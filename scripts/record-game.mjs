import { setTimeout as wait } from "node:timers/promises";
import puppeteer from "puppeteer-core";

const GAME_URL = process.env.STATELESS_GAME_URL
  ?? "https://softkleenex.github.io/state-less-game/";
const OUTPUT_PATH = process.argv[2] ?? "artifacts/state-less-gameplay.webm";
const CHROME_PATH = process.env.STATELESS_CHROME_PATH
  ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const VIEWPORT_WIDTH = Number.parseInt(process.env.STATELESS_VIEWPORT_WIDTH ?? "1920", 10);
const VIEWPORT_HEIGHT = Number.parseInt(process.env.STATELESS_VIEWPORT_HEIGHT ?? "1080", 10);
const INPUT_MODE = process.env.STATELESS_INPUT_MODE ?? "keyboard";
const PLAY_STYLE = process.env.STATELESS_PLAY_STYLE ?? "perfect";
const CAPTURE_VIDEO = process.env.STATELESS_CAPTURE !== "false";
const TOTAL_ROUNDS = 6;

if (!new Set(["keyboard", "mouse"]).has(INPUT_MODE)) {
  throw new Error("STATELESS_INPUT_MODE must be keyboard or mouse");
}
if (!new Set(["perfect", "recovery"]).has(PLAY_STYLE)) {
  throw new Error("STATELESS_PLAY_STYLE must be perfect or recovery");
}

async function settleWithin(action, timeoutMs) {
  return Promise.race([
    Promise.resolve()
      .then(action)
      .then(() => ({ ok: true }), (error) => ({ ok: false, error })),
    wait(timeoutMs).then(() => ({ ok: false, timedOut: true })),
  ]);
}

async function readVisibleRound(page) {
  return page.evaluate(() => ({
    kind: document.querySelector("#statement-board")?.dataset.roundKind ?? "",
    evidence: [...document.querySelectorAll("#evidence-summary li")]
      .map((item) => item.textContent ?? ""),
    statements: [...document.querySelectorAll("#statement-board .statement-chip")].map((button) => ({
      text: button.textContent ?? "",
      claim: button.dataset.claim ?? "",
      disabled: button.disabled,
      selected: button.classList.contains("is-selected"),
    })),
  }));
}

function getActualFieldValue(signal, field) {
  if (field === "VISIT") {
    const count = Number.parseInt(signal.match(/(\d+) CHECK-INS/)?.[1] ?? "0", 10);
    return count <= 1 ? "01 / FIRST" : `${String(count).padStart(2, "0")} / RETURN`;
  }
  if (field === "THEME") return signal.includes("DARK SIGNAL") ? "DARK" : "LIGHT";
  if (field === "TIME") {
    const hour = Number.parseInt(signal.match(/(\d{2}):/)?.[1] ?? "12", 10);
    return hour >= 6 && hour < 18 ? "DAY" : "NIGHT";
  }
  if (field === "INPUT") return signal.includes("KEYDOWN") ? "KEYBOARD" : "MOUSE";
  if (field === "TAB") return signal.includes("HIDDEN 1") ? "LEFT" : "CLEAN";
  if (field === "PEER") return signal.includes("ACK · 1") ? "DETECTED" : "NONE";
  if (field === "VIEWPORT") {
    const width = Number.parseInt(signal.match(/(\d+)px/)?.[1] ?? "0", 10);
    return width >= 720 ? "WIDE" : "NARROW";
  }
  if (field === "MOTION") return signal.includes("REDUCE 1") ? "REDUCED" : "FULL";
  if (field === "NETWORK") return signal.includes("NO ACK") ? "OFFLINE" : "ONLINE";
  if (field === "ENDING") {
    const ending = signal.split(" · ").at(-1);
    return ending === "EMPTY" ? "NONE" : ending;
  }
  if (field === "SHARDS") {
    return signal.match(/(\d{2} \/ \d{2}) RECOVERED/)?.[1] ?? "00 / 06";
  }
  if (field === "RUNS") {
    return `${signal.match(/(\d{2,3}) COMPLETE/)?.[1] ?? "00"} COMPLETE`;
  }
  if (field === "RETENTION") {
    return signal.includes("EXPIRES 7D") ? "7 DAYS" : "TAB ONLY";
  }
  if (field === "BEST") {
    return signal.match(/COOKIE HIGH SCORE · (\d+)/)?.[1] ?? "00000";
  }
  throw new Error(`Unknown checksum field: ${field}`);
}

function solveChecksumClaim(evidence) {
  const mismatchCount = evidence.filter((entry) => {
    const payload = entry.slice(entry.indexOf(":") + 1).trim();
    const [signal, indexedField] = payload.split(" ↔ ");
    const separator = indexedField.indexOf("=");
    const field = indexedField.slice(0, separator);
    const candidateValue = indexedField.slice(separator + 1);
    return getActualFieldValue(signal, field) !== candidateValue;
  }).length;
  return `count-${mismatchCount}`;
}

function getExpectedClaim(round) {
  const claimByKind = {
    trace: "truth",
    purge: "lie",
    restore: "truth",
    redact: "value",
    crosscheck: "verified-pair",
  };
  return round.kind === "checksum"
    ? solveChecksumClaim(round.evidence)
    : claimByKind[round.kind];
}

const browser = await puppeteer.launch({
  executablePath: CHROME_PATH,
  headless: true,
  args: [
    "--autoplay-policy=no-user-gesture-required",
    "--disable-background-timer-throttling",
    "--disable-renderer-backgrounding",
    "--hide-scrollbars",
  ],
});

const page = await browser.newPage();
await page.setViewport({
  width: VIEWPORT_WIDTH,
  height: VIEWPORT_HEIGHT,
  deviceScaleFactor: 1,
});
await page.emulateMediaFeatures([
  { name: "prefers-color-scheme", value: "dark" },
  { name: "prefers-reduced-motion", value: "no-preference" },
]);

const browserErrors = [];
page.on("console", (message) => {
  if (message.type() === "error") browserErrors.push(message.text());
});
page.on("pageerror", (error) => browserErrors.push(error.message));

let recorder;
let resultSummary;
let maxHorizontalOverflow = 0;
let minimumDeepVerifyHeight = Number.POSITIVE_INFINITY;
let finalCoreVerified = false;
let directiveSealed = false;
const cleanupWarnings = [];
const browserProcess = browser.process();
try {
  await page.goto(GAME_URL, { waitUntil: "networkidle0", timeout: 30_000 });
  await page.waitForSelector("#intro-screen:not([hidden])", { timeout: 10_000 });

  if (CAPTURE_VIDEO) {
    recorder = await page.screencast({
      path: OUTPUT_PATH,
      format: "webm",
      fps: 30,
      quality: 22,
      ffmpegPath: "/opt/homebrew/bin/ffmpeg",
      overwrite: true,
    });
  }

  await wait(2_800);

  if (INPUT_MODE === "mouse") {
    await page.click('[data-memory-policy="persistent"]');
  } else {
    // The first ArrowRight focuses the first policy; the second focuses the
    // persistent seven-day option. Enter starts without using a pointer.
    await page.keyboard.press("ArrowRight");
    await wait(500);
    await page.keyboard.press("ArrowRight");
    await wait(700);
    await page.keyboard.press("Enter");
  }
  await page.waitForSelector("#play-screen:not([hidden])", { timeout: 5_000 });

  for (let roundIndex = 0; roundIndex < TOTAL_ROUNDS; roundIndex += 1) {
    await page.waitForFunction(
      (expectedRound) => {
        const kicker = document.querySelector("#round-kicker")?.textContent ?? "";
        const buttons = [...document.querySelectorAll("#statement-board .statement-chip")];
        return kicker.includes(String(expectedRound).padStart(2, "0"))
          && buttons.length === 3
          && buttons.every((button) => !button.disabled);
      },
      { timeout: 5_000 },
      roundIndex + 1,
    );

    const layoutCheck = await page.evaluate(() => {
      const root = document.documentElement;
      const body = document.body;
      const deepVerify = document.querySelector("#deep-verify-button");
      const bounds = deepVerify?.getBoundingClientRect();
      return {
        clientWidth: root.clientWidth,
        scrollWidth: Math.max(root.scrollWidth, body?.scrollWidth ?? 0),
        deepVerifyHeight: bounds?.height ?? 0,
        deepVerifyLeft: bounds?.left ?? -1,
        deepVerifyRight: bounds?.right ?? Number.POSITIVE_INFINITY,
      };
    });
    const horizontalOverflow = Math.max(
      0,
      layoutCheck.scrollWidth - layoutCheck.clientWidth,
    );
    maxHorizontalOverflow = Math.max(maxHorizontalOverflow, horizontalOverflow);
    minimumDeepVerifyHeight = Math.min(
      minimumDeepVerifyHeight,
      layoutCheck.deepVerifyHeight,
    );
    if (horizontalOverflow > 1
      || layoutCheck.deepVerifyHeight < 44
      || layoutCheck.deepVerifyLeft < -1
      || layoutCheck.deepVerifyRight > layoutCheck.clientWidth + 1) {
      throw new Error(`Round ${roundIndex + 1} layout overflow: ${JSON.stringify(layoutCheck)}`);
    }

    await wait(3_000);
    let round = await readVisibleRound(page);

    if (roundIndex === 0 && PLAY_STYLE === "perfect") {
      if (INPUT_MODE === "mouse") await page.click("#lens-button");
      else await page.keyboard.press("f");
      await wait(650);
      round = await readVisibleRound(page);
      if (round.statements.filter((statement) => statement.disabled).length !== 1) {
        throw new Error("ARCHIVE LENS did not remove exactly one option");
      }
    }

    const expectedClaim = getExpectedClaim(round);
    const expectedIndex = round.statements.findIndex((statement) => statement.claim === expectedClaim);
    const targetIndex = PLAY_STYLE === "recovery" && roundIndex === 0
      ? round.statements.findIndex((_, index) => index !== expectedIndex)
      : expectedIndex;

    if (targetIndex < 0) {
      throw new Error(`No correct ${round.kind} option found in round ${roundIndex + 1}`);
    }

    if (PLAY_STYLE === "perfect" && roundIndex === TOTAL_ROUNDS - 1) {
      if (INPUT_MODE === "mouse") await page.click("#deep-verify-button");
      else await page.keyboard.press("d");
      await wait(320);
      const finalWager = await page.evaluate(() => ({
        finalRound: document.querySelector("#screen-stack")?.dataset.finalRound,
        pressed: document.querySelector("#deep-verify-button")?.getAttribute("aria-pressed"),
        label: document.querySelector("#deep-verify-label")?.textContent ?? "",
        kicker: document.querySelector("#deep-verify-kicker")?.textContent ?? "",
      }));
      if (finalWager.finalRound !== "true"
        || finalWager.pressed !== "true"
        || !finalWager.label.includes("+700")
        || !finalWager.kicker.includes("FINAL WAGER")) {
        throw new Error(`FINAL CORE wager did not arm: ${JSON.stringify(finalWager)}`);
      }
    }

    if (INPUT_MODE === "mouse") {
      await page.click(`.statement-chip:nth-of-type(${targetIndex + 1})`);
    } else {
      for (let step = 0; step < 4; step += 1) {
        round = await readVisibleRound(page);
        const selectedIndex = round.statements.findIndex((statement) => statement.selected);
        if (selectedIndex === targetIndex) break;
        await page.keyboard.press("ArrowRight");
        await wait(260);
      }
      round = await readVisibleRound(page);
      if (!round.statements[targetIndex].selected) {
        throw new Error(`Keyboard navigation missed the ${round.kind} answer`);
      }
      await page.keyboard.press("Space");
    }
    await page.waitForFunction(
      () => (document.querySelector("#round-feedback")?.textContent ?? "").length > 0,
      { timeout: 2_000 },
    );
    const directiveResolution = await page.evaluate(() => ({
      label: document.querySelector("#round-impact-label")?.textContent ?? "",
      moriState: document.querySelector("#screen-stack")?.dataset.moriState ?? "",
      readoutState: document.querySelector("#layout-readout")?.dataset.state ?? "",
      readout: document.querySelector("#layout-readout")?.textContent ?? "",
    }));
    if (directiveResolution.label === "REQUEST SEALED") {
      directiveSealed = directiveResolution.moriState === "directive-complete"
        && directiveResolution.readoutState === "complete"
        && directiveResolution.readout.includes("+600");
    }
    if (PLAY_STYLE === "perfect" && roundIndex === TOTAL_ROUNDS - 1) {
      const finalResolution = await page.evaluate(() => ({
        label: document.querySelector("#round-impact-label")?.textContent ?? "",
        detail: document.querySelector("#round-impact-detail")?.textContent ?? "",
        feedback: document.querySelector("#round-feedback")?.textContent ?? "",
      }));
      finalCoreVerified = finalResolution.label === "CORE DEEP VERIFIED"
        && finalResolution.detail.includes("WAGER +700")
        && finalResolution.feedback.includes("DEEP VERIFY +700");
      if (!finalCoreVerified) {
        throw new Error(`FINAL CORE wager did not resolve: ${JSON.stringify(finalResolution)}`);
      }
    }
    await wait(2_300);
  }

  await page.waitForSelector("#result-screen:not([hidden])", { timeout: 5_000 });
  const result = await page.evaluate(() => ({
    rank: document.querySelector("#result-rank")?.textContent,
    truth: document.querySelector("#result-truth")?.textContent,
    score: document.querySelector("#result-score")?.textContent,
    recovered: document.querySelectorAll('#audit-progress li[data-state="recovered"]').length,
    message: document.querySelector("#result-message")?.textContent ?? "",
    directiveState: document.querySelector("#result-directive")?.dataset.state ?? "",
    directive: document.querySelector("#result-directive-copy")?.textContent ?? "",
  }));
  const expectedResult = PLAY_STYLE === "recovery"
    ? { rank: "A", truth: "6/6", recovered: 1 }
    : { rank: "S", truth: "6/6", recovered: 0 };
  if (result.rank !== expectedResult.rank
    || result.truth !== expectedResult.truth
    || result.recovered !== expectedResult.recovered
    || result.directiveState !== "complete"
    || !result.directive.includes("SYNC CHAIN")
    || !result.directive.includes("+600")
    || !directiveSealed
    || (PLAY_STYLE === "perfect" && !finalCoreVerified)
    || (PLAY_STYLE === "recovery" && !result.message.includes("SYNC RECOVERY"))) {
    throw new Error(`Unexpected recorded result: ${JSON.stringify(result)}`);
  }

  await wait(5_000);
  resultSummary = {
    output: CAPTURE_VIDEO ? OUTPUT_PATH : null,
    url: GAME_URL,
    viewport: `${VIEWPORT_WIDTH}x${VIEWPORT_HEIGHT}`,
    inputMode: INPUT_MODE,
    playStyle: PLAY_STYLE,
    finalCoreVerified,
    directiveSealed,
    maxHorizontalOverflow,
    minimumDeepVerifyHeight,
    ...result,
  };
} finally {
  if (recorder) {
    const recorderCleanup = await settleWithin(() => recorder.stop(), 5_000);
    if (!recorderCleanup.ok) {
      cleanupWarnings.push(recorderCleanup.timedOut
        ? "recorder stop timed out"
        : `recorder stop failed: ${recorderCleanup.error?.message ?? "unknown error"}`);
    }
  }

  const browserCleanup = await settleWithin(() => browser.close(), 5_000);
  if (!browserCleanup.ok) {
    cleanupWarnings.push(browserCleanup.timedOut
      ? "browser close timed out; disconnected instead"
      : `browser close failed: ${browserCleanup.error?.message ?? "unknown error"}`);
    browser.disconnect();
    if (browserProcess && browserProcess.exitCode === null) {
      browserProcess.kill("SIGTERM");
      await wait(250);
    }
  }
}

if (browserErrors.length > 0) {
  throw new Error(`Browser console errors: ${browserErrors.join(" | ")}`);
}
if (!resultSummary) {
  throw new Error("Gameplay verification finished without a result summary");
}
await new Promise((resolve, reject) => {
  process.stdout.write(
    `${JSON.stringify({ ...resultSummary, cleanupWarnings })}\n`,
    (error) => error ? reject(error) : resolve(),
  );
});
process.exit(0);
