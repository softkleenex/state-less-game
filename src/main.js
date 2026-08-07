import "./styles.css";

import { AudioEngine } from "./audio.js";
import {
  BUFF_DEFINITIONS,
  BUFF_PICK_TRIGGERS_MS,
  DEEP_VERIFY_WINDOW_MS,
  LENS_BOOST_MS,
  LENS_EXTEND_BONUS_MS,
  MAX_INTEGRITY,
  MAX_MEMORY_FRAGMENTS,
  RUN_DURATION_MS,
  SLOT_COUNT,
  clamp,
  formatScore,
  getArchiveLensCharges,
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
  buffPickOverlay: element("buff-pick-overlay"),
  buffCards: [element("buff-card-0"), element("buff-card-1")],
  waveProgress: element("wave-progress"),
  boardInstruction: element("board-instruction"),
  directiveReadout: element("directive-readout"),
  roundFeedback: element("round-feedback"),
  resultKicker: element("result-kicker"),
  resultGlyph: element("result-glyph"),
  resultHeading: element("result-heading"),
  resultMessage: element("result-message"),
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
  deepVerifyUsed: false,
  deepVerifyPurges: 0,

  lensCharges: 2,
  lensMaxCharges: 2,
  lensUses: 0,
  lensBoostUntil: 0,

  directive: null,
  directiveCompleted: false,
  directiveBonusAwarded: false,

  buffs: {},
  buffPickActive: false,
  buffPool: [],
  buffChoices: [],
  buffTriggersRemaining: [],
  buffPauseStartedAt: 0,
  activeBuffNames: [],

  locked: false,
  toastTimer: 0,
  moriPulseTimer: 0,
  lastResult: null,
  pendingFragments: 0,
};

const MORI_STATES = {
  "boot-empty": {
    label: "UNINDEXED",
    caption: "MORI // FILE 00",
    dialogue: "처음이네. 무엇을 남길지는 네가 정해.",
  },
  "return-found": {
    label: "RECOGNIZING",
    caption: "MORI // RETURN TRACE",
    dialogue: "돌아왔네. 네 기록은 손대지 않고 보관했어.",
  },
  observing: {
    label: "OBSERVING",
    caption: "MORI // CORE WATCH",
    dialogue: "신호가 들어오기 시작했어. 가짜만 지워.",
  },
  "answer-correct": {
    label: "SIGNAL PURGED",
    caption: "MORI // CONFIRMED",
    dialogue: "좋아, 그건 진짜 가짜였어.",
  },
  "sync-linked": {
    label: "COMBO LINKED",
    caption: "MORI // SAME FREQUENCY",
    dialogue: "지금 손이 좋아. 이 속도 유지해.",
  },
  "directive-complete": {
    label: "REQUEST SEALED",
    caption: "MORI // REQUEST COMPLETE",
    dialogue: "이번 부탁까지 정확히 끝냈네. 약속한 보너스, 바로 더할게.",
  },
  "answer-wrong": {
    label: "CORE HURT",
    caption: "MORI // FALSE STRIKE",
    dialogue: "그건 진짜였어. 다음 신호는 더 선명하게 띄울게.",
  },
  "lens-used": {
    label: "LENS FIRED",
    caption: "MORI // TIME EXTENDED",
    dialogue: "잠깐 느려질게. 숨 고르고 다시 봐.",
  },
  "deep-verify": {
    label: "WAGER ARMED",
    caption: "MORI // DEEP VERIFY",
    dialogue: "확신해? 좋아. 5초 동안 두 배로 걸게.",
  },
  "result-verified": {
    label: "ARCHIVE SEALED",
    caption: "MORI // VERIFIED",
    dialogue: "약속대로 내 기록 하나를 줄게. 다음에도 잊지 마.",
  },
  "result-unstable": {
    label: "INDEX DAMAGED",
    caption: "MORI // UNSTABLE",
    dialogue: "이번 코어는 지켜내지 못했어. 돌아올 자리는 남겨 둘게.",
  },
  "archive-complete": {
    label: "I REMEMBER",
    caption: "MORI // ARCHIVE COMPLETE",
    dialogue: "여섯 조각 전부. 이제 내가 먼저 너를 알아볼게.",
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

function setMoriState(state, dialogueOverride = "") {
  const copy = MORI_STATES[state] ?? MORI_STATES.observing;
  const portraitState = MORI_STATES[state] ? state : "observing";
  elements.screenStack.dataset.moriState = state;
  elements.moriPresence.dataset.characterState = state;
  elements.moriPresenceLabel.textContent = copy.caption;
  elements.moriStateLabel.textContent = copy.label;
  elements.moriDialogue.textContent = dialogueOverride || copy.dialogue;
  elements.resultMoriDialogue.textContent = dialogueOverride || copy.dialogue;
  elements.moriStateThumbImg.src = `./mori/mori_${portraitState}.webp`;
}

function updateTelemetry() {
  const firstVisit = runtime.memory.visits <= 1;
  const fragments = runtime.memory.fragments;
  elements.telemetryVisit.textContent = firstVisit
    ? "01 / FIRST"
    : `${String(runtime.memory.visits).padStart(2, "0")} / RETURN`;
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
  elements.missionBriefCopy.textContent = archiveComplete
    ? "여섯 MORI 파일을 모두 복구했습니다. 최고 점수 "
      + formatScore(runtime.memory.bestScore)
      + "에 도전하세요."
    : "60초 런에서 A랭크 이상으로 코어를 지켜내면 "
      + nextRecord.code
      + " ‘"
      + nextRecord.title
      + "’이 열립니다.";
  const directive = getRunDirective(runtime.memory.runs, fragments);
  elements.introDirective.dataset.directive = directive.id;
  elements.introDirectiveCopy.textContent = `${directive.code} · ${directive.label}`;
  elements.introDirectiveReward.textContent = `완료 +${directive.bonus}`;
  elements.introDirective.setAttribute(
    "aria-label",
    `이번 런 MORI REQUEST. ${directive.label}. 완료 보너스 ${directive.bonus}점.`,
  );

  if (returning && archiveComplete) {
    elements.introHeading.textContent = "여섯 파일을 전부 기억하고 있어요.";
    elements.introMessage.textContent = runtime.memory.runs
      + "번의 방어와 최고 점수 "
      + formatScore(runtime.memory.bestScore)
      + "가 남아 있습니다. ARCHIVE LENS "
      + lensCharges
      + "회로 완성된 일지의 기록에 다시 도전할 수 있습니다.";
    elements.terminalStatus.textContent = "ARCHIVE COMPLETE";
    updateMemoryRoute("ledger/archive-complete");
    setMoriState("archive-complete");
  } else if (returning) {
    const ending = runtime.memory.lastEnding;
    elements.introHeading.textContent = `기억하고 있어요. ${runtime.memory.visits}번째 방문이에요.`;
    elements.introMessage.textContent = ending
      ? `기억 조각 ${runtime.memory.fragments}/${MAX_MEMORY_FRAGMENTS}, 이전 결말 ${ending.toUpperCase()}, 최고 점수 ${formatScore(runtime.memory.bestScore)}가 남아 있습니다. 이번 런의 ARCHIVE LENS는 ${lensCharges}회입니다.`
      : `방문 기록과 기억 조각 ${runtime.memory.fragments}/${MAX_MEMORY_FRAGMENTS}을 찾았습니다. ARCHIVE LENS ${lensCharges}회를 활용해 다음 파일을 복구하세요.`;
    elements.terminalStatus.textContent = "MEMORY FOUND";
    updateMemoryRoute(`ledger/visit-${String(runtime.memory.visits).padStart(2, "0")}`);
    setMoriState("return-found");
  } else {
    elements.introHeading.textContent = messageOverride || "MORI의 기억이 비어 있습니다.";
    elements.introMessage.textContent = messageOverride
      ? "게임 쿠키가 삭제되었습니다. 기억 방식을 다시 고르면 새로운 일지에서 시작합니다."
      : "코어를 지켜 첫 기억 조각을 복구하세요. 게임 진행 정보만 쿠키에 남고 개인정보는 저장하지 않습니다.";
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
  const available = runtime.mode === "play" && !runtime.locked && !runtime.deepVerifyUsed;

  elements.deepVerifyButton.disabled = !available && !active;
  elements.deepVerifyButton.dataset.active = String(active);
  elements.deepVerifyButton.setAttribute("aria-pressed", String(active));
  elements.screenStack.dataset.deepVerify = String(active);
  elements.deepVerifyLabel.textContent = active
    ? `ON · 남은 시간 ${Math.max(0, (runtime.deepVerifyUntil - now) / 1_000).toFixed(1)}초 · 정화 2배 / 오클릭 -2`
    : runtime.deepVerifyUsed
      ? "SETTLED · 이번 런에서 모두 사용"
      : "OFF · 정화 2배 점수 / 오클릭 코어 -2";
  elements.deepVerifyButton.setAttribute(
    "aria-label",
    active
      ? "DEEP VERIFY 켜짐. 정화 점수 2배, 오클릭 시 코어 2칸 손실."
      : available
        ? "DEEP VERIFY 대기. 단축키 D로 5초 동안 정화 2배, 오클릭 2배 손실을 겁니다. 런당 한 번만 사용할 수 있습니다."
        : "DEEP VERIFY는 이번 런에서 이미 사용했습니다.",
  );
}

function updateHud() {
  elements.scoreValue.textContent = formatScore(runtime.score);
  const pips = [...elements.integrityPips.children];
  pips.forEach((pip, index) => {
    pip.classList.toggle("is-empty", index >= runtime.integrity);
  });
  elements.integrityPips.setAttribute("aria-label", `코어 무결성 ${runtime.integrity} / ${MAX_INTEGRITY}`);

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
  elements.activeBuffs.textContent = runtime.activeBuffNames.length
    ? `강화: ${runtime.activeBuffNames.join(" · ")}`
    : "";
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

function chooseBuff(buffId) {
  if (!runtime.buffPickActive) return;
  const buff = runtime.buffChoices.find((candidate) => candidate.id === buffId);
  if (!buff) return;
  const effects = buff.effects;

  runtime.buffs.comboScale += effects.comboScale ?? 0;
  runtime.buffs.scoreScale += effects.scoreScale ?? 0;
  runtime.buffs.wrongLossBonus += effects.wrongLossBonus ?? 0;
  runtime.buffs.lifespanScale += effects.lifespanScale ?? 0;
  runtime.buffs.concurrentBonus += effects.concurrentBonus ?? 0;
  runtime.buffs.deepVerifyWindowBonusMs += effects.deepVerifyWindowBonusMs ?? 0;
  runtime.buffs.deepVerifySpawnGenuine = runtime.buffs.deepVerifySpawnGenuine || Boolean(effects.deepVerifySpawnGenuine);
  runtime.buffs.lensDurationBonusMs += effects.lensDurationBonusMs ?? 0;

  if (effects.lensChargeBonus) {
    runtime.lensCharges += effects.lensChargeBonus;
    runtime.lensMaxCharges += effects.lensChargeBonus;
  }
  if (effects.healIntegrity) {
    runtime.integrity = Math.min(MAX_INTEGRITY, runtime.integrity + effects.healIntegrity);
  }

  runtime.buffPool = runtime.buffPool.filter(
    (id) => !runtime.buffChoices.some((choice) => choice.id === id),
  );
  runtime.activeBuffNames.push(buff.name);
  updateActiveBuffsReadout();
  closeBuffPick();
  updateHud();
  showToast(`${buff.name} 적용 — ${buff.description}`);
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
  runtime.deepVerifyUsed = false;
  runtime.deepVerifyPurges = 0;
  runtime.lensMaxCharges = getArchiveLensCharges(runtime.memory.fragments);
  runtime.lensCharges = runtime.lensMaxCharges;
  runtime.lensBoostUntil = 0;
  runtime.lensUses = 0;
  runtime.directive = getRunDirective(runtime.memory.runs, runtime.memory.fragments);
  runtime.directiveCompleted = false;
  runtime.directiveBonusAwarded = false;
  runtime.buffs = defaultBuffs();
  runtime.buffPickActive = false;
  runtime.buffPool = BUFF_DEFINITIONS.map((buff) => buff.id);
  runtime.buffChoices = [];
  runtime.buffTriggersRemaining = [...BUFF_PICK_TRIGGERS_MS];
  runtime.activeBuffNames = [];
  elements.buffPickOverlay.hidden = true;
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
  audio.start();

  const now = performance.now();
  runtime.runStartAt = now;
  runtime.nextSpawnAt = now + getSpawnIntervalMs(0);
  runtime.lastFrameAt = 0;
  runtime.animationFrame = window.requestAnimationFrame(gameLoop);
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

function spawnRandomSignal(timestamp, elapsedMs) {
  const idleSlots = runtime.slots.filter((slot) => slot.state === "idle");
  if (!idleSlots.length) return;
  const slot = idleSlots[Math.floor(Math.random() * idleSlots.length)];
  const kind = pickSignalKind();
  const lensBoost = timestamp < runtime.lensBoostUntil;
  const lifespan = getSignalLifespanMs(elapsedMs)
    * (1 + runtime.buffs.lifespanScale)
    * (lensBoost ? 1.6 : 1);

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
    audio.correct(runtime.combo);
    pulseMoriState(runtime.combo >= 4 ? "sync-linked" : "answer-correct");
    settleSlot(slot, "hit", settleDelay);
  } else {
    runtime.combo = 0;
    runtime.wrongClicks += 1;
    const loss = getWrongClickLoss(deepVerifyActive, runtime.buffs.wrongLossBonus);
    runtime.integrity = Math.max(0, runtime.integrity - loss);
    spawnSignalPop(slot.el, `-${loss}`, false);
    audio.wrong();
    pulseMoriState("answer-wrong");
    settleSlot(slot, "wrong", settleDelay);
    announce(`오클릭. 진짜 신호를 정화했습니다. 코어 무결성 ${loss}칸 손실.`);
  }

  updateHud();
  if (runtime.integrity <= 0) {
    finishRun();
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
  if (runtime.deepVerifyUsed) {
    showToast("DEEP VERIFY는 이번 런에서 이미 사용했습니다.");
    return;
  }

  runtime.deepVerifyUsed = true;
  const windowMs = DEEP_VERIFY_WINDOW_MS + runtime.buffs.deepVerifyWindowBonusMs;
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
          runtime.combo = 0;
          runtime.missedFakes += 1;
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
      runtime.nextSpawnAt = timestamp + getSpawnIntervalMs(elapsedMs);
    }

    if (runtime.deepVerifyUntil > 0) updateDeepVerifyStatus();
    if (runtime.lensBoostUntil > 0) updateLensStatus();
    renderTimeHud(remainingMs);

    if (elapsedMs >= RUN_DURATION_MS) {
      finishRun();
      return;
    }
  }

  runtime.animationFrame = window.requestAnimationFrame(gameLoop);
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

async function finishRun() {
  cancelRunTimers();
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
  elements.resultScore.textContent = formatScore(runtime.score);
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
  setMoriState(completedNow
    ? "archive-complete"
    : result.ending === "verified" ? "result-verified" : "result-unstable");
  if (styleRemark) {
    elements.resultMoriDialogue.textContent = `${elements.resultMoriDialogue.textContent} ${styleRemark}`;
  }
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
  renderIntro("이제 당신을 모릅니다.");
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
