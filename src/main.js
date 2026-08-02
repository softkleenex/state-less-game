import "./styles.css";

import { AudioEngine } from "./audio.js";
import {
  MAX_INTEGRITY,
  TOTAL_ROUNDS,
  createFactCatalog,
  createRoundDeck,
  formatScore,
  getResult,
  getRoundDuration,
  scoreCorrectAnswer,
  seedFromString,
} from "./game-logic.js";
import { layoutStatementChips } from "./pretext-layout.js";
import {
  EMPTY_MEMORY,
  clearMemory,
  loadMemory,
  observeMemoryChanges,
  saveMemory,
} from "./state-store.js";

const element = (id) => document.getElementById(id);

const elements = {
  storageApiLabel: element("storage-api-label"),
  soundButton: element("sound-button"),
  soundIcon: element("sound-icon"),
  soundLabel: element("sound-label"),
  terminalStatus: element("terminal-status"),
  sessionCode: element("session-code"),
  introScreen: element("intro-screen"),
  playScreen: element("play-screen"),
  resultScreen: element("result-screen"),
  introHeading: element("intro-heading"),
  introMessage: element("intro-message"),
  firstVisitActions: element("first-visit-actions"),
  returnStartButton: element("return-start-button"),
  memoryButtons: [...document.querySelectorAll("[data-memory-policy]")],
  telemetryVisit: element("telemetry-visit"),
  telemetryTheme: element("telemetry-theme"),
  telemetryTime: element("telemetry-time"),
  telemetryInput: element("telemetry-input"),
  telemetryTab: element("telemetry-tab"),
  telemetryPeer: element("telemetry-peer"),
  roundKicker: element("round-kicker"),
  roundContext: element("round-context"),
  scoreValue: element("score-value"),
  integrityPips: element("integrity-pips"),
  statementBoard: element("statement-board"),
  scanProgress: element("scan-progress"),
  layoutReadout: element("layout-readout"),
  roundFeedback: element("round-feedback"),
  resultKicker: element("result-kicker"),
  resultGlyph: element("result-glyph"),
  resultHeading: element("result-heading"),
  resultMessage: element("result-message"),
  resultScore: element("result-score"),
  resultRank: element("result-rank"),
  resultTruth: element("result-truth"),
  rememberButton: element("remember-button"),
  forgetButton: element("forget-button"),
  runtimeNote: element("runtime-note"),
  toast: element("toast"),
  announcer: element("announcer"),
};

const audio = new AudioEngine();
const darkModeQuery = window.matchMedia("(prefers-color-scheme: dark)");
const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

const runtime = {
  ready: false,
  mode: "boot",
  memory: { ...EMPTY_MEMORY },
  memoryFound: false,
  adapter: "SCANNING",
  sessionId: "----",
  inputMode: null,
  tabLeft: false,
  peerPresent: false,
  peerLastSeenAt: 0,
  stateRevision: 0,
  snapshot: null,
  rounds: [],
  roundIndex: 0,
  roundDuration: 0,
  remaining: 0,
  selectedIndex: 0,
  score: 0,
  integrity: MAX_INTEGRITY,
  correct: 0,
  streak: 0,
  locked: false,
  lastFrameAt: 0,
  animationFrame: 0,
  advanceTimer: 0,
  toastTimer: 0,
  resizeTimer: 0,
  boardWidth: 0,
  lastResult: null,
};

elements.memoryButtons.forEach((button) => {
  button.disabled = true;
});

function createSessionId() {
  const buffer = new Uint32Array(1);
  crypto.getRandomValues(buffer);
  return buffer[0].toString(16).toUpperCase().padStart(8, "0").slice(0, 8);
}

function getSnapshot() {
  const hour = new Date().getHours();
  return {
    visitCount: runtime.memory.visits,
    lastEnding: runtime.memory.lastEnding,
    theme: darkModeQuery.matches ? "dark" : "light",
    timePhase: hour >= 6 && hour < 18 ? "day" : "night",
    inputMode: runtime.inputMode ?? "mouse",
    tabLeft: runtime.tabLeft,
    peerPresent: runtime.peerPresent,
    viewport: window.innerWidth >= 720 ? "wide" : "narrow",
    motion: reducedMotionQuery.matches ? "reduced" : "full",
    network: navigator.onLine ? "online" : "offline",
  };
}

function recordInput(mode) {
  if (runtime.inputMode) return;
  runtime.inputMode = mode;
  updateTelemetry();
}

function announce(message) {
  elements.announcer.textContent = "";
  window.setTimeout(() => {
    elements.announcer.textContent = message;
  }, 20);
}

function showToast(message) {
  window.clearTimeout(runtime.toastTimer);
  elements.toast.textContent = message;
  elements.toast.hidden = false;
  runtime.toastTimer = window.setTimeout(() => {
    elements.toast.hidden = true;
  }, 3_200);
}

function updateStorageLabel(adapter = runtime.adapter) {
  runtime.adapter = adapter;
  const shortLabel = adapter === "COOKIE STORE API" ? "ASYNC STORE" : "SYNC FALLBACK";
  elements.storageApiLabel.textContent = `COOKIE: ${shortLabel}`;
  elements.runtimeNote.textContent = `${adapter} · CLIENT-SIDE ONLY`;
}

function updateTelemetry() {
  const snapshot = getSnapshot();
  const firstVisit = snapshot.visitCount <= 1;
  elements.telemetryVisit.textContent = firstVisit
    ? "01 / FIRST"
    : `${String(snapshot.visitCount).padStart(2, "0")} / RETURN`;
  elements.telemetryTheme.textContent = snapshot.theme.toUpperCase();
  elements.telemetryTime.textContent = snapshot.timePhase.toUpperCase();
  elements.telemetryInput.textContent = runtime.inputMode?.toUpperCase() ?? "UNKNOWN";
  elements.telemetryTab.textContent = snapshot.tabLeft ? "LEFT / RECORDED" : "CLEAN";
  elements.telemetryPeer.textContent = snapshot.peerPresent ? "DETECTED" : "NONE";

  elements.telemetryTab.classList.toggle("is-hot", snapshot.tabLeft);
  elements.telemetryPeer.classList.toggle("is-hot", snapshot.peerPresent);
}

function renderIntro(messageOverride = "") {
  const returning = runtime.memoryFound;
  elements.firstVisitActions.hidden = returning;
  elements.returnStartButton.hidden = !returning;

  if (returning) {
    const ending = runtime.memory.lastEnding;
    elements.introHeading.textContent = `다시 왔군요. ${runtime.memory.visits}번째입니다.`;
    elements.introMessage.textContent = ending
      ? `쿠키에 이전 결말 ${ending.toUpperCase()} 기록과 최고 점수 ${formatScore(runtime.memory.bestScore)}가 남아 있습니다. 이번 추론은 그 기억까지 사용합니다.`
      : "방문 기록은 찾았지만 저장된 결말은 없습니다. 이번에는 어떤 기억을 남길지 확인해 보겠습니다.";
    elements.terminalStatus.textContent = "MEMORY FOUND";
  } else {
    elements.introHeading.textContent = messageOverride || "아직 당신을 모릅니다.";
    elements.introMessage.textContent = messageOverride
      ? "게임 쿠키가 삭제되었습니다. 기억 방식을 다시 고르면 완전히 새로운 원장에서 시작합니다."
      : "이 게임이 만든 방문 횟수와 결말만 쿠키에 저장합니다. 추적 코드도, 개인정보도 없습니다.";
    elements.terminalStatus.textContent = "MEMORY EMPTY";
  }

  updateTelemetry();
}

function setVisibleScreen(name) {
  const screens = {
    intro: elements.introScreen,
    play: elements.playScreen,
    result: elements.resultScreen,
  };
  Object.entries(screens).forEach(([screenName, screen]) => {
    const isVisible = screenName === name;
    screen.hidden = !isVisible;
    screen.classList.toggle("is-active", isVisible);
    screen.setAttribute("aria-hidden", String(!isVisible));
  });
}

async function transitionTo(name) {
  const update = () => setVisibleScreen(name);
  if (!document.startViewTransition || reducedMotionQuery.matches) {
    update();
    return;
  }

  let updated = false;
  try {
    const transition = document.startViewTransition(() => {
      updated = true;
      update();
    });
    await transition.finished;
  } catch {
    if (!updated) update();
  }
}

function getIntroControls() {
  return runtime.memoryFound
    ? [elements.returnStartButton]
    : elements.memoryButtons;
}

function moveFocus(controls, direction) {
  const visibleControls = controls.filter((control) => !control.hidden && !control.disabled);
  if (!visibleControls.length) return;
  const currentIndex = visibleControls.indexOf(document.activeElement);
  const nextIndex = currentIndex < 0
    ? 0
    : (currentIndex + direction + visibleControls.length) % visibleControls.length;
  visibleControls[nextIndex].focus({ preventScroll: true });
  visibleControls.forEach((control, index) => {
    control.classList.toggle("is-selected", index === nextIndex);
  });
  audio.navigate(nextIndex);
}

function updateSoundButton() {
  elements.soundButton.setAttribute("aria-pressed", String(audio.enabled));
  elements.soundIcon.textContent = audio.enabled ? "◖))" : "◖×";
  elements.soundLabel.textContent = audio.enabled ? "소리 켜짐" : "소리 꺼짐";
}

function cancelRoundTimers() {
  window.cancelAnimationFrame(runtime.animationFrame);
  window.clearTimeout(runtime.advanceTimer);
  runtime.animationFrame = 0;
  runtime.advanceTimer = 0;
}

function createDeck() {
  runtime.snapshot = getSnapshot();
  const catalog = createFactCatalog(runtime.snapshot);
  const seed = seedFromString(
    `${runtime.sessionId}:${runtime.memory.visits}:${runtime.memory.runs}:${runtime.stateRevision}`,
  );
  runtime.rounds = createRoundDeck(catalog, TOTAL_ROUNDS, seed);
}

async function startGame(policy = null) {
  if (!runtime.ready) return;
  audio.unlock();

  if (policy) {
    runtime.memory.policy = policy;
    runtime.memoryFound = true;
    updateStorageLabel(await saveMemory(runtime.memory));
  }

  runtime.tabLeft = false;
  runtime.stateRevision += 1;
  runtime.roundIndex = 0;
  runtime.score = 0;
  runtime.integrity = MAX_INTEGRITY;
  runtime.correct = 0;
  runtime.streak = 0;
  runtime.locked = false;
  runtime.lastResult = null;
  createDeck();
  updateTelemetry();
  updateScoreAndIntegrity();
  elements.terminalStatus.textContent = "AUDIT ACTIVE";
  document.title = "[1/6] STATE//LESS";

  cancelRoundTimers();
  runtime.mode = "play";
  await transitionTo("play");
  audio.start();
  startRound();
}

function updateScoreAndIntegrity() {
  elements.scoreValue.textContent = formatScore(runtime.score);
  const pips = [...elements.integrityPips.children];
  pips.forEach((pip, index) => {
    pip.classList.toggle("is-empty", index >= runtime.integrity);
  });
  elements.integrityPips.setAttribute(
    "aria-label",
    `기억 무결성 ${runtime.integrity} / ${MAX_INTEGRITY}`,
  );
}

function renderRoundContext(round) {
  const fragment = document.createDocumentFragment();
  round.statements.forEach((statement) => {
    const chip = document.createElement("span");
    const label = document.createElement("span");
    const value = document.createElement("strong");
    chip.className = "context-chip";
    label.textContent = statement.factLabel;
    value.textContent = statement.factValue;
    chip.append(label, value);
    fragment.append(chip);
  });
  elements.roundContext.replaceChildren(fragment);
}

function renderStatementButtons(round) {
  const fragment = document.createDocumentFragment();
  round.statements.forEach((statement, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "statement-chip";
    button.dataset.index = String(index + 1).padStart(2, "0");
    button.textContent = statement.text;
    button.setAttribute("aria-label", `문장 ${index + 1}. ${statement.text}`);
    button.tabIndex = index === 0 ? 0 : -1;
    button.addEventListener("pointerenter", () => selectStatement(index, false));
    button.addEventListener("click", () => submitAnswer(index));
    fragment.append(button);
  });
  elements.statementBoard.replaceChildren(fragment);
  runtime.selectedIndex = 0;
  selectStatement(0, runtime.inputMode === "keyboard");
  applyStatementLayout();
}

function applyStatementLayout() {
  const round = runtime.rounds[runtime.roundIndex];
  if (!round || runtime.mode !== "play") return;

  const width = runtime.boardWidth || elements.statementBoard.getBoundingClientRect().width;
  if (width < 240) return;

  try {
    const layout = layoutStatementChips(round.statements, width);
    const buttons = [...elements.statementBoard.querySelectorAll(".statement-chip")];
    buttons.forEach((button, index) => {
      const position = layout.positions[index];
      if (!position) return;
      button.style.left = `${Math.round(position.x)}px`;
      button.style.top = `${Math.round(position.y)}px`;
      button.style.width = `${Math.round(Math.min(position.width, width - position.x - 12))}px`;
      button.style.fontSize = `${layout.fontSize}px`;
    });
    elements.layoutReadout.textContent = `PRETEXT · ${layout.lineCount} LINES · ${layout.measuredWidth}px · 0 TEXT READS`;
  } catch (error) {
    console.warn("Pretext layout fallback", error);
    const buttons = [...elements.statementBoard.querySelectorAll(".statement-chip")];
    buttons.forEach((button, index) => {
      button.style.left = "16px";
      button.style.top = `${18 + index * 66}px`;
      button.style.width = `${Math.max(180, width - 32)}px`;
    });
    elements.layoutReadout.textContent = "PRETEXT · SAFE FALLBACK";
  }
}

function selectStatement(index, focus = false) {
  if (runtime.mode !== "play" || runtime.locked) return;
  const buttons = [...elements.statementBoard.querySelectorAll(".statement-chip")];
  if (!buttons.length) return;
  runtime.selectedIndex = (index + buttons.length) % buttons.length;
  buttons.forEach((button, buttonIndex) => {
    const selected = buttonIndex === runtime.selectedIndex;
    button.classList.toggle("is-selected", selected);
    button.tabIndex = selected ? 0 : -1;
  });
  if (focus) buttons[runtime.selectedIndex].focus({ preventScroll: true });
}

function startRound() {
  cancelRoundTimers();
  if (runtime.integrity <= 0 || runtime.roundIndex >= TOTAL_ROUNDS) {
    finishGame();
    return;
  }

  const round = runtime.rounds[runtime.roundIndex];
  runtime.locked = false;
  runtime.roundDuration = getRoundDuration(runtime.roundIndex);
  runtime.remaining = runtime.roundDuration;
  runtime.lastFrameAt = performance.now();

  elements.roundKicker.textContent = `MEMORY PACKET ${String(runtime.roundIndex + 1).padStart(2, "0")}/${String(TOTAL_ROUNDS).padStart(2, "0")}`;
  elements.roundFeedback.textContent = "";
  elements.roundFeedback.className = "round-feedback";
  elements.scanProgress.style.transform = "scaleX(1)";
  elements.statementBoard.style.setProperty("--scan-position", "100%");
  document.title = `[${runtime.roundIndex + 1}/${TOTAL_ROUNDS}] STATE//LESS`;

  renderRoundContext(round);
  renderStatementButtons(round);
  announce(`${runtime.roundIndex + 1}번째 문제. 실제 상태와 다른 문장 하나를 고르세요.`);
  runtime.animationFrame = window.requestAnimationFrame(updateRoundClock);
}

function updateRoundClock(timestamp) {
  if (runtime.mode !== "play" || runtime.locked) return;
  const elapsed = Math.min(100, timestamp - runtime.lastFrameAt);
  runtime.lastFrameAt = timestamp;
  runtime.remaining = Math.max(0, runtime.remaining - elapsed);
  const ratio = runtime.remaining / runtime.roundDuration;
  elements.scanProgress.style.transform = `scaleX(${ratio})`;
  elements.statementBoard.style.setProperty("--scan-position", `${ratio * 100}%`);

  if (runtime.remaining <= 0) {
    submitAnswer(-1, true);
    return;
  }
  runtime.animationFrame = window.requestAnimationFrame(updateRoundClock);
}

function submitAnswer(index, timedOut = false) {
  if (runtime.mode !== "play" || runtime.locked) return;
  runtime.locked = true;
  window.cancelAnimationFrame(runtime.animationFrame);

  const round = runtime.rounds[runtime.roundIndex];
  const lieIndex = round.statements.findIndex((statement) => statement.isLie);
  const correct = index === lieIndex;
  const buttons = [...elements.statementBoard.querySelectorAll(".statement-chip")];

  buttons.forEach((button, buttonIndex) => {
    button.disabled = true;
    button.classList.remove("is-selected");
    if (buttonIndex === lieIndex) button.classList.add("is-correct");
    if (buttonIndex === index && !correct) button.classList.add("is-wrong");
    if (buttonIndex !== lieIndex && buttonIndex !== index) button.classList.add("is-muted");
  });

  if (correct) {
    runtime.streak += 1;
    runtime.correct += 1;
    const points = scoreCorrectAnswer(runtime.remaining / runtime.roundDuration, runtime.streak);
    runtime.score += points;
    elements.roundFeedback.textContent = `거짓 제거 완료 · +${points} · ${runtime.streak} 연속 검증`;
    elements.roundFeedback.classList.add("is-positive");
    audio.correct(runtime.streak);
    announce(`정답입니다. ${points}점을 획득했습니다.`);
  } else {
    runtime.streak = 0;
    runtime.integrity -= 1;
    elements.roundFeedback.textContent = timedOut
      ? "스캔 시간 초과 · 기억 무결성 -1"
      : "진실을 지웠습니다 · 기억 무결성 -1";
    elements.roundFeedback.classList.add("is-negative");
    audio.wrong();
    announce(timedOut ? "시간이 초과되었습니다." : "틀렸습니다. 초록색 문장이 거짓 기억이었습니다.");
  }

  updateScoreAndIntegrity();
  const answeredRound = runtime.roundIndex;
  runtime.advanceTimer = window.setTimeout(() => {
    if (runtime.mode !== "play" || runtime.roundIndex !== answeredRound) return;
    runtime.roundIndex += 1;
    startRound();
  }, reducedMotionQuery.matches ? 320 : 1_150);
}

async function finishGame() {
  cancelRoundTimers();
  runtime.mode = "result";
  runtime.lastResult = getResult({
    score: runtime.score,
    correct: runtime.correct,
    integrity: runtime.integrity,
  });

  const result = runtime.lastResult;
  elements.resultKicker.textContent = result.ending === "verified" ? "AUDIT COMPLETE" : "AUDIT INTERRUPTED";
  elements.resultGlyph.textContent = result.rank;
  elements.resultHeading.textContent = result.title;
  elements.resultMessage.textContent = result.message;
  elements.resultScore.textContent = formatScore(runtime.score);
  elements.resultRank.textContent = result.rank;
  elements.resultTruth.textContent = `${runtime.correct}/${TOTAL_ROUNDS}`;
  elements.terminalStatus.textContent = result.ending === "verified" ? "MEMORY VERIFIED" : "MEMORY UNSTABLE";
  document.title = `${result.rank} RANK · STATE//LESS`;

  await transitionTo("result");
  audio.finish(result.ending === "verified");
  if (runtime.inputMode === "keyboard") {
    elements.rememberButton.focus({ preventScroll: true });
  }
  announce(`${result.title} 점수 ${formatScore(runtime.score)}, 랭크 ${result.rank}.`);
}

async function rememberResultAndRestart() {
  if (!runtime.lastResult) return;
  runtime.memory = {
    ...runtime.memory,
    runs: runtime.memory.runs + 1,
    bestScore: Math.max(runtime.memory.bestScore, runtime.score),
    lastEnding: runtime.lastResult.ending,
    policy: runtime.memory.policy ?? "session",
  };
  runtime.memoryFound = true;
  updateStorageLabel(await saveMemory(runtime.memory));
  showToast("이번 결말이 게임 쿠키에 저장되었습니다.");
  await startGame();
}

async function forgetAndReturn() {
  cancelRoundTimers();
  updateStorageLabel(await clearMemory());
  runtime.memory = { ...EMPTY_MEMORY, visits: 1 };
  runtime.memoryFound = false;
  runtime.lastResult = null;
  runtime.tabLeft = false;
  runtime.mode = "intro";
  document.title = "STATE//LESS — 이 페이지는 당신을 기억한다";
  renderIntro("이제 당신을 모릅니다.");
  await transitionTo("intro");
  showToast("게임 쿠키를 지웠습니다. 저장된 상태는 복구되지 않습니다.");
  const target = elements.memoryButtons[0];
  if (runtime.inputMode === "keyboard") target.focus({ preventScroll: true });
}

function regenerateActiveRound(reason) {
  if (runtime.mode !== "play" || runtime.locked) return;
  runtime.stateRevision += 1;
  const currentIndex = runtime.roundIndex;
  const completed = runtime.rounds.slice(0, currentIndex);
  createDeck();
  runtime.rounds.splice(0, currentIndex, ...completed);
  showToast(reason);
  startRound();
}

function handleVisibilityChange() {
  if (!runtime.ready || !document.hidden) {
    if (!document.hidden && runtime.mode === "paused") {
      runtime.mode = "play";
      updateTelemetry();
      regenerateActiveRound("탭 이탈이 기록되어 현재 문장을 다시 추론했습니다.");
    }
    return;
  }

  runtime.tabLeft = true;
  updateTelemetry();
  if (runtime.mode === "play" && !runtime.locked) {
    cancelRoundTimers();
    runtime.mode = "paused";
  }
}

function handleEnvironmentChange(message) {
  updateTelemetry();
  regenerateActiveRound(message);
}

function setupPresenceChannel() {
  if (!("BroadcastChannel" in window)) return;
  const channel = new BroadcastChannel("state-less-presence-v1");
  const tabId = runtime.sessionId;

  channel.addEventListener("message", (event) => {
    if (!event.data || event.data.id === tabId) return;
    runtime.peerLastSeenAt = Date.now();
    if (!runtime.peerPresent) {
      runtime.peerPresent = true;
      handleEnvironmentChange("같은 페이지의 다른 탭이 감지되었습니다.");
    }
    if (event.data.type === "hello") {
      channel.postMessage({ type: "present", id: tabId });
    }
  });

  channel.postMessage({ type: "hello", id: tabId });
  const heartbeat = window.setInterval(() => {
    channel.postMessage({ type: "ping", id: tabId });
    if (runtime.peerPresent && Date.now() - runtime.peerLastSeenAt > 5_500) {
      runtime.peerPresent = false;
      handleEnvironmentChange("다른 탭의 신호가 사라졌습니다.");
    }
  }, 2_000);

  window.addEventListener("beforeunload", () => {
    window.clearInterval(heartbeat);
    channel.close();
  }, { once: true });
}

function handleGlobalKeydown(event) {
  if (!event.metaKey && !event.ctrlKey && !event.altKey) {
    recordInput("keyboard");
  }
  if (!runtime.ready) return;

  if (runtime.mode === "play" && !runtime.locked) {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      const direction = event.key === "ArrowRight" ? 1 : -1;
      selectStatement(runtime.selectedIndex + direction, true);
      audio.navigate(runtime.selectedIndex);
      return;
    }
    if ((event.key === " " || event.key === "Enter") && !event.target.closest("#sound-button")) {
      event.preventDefault();
      submitAnswer(runtime.selectedIndex);
    }
    return;
  }

  if (runtime.mode === "intro" && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
    event.preventDefault();
    moveFocus(getIntroControls(), event.key === "ArrowRight" ? 1 : -1);
    return;
  }

  if (runtime.mode === "result" && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
    event.preventDefault();
    moveFocus([elements.rememberButton, elements.forgetButton], event.key === "ArrowRight" ? 1 : -1);
  }
}

async function initialize() {
  runtime.sessionId = createSessionId();
  elements.sessionCode.textContent = `SESSION ${runtime.sessionId.slice(0, 4)}`;
  setupPresenceChannel();

  const loaded = await loadMemory();
  runtime.adapter = loaded.adapter;
  runtime.memoryFound = loaded.found;
  runtime.memory = {
    ...loaded.memory,
    visits: loaded.memory.visits + 1,
    policy: loaded.found ? loaded.memory.policy ?? "session" : null,
  };

  if (loaded.found) {
    updateStorageLabel(await saveMemory(runtime.memory));
  } else {
    updateStorageLabel(loaded.adapter);
  }

  observeMemoryChanges(() => {
    elements.storageApiLabel.textContent = "COOKIE: SYNCED";
    window.setTimeout(() => updateStorageLabel(), 1_000);
  });

  runtime.ready = true;
  runtime.mode = "intro";
  elements.memoryButtons.forEach((button) => {
    button.disabled = false;
  });
  renderIntro();
  setVisibleScreen("intro");

  const resizeObserver = new ResizeObserver(([entry]) => {
    const width = Math.round(entry.contentRect.width);
    if (width < 240 || Math.abs(width - runtime.boardWidth) < 2) return;
    runtime.boardWidth = width;
    applyStatementLayout();
  });
  resizeObserver.observe(elements.statementBoard);
}

document.addEventListener("pointerdown", (event) => {
  if (event.isPrimary) recordInput("mouse");
}, { capture: true });
document.addEventListener("keydown", handleGlobalKeydown, { capture: true });

elements.memoryButtons.forEach((button) => {
  button.addEventListener("click", () => startGame(button.dataset.memoryPolicy));
});
elements.returnStartButton.addEventListener("click", () => startGame());
elements.rememberButton.addEventListener("click", rememberResultAndRestart);
elements.forgetButton.addEventListener("click", forgetAndReturn);
elements.soundButton.addEventListener("click", () => {
  audio.setEnabled(!audio.enabled);
  updateSoundButton();
});

document.addEventListener("visibilitychange", handleVisibilityChange);
window.addEventListener("online", () => handleEnvironmentChange("네트워크 상태가 온라인으로 바뀌었습니다."));
window.addEventListener("offline", () => handleEnvironmentChange("네트워크 상태가 오프라인으로 바뀌었습니다."));
darkModeQuery.addEventListener("change", () => handleEnvironmentChange("화면 색상 선호가 바뀌었습니다."));
reducedMotionQuery.addEventListener("change", () => handleEnvironmentChange("움직임 선호가 바뀌었습니다."));
window.addEventListener("resize", () => {
  window.clearTimeout(runtime.resizeTimer);
  runtime.resizeTimer = window.setTimeout(() => {
    const nextViewport = window.innerWidth >= 720 ? "wide" : "narrow";
    if (runtime.snapshot && runtime.snapshot.viewport !== nextViewport) {
      handleEnvironmentChange("화면 폭이 바뀌어 문장을 다시 배치했습니다.");
    }
  }, 180);
});

updateSoundButton();
initialize().catch((error) => {
  console.error(error);
  runtime.mode = "intro";
  elements.introHeading.textContent = "초기화에 실패했습니다.";
  elements.introMessage.textContent = "페이지를 새로고침해 주세요. 오류가 계속되면 개발자 콘솔의 메시지를 확인해 주세요.";
  elements.terminalStatus.textContent = "BOOT ERROR";
  setVisibleScreen("intro");
});
