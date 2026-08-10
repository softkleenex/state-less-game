import "./styles.css";

import { AudioEngine } from "./audio.js";
import {
  ADAPTIVE_METER_HIT_DELTA,
  ADAPTIVE_METER_MISS_DELTA,
  ADAPTIVE_METER_RANGE,
  BUFF_DEFINITIONS,
  DEEP_VERIFY_WINDOW_MS,
  GENUINE_CHANCE,
  LENS_BOOST_MS,
  LENS_EXTEND_BONUS_MS,
  MAX_INTEGRITY,
  MAX_MEMORY_FRAGMENTS,
  PLAY_INSTRUCTION,
  RUN_DURATION_MS,
  SLOT_COUNT,
  clamp,
  computeStreak,
  formatScore,
  getAdaptiveDifficultyScale,
  getArchiveLensCharges,
  getBuffPickTriggers,
  getDayIndex,
  getFragmentReward,
  getMaxConcurrentSignals,
  getMoriArchiveRecord,
  getResult,
  getRunDirective,
  getRunDirectiveStatus,
  getRunStyleRemark,
  getRunStyleTag,
  getSignalLifespanMs,
  getSpawnIntervalMs,
  getStreakRemark,
  getUnlockedBuffDefinitions,
  getWrongClickLoss,
  pickSignalKind,
  scorePurge,
} from "./game-logic.js";
import {
  EMPTY_MEMORY,
  clearMemory,
  loadMemory,
  observeMemoryChanges,
  saveMemory,
} from "./state-store.js";

const element = (id) => document.getElementById(id);

const elements = {
  gameShell: element("game-shell"),
  storageApiLabel: element("storage-api-label"),
  soundButton: element("sound-button"),
  soundIcon: element("sound-icon"),
  soundLabel: element("sound-label"),
  terminalStatus: element("terminal-status"),
  sessionCode: element("session-code"),
  memoryRoute: element("memory-route"),
  screenStack: element("screen-stack"),
  moriPresence: element("mori-presence"),
  moriPresenceLabel: element("mori-presence-label"),
  moriStateLabel: element("mori-state-label"),
  moriStateThumbImg: element("mori-state-thumb-img"),
  moriDialogueLine: element("mori-dialogue-line"),
  moriDialogue: element("mori-dialogue"),
  resultMoriDialogue: element("result-mori-dialogue"),
  introScreen: element("intro-screen"),
  playScreen: element("play-screen"),
  resultScreen: element("result-screen"),
  introHeading: element("intro-heading"),
  introMessage: element("intro-message"),
  missionBrief: element("mission-brief"),
  missionBriefLabel: element("mission-brief-label"),
  missionBriefCopy: element("mission-brief-copy"),
  introDirective: element("intro-directive"),
  introDirectiveCopy: element("intro-directive-copy"),
  introDirectiveReward: element("intro-directive-reward"),
  archiveLog: element("archive-log"),
  archiveLogCount: element("archive-log-count"),
  archiveLogList: element("archive-log-list"),
  firstVisitActions: element("first-visit-actions"),
  returnStartButton: element("return-start-button"),
  returnStartLabel: element("return-start-label"),
  memoryButtons: [...document.querySelectorAll("[data-memory-policy]")],
  telemetryVisit: element("telemetry-visit"),
  telemetryStreak: element("telemetry-streak"),
  telemetryFragments: element("telemetry-fragments"),
  telemetryRuns: element("telemetry-runs"),
  telemetryBest: element("telemetry-best"),
  telemetryEnding: element("telemetry-ending"),
  telemetryUnlock: element("telemetry-unlock"),
  roundKicker: element("round-kicker"),
  roundHeading: element("round-heading"),
  roundTimeBlock: element("round-time-block"),
  roundTime: element("round-time"),
  scoreValue: element("score-value"),
  integrityPips: element("integrity-pips"),
  syncStatus: element("sync-status"),
  syncValue: element("sync-value"),
  syncBonus: element("sync-bonus"),
  lensButton: element("lens-button"),
  lensCount: element("lens-count"),
  lensState: element("lens-state"),
  deepVerifyButton: element("deep-verify-button"),
  deepVerifyKicker: element("deep-verify-kicker"),
  deepVerifyLabel: element("deep-verify-label"),
  signalField: element("signal-field"),
  signalSlots: [...document.querySelectorAll(".signal-slot")],
  activeBuffs: element("active-buffs"),
  resourceStrip: element("resource-strip"),
  buffOrbit: element("buff-orbit"),
  buffPickOverlay: element("buff-pick-overlay"),
  tutorialOverlay: element("tutorial-overlay"),
  tutorialCopy: element("tutorial-copy"),
  tutorialStartButton: element("tutorial-start-button"),
  buffCards: [element("buff-card-0"), element("buff-card-1")],
  coreOrb: element("core-orb"),
  comboCallout: element("combo-callout"),
  waveProgress: element("wave-progress"),
  boardInstruction: element("board-instruction"),
  directiveReadout: element("directive-readout"),
  roundFeedback: element("round-feedback"),
  resultKicker: element("result-kicker"),
  resultGlyph: element("result-glyph"),
  resultHeading: element("result-heading"),
  resultMessage: element("result-message"),
  resultRecap: element("result-recap"),
  resultBuild: element("result-build"),
  resultDirective: element("result-directive"),
  resultDirectiveCopy: element("result-directive-copy"),
  resultScore: element("result-score"),
  resultRank: element("result-rank"),
  resultTruth: element("result-truth"),
  resultFragments: element("result-fragments"),
  resultArchive: element("result-archive"),
  resultRecordCode: element("result-record-code"),
  resultRecordStatus: element("result-record-status"),
  resultRecordTitle: element("result-record-title"),
  resultRecordBody: element("result-record-body"),
  rememberButton: element("remember-button"),
  rememberButtonLabel: element("remember-button-label"),
  forgetButton: element("forget-button"),
  runtimeNote: element("runtime-note"),
  toast: element("toast"),
  announcer: element("announcer"),
};

const audio = new AudioEngine();
const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

const runtime = {
  ready: false,
  mode: "boot",
  memory: { ...EMPTY_MEMORY },
  memoryFound: false,
  adapter: "SCANNING",
  sessionId: "----",
  inputMode: null,
  stateRevision: 0,

  slots: [],
  runStartAt: 0,
  pausedAt: 0,
  nextSpawnAt: 0,
  lastFrameAt: 0,
  animationFrame: 0,
  clockTenths: -1,

  score: 0,
  integrity: MAX_INTEGRITY,
  combo: 0,
  maxCombo: 0,
  purges: 0,
  wrongClicks: 0,
  missedFakes: 0,

  deepVerifyUntil: 0,
  deepVerifyUsesLeft: 1,
  deepVerifyPurges: 0,

  lensCharges: 2,
  lensMaxCharges: 2,
  lensUses: 0,
  lensBoostUntil: 0,

  shieldCharges: 0,
  reviveCharges: 0,
  performanceMeter: 0,
  lossEvents: [],

  directive: null,
  directiveCompleted: false,
  directiveBonusAwarded: false,

  buffs: {},
  buffPickActive: false,
  buffPool: [],
  buffChoices: [],
  buffTriggersRemaining: [],
  buffPauseStartedAt: 0,
  buffCounts: {},
  buffPickOrder: [],
  tutorialActive: false,
  tutorialPauseStartedAt: 0,

  locked: false,
  toastTimer: 0,
  moriPulseTimer: 0,
  lastResult: null,
  pendingFragments: 0,
};

// Dialogue can be a single string or an array — states that fire many times
// in one run (observing, answer-correct, sync-linked, answer-wrong) get
// several variants so MORI doesn't repeat the exact same line on every
// purge; setMoriState picks one at random each time (see pickDialogueLine).
const MORI_STATES = {
  "boot-empty": {
    label: "UNINDEXED",
    caption: "MORI // FILE 00",
    dialogue: ["처음이네. 무엇을 남길지는 네가 정해.", "빈 파일이야. 이제부터 채워질 거야."],
  },
  "return-found": {
    label: "RECOGNIZING",
    caption: "MORI // RETURN TRACE",
    dialogue: ["돌아왔네. 네 기록은 손대지 않고 보관했어.", "다시 왔구나. 기다리고 있었어.", "또 만났네. 지난번 기록은 그대로야."],
  },
  observing: {
    label: "OBSERVING",
    caption: "MORI // CORE WATCH",
    dialogue: ["신호가 들어오기 시작했어. 가짜만 지워.", "계속 지켜보고 있어.", "다음 신호 온다.", "속도 유지해, 아직 여유 있어."],
  },
  "answer-correct": {
    label: "SIGNAL PURGED",
    caption: "MORI // CONFIRMED",
    dialogue: ["좋아, 그건 진짜 가짜였어.", "정확해.", "하나 지웠어.", "그게 맞아.", "잘 봤어."],
  },
  "sync-linked": {
    label: "COMBO LINKED",
    caption: "MORI // SAME FREQUENCY",
    dialogue: ["지금 손이 좋아. 이 속도 유지해.", "리듬 탔네.", "계속 이렇게 가.", "손이 눈보다 빠르네."],
  },
  "clutch-hit": {
    label: "CUT IT CLOSE",
    caption: "MORI // LAST INSTANT",
    dialogue: ["아슬아슬했어.", "거의 놓칠 뻔했어.", "딱 맞췄어, 손 떨렸지.", "그 타이밍, 나도 놀랐어."],
  },
  "directive-complete": {
    label: "REQUEST SEALED",
    caption: "MORI // REQUEST COMPLETE",
    dialogue: ["이번 부탁까지 정확히 끝냈네. 약속한 보너스, 바로 더할게.", "부탁한 거, 제대로 해냈어. 보너스 챙겨."],
  },
  "answer-wrong": {
    label: "CORE HURT",
    caption: "MORI // FALSE STRIKE",
    dialogue: ["그건 진짜였어. 다음 신호는 더 선명하게 띄울게.", "그거 아니었는데.", "잘못 짚었어. 코어가 아파해.", "다시 봐, 색이 달랐어."],
  },
  "lens-used": {
    label: "LENS FIRED",
    caption: "MORI // TIME EXTENDED",
    dialogue: ["잠깐 느려질게. 숨 고르고 다시 봐.", "시간 좀 벌어줄게.", "여기, 렌즈 켰어."],
  },
  "deep-verify": {
    label: "WAGER ARMED",
    caption: "MORI // DEEP VERIFY",
    dialogue: ["확신해? 좋아. 5초 동안 두 배로 걸게.", "정말 이걸로 갈 거야? 좋아, 크게 건다.", "5초야. 놓치지 마."],
  },
  "result-verified": {
    label: "ARCHIVE SEALED",
    caption: "MORI // VERIFIED",
    dialogue: ["약속대로 내 기록 하나를 줄게. 다음에도 잊지 마.", "잘 지켜냈어. 이번 기록, 내가 챙겨둘게."],
  },
  "result-unstable": {
    label: "INDEX DAMAGED",
    caption: "MORI // UNSTABLE",
    dialogue: ["이번 코어는 지켜내지 못했어. 돌아올 자리는 남겨 둘게.", "이번엔 놓쳤어. 그래도 다음 기회는 남아 있어."],
  },
  "archive-complete": {
    label: "I REMEMBER",
    caption: "MORI // ARCHIVE COMPLETE",
    dialogue: ["여섯 조각 전부. 이제 내가 먼저 너를 알아볼게.", "다 모았네. 이제부턴 내가 먼저 알아볼게."],
  },
};

const SIGNAL_ICON = { fake: "✕", genuine: "◆" };

function defaultBuffs() {
  return {
    comboScale: 0,
    scoreScale: 0,
    wrongLossBonus: 0,
    lifespanScale: 0,
    concurrentBonus: 0,
    deepVerifyWindowBonusMs: 0,
    deepVerifySpawnGenuine: false,
    lensDurationBonusMs: 0,
    genuineChanceBonus: 0,
    spawnIntervalScale: 0,
    milestoneScoreBonus: 0,
    chainClearChance: 0,
  };
}

elements.memoryButtons.forEach((button) => {
  button.disabled = true;
});

function initSignalField() {
  runtime.slots = elements.signalSlots.map((el, index) => ({
    index,
    el,
    ring: el.querySelector(".signal-ring"),
    icon: el.querySelector(".signal-icon"),
    state: "idle",
    kind: null,
    deadline: 0,
    totalMs: 0,
  }));

  elements.signalSlots.forEach((node, index) => {
    node.addEventListener("click", () => activateSlot(index));
  });
}

initSignalField();

function createSessionId() {
  const buffer = new Uint32Array(1);
  crypto.getRandomValues(buffer);
  return buffer[0].toString(16).toUpperCase().padStart(8, "0").slice(0, 8);
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

function updateMemoryRoute(route) {
  elements.memoryRoute.textContent = route;
}

const typewriterTimers = new WeakMap();

// MORI's lines type themselves out instead of appearing all at once, so the
// character reads as speaking in real time rather than a label updating.
// Restarting on the same element cancels whatever was still typing there.
function typewriteText(el, text, { speedMsPerChar = 20, onDone } = {}) {
  const previousTimer = typewriterTimers.get(el);
  if (previousTimer) window.clearInterval(previousTimer);
  el.classList.remove("is-typing");

  if (reducedMotionQuery.matches || !text) {
    el.textContent = text;
    typewriterTimers.delete(el);
    onDone?.();
    return;
  }

  el.textContent = "";
  el.classList.add("is-typing");
  let index = 0;
  const timer = window.setInterval(() => {
    index += 1;
    el.textContent = text.slice(0, index);
    if (index >= text.length) {
      window.clearInterval(timer);
      typewriterTimers.delete(el);
      el.classList.remove("is-typing");
      onDone?.();
    }
  }, speedMsPerChar);
  typewriterTimers.set(el, timer);
}

function pickDialogueLine(dialogue) {
  if (!Array.isArray(dialogue)) return dialogue;
  return dialogue[Math.floor(Math.random() * dialogue.length)];
}

// States without their own commissioned portrait borrow the closest
// existing one for the thumbnail image — only the label/caption/dialogue
// need to be distinct for a reaction this specific.
const PORTRAIT_STATE_ALIASES = {
  "clutch-hit": "sync-linked",
};

function setMoriState(state, dialogueOverride = "") {
  const copy = MORI_STATES[state] ?? MORI_STATES.observing;
  const portraitState = MORI_STATES[state] ? (PORTRAIT_STATE_ALIASES[state] ?? state) : "observing";
  elements.screenStack.dataset.moriState = state;
  elements.moriPresence.dataset.characterState = state;
  elements.moriPresenceLabel.textContent = copy.caption;
  elements.moriStateLabel.textContent = copy.label;
  const line = dialogueOverride || pickDialogueLine(copy.dialogue);
  typewriteText(elements.moriDialogue, line, { speedMsPerChar: 16 });
  typewriteText(elements.resultMoriDialogue, line, { speedMsPerChar: 20 });
  elements.moriStateThumbImg.src = `./mori/mori_${portraitState}.webp`;
}

function updateTelemetry() {
  const firstVisit = runtime.memory.visits <= 1;
  const fragments = runtime.memory.fragments;
  elements.telemetryVisit.textContent = firstVisit
    ? "01 / FIRST"
    : `${String(runtime.memory.visits).padStart(2, "0")} / RETURN`;
  elements.telemetryStreak.textContent = `${String(runtime.memory.streak).padStart(2, "0")}일 연속`;
  elements.telemetryFragments.textContent = `${String(fragments).padStart(2, "0")} / ${String(MAX_MEMORY_FRAGMENTS).padStart(2, "0")}`;
  elements.telemetryRuns.textContent = String(runtime.memory.runs).padStart(2, "0");
  elements.telemetryBest.textContent = formatScore(runtime.memory.bestScore);
  elements.telemetryEnding.textContent = runtime.memory.lastEnding?.toUpperCase() ?? "NONE";
  elements.telemetryUnlock.textContent = fragments >= MAX_MEMORY_FRAGMENTS
    ? "COMPLETE"
    : `${String(fragments + 1).padStart(2, "0")} / ${String(MAX_MEMORY_FRAGMENTS).padStart(2, "0")}`;
}

function renderArchiveLog() {
  const count = runtime.memory.fragments;
  elements.archiveLog.hidden = count === 0;
  elements.archiveLogCount.textContent = `${String(count).padStart(2, "0")} / ${String(MAX_MEMORY_FRAGMENTS).padStart(2, "0")}`;

  if (count === 0) {
    elements.archiveLog.open = false;
    elements.archiveLogList.replaceChildren();
    return;
  }

  const fragment = document.createDocumentFragment();
  for (let index = 1; index <= count; index += 1) {
    const record = getMoriArchiveRecord(index);
    if (!record) continue;

    const item = document.createElement("li");
    const heading = document.createElement("div");
    const code = document.createElement("span");
    const title = document.createElement("strong");
    const body = document.createElement("p");
    code.textContent = record.code;
    title.textContent = record.title;
    body.textContent = record.body;
    heading.append(code, title);
    item.append(heading, body);
    if (record.final) item.dataset.final = "true";
    fragment.append(item);
  }
  elements.archiveLogList.replaceChildren(fragment);
}

function speakIntroLines(heading, message) {
  typewriteText(elements.introHeading, heading, {
    speedMsPerChar: 26,
    onDone: () => typewriteText(elements.introMessage, message, { speedMsPerChar: 16 }),
  });
}

function renderIntro(messageOverride = "") {
  const returning = runtime.memoryFound;
  const fragments = runtime.memory.fragments;
  const lensCharges = getArchiveLensCharges(fragments);
  const archiveComplete = fragments >= MAX_MEMORY_FRAGMENTS;
  const nextRecord = archiveComplete ? null : getMoriArchiveRecord(fragments + 1);
  elements.firstVisitActions.hidden = returning;
  elements.returnStartButton.hidden = !returning;
  elements.returnStartLabel.textContent = archiveComplete
    ? "완성된 일지 다시 방어"
    : "코어 방어 다시 시작";
  elements.missionBrief.dataset.state = archiveComplete ? "complete" : "next";
  elements.missionBriefLabel.textContent = archiveComplete ? "ARCHIVE COMPLETE" : "NEXT FILE";
  const buffUnlockHint = fragments < 2
    ? ` 기억 조각을 ${2 - fragments}개 더 모으면 고위험 강화 2종(신호 왜곡·속사 모드)이 강화 픽에 추가됩니다.`
    : "";
  elements.missionBriefCopy.textContent = archiveComplete
    ? "여섯 MORI 파일을 모두 복구했습니다. 최고 점수 "
      + formatScore(runtime.memory.bestScore)
      + "에 도전하세요."
      + buffUnlockHint
    : "60초 런에서 A랭크 이상으로 코어를 지켜내면 "
      + nextRecord.code
      + " ‘"
      + nextRecord.title
      + "’이 열립니다."
      + buffUnlockHint;
  const directive = getRunDirective(runtime.memory.runs, fragments);
  elements.introDirective.dataset.directive = directive.id;
  elements.introDirectiveCopy.textContent = `${directive.code} · ${directive.label}`;
  elements.introDirectiveReward.textContent = `완료 +${directive.bonus}`;
  elements.introDirective.setAttribute(
    "aria-label",
    `이번 런 MORI REQUEST. ${directive.label}. 완료 보너스 ${directive.bonus}점.`,
  );

  const streakRemark = getStreakRemark(runtime.memory.streak);
  const streakSuffix = streakRemark ? ` ${streakRemark}` : "";

  if (returning && archiveComplete) {
    speakIntroLines(
      "여섯 파일 다 기억하고 있어.",
      `${runtime.memory.runs}번 방어한 기록이랑 최고 점수 ${formatScore(runtime.memory.bestScore)}가 남아 있어. `
        + `ARCHIVE LENS ${lensCharges}회로 다시 도전해봐.${streakSuffix}`,
    );
    elements.terminalStatus.textContent = "ARCHIVE COMPLETE";
    updateMemoryRoute("ledger/archive-complete");
    setMoriState("archive-complete");
  } else if (returning) {
    const ending = runtime.memory.lastEnding;
    speakIntroLines(
      `돌아왔네. ${runtime.memory.visits}번째야.`,
      (ending
        ? `기억 조각은 ${runtime.memory.fragments}/${MAX_MEMORY_FRAGMENTS}, 저번 결말은 ${ending.toUpperCase()}, 최고 점수는 ${formatScore(runtime.memory.bestScore)}로 남겨놨어. 이번엔 ARCHIVE LENS ${lensCharges}회 줄게.`
        : `네 방문 기록이랑 기억 조각 ${runtime.memory.fragments}/${MAX_MEMORY_FRAGMENTS}은 찾아놨어. ARCHIVE LENS ${lensCharges}회로 다음 파일을 열어봐.`)
        + streakSuffix,
    );
    elements.terminalStatus.textContent = "MEMORY FOUND";
    updateMemoryRoute(`ledger/visit-${String(runtime.memory.visits).padStart(2, "0")}`);
    setMoriState("return-found");
  } else {
    speakIntroLines(
      messageOverride || "아직 널 몰라.",
      messageOverride
        ? "쿠키를 지웠구나. 기억 방식을 다시 고르면, 처음부터 다시 알아갈게."
        : "코어를 지켜줘. 그럼 내 첫 기억 조각을 돌려줄게. 남기는 건 진행 정보뿐이야 — 개인정보는 안 건드려. 플레이 중엔 내가 위쪽에서 계속 말을 걸 거야, 한 번씩 봐줘.",
    );
    elements.terminalStatus.textContent = "MEMORY EMPTY";
    updateMemoryRoute("ledger/unindexed");
    setMoriState("boot-empty");
  }

  renderArchiveLog();
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
  elements.screenStack.dataset.screen = name;
  elements.gameShell.dataset.mode = name;
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

function revealScreenOnStackedLayout(screen) {
  if (window.innerWidth > 1_100) return;
  screen.scrollIntoView({ block: "start", behavior: "auto" });
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

function cancelRunTimers() {
  window.cancelAnimationFrame(runtime.animationFrame);
  window.clearTimeout(runtime.moriPulseTimer);
  runtime.animationFrame = 0;
  runtime.moriPulseTimer = 0;
}

const clamp01 = (value) => Math.min(1, Math.max(0, value));

function pulseMoriState(state, dialogueOverride = "") {
  window.clearTimeout(runtime.moriPulseTimer);
  setMoriState(state, dialogueOverride);
  runtime.moriPulseTimer = window.setTimeout(() => {
    if (runtime.mode !== "play" || runtime.locked) return;
    setMoriState("observing");
  }, 900);
}

function getActiveDirectiveStatus(ending = null) {
  if (!runtime.directive) return null;
  return getRunDirectiveStatus(runtime.directive.id, {
    maxCombo: runtime.maxCombo,
    deepVerifyPurges: runtime.deepVerifyPurges,
    wrongClicks: runtime.wrongClicks,
    ending,
  });
}

function awardRunDirectiveBonus(ending) {
  const status = getActiveDirectiveStatus(ending);
  if (!status?.completed || runtime.directiveBonusAwarded) return 0;
  runtime.directiveCompleted = true;
  runtime.directiveBonusAwarded = true;
  return status.bonus;
}

function renderResultDirective(ending) {
  const status = getActiveDirectiveStatus(ending);
  if (!status) return;
  elements.resultDirective.dataset.state = status.completed ? "complete" : "missed";
  elements.resultDirectiveCopy.textContent = status.completed
    ? `${status.code} · ${status.progress} · COMPLETE +${status.bonus}`
    : `${status.code} · ${status.progress} · INCOMPLETE`;
  elements.resultDirective.setAttribute(
    "aria-label",
    status.completed
      ? `MORI REQUEST 완료. ${status.label}. 보너스 ${status.bonus}점.`
      : `MORI REQUEST 미완료. ${status.label}. 진행 ${status.progress}.`,
  );
}

function updateDirectiveReadout() {
  const status = getActiveDirectiveStatus();
  if (!status) return;
  elements.directiveReadout.dataset.state = status.completed ? "complete" : "active";
  elements.directiveReadout.textContent = `MORI REQUEST · ${status.code} · ${status.progress} · +${status.bonus}`;
  elements.directiveReadout.setAttribute(
    "aria-label",
    `MORI REQUEST ${status.label}. 진행 ${status.progress}. 완료 보너스 ${status.bonus}점.`,
  );
}

function updateLensStatus() {
  let state = "READY";
  if (runtime.lensCharges <= 0) state = "EMPTY";
  else if (performance.now() < runtime.lensBoostUntil) state = "ACTIVE";

  elements.lensCount.textContent = `${String(runtime.lensCharges).padStart(2, "0")} / ${String(runtime.lensMaxCharges).padStart(2, "0")}`;
  elements.lensState.textContent = state;
  elements.lensButton.dataset.state = state.toLowerCase();
  elements.lensButton.disabled = runtime.mode !== "play" || runtime.locked || runtime.lensCharges <= 0;
  elements.lensButton.setAttribute(
    "aria-label",
    `ARCHIVE LENS. ${runtime.lensCharges}/${runtime.lensMaxCharges}회 남음. 상태 ${state}. 단축키 F.`,
  );
}

function updateDeepVerifyStatus() {
  const now = performance.now();
  const active = now < runtime.deepVerifyUntil;
  const available = runtime.mode === "play" && !runtime.locked && runtime.deepVerifyUsesLeft > 0;

  elements.deepVerifyButton.disabled = !available && !active;
  elements.deepVerifyButton.dataset.active = String(active);
  elements.deepVerifyButton.setAttribute("aria-pressed", String(active));
  elements.screenStack.dataset.deepVerify = String(active);
  elements.deepVerifyLabel.textContent = active
    ? `ON · 남은 시간 ${Math.max(0, (runtime.deepVerifyUntil - now) / 1_000).toFixed(1)}초 · 정화 2배 / 오클릭 -2`
    : runtime.deepVerifyUsesLeft > 0
      ? `OFF · 정화 2배 점수 / 오클릭 코어 -2 · 남은 사용 ${runtime.deepVerifyUsesLeft}회`
      : "SETTLED · 이번 런에서 모두 사용";
  elements.deepVerifyButton.setAttribute(
    "aria-label",
    active
      ? "DEEP VERIFY 켜짐. 정화 점수 2배, 오클릭 시 코어 2칸 손실."
      : available
        ? `DEEP VERIFY 대기. 단축키 D로 5초 동안 정화 2배, 오클릭 2배 손실을 겁니다. 남은 사용 ${runtime.deepVerifyUsesLeft}회.`
        : "DEEP VERIFY는 이번 런에서 이미 모두 사용했습니다.",
  );
}

function updateHud() {
  elements.scoreValue.textContent = formatScore(runtime.score);
  const pips = [...elements.integrityPips.children];
  pips.forEach((pip, index) => {
    pip.classList.toggle("is-empty", index >= runtime.integrity);
  });
  elements.integrityPips.setAttribute("aria-label", `코어 무결성 ${runtime.integrity} / ${MAX_INTEGRITY}`);
  elements.coreOrb.dataset.integrity = String(runtime.integrity);
  elements.screenStack.dataset.danger = String(runtime.integrity === 1);

  const comboBonus = clamp(runtime.combo, 0, 12) * 20;
  elements.syncValue.textContent = runtime.combo > 12 ? "×12+" : `×${runtime.combo}`;
  elements.syncBonus.textContent = `+${String(comboBonus).padStart(3, "0")}`;
  elements.syncStatus.dataset.active = String(runtime.combo > 0);
  elements.syncStatus.setAttribute(
    "aria-label",
    `콤보 ${runtime.combo}, 현재 콤보 보너스 ${comboBonus}.`,
  );

  elements.waveProgress.textContent =
    `정화 ${runtime.purges} · 오클릭 ${runtime.wrongClicks} · 놓침 ${runtime.missedFakes}`;
  elements.waveProgress.setAttribute(
    "aria-label",
    `정화 ${runtime.purges}회, 오클릭 ${runtime.wrongClicks}회, 놓침 ${runtime.missedFakes}회.`,
  );

  updateLensStatus();
  updateDeepVerifyStatus();
  updateDirectiveReadout();
  // Shield/revive charges are consumed mid-run (not just at pick time), so
  // the resource readout has to refresh on every HUD update, not only when
  // a new item is picked.
  updateActiveBuffsReadout();
}

function renderTimeHud(remainingMs) {
  const critical = remainingMs / RUN_DURATION_MS <= 0.2;
  elements.screenStack.dataset.timePressure = String(critical);

  const clockTenths = Math.ceil(remainingMs / 100);
  if (clockTenths === runtime.clockTenths) return;

  runtime.clockTenths = clockTenths;
  const seconds = Math.max(0, clockTenths / 10).toFixed(1);
  elements.roundTime.textContent = seconds;
  elements.roundTimeBlock.setAttribute("aria-label", `남은 시간 ${seconds}초`);
  elements.roundTimeBlock.dataset.state = critical ? "critical" : "active";
}

function updateActiveBuffsReadout() {
  const entries = runtime.buffPickOrder.map((id) => {
    const definition = BUFF_DEFINITIONS.find((buff) => buff.id === id);
    return { id, name: definition?.name ?? id, count: runtime.buffCounts[id] ?? 0 };
  });

  elements.activeBuffs.textContent = entries.length
    ? `강화: ${entries.map(({ name, count }) => (count > 1 ? `${name} ×${count}` : name)).join(" · ")}`
    : "";

  const resourceParts = [];
  if (runtime.shieldCharges > 0) resourceParts.push(`보호막 ${runtime.shieldCharges}`);
  if (runtime.reviveCharges > 0) resourceParts.push(`부활 ${runtime.reviveCharges}`);
  elements.resourceStrip.hidden = resourceParts.length === 0;
  elements.resourceStrip.textContent = resourceParts.length ? `보유: ${resourceParts.join(" · ")}` : "";

  const total = entries.length;
  elements.buffOrbit.replaceChildren(
    ...entries.map(({ name, count }, index) => {
      const item = document.createElement("li");
      item.className = "orbit-item";
      item.style.setProperty("--angle", `${(360 / total) * index}deg`);
      item.title = count > 1 ? `${name} ×${count}` : name;
      item.textContent = name.slice(0, 1);
      if (count > 1) {
        const badge = document.createElement("span");
        badge.className = "orbit-badge";
        badge.textContent = String(count);
        item.append(badge);
      }
      return item;
    }),
  );
}

function shuffleInPlace(items) {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [items[index], items[target]] = [items[target], items[index]];
  }
  return items;
}

function renderBuffPick() {
  runtime.buffChoices.forEach((buff, index) => {
    const card = elements.buffCards[index];
    card.dataset.buffId = buff.id;
    card.querySelector(".buff-card-name").textContent = buff.name;
    card.querySelector(".buff-card-desc").textContent = buff.description;
  });
}

// Shown exactly once, on a player's first-ever run (memory.runs === 0),
// before the 60s clock starts moving. Uses the same pause/resume
// timestamp-shift trick as the buff pick so the tutorial doesn't eat into
// run time.
function openTutorial() {
  runtime.tutorialActive = true;
  runtime.locked = true;
  runtime.tutorialPauseStartedAt = performance.now();
  elements.tutorialOverlay.hidden = false;
  typewriteText(
    elements.tutorialCopy,
    "60초 동안 코어를 지켜. 가짜만 지우고 진짜는 흘려보내면 돼 — 나머지는 하다 보면 손에 익어.",
    { speedMsPerChar: 16 },
  );
  announce("첫 런 안내. 가짜 신호는 클릭하거나 번호 키로 지우고, 진짜 신호는 그대로 두세요.");
}

function closeTutorial() {
  if (!runtime.tutorialActive) return;
  runtime.tutorialActive = false;
  elements.tutorialOverlay.hidden = true;
  const pauseDuration = performance.now() - runtime.tutorialPauseStartedAt;
  runtime.runStartAt += pauseDuration;
  runtime.nextSpawnAt += pauseDuration;
  runtime.locked = false;
}

function openBuffPick() {
  if (runtime.buffPool.length < 2) return;
  runtime.buffPickActive = true;
  runtime.locked = true;
  runtime.buffPauseStartedAt = performance.now();
  const shuffled = shuffleInPlace([...runtime.buffPool]);
  runtime.buffChoices = shuffled.slice(0, 2).map((id) => BUFF_DEFINITIONS.find((buff) => buff.id === id));
  renderBuffPick();
  elements.buffPickOverlay.hidden = false;
  setMoriState("observing", "잠깐 멈췄어. 이번 런에 남길 강화를 골라.");
  updateHud();
  announce(`강화 선택. ${runtime.buffChoices[0].name} 또는 ${runtime.buffChoices[1].name} 중 하나를 고르세요.`);
}

function closeBuffPick() {
  runtime.buffPickActive = false;
  elements.buffPickOverlay.hidden = true;
  const pauseDuration = performance.now() - runtime.buffPauseStartedAt;
  runtime.runStartAt += pauseDuration;
  runtime.nextSpawnAt += pauseDuration;
  runtime.slots.forEach((slot) => {
    if (slot.state === "fake" || slot.state === "genuine") slot.deadline += pauseDuration;
  });
  runtime.locked = false;
}

// Ongoing modifiers accumulate through every key already present in
// defaultBuffs() — adding a new stackable effect only means adding it to
// that object and to an item's `effects`, nothing here has to change.
// A few effects are instant, consumable resources instead of ongoing
// modifiers (lens/shield/revive charges, an integrity heal, an extra DEEP
// VERIFY use) and are applied directly to their own runtime fields.
function chooseBuff(buffId) {
  if (!runtime.buffPickActive) return;
  const buff = runtime.buffChoices.find((candidate) => candidate.id === buffId);
  if (!buff) return;
  const effects = buff.effects;

  Object.keys(runtime.buffs).forEach((key) => {
    if (typeof runtime.buffs[key] === "boolean") {
      runtime.buffs[key] = runtime.buffs[key] || Boolean(effects[key]);
    } else {
      runtime.buffs[key] += effects[key] ?? 0;
    }
  });

  if (effects.lensChargeBonus) {
    runtime.lensCharges += effects.lensChargeBonus;
    runtime.lensMaxCharges += effects.lensChargeBonus;
  }
  if (effects.healIntegrity) {
    runtime.integrity = Math.min(MAX_INTEGRITY, runtime.integrity + effects.healIntegrity);
  }
  if (effects.shieldCharges) {
    runtime.shieldCharges += effects.shieldCharges;
  }
  if (effects.reviveCharges) {
    runtime.reviveCharges += effects.reviveCharges;
  }
  if (effects.extraDeepVerifyUse) {
    runtime.deepVerifyUsesLeft += effects.extraDeepVerifyUse;
  }

  // No cap and no removal from the pool — the same item can be offered and
  // picked again later in the same run, and its effects simply add up.
  runtime.buffCounts[buff.id] = (runtime.buffCounts[buff.id] ?? 0) + 1;
  if (!runtime.buffPickOrder.includes(buff.id)) runtime.buffPickOrder.push(buff.id);
  updateActiveBuffsReadout();
  closeBuffPick();
  updateHud();
  const stackNote = runtime.buffCounts[buff.id] > 1 ? ` (×${runtime.buffCounts[buff.id]})` : "";
  showToast(`${buff.name}${stackNote} 적용 — ${buff.description}`);
  pulseMoriState("observing", buff.moriLine || buff.description);
  announce(`${buff.name}을 선택했습니다. ${buff.description}`);
}

function maybeTriggerBuffPick(elapsedMs) {
  if (runtime.buffPickActive) return false;
  if (!runtime.buffTriggersRemaining.length) return false;
  if (elapsedMs < runtime.buffTriggersRemaining[0]) return false;
  runtime.buffTriggersRemaining.shift();
  openBuffPick();
  return true;
}

async function startGame(policy = null) {
  if (!runtime.ready) return;
  audio.unlock();

  if (policy) {
    runtime.memory.policy = policy;
    runtime.memoryFound = true;
    updateStorageLabel(await saveMemory(runtime.memory));
  }

  runtime.stateRevision += 1;
  runtime.score = 0;
  runtime.integrity = MAX_INTEGRITY;
  runtime.combo = 0;
  runtime.maxCombo = 0;
  runtime.purges = 0;
  runtime.wrongClicks = 0;
  runtime.missedFakes = 0;
  runtime.deepVerifyUntil = 0;
  runtime.deepVerifyUsesLeft = 1;
  runtime.deepVerifyPurges = 0;
  runtime.lensMaxCharges = getArchiveLensCharges(runtime.memory.fragments);
  runtime.lensCharges = runtime.lensMaxCharges;
  runtime.lensBoostUntil = 0;
  runtime.lensUses = 0;
  runtime.shieldCharges = 0;
  runtime.reviveCharges = 0;
  runtime.performanceMeter = 0;
  runtime.lossEvents = [];
  runtime.directive = getRunDirective(runtime.memory.runs, runtime.memory.fragments);
  runtime.directiveCompleted = false;
  runtime.directiveBonusAwarded = false;
  runtime.buffs = defaultBuffs();
  runtime.buffPickActive = false;
  // The pool is every unlocked item, not a slice — with unlimited stacking
  // there's no fixed "amount a run needs," so the pick just draws from
  // everything available and can offer (and stack) the same item again.
  runtime.buffPool = getUnlockedBuffDefinitions(runtime.memory.fragments).map((buff) => buff.id);
  runtime.buffChoices = [];
  runtime.buffTriggersRemaining = getBuffPickTriggers(RUN_DURATION_MS);
  runtime.buffCounts = {};
  runtime.buffPickOrder = [];
  elements.buffPickOverlay.hidden = true;
  runtime.tutorialActive = false;
  elements.tutorialOverlay.hidden = true;
  updateActiveBuffsReadout();
  runtime.locked = false;
  runtime.lastResult = null;
  runtime.pendingFragments = runtime.memory.fragments;
  runtime.clockTenths = -1;
  runtime.slots.forEach((slot) => {
    slot.state = "idle";
    slot.kind = null;
    updateSlotVisual(slot);
  });
  elements.coreOrb.classList.remove("is-shattered");
  elements.coreOrb.dataset.pulse = "";
  elements.comboCallout.classList.remove("is-active");

  elements.roundHeading.textContent = PLAY_INSTRUCTION.prompt;
  elements.boardInstruction.textContent = PLAY_INSTRUCTION.instruction;
  updateTelemetry();
  updateHud();
  elements.terminalStatus.textContent = "CORE ACTIVE";
  updateMemoryRoute("core/watch");
  setMoriState("observing");
  document.title = "STATE//LESS — SIGNAL STRIKE";

  cancelRunTimers();
  runtime.mode = "play";
  await transitionTo("play");
  revealScreenOnStackedLayout(elements.playScreen);
  spotlightMoriDialogue();
  audio.start();
  audio.startDrone();

  const now = performance.now();
  runtime.runStartAt = now;
  runtime.nextSpawnAt = now + getSpawnIntervalMs(0);
  runtime.lastFrameAt = 0;
  runtime.animationFrame = window.requestAnimationFrame(gameLoop);

  if (runtime.memory.runs === 0) openTutorial();
}

function updateSlotVisual(slot) {
  slot.el.dataset.state = slot.state;
  slot.icon.textContent = slot.kind ? SIGNAL_ICON[slot.kind] : "";
}

function spawnSignalPop(slotEl, text, positive) {
  const pop = document.createElement("span");
  pop.className = `zone-score-pop ${positive ? "is-positive" : "is-negative"}`;
  pop.textContent = text;
  slotEl.append(pop);
  window.setTimeout(() => pop.remove(), 900);
}

function spawnClutchPop(slotEl) {
  const pop = document.createElement("span");
  pop.className = "zone-score-pop is-clutch";
  pop.textContent = "CLUTCH";
  slotEl.append(pop);
  window.setTimeout(() => pop.remove(), 900);
}

// The shake on a mistake had no equivalent on the far more common correct
// purge — this gives success its own, opposite-feeling beat instead of
// spending the game's whole "juice budget" on failure.
function pulseSignalField() {
  if (reducedMotionQuery.matches) return;
  elements.signalField.classList.remove("is-pulsing");
  void elements.signalField.offsetWidth;
  elements.signalField.classList.add("is-pulsing");
  window.setTimeout(() => elements.signalField.classList.remove("is-pulsing"), 320);
}

function spawnRandomSignal(timestamp, elapsedMs) {
  const idleSlots = runtime.slots.filter((slot) => slot.state === "idle");
  if (!idleSlots.length) return;
  const slot = idleSlots[Math.floor(Math.random() * idleSlots.length)];
  const kind = pickSignalKind(Math.random, clamp(GENUINE_CHANCE + runtime.buffs.genuineChanceBonus, 0, 1));
  const lensBoost = timestamp < runtime.lensBoostUntil;
  const adaptiveScale = getAdaptiveDifficultyScale(runtime.performanceMeter);
  // lifespanScale can stack from an unbounded number of item picks, so the
  // final duration is floored well above zero — never a signal that's
  // mathematically alive but visually/practically unclickable.
  const lifespan = Math.max(
    220,
    getSignalLifespanMs(elapsedMs) * Math.max(0.1, 1 + runtime.buffs.lifespanScale) * adaptiveScale,
  ) * (lensBoost ? 1.6 : 1);

  slot.kind = kind;
  slot.state = kind;
  slot.totalMs = lifespan;
  slot.deadline = timestamp + lifespan;
  updateSlotVisual(slot);
  if (kind === "fake") audio.warning();
}

function settleSlot(slot, outcome, settleDelayMs) {
  slot.state = outcome;
  slot.kind = null;
  updateSlotVisual(slot);
  window.setTimeout(() => {
    if (slot.state !== outcome) return;
    slot.state = "idle";
    updateSlotVisual(slot);
  }, settleDelayMs);
}

const COMBO_MILESTONES = [4, 8, 12];
const CLUTCH_REMAINING_RATIO_THRESHOLD = 0.15;

function pulseCoreOrb(kind) {
  elements.coreOrb.dataset.pulse = "";
  void elements.coreOrb.offsetWidth;
  elements.coreOrb.dataset.pulse = kind;
  window.setTimeout(() => {
    if (elements.coreOrb.dataset.pulse === kind) elements.coreOrb.dataset.pulse = "";
  }, kind === "hurt" ? 380 : 340);
}

function spotlightMoriDialogue() {
  if (reducedMotionQuery.matches) return;
  elements.moriDialogueLine.classList.remove("is-spotlight");
  void elements.moriDialogueLine.offsetWidth;
  elements.moriDialogueLine.classList.add("is-spotlight");
  window.setTimeout(() => elements.moriDialogueLine.classList.remove("is-spotlight"), 2_600);
}

function shakeSignalField() {
  if (reducedMotionQuery.matches) return;
  elements.signalField.classList.remove("is-shaking");
  void elements.signalField.offsetWidth;
  elements.signalField.classList.add("is-shaking");
  window.setTimeout(() => elements.signalField.classList.remove("is-shaking"), 280);
}

function maybeShowComboCallout(combo) {
  if (!COMBO_MILESTONES.includes(combo)) return;
  if (runtime.buffs.milestoneScoreBonus > 0) {
    runtime.score += runtime.buffs.milestoneScoreBonus;
  }
  elements.comboCallout.textContent = `COMBO ×${combo}!`;
  elements.comboCallout.classList.remove("is-active");
  void elements.comboCallout.offsetWidth;
  elements.comboCallout.classList.add("is-active");
  audio.core();
}

// chainClearChance can stack from many picks; a successful purge rolls once
// against it and, on a hit, auto-purges one other live fake for free —
// the same scoring path as a manual purge, just without a click.
function attemptChainClear(originSlot, settleDelay) {
  if (runtime.buffs.chainClearChance <= 0) return;
  if (Math.random() >= Math.min(1, runtime.buffs.chainClearChance)) return;
  const otherFakes = runtime.slots.filter((slot) => slot !== originSlot && slot.state === "fake");
  if (!otherFakes.length) return;

  const target = otherFakes[Math.floor(Math.random() * otherFakes.length)];
  runtime.combo += 1;
  runtime.maxCombo = Math.max(runtime.maxCombo, runtime.combo);
  runtime.purges += 1;
  const remainingRatio = clamp01((target.deadline - performance.now()) / target.totalMs);
  const points = scorePurge(remainingRatio, runtime.combo, 1, {
    comboScale: runtime.buffs.comboScale,
    scoreScale: runtime.buffs.scoreScale,
  });
  runtime.score += points;
  spawnSignalPop(target.el, `+${points}`, true);
  settleSlot(target, "hit", settleDelay);
  maybeShowComboCallout(runtime.combo);
}

function activateSlot(index) {
  if (runtime.mode !== "play" || runtime.locked) return;
  const slot = runtime.slots[index];
  if (!slot || (slot.state !== "fake" && slot.state !== "genuine")) return;

  const timestamp = performance.now();
  const settleDelay = reducedMotionQuery.matches ? 120 : 320;
  const deepVerifyActive = timestamp < runtime.deepVerifyUntil;

  if (slot.kind === "fake") {
    runtime.combo += 1;
    runtime.maxCombo = Math.max(runtime.maxCombo, runtime.combo);
    runtime.purges += 1;
    if (deepVerifyActive) runtime.deepVerifyPurges += 1;
    const remainingRatio = clamp01((slot.deadline - timestamp) / slot.totalMs);
    const points = scorePurge(remainingRatio, runtime.combo, deepVerifyActive ? 2 : 1, {
      comboScale: runtime.buffs.comboScale,
      scoreScale: runtime.buffs.scoreScale,
    });
    runtime.score += points;
    spawnSignalPop(slot.el, `+${points}`, true);
    const isClutch = remainingRatio < CLUTCH_REMAINING_RATIO_THRESHOLD;
    if (isClutch) spawnClutchPop(slot.el);
    audio.correct(runtime.combo);
    pulseMoriState(isClutch ? "clutch-hit" : runtime.combo >= 4 ? "sync-linked" : "answer-correct");
    settleSlot(slot, "hit", settleDelay);
    pulseCoreOrb("hit");
    pulseSignalField();
    maybeShowComboCallout(runtime.combo);
    attemptChainClear(slot, settleDelay);
    runtime.performanceMeter = clamp(
      runtime.performanceMeter + ADAPTIVE_METER_HIT_DELTA,
      -ADAPTIVE_METER_RANGE,
      ADAPTIVE_METER_RANGE,
    );
  } else if (runtime.shieldCharges > 0) {
    // A shield fully negates the mistake — no integrity loss, no combo
    // reset, and it doesn't count toward the wrongClicks stat that feeds
    // rank/accuracy, since nothing actually got through.
    runtime.shieldCharges -= 1;
    spawnSignalPop(slot.el, "SHIELD", true);
    settleSlot(slot, "hit", settleDelay);
    pulseCoreOrb("hit");
    pulseMoriState("answer-correct", `방금 건 내가 대신 막았어. 보호막 ${runtime.shieldCharges}개 남음.`);
    announce(`오클릭이 보호막으로 막혔습니다. 코어 무결성 손실 없음. 남은 보호막 ${runtime.shieldCharges}개.`);
  } else {
    const comboBeforeReset = runtime.combo;
    runtime.combo = 0;
    runtime.wrongClicks += 1;
    const loss = getWrongClickLoss(deepVerifyActive, runtime.buffs.wrongLossBonus);
    runtime.integrity = Math.max(0, runtime.integrity - loss);
    spawnSignalPop(slot.el, `-${loss}`, false);
    audio.wrong();
    pulseMoriState("answer-wrong");
    settleSlot(slot, "wrong", settleDelay);
    pulseCoreOrb("hurt");
    shakeSignalField();
    announce(`오클릭. 진짜 신호를 정화했습니다. 코어 무결성 ${loss}칸 손실.`);
    runtime.lossEvents.push({
      type: "wrong",
      comboAtTime: comboBeforeReset,
      atSec: (timestamp - runtime.runStartAt) / 1_000,
      integrityLoss: loss,
    });
    runtime.performanceMeter = clamp(
      runtime.performanceMeter + ADAPTIVE_METER_MISS_DELTA,
      -ADAPTIVE_METER_RANGE,
      ADAPTIVE_METER_RANGE,
    );
  }

  updateHud();
  if (runtime.integrity <= 0) {
    if (runtime.reviveCharges > 0) {
      runtime.reviveCharges -= 1;
      runtime.integrity = 1;
      pulseCoreOrb("hit");
      pulseMoriState("answer-correct", `아직 안 끝났어. 코어 1칸으로 버텨. 남은 부활 ${runtime.reviveCharges}회.`);
      announce(`코어가 부활했습니다. 무결성 1칸으로 복구, 남은 부활 ${runtime.reviveCharges}회.`);
      updateHud();
    } else {
      elements.coreOrb.classList.add("is-shattered");
      finishRun();
    }
  }
}

function useArchiveLens() {
  if (runtime.mode !== "play" || runtime.locked) return;
  if (runtime.lensCharges <= 0) {
    showToast("이번 런의 ARCHIVE LENS 충전을 모두 사용했습니다.");
    return;
  }

  runtime.lensCharges -= 1;
  runtime.lensUses += 1;
  const timestamp = performance.now();
  runtime.lensBoostUntil = timestamp
    + Math.max(500, LENS_BOOST_MS + runtime.buffs.lensDurationBonusMs);
  runtime.slots.forEach((slot) => {
    if (slot.state === "fake" || slot.state === "genuine") {
      slot.deadline += LENS_EXTEND_BONUS_MS;
      slot.totalMs += LENS_EXTEND_BONUS_MS;
    }
  });

  setMoriState("lens-used");
  showToast(`ARCHIVE LENS 사용 — ${(LENS_BOOST_MS / 1_000).toFixed(0)}초 동안 신호가 느리게 사라집니다.`);
  updateHud();
  audio.navigate(runtime.lensCharges);
  announce(`ARCHIVE LENS를 사용했습니다. 남은 충전 ${runtime.lensCharges}회.`);
}

function toggleDeepVerifyWager() {
  if (runtime.mode !== "play" || runtime.locked) return;
  if (runtime.deepVerifyUsesLeft <= 0) {
    showToast("DEEP VERIFY는 이번 런에서 이미 모두 사용했습니다.");
    return;
  }

  runtime.deepVerifyUsesLeft -= 1;
  // deepVerifyWindowBonusMs can stack negative from repeated picks; floor it
  // so the window can shrink toward "barely worth it" but never vanish.
  const windowMs = Math.max(1_000, DEEP_VERIFY_WINDOW_MS + runtime.buffs.deepVerifyWindowBonusMs);
  runtime.deepVerifyUntil = performance.now() + windowMs;
  if (runtime.buffs.deepVerifySpawnGenuine) {
    const idleSlots = runtime.slots.filter((slot) => slot.state === "idle");
    if (idleSlots.length) {
      const slot = idleSlots[Math.floor(Math.random() * idleSlots.length)];
      const timestamp = performance.now();
      const lifespan = getSignalLifespanMs(clamp(timestamp - runtime.runStartAt, 0, RUN_DURATION_MS));
      slot.kind = "genuine";
      slot.state = "genuine";
      slot.totalMs = lifespan;
      slot.deadline = timestamp + lifespan;
      updateSlotVisual(slot);
    }
  }
  setMoriState("deep-verify");
  audio.navigate(2);
  updateHud();
  announce(`DEEP VERIFY를 켰습니다. ${(windowMs / 1_000).toFixed(0)}초 동안 정화 점수가 2배, 오클릭 손실도 2배입니다.`);
}

function gameLoop(timestamp) {
  if (runtime.mode !== "play") {
    runtime.animationFrame = 0;
    return;
  }

  if (!runtime.locked) {
    const elapsedMs = clamp(timestamp - runtime.runStartAt, 0, RUN_DURATION_MS);
    const remainingMs = RUN_DURATION_MS - elapsedMs;

    if (maybeTriggerBuffPick(elapsedMs)) {
      runtime.animationFrame = window.requestAnimationFrame(gameLoop);
      return;
    }

    runtime.slots.forEach((slot) => {
      if (slot.state !== "fake" && slot.state !== "genuine") return;
      const remaining = Math.max(0, slot.deadline - timestamp);
      const ratioPercent = slot.totalMs > 0 ? (remaining / slot.totalMs) * 100 : 0;
      slot.ring.style.setProperty("--time-left", String(ratioPercent));

      if (remaining <= 0) {
        if (slot.kind === "fake") {
          runtime.lossEvents.push({
            type: "missed",
            comboAtTime: runtime.combo,
            atSec: elapsedMs / 1_000,
            integrityLoss: 0,
          });
          runtime.combo = 0;
          runtime.missedFakes += 1;
          runtime.performanceMeter = clamp(
            runtime.performanceMeter + ADAPTIVE_METER_MISS_DELTA,
            -ADAPTIVE_METER_RANGE,
            ADAPTIVE_METER_RANGE,
          );
          settleSlot(slot, "missed", reducedMotionQuery.matches ? 120 : 260);
        } else {
          settleSlot(slot, "idle", 0);
        }
        updateHud();
      }
    });

    const maxConcurrent = clamp(
      getMaxConcurrentSignals(elapsedMs) + runtime.buffs.concurrentBonus,
      1,
      SLOT_COUNT,
    );
    if (
      timestamp >= runtime.nextSpawnAt
      && runtime.slots.filter((slot) => slot.state === "fake" || slot.state === "genuine").length
        < maxConcurrent
    ) {
      spawnRandomSignal(timestamp, elapsedMs);
      // spawnIntervalScale can stack arbitrarily negative across many picks;
      // floor the interval so spawns can approach "as fast as possible" but
      // never divide down toward zero/negative.
      runtime.nextSpawnAt = timestamp
        + Math.max(
          90,
          getSpawnIntervalMs(elapsedMs)
            * Math.max(0.1, 1 + runtime.buffs.spawnIntervalScale)
            * getAdaptiveDifficultyScale(runtime.performanceMeter),
        );
    }

    if (runtime.deepVerifyUntil > 0) updateDeepVerifyStatus();
    if (runtime.lensBoostUntil > 0) updateLensStatus();
    renderTimeHud(remainingMs);
    audio.setDroneTension(runtime.integrity / MAX_INTEGRITY, 1 - clamp01(remainingMs / RUN_DURATION_MS));

    if (elapsedMs >= RUN_DURATION_MS) {
      finishRun();
      return;
    }
  }

  runtime.animationFrame = window.requestAnimationFrame(gameLoop);
}

// "Why did I lose" recap: escalating difficulty + item stacking + adaptive
// difficulty together make a cause genuinely hard to reconstruct after the
// fact, so the run logs its own mistakes as they happen and the result
// screen surfaces the single costliest one (highest combo broken) instead
// of leaving the player to guess.
function renderResultRecap() {
  if (!runtime.lossEvents.length) {
    elements.resultRecap.hidden = true;
    elements.resultRecap.textContent = "";
    return;
  }
  const worst = runtime.lossEvents.reduce((a, b) => (b.comboAtTime > a.comboAtTime ? b : a));
  const minutes = Math.floor(worst.atSec / 60);
  const seconds = String(Math.floor(worst.atSec % 60)).padStart(2, "0");
  const cause = worst.type === "wrong"
    ? `오클릭으로 무결성 ${worst.integrityLoss}칸을 잃었습니다`
    : "가짜 신호를 놓쳤습니다";
  elements.resultRecap.hidden = false;
  elements.resultRecap.textContent = worst.comboAtTime > 0
    ? `가장 아쉬웠던 순간: ${minutes}:${seconds}, 콤보 ×${worst.comboAtTime}에서 ${cause}.`
    : `가장 아쉬웠던 순간: ${minutes}:${seconds}, ${cause}.`;
}

// With no cap on stacking, "what did this run's build even look like" stops
// being obvious mid-run just from the orbit ring, so the result screen gets
// a plain-text recap in pick order — the same buffCounts/buffPickOrder the
// HUD orbit already tracks, just read once at the end instead of live.
function renderResultBuild() {
  if (!runtime.buffPickOrder.length) {
    elements.resultBuild.hidden = true;
    elements.resultBuild.textContent = "";
    return;
  }
  const summary = runtime.buffPickOrder
    .map((id) => {
      const definition = BUFF_DEFINITIONS.find((buff) => buff.id === id);
      const count = runtime.buffCounts[id] ?? 0;
      const name = definition?.name ?? id;
      return count > 1 ? `${name} ×${count}` : name;
    })
    .join(" · ");
  elements.resultBuild.hidden = false;
  elements.resultBuild.textContent = `이번 런 빌드: ${summary}`;
}

function renderResultArchive(foundNewFragment) {
  const archiveComplete = runtime.pendingFragments >= MAX_MEMORY_FRAGMENTS;
  const record = foundNewFragment
    ? getMoriArchiveRecord(runtime.pendingFragments)
    : archiveComplete ? getMoriArchiveRecord(MAX_MEMORY_FRAGMENTS) : null;

  if (record) {
    const completedNow = foundNewFragment && record.final;
    elements.resultArchive.dataset.state = record.final ? "complete" : "unlocked";
    elements.resultRecordCode.textContent = record.code;
    elements.resultRecordStatus.textContent = completedNow
      ? "ARCHIVE COMPLETE"
      : foundNewFragment ? "NEW FILE" : "RECOVERED";
    elements.resultRecordTitle.textContent = record.title;
    elements.resultRecordBody.textContent = record.body;
    return record;
  }

  const nextFragment = Math.min(runtime.memory.fragments + 1, MAX_MEMORY_FRAGMENTS);
  elements.resultArchive.dataset.state = "locked";
  elements.resultRecordCode.textContent = `MORI.LOG/${String(nextFragment).padStart(2, "0")}`;
  elements.resultRecordStatus.textContent = "NO REWARD";
  elements.resultRecordTitle.textContent = "다음 기록은 아직 잠겨 있습니다.";
  elements.resultRecordBody.textContent = "A랭크 이상으로 VERIFIED 결말에 도달하면 이 파일이 열립니다.";
  return null;
}

function animateScoreCountUp(target, durationMs = 900) {
  if (reducedMotionQuery.matches) {
    elements.resultScore.textContent = formatScore(target);
    return;
  }
  const start = performance.now();
  function tick(now) {
    const ratio = clamp01((now - start) / durationMs);
    const eased = 1 - (1 - ratio) ** 3;
    elements.resultScore.textContent = formatScore(Math.round(target * eased));
    if (ratio < 1) window.requestAnimationFrame(tick);
  }
  window.requestAnimationFrame(tick);
}

async function finishRun() {
  cancelRunTimers();
  audio.stopDrone();
  runtime.locked = true;
  runtime.mode = "result";

  const provisionalResult = getResult({
    score: runtime.score,
    purges: runtime.purges,
    wrongClicks: runtime.wrongClicks,
    missedFakes: runtime.missedFakes,
    integrity: runtime.integrity,
  });
  const directiveBonus = awardRunDirectiveBonus(provisionalResult.ending);
  runtime.score += directiveBonus;
  runtime.lastResult = getResult({
    score: runtime.score,
    purges: runtime.purges,
    wrongClicks: runtime.wrongClicks,
    missedFakes: runtime.missedFakes,
    integrity: runtime.integrity,
  });

  const result = runtime.lastResult;
  const styleTag = getRunStyleTag({
    deepVerifyPurges: runtime.deepVerifyPurges,
    wrongClicks: runtime.wrongClicks,
    maxCombo: runtime.maxCombo,
    lensUses: runtime.lensUses,
  });
  const styleRemark = getRunStyleRemark(styleTag);
  renderResultDirective(result.ending);
  runtime.pendingFragments = getFragmentReward(runtime.memory.fragments, result.ending);
  const foundNewFragment = runtime.pendingFragments > runtime.memory.fragments;
  const recoveredRecord = renderResultArchive(foundNewFragment);
  const completedNow = Boolean(foundNewFragment && recoveredRecord?.final);

  elements.resultKicker.textContent = completedNow
    ? "ARCHIVE COMPLETE"
    : result.ending === "verified" ? "RUN COMPLETE" : "CORE BREACHED";
  elements.resultGlyph.textContent = result.rank;
  elements.resultGlyph.dataset.rank = result.rank;
  elements.resultGlyph.classList.remove("is-revealed");
  void elements.resultGlyph.offsetWidth;
  elements.resultGlyph.classList.add("is-revealed");
  elements.resultHeading.textContent = result.title;
  if (completedNow) {
    elements.resultMessage.textContent = `${result.message} 마지막 기억 조각과 MORI의 최종 기록을 복구했습니다.`;
  } else if (foundNewFragment) {
    elements.resultMessage.textContent = `${result.message} ${recoveredRecord.code}가 열렸습니다. 저장하면 다음 방문에도 읽을 수 있습니다.`;
  } else if (runtime.pendingFragments >= MAX_MEMORY_FRAGMENTS) {
    elements.resultMessage.textContent = `${result.message} MORI의 여섯 기록은 이미 모두 복구되어 있습니다.`;
  } else {
    elements.resultMessage.textContent = `${result.message} 이번 런에서는 새 기억 조각을 얻지 못했습니다.`;
  }
  renderResultRecap();
  renderResultBuild();
  animateScoreCountUp(runtime.score);
  elements.resultRank.textContent = result.rank;
  elements.resultTruth.textContent = String(runtime.purges);
  elements.resultFragments.textContent = `${runtime.pendingFragments}/${MAX_MEMORY_FRAGMENTS}`;
  elements.rememberButtonLabel.textContent = completedNow
    ? "마지막 파일 저장하고 다시"
    : foundNewFragment
      ? "새 파일 저장하고 다시"
      : result.ending === "verified" ? "결말 저장하고 다시" : "실패 기록 저장하고 다시";
  elements.terminalStatus.textContent = completedNow
    ? "ARCHIVE COMPLETE"
    : result.ending === "verified" ? "MEMORY VERIFIED" : "MEMORY UNSTABLE";
  updateMemoryRoute(completedNow ? "ending/archive-complete" : `ending/${result.ending}`);
  const resultMoriState = completedNow
    ? "archive-complete"
    : result.ending === "verified" ? "result-verified" : "result-unstable";
  const resultDialogue = styleRemark
    ? `${pickDialogueLine(MORI_STATES[resultMoriState].dialogue)} ${styleRemark}`
    : "";
  setMoriState(resultMoriState, resultDialogue);
  document.title = `${result.rank} RANK · STATE//LESS`;

  await transitionTo("result");
  revealScreenOnStackedLayout(elements.resultScreen);
  audio.finish(result.ending === "verified");
  if (runtime.inputMode === "keyboard") {
    elements.resultHeading.tabIndex = -1;
    elements.resultHeading.focus({ preventScroll: true });
  }
  const recordAnnouncement = foundNewFragment ? ` ${recoveredRecord.code}, ${recoveredRecord.title} 공개.` : " 새 기억 조각 없음.";
  const directiveAnnouncement = runtime.directiveCompleted
    ? ` MORI REQUEST 완료, 보너스 ${runtime.directive.bonus}점.`
    : " MORI REQUEST 미완료.";
  announce(`${result.title} 점수 ${formatScore(runtime.score)}, 랭크 ${result.rank}, 정화 ${runtime.purges}회, 기억 조각 ${runtime.pendingFragments}/${MAX_MEMORY_FRAGMENTS}.${directiveAnnouncement}${recordAnnouncement}`);
}

async function rememberResultAndRestart() {
  if (!runtime.lastResult) return;
  runtime.memory = {
    ...runtime.memory,
    runs: runtime.memory.runs + 1,
    bestScore: Math.max(runtime.memory.bestScore, runtime.score),
    lastEnding: runtime.lastResult.ending,
    policy: runtime.memory.policy ?? "session",
    fragments: runtime.pendingFragments,
  };
  runtime.memoryFound = true;
  updateStorageLabel(await saveMemory(runtime.memory));
  showToast("이번 결말이 게임 쿠키에 저장되었습니다.");
  await startGame();
}

async function forgetAndReturn() {
  cancelRunTimers();
  updateStorageLabel(await clearMemory());
  runtime.memory = { ...EMPTY_MEMORY, visits: 1 };
  runtime.memoryFound = false;
  runtime.lastResult = null;
  runtime.mode = "intro";
  document.title = "STATE//LESS — 이 페이지는 당신을 기억한다";
  renderIntro("이제 널 몰라.");
  await transitionTo("intro");
  revealScreenOnStackedLayout(elements.introScreen);
  showToast("게임 쿠키를 지웠습니다. 저장된 상태는 복구되지 않습니다.");
  const target = elements.memoryButtons[0];
  if (runtime.inputMode === "keyboard") target.focus({ preventScroll: true });
}

function handleVisibilityChange() {
  if (!runtime.ready || !document.hidden) {
    if (!document.hidden && runtime.mode === "play" && runtime.locked && runtime.pausedAt > 0) {
      const pauseDuration = performance.now() - runtime.pausedAt;
      runtime.pausedAt = 0;
      runtime.runStartAt += pauseDuration;
      runtime.nextSpawnAt += pauseDuration;
      runtime.slots.forEach((slot) => {
        if (slot.state === "fake" || slot.state === "genuine") slot.deadline += pauseDuration;
      });
      runtime.locked = false;
      runtime.lastFrameAt = 0;
      runtime.animationFrame = window.requestAnimationFrame(gameLoop);
    }
    return;
  }

  if (runtime.mode === "play" && !runtime.locked) {
    runtime.locked = true;
    runtime.pausedAt = performance.now();
  }
}

function handleGlobalKeydown(event) {
  if (!event.metaKey && !event.ctrlKey && !event.altKey) {
    recordInput("keyboard");
  }
  if (!runtime.ready) return;

  if (runtime.mode === "play" && runtime.tutorialActive) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (!event.repeat) closeTutorial();
    }
    return;
  }

  if (runtime.mode === "play" && runtime.buffPickActive) {
    if (event.key === "1" || event.key === "2") {
      event.preventDefault();
      if (!event.repeat) {
        const buff = runtime.buffChoices[Number(event.key) - 1];
        if (buff) chooseBuff(buff.id);
      }
    }
    return;
  }

  if (runtime.mode === "play" && !runtime.locked) {
    if (event.key.toLowerCase() === "d") {
      event.preventDefault();
      if (!event.repeat) toggleDeepVerifyWager();
      return;
    }
    if (event.key.toLowerCase() === "f") {
      event.preventDefault();
      if (!event.repeat) useArchiveLens();
      return;
    }
    const slotNumber = Number.parseInt(event.key, 10);
    if (Number.isInteger(slotNumber) && slotNumber >= 1 && slotNumber <= SLOT_COUNT) {
      event.preventDefault();
      activateSlot(slotNumber - 1);
      return;
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

  const loaded = await loadMemory();
  runtime.adapter = loaded.adapter;
  runtime.memoryFound = loaded.found;
  const todayDayIndex = getDayIndex();
  runtime.memory = {
    ...loaded.memory,
    visits: loaded.memory.visits + 1,
    policy: loaded.found ? loaded.memory.policy ?? "session" : null,
    streak: computeStreak(loaded.memory.streak, loaded.memory.lastPlayDay, todayDayIndex),
    lastPlayDay: todayDayIndex,
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
}

document.addEventListener("pointerdown", (event) => {
  if (event.isPrimary) recordInput("mouse");
}, { capture: true });
document.addEventListener("keydown", handleGlobalKeydown, { capture: true });

elements.memoryButtons.forEach((button) => {
  button.addEventListener("click", () => startGame(button.dataset.memoryPolicy));
});
elements.returnStartButton.addEventListener("click", () => startGame());
elements.lensButton.addEventListener("click", useArchiveLens);
elements.deepVerifyButton.addEventListener("click", toggleDeepVerifyWager);
elements.buffCards.forEach((card) => {
  card.addEventListener("click", () => chooseBuff(card.dataset.buffId));
});
elements.tutorialStartButton.addEventListener("click", closeTutorial);
elements.rememberButton.addEventListener("click", rememberResultAndRestart);
elements.forgetButton.addEventListener("click", forgetAndReturn);
elements.soundButton.addEventListener("click", () => {
  audio.setEnabled(!audio.enabled);
  updateSoundButton();
});

document.addEventListener("visibilitychange", handleVisibilityChange);

updateSoundButton();
initialize().catch((error) => {
  console.error(error);
  runtime.mode = "intro";
  elements.introHeading.textContent = "초기화에 실패했습니다.";
  elements.introMessage.textContent = "페이지를 새로고침해 주세요. 오류가 계속되면 개발자 콘솔의 메시지를 확인해 주세요.";
  elements.terminalStatus.textContent = "BOOT ERROR";
  setVisibleScreen("intro");
});
