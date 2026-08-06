import "./styles.css";

import { AudioEngine } from "./audio.js";
import {
  DEEP_VERIFY_BONUS,
  DEEP_VERIFY_BURST_MS,
  MAX_INTEGRITY,
  MAX_MEMORY_FRAGMENTS,
  PLAY_INSTRUCTION,
  SYNC_RECOVERY_STREAK,
  TOTAL_ROUNDS,
  VERIFIED_CORRECT_REQUIRED,
  createChipPool,
  createFactCatalog,
  formatScore,
  getArchiveLensCharges,
  getAuditGateStatus,
  getDeepVerifyBonus,
  getFragmentReward,
  getMoriArchiveRecord,
  getResult,
  getRunDirective,
  getRunDirectiveStatus,
  getRunStyleRemark,
  getRunStyleTag,
  getSyncRecoveryIndex,
  getWaveConfig,
  getWaveDurationMs,
  getWrongAnswerIntegrityLoss,
  scoreCorrectAnswer,
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
  roundImpactPortraitImg: element("round-impact-portrait-img"),
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
  auditProgress: element("audit-progress"),
  auditGateValue: element("audit-gate-value"),
  auditReward: element("audit-reward"),
  syncStatus: element("sync-status"),
  syncValue: element("sync-value"),
  syncBonus: element("sync-bonus"),
  lensButton: element("lens-button"),
  lensCount: element("lens-count"),
  lensState: element("lens-state"),
  deepVerifyButton: element("deep-verify-button"),
  deepVerifyKicker: element("deep-verify-kicker"),
  deepVerifyLabel: element("deep-verify-label"),
  liveSignalGrid: element("live-signal-grid"),
  triageLane: element("triage-lane"),
  zoneTrue: element("zone-true"),
  zoneFalse: element("zone-false"),
  zoneCorrupted: element("zone-corrupted"),
  waveProgress: element("wave-progress"),
  boardInstruction: element("board-instruction"),
  directiveReadout: element("directive-readout"),
  roundFeedback: element("round-feedback"),
  roundImpact: element("round-impact"),
  roundImpactLabel: element("round-impact-label"),
  roundImpactValue: element("round-impact-value"),
  roundImpactDetail: element("round-impact-detail"),
  roundContinueButton: element("round-continue-button"),
  roundContinueLabel: element("round-continue-label"),
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
  catalog: [],
  seed: "",
  roundIndex: 0,
  score: 0,
  integrity: MAX_INTEGRITY,
  correct: 0,
  streak: 0,
  syncRecoveryUsed: false,
  deepVerifyBonus: DEEP_VERIFY_BONUS,
  deepVerifyBurstUntil: 0,
  deepVerifyUsedWaveIndex: -1,
  directive: null,
  directiveCompleted: false,
  directiveBonusAwarded: false,
  maxStreak: 0,
  deepVerifyWins: 0,
  wrongCount: 0,
  missedCount: 0,
  outcomes: [],
  lensCharges: 1,
  lensMaxCharges: 1,
  lensUsedRoundIndex: -1,
  locked: false,
  waveConfig: null,
  waveChipPool: [],
  waveChipCursor: 0,
  waveCorrect: 0,
  waveWrong: 0,
  waveMissed: 0,
  waveDeadline: 0,
  nextSpawnAt: 0,
  activeChips: new Map(),
  selectedChipId: null,
  lensRevealChipId: null,
  triageFrame: 0,
  moriPulseTimer: 0,
  lastFrameAt: 0,
  animationFrame: 0,
  advanceTimer: 0,
  impactTimer: 0,
  toastTimer: 0,
  resizeTimer: 0,
  lastResult: null,
  pendingFragments: 0,
  pressureWarned: false,
  clockTenths: -1,
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
    caption: "MORI // AUDIT ACTIVE",
    dialogue: "일지와 신호를 같이 봐. 답은 늘 둘 사이에 있어.",
  },
  "time-critical": {
    label: "TIME FRACTURE",
    caption: "MORI // FIVE SECONDS",
    dialogue: "5초 남았어. 처음 읽은 흔적을 믿어.",
  },
  "answer-correct": {
    label: "TRACE ACCEPTED",
    caption: "MORI // CONFIRMED",
    dialogue: "응, 그 흔적이 맞아. 내 일지를 읽을 줄 아네.",
  },
  "sync-linked": {
    label: "SYNC LINKED",
    caption: "MORI // SAME FREQUENCY",
    dialogue: "지금 호흡 좋아. 이대로 나랑 같은 기록을 봐.",
  },
  "sync-recovery": {
    label: "TRACE RESTORED",
    caption: "MORI // SYNC RECOVERY",
    dialogue: "세 흔적이 이어졌어. 아까 다친 색인 하나, 내가 되돌릴게.",
  },
  "directive-complete": {
    label: "REQUEST SEALED",
    caption: "MORI // REQUEST COMPLETE",
    dialogue: "이번 부탁까지 정확히 끝냈네. 약속한 보너스, 일지에 바로 더할게.",
  },
  "answer-wrong": {
    label: "INDEX HURT",
    caption: "MORI // CORRUPTION",
    dialogue: "그건 오염된 쪽이야. 다음 흔적은 더 선명하게 띄울게.",
  },
  "lens-used": {
    label: "LENS FIRED",
    caption: "MORI // ZONE REVEALED",
    dialogue: "정답 구역, 미리 보여줄게. 확인하고 넣어.",
  },
  "deep-verify": {
    label: "WAGER ARMED",
    caption: "MORI // DEEP VERIFY",
    dialogue: "확신해? 좋아. 맞히면 더 깊게 새기고, 틀리면 두 칸이 찢어져.",
  },
  "core-final": {
    label: "CORE EXPOSED",
    caption: "MORI // FINAL CORE",
    dialogue: "마지막 핵심 색인이야. 이번 선택으로 일지를 같이 봉인하자.",
  },
  "tab-left": {
    label: "YOU LEFT",
    caption: "MORI // HIDDEN TRACE",
    dialogue: "잠깐 다른 곳을 봤지? 괜찮아. 그 흔적도 기록이니까.",
  },
  "other-self": {
    label: "OTHER SELF",
    caption: "MORI // DUPLICATE TAB",
    dialogue: "같은 페이지가 하나 더 있어. 어느 쪽이 진짜 너지?",
  },
  "result-verified": {
    label: "ARCHIVE SEALED",
    caption: "MORI // VERIFIED",
    dialogue: "약속대로 내 기록 하나를 줄게. 다음에도 잊지 마.",
  },
  "result-unstable": {
    label: "INDEX DAMAGED",
    caption: "MORI // UNSTABLE",
    dialogue: "이번 일지는 봉인할 수 없어. 돌아올 자리는 남겨 둘게.",
  },
  "archive-complete": {
    label: "I REMEMBER",
    caption: "MORI // ARCHIVE COMPLETE",
    dialogue: "여섯 조각 전부. 이제 내가 먼저 너를 알아볼게.",
  },
};

const WAVE_MORI_DIALOGUE = [
  "신호가 흐르기 시작했어. 잡아서 제자리로 보내.",
  "이제 두 개가 겹칠 거야. 눈을 두 군데에 둬.",
  "오염된 신호도 섞여. 색이 다르면 의심해.",
  "손이 바빠질 거야. 놓치는 것보다 잘못 넣는 게 더 아파.",
  "거의 다 왔어. 속도보다 정확도.",
  "마지막 코어야. 지금까지 중 제일 빨라.",
];

const ZONE_LABELS = {
  true: "TRUE",
  false: "FALSE",
  corrupted: "CORRUPTED",
};

const WRONG_ZONE_HINT = {
  true: "그건 진실 쪽이었어. 다음 흔적은 더 선명하게 띄울게.",
  false: "그건 거짓 쪽이었어. 다음 흔적은 더 선명하게 띄울게.",
  corrupted: "그건 오염된 쪽이었어. 다음 흔적은 더 선명하게 띄울게.",
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
    fragments: runtime.memory.fragments,
    runs: runtime.memory.runs,
    bestScore: runtime.memory.bestScore,
    policy: runtime.memory.policy,
    theme: darkModeQuery.matches ? "dark" : "light",
    timePhase: hour >= 6 && hour < 18 ? "day" : "night",
    inputMode: runtime.inputMode ?? "mouse",
    tabLeft: runtime.tabLeft,
    peerPresent: runtime.peerPresent,
    viewport: window.innerWidth >= 720 ? "wide" : "narrow",
    motion: reducedMotionQuery.matches ? "reduced" : "full",
    network: navigator.onLine ? "online" : "offline",
    localHour: hour,
    viewportWidth: window.innerWidth,
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
  elements.roundImpactPortraitImg.src = `./mori/mori_${portraitState}.webp`;
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
    ? "완성된 일지 다시 감사"
    : "기억 검사 다시 시작";
  elements.missionBrief.dataset.state = archiveComplete ? "complete" : "next";
  elements.missionBriefLabel.textContent = archiveComplete ? "ARCHIVE COMPLETE" : "NEXT FILE";
  elements.missionBriefCopy.textContent = archiveComplete
    ? "여섯 MORI 파일을 모두 복구했습니다. 최고 점수 "
      + formatScore(runtime.memory.bestScore)
      + "와 6연속 SYNC에 도전하세요."
    : "여섯 번 중 다섯 번 이상 검증하면 "
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
      + "번의 감사와 최고 점수 "
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
      : "브라우저 흔적을 해석해 첫 기억 조각을 복구하세요. 게임 진행 정보만 쿠키에 남고 개인정보는 저장하지 않습니다.";
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

function cancelRoundTimers() {
  window.cancelAnimationFrame(runtime.animationFrame);
  window.clearTimeout(runtime.advanceTimer);
  window.clearTimeout(runtime.impactTimer);
  window.clearTimeout(runtime.moriPulseTimer);
  runtime.animationFrame = 0;
  runtime.advanceTimer = 0;
  runtime.impactTimer = 0;
  runtime.moriPulseTimer = 0;
}

function resetRoundImpact() {
  window.clearTimeout(runtime.impactTimer);
  runtime.impactTimer = 0;
  elements.roundImpact.dataset.state = "idle";
  elements.roundContinueButton.hidden = true;
}

function showRoundImpact(state, label, value, detail, autoHideMs = 0) {
  window.clearTimeout(runtime.impactTimer);
  elements.roundImpact.dataset.state = "idle";
  elements.roundImpactLabel.textContent = label;
  elements.roundImpactValue.textContent = value;
  elements.roundImpactDetail.textContent = detail;
  void elements.roundImpact.offsetWidth;
  elements.roundImpact.dataset.state = state;
  if (autoHideMs > 0) {
    runtime.impactTimer = window.setTimeout(() => {
      elements.roundImpact.dataset.state = "idle";
      runtime.impactTimer = 0;
    }, autoHideMs);
  }
}

const clamp01 = (value) => Math.min(1, Math.max(0, value));

function updateWaveTime() {
  const remainingMs = Math.max(0, runtime.waveDeadline - performance.now());
  const clockTenths = Math.ceil(remainingMs / 100);
  if (clockTenths === runtime.clockTenths) return;

  runtime.clockTenths = clockTenths;
  const seconds = (clockTenths / 10).toFixed(1);
  elements.roundTime.textContent = seconds;
  elements.roundTimeBlock.setAttribute("aria-label", `남은 시간 ${seconds}초`);
  elements.roundTimeBlock.dataset.state = remainingMs <= 5_000 ? "critical" : "active";
}

function advanceRound() {
  if (runtime.mode !== "play" || !runtime.locked) return;
  window.clearTimeout(runtime.advanceTimer);
  runtime.advanceTimer = 0;
  runtime.roundIndex += 1;
  startWave();
}

function createDeck() {
  runtime.snapshot = getSnapshot();
  runtime.catalog = createFactCatalog(runtime.snapshot);
  runtime.seed = `${runtime.sessionId}:${runtime.memory.visits}:${runtime.memory.runs}:${runtime.stateRevision}`;
  renderLiveSignalPanel();
}

function renderLiveSignalPanel() {
  if (!runtime.catalog) return;
  const fragment = document.createDocumentFragment();
  for (const fact of runtime.catalog) {
    const row = document.createElement("div");
    row.className = "live-signal-row";
    const dt = document.createElement("dt");
    dt.textContent = fact.label;
    const dd = document.createElement("dd");
    dd.textContent = fact.value;
    row.append(dt, dd);
    fragment.append(row);
  }
  elements.liveSignalGrid.replaceChildren(fragment);
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
  runtime.syncRecoveryUsed = false;
  runtime.deepVerifyBurstUntil = 0;
  runtime.deepVerifyUsedWaveIndex = -1;
  runtime.deepVerifyBonus = DEEP_VERIFY_BONUS;
  runtime.directive = getRunDirective(runtime.memory.runs, runtime.memory.fragments);
  runtime.directiveCompleted = false;
  runtime.directiveBonusAwarded = false;
  runtime.maxStreak = 0;
  runtime.deepVerifyWins = 0;
  runtime.wrongCount = 0;
  runtime.missedCount = 0;
  runtime.outcomes = Array(TOTAL_ROUNDS).fill(null);
  runtime.lensMaxCharges = getArchiveLensCharges(runtime.memory.fragments);
  runtime.lensCharges = runtime.lensMaxCharges;
  runtime.lensUsedRoundIndex = -1;
  runtime.locked = false;
  runtime.lastResult = null;
  runtime.pendingFragments = runtime.memory.fragments;
  createDeck();
  updateTelemetry();
  updateScoreAndIntegrity();
  elements.terminalStatus.textContent = "AUDIT ACTIVE";
  elements.screenStack.dataset.finalRound = "false";
  updateMemoryRoute("audit/round-01");
  setMoriState("observing");
  document.title = "[1/6] STATE//LESS";

  cancelRoundTimers();
  runtime.mode = "play";
  await transitionTo("play");
  revealScreenOnStackedLayout(elements.playScreen);
  audio.start();
  startWave();
}

function updateLensStatus() {
  const usedThisWave = runtime.lensUsedRoundIndex === runtime.roundIndex;
  let state = "READY";
  if (runtime.lensCharges <= 0) state = "EMPTY";
  else if (usedThisWave) state = "NEXT WAVE";
  else if (runtime.locked) state = "SCANNING";

  elements.lensCount.textContent = `${String(runtime.lensCharges).padStart(2, "0")} / ${String(runtime.lensMaxCharges).padStart(2, "0")}`;
  elements.lensState.textContent = state;
  elements.lensButton.dataset.state = state.toLowerCase().replace(" ", "-");
  elements.lensButton.disabled = runtime.mode !== "play"
    || runtime.locked
    || runtime.lensCharges <= 0
    || usedThisWave;
  elements.lensButton.setAttribute(
    "aria-label",
    `ARCHIVE LENS. ${runtime.lensCharges}/${runtime.lensMaxCharges}회 남음. 상태 ${state}. 단축키 F.`,
  );
}

function isDeepVerifyBurstActive() {
  return performance.now() < runtime.deepVerifyBurstUntil;
}

function updateDeepVerifyStatus() {
  const burstActive = isDeepVerifyBurstActive();
  const usedThisWave = runtime.deepVerifyUsedWaveIndex === runtime.roundIndex;
  const available = runtime.mode === "play"
    && !runtime.locked
    && runtime.integrity > 1
    && !usedThisWave
    && !burstActive;
  const finalCore = runtime.roundIndex === TOTAL_ROUNDS - 1;
  const bonus = runtime.deepVerifyBonus;

  elements.deepVerifyButton.disabled = !available;
  elements.deepVerifyButton.dataset.active = String(burstActive);
  elements.deepVerifyButton.setAttribute("aria-pressed", String(burstActive));
  elements.screenStack.dataset.deepVerify = String(burstActive);
  elements.deepVerifyKicker.textContent = finalCore
    ? "FINAL WAGER · DEEP VERIFY ×2"
    : "OPTIONAL WAGER · DEEP VERIFY";
  elements.deepVerifyLabel.textContent = burstActive
    ? `ON · 정답 +${bonus} / 오답 무결성 -2`
    : usedThisWave
      ? "SETTLED · 다음 웨이브에서 다시 사용"
      : runtime.integrity <= 1
        ? "LOCKED · 무결성 2칸 필요"
        : `OFF · 정답 +${bonus} / 오답 무결성 -2 · ${Math.round(DEEP_VERIFY_BURST_MS / 1000)}초간 지속`;
  elements.deepVerifyButton.setAttribute(
    "aria-label",
    burstActive
      ? `DEEP VERIFY 켜짐. 정답 추가 ${bonus}점, 오답 기억 무결성 2칸 손실.`
      : available
        ? `DEEP VERIFY 대기. 정답 추가 ${bonus}점, 오답 기억 무결성 2칸 손실. 단축키 D로 ${Math.round(DEEP_VERIFY_BURST_MS / 1000)}초간 켜기.`
        : usedThisWave
          ? "DEEP VERIFY 이번 웨이브에서 이미 사용했습니다. 다음 웨이브에서 다시 사용할 수 있습니다."
          : "DEEP VERIFY 잠김. 기억 무결성이 2칸 이상일 때 사용할 수 있습니다.",
  );
}

function getActiveDirectiveStatus(ending = null) {
  if (!runtime.directive) return null;
  return getRunDirectiveStatus(runtime.directive.id, {
    maxStreak: runtime.maxStreak,
    deepVerifyWins: runtime.deepVerifyWins,
    integrity: runtime.integrity,
    ending,
  });
}

function getDirectiveProgressLabel(status, ending = null) {
  if (!status) return "0/0";
  if (status.id !== "clean") return status.progress;
  if (ending === null) return `${status.progress} · VERIFIED 필요`;
  return `${status.progress} · ${ending === "verified" ? "VERIFIED" : "NOT VERIFIED"}`;
}

function awardRunDirectiveBonus(ending = null) {
  const status = getActiveDirectiveStatus(ending);
  if (!status?.completed || runtime.directiveBonusAwarded) return 0;
  runtime.directiveCompleted = true;
  runtime.directiveBonusAwarded = true;
  return status.bonus;
}

function renderResultDirective(ending) {
  const status = getActiveDirectiveStatus(ending);
  if (!status) return;
  const progress = getDirectiveProgressLabel(status, ending);
  elements.resultDirective.dataset.state = status.completed ? "complete" : "missed";
  elements.resultDirectiveCopy.textContent = status.completed
    ? `${status.code} · ${progress} · COMPLETE +${status.bonus}`
    : `${status.code} · ${progress} · INCOMPLETE`;
  elements.resultDirective.setAttribute(
    "aria-label",
    status.completed
      ? `MORI REQUEST 완료. ${status.label}. 보너스 ${status.bonus}점.`
      : `MORI REQUEST 미완료. ${status.label}. 진행 ${progress}.`,
  );
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
  const syncBonus = Math.min(runtime.streak, 5) * 60;
  const failedOutcomeExists = runtime.outcomes.some(
    (outcome) => outcome === "wrong" || outcome === "timeout",
  );
  const recoveryArmed = failedOutcomeExists && !runtime.syncRecoveryUsed;
  const recoveryRemaining = Math.max(0, SYNC_RECOVERY_STREAK - runtime.streak);
  elements.syncValue.textContent = `×${runtime.streak}`;
  elements.syncBonus.textContent = recoveryArmed
    ? `↺${recoveryRemaining} · +${String(syncBonus).padStart(3, "0")}`
    : runtime.syncRecoveryUsed
      ? `↺OK · +${String(syncBonus).padStart(3, "0")}`
      : `+${String(syncBonus).padStart(3, "0")}`;
  elements.syncStatus.dataset.active = String(runtime.streak > 0);
  elements.syncStatus.dataset.recovery = recoveryArmed
    ? "armed"
    : runtime.syncRecoveryUsed ? "used" : "idle";
  elements.syncStatus.setAttribute(
    "aria-label",
    recoveryArmed
      ? `연속 정답 ${runtime.streak}, 현재 연속 보너스 ${syncBonus}. ${recoveryRemaining}연속 정답을 더 하면 이전 오류 하나를 복구합니다.`
      : runtime.syncRecoveryUsed
        ? `연속 정답 ${runtime.streak}, 현재 연속 보너스 ${syncBonus}. SYNC RECOVERY 사용 완료.`
        : `연속 정답 ${runtime.streak}, 현재 연속 보너스 ${syncBonus}. 오류 뒤 ${SYNC_RECOVERY_STREAK}연속 정답으로 한 번 복구할 수 있습니다.`,
  );
  updateAuditProgress();
  updateLensStatus();
  updateDeepVerifyStatus();
  updateDirectiveReadout();
}

function updateAuditProgress() {
  const answered = runtime.outcomes.filter(Boolean).length;
  const gate = getAuditGateStatus({
    correct: runtime.correct,
    answered,
    integrity: runtime.integrity,
    required: VERIFIED_CORRECT_REQUIRED,
  });
  elements.auditProgress.dataset.state = gate.state;
  elements.auditGateValue.textContent = gate.label;
  elements.auditReward.textContent = runtime.memory.fragments >= MAX_MEMORY_FRAGMENTS
    ? "ARCHIVE COMPLETE"
    : `NEXT MORI.LOG/${String(runtime.memory.fragments + 1).padStart(2, "0")}`;

  const statusLabels = {
    correct: "검증 성공",
    recovered: "SYNC 복구",
    wrong: "검증 실패",
    timeout: "시간 초과",
    current: "현재 라운드",
    pending: "대기",
  };
  const statusMarks = {
    correct: "✓",
    recovered: "↺",
    wrong: "×",
    timeout: "×",
    current: "◆",
    pending: "·",
  };

  elements.auditProgress.querySelectorAll("li").forEach((item, index) => {
    const outcome = runtime.outcomes[index];
    const isCurrent = runtime.mode === "play"
      && !runtime.locked
      && index === runtime.roundIndex;
    const state = outcome || (isCurrent ? "current" : "pending");
    item.dataset.state = state;
    item.querySelector("strong").textContent = statusMarks[state];
    item.setAttribute("aria-label", `웨이브 ${index + 1}, ${statusLabels[state]}`);
    if (isCurrent) item.setAttribute("aria-current", "step");
    else item.removeAttribute("aria-current");
  });
}

function updateDirectiveReadout() {
  const status = getActiveDirectiveStatus();
  if (!status) return;
  const progress = getDirectiveProgressLabel(status);
  elements.directiveReadout.dataset.state = status.completed ? "complete" : "active";
  elements.directiveReadout.textContent = `MORI REQUEST · ${status.code} · ${progress} · +${status.bonus}`;
  elements.directiveReadout.setAttribute(
    "aria-label",
    `MORI REQUEST ${status.label}. 진행 ${progress}. 완료 보너스 ${status.bonus}점.`,
  );
}

function clearTriageLane() {
  elements.triageLane.replaceChildren();
  runtime.activeChips.clear();
  runtime.selectedChipId = null;
  runtime.lensRevealChipId = null;
}

function pickFreeTrack() {
  const usedTracks = new Set([...runtime.activeChips.values()].map((chip) => chip.track));
  for (let track = 0; track < 3; track += 1) {
    if (!usedTracks.has(track)) return track;
  }
  return Math.floor(Math.random() * 3);
}

function selectChip(chipId) {
  if (!runtime.activeChips.has(chipId)) return;
  runtime.selectedChipId = chipId;
  runtime.activeChips.forEach((chip, id) => {
    chip.el.classList.toggle("is-selected", id === chipId);
  });
}

function cycleChipSelection(direction) {
  const ids = [...runtime.activeChips.keys()];
  if (!ids.length) return;
  const currentIndex = ids.indexOf(runtime.selectedChipId);
  const nextIndex = currentIndex < 0
    ? 0
    : (currentIndex + direction + ids.length) % ids.length;
  selectChip(ids[nextIndex]);
  audio.navigate(nextIndex);
}

function removeChip(chipId) {
  const chip = runtime.activeChips.get(chipId);
  if (!chip) return;
  chip.el.remove();
  runtime.activeChips.delete(chipId);
  if (runtime.selectedChipId === chipId) {
    runtime.selectedChipId = null;
    const [nextId] = runtime.activeChips.keys();
    if (nextId) selectChip(nextId);
  }
}

function spawnChip() {
  if (runtime.waveChipCursor >= runtime.waveChipPool.length) return;
  const def = runtime.waveChipPool[runtime.waveChipCursor];
  runtime.waveChipCursor += 1;

  const track = pickFreeTrack();
  const el = document.createElement("button");
  el.type = "button";
  el.className = "triage-chip";
  el.dataset.chipId = def.id;
  el.dataset.track = String(track);
  el.textContent = def.text;
  el.setAttribute("aria-label", `증거 신호: ${def.text}`);
  el.style.setProperty("--chip-track", String(track));
  el.style.setProperty("--chip-progress", "0");
  el.addEventListener("click", () => selectChip(def.id));
  elements.triageLane.append(el);

  runtime.activeChips.set(def.id, {
    def,
    el,
    track,
    spawnedAt: performance.now(),
  });

  if (runtime.selectedChipId === null) selectChip(def.id);
}

function spawnZonePop(zoneKey, text, positive) {
  const zoneEl = {
    true: elements.zoneTrue,
    false: elements.zoneFalse,
    corrupted: elements.zoneCorrupted,
  }[zoneKey];
  if (!zoneEl) return;
  const pop = document.createElement("span");
  pop.className = `zone-score-pop ${positive ? "is-positive" : "is-negative"}`;
  pop.textContent = text;
  zoneEl.append(pop);
  window.setTimeout(() => pop.remove(), 900);
}

function pulseMoriState(state, dialogueOverride = "") {
  window.clearTimeout(runtime.moriPulseTimer);
  setMoriState(state, dialogueOverride);
  runtime.moriPulseTimer = window.setTimeout(() => {
    if (runtime.mode !== "play" || runtime.locked) return;
    const finalCore = runtime.roundIndex === TOTAL_ROUNDS - 1;
    if (finalCore) setMoriState("core-final");
    else setMoriState("observing", WAVE_MORI_DIALOGUE[runtime.roundIndex]);
  }, 900);
}

function updateWaveProgress() {
  if (!runtime.waveConfig) return;
  elements.waveProgress.textContent =
    `정답 ${runtime.waveCorrect} / ${runtime.waveConfig.target} · 오답 ${runtime.waveWrong} · 놓침 ${runtime.waveMissed}`;
  elements.waveProgress.setAttribute(
    "aria-label",
    `이번 웨이브 진행. 정답 ${runtime.waveCorrect}/${runtime.waveConfig.target}, 오답 ${runtime.waveWrong}, 놓침 ${runtime.waveMissed}.`,
  );
}

function assignSelectedChip(zone) {
  if (runtime.mode !== "play" || runtime.locked) return;
  if (!runtime.selectedChipId) {
    showToast("먼저 분류할 신호를 고르세요.");
    return;
  }
  resolveChip(runtime.selectedChipId, zone);
}

function resolveChip(chipId, zone) {
  const chip = runtime.activeChips.get(chipId);
  if (!chip || runtime.mode !== "play" || runtime.locked) return;

  const finalCore = runtime.roundIndex === TOTAL_ROUNDS - 1;
  const deepVerify = isDeepVerifyBurstActive();
  const correct = zone === chip.def.zone;
  const elapsed = performance.now() - chip.spawnedAt;
  const remainingRatio = 1 - clamp01(elapsed / runtime.waveConfig.travelMs);

  removeChip(chipId);

  if (correct) {
    runtime.streak += 1;
    runtime.maxStreak = Math.max(runtime.maxStreak, runtime.streak);
    runtime.waveCorrect += 1;
    if (deepVerify) runtime.deepVerifyWins += 1;
    const points = scoreCorrectAnswer(remainingRatio, runtime.streak, deepVerify, runtime.deepVerifyBonus);
    runtime.score += points;
    spawnZonePop(zone, `+${points}`, true);
    audio.correct(runtime.streak);
    pulseMoriState(runtime.streak >= 2 ? "sync-linked" : "answer-correct");
    updateScoreAndIntegrity();
    updateWaveProgress();
    announce(`${ZONE_LABELS[zone]} 구역에 정확히 넣었습니다. ${points}점 획득. 연속 ${runtime.streak}.`);

    if (runtime.waveCorrect >= runtime.waveConfig.target) {
      concludeWave("correct");
    }
    return;
  }

  runtime.streak = 0;
  runtime.waveWrong += 1;
  runtime.wrongCount += 1;
  const integrityLoss = getWrongAnswerIntegrityLoss(deepVerify);
  runtime.integrity = Math.max(0, runtime.integrity - integrityLoss);
  spawnZonePop(zone, `-${integrityLoss}`, false);
  audio.wrong();
  pulseMoriState("answer-wrong", WRONG_ZONE_HINT[chip.def.zone]);
  updateScoreAndIntegrity();
  updateWaveProgress();
  announce(`${ZONE_LABELS[zone]} 구역은 오답입니다. 기억 무결성 ${integrityLoss}칸 손실.`);

  if (runtime.integrity <= 0) {
    concludeWave("wrong");
  }
}

function expireChip(chipId) {
  const chip = runtime.activeChips.get(chipId);
  if (!chip) return;
  runtime.streak = 0;
  runtime.waveMissed += 1;
  runtime.missedCount += 1;
  removeChip(chipId);
  updateScoreAndIntegrity();
  updateWaveProgress();
}

function useArchiveLens() {
  if (runtime.mode !== "play" || runtime.locked) return;
  if (runtime.lensUsedRoundIndex === runtime.roundIndex) {
    showToast("ARCHIVE LENS는 웨이브마다 한 번만 조준할 수 있습니다.");
    return;
  }
  if (runtime.lensCharges <= 0) {
    showToast("이번 런의 ARCHIVE LENS 충전을 모두 사용했습니다.");
    return;
  }
  const targetId = runtime.selectedChipId ?? [...runtime.activeChips.keys()][0];
  const chip = targetId ? runtime.activeChips.get(targetId) : null;
  if (!chip) {
    showToast("지금 화면에 분류할 신호가 없습니다.");
    return;
  }

  runtime.lensCharges -= 1;
  runtime.lensUsedRoundIndex = runtime.roundIndex;
  runtime.lensRevealChipId = targetId;
  chip.el.classList.add("is-lens-revealed");
  chip.el.dataset.revealZone = chip.def.zone;

  elements.roundFeedback.textContent = `ARCHIVE LENS · 신호 하나의 정답 구역(${ZONE_LABELS[chip.def.zone]})을 밝혔습니다.`;
  elements.roundFeedback.className = "round-feedback is-lens";
  setMoriState("lens-used");
  showRoundImpact(
    "lens",
    "ARCHIVE LENS",
    ZONE_LABELS[chip.def.zone],
    `${runtime.lensCharges} CHARGE${runtime.lensCharges === 1 ? "" : "S"} REMAIN`,
    reducedMotionQuery.matches ? 450 : 900,
  );
  updateScoreAndIntegrity();
  audio.navigate(runtime.lensCharges);
  announce(`ARCHIVE LENS를 사용했습니다. 신호 하나의 정답 구역을 밝혔습니다. 남은 충전 ${runtime.lensCharges}회.`);
}

function triggerDeepVerifyBurst() {
  if (runtime.mode !== "play" || runtime.locked) return;
  if (runtime.integrity <= 1) {
    showToast("DEEP VERIFY는 기억 무결성이 2칸 이상일 때만 켤 수 있습니다.");
    announce("DEEP VERIFY를 사용할 수 없습니다. 기억 무결성이 1칸 남았습니다.");
    return;
  }
  if (runtime.deepVerifyUsedWaveIndex === runtime.roundIndex || isDeepVerifyBurstActive()) {
    showToast("DEEP VERIFY는 웨이브마다 한 번만 사용할 수 있습니다.");
    return;
  }

  runtime.deepVerifyUsedWaveIndex = runtime.roundIndex;
  runtime.deepVerifyBurstUntil = performance.now() + DEEP_VERIFY_BURST_MS;
  updateDeepVerifyStatus();
  elements.roundFeedback.textContent =
    `DEEP VERIFY ON · ${Math.round(DEEP_VERIFY_BURST_MS / 1000)}초간 정답 +${runtime.deepVerifyBonus} / 오답 무결성 -2`;
  elements.roundFeedback.className = "round-feedback is-wager";
  setMoriState("deep-verify");
  audio.navigate(2);
  announce(`DEEP VERIFY를 켰습니다. ${Math.round(DEEP_VERIFY_BURST_MS / 1000)}초 동안 정답이면 ${runtime.deepVerifyBonus}점을 더 받고, 실패하면 기억 무결성을 2칸 잃습니다.`);

  window.setTimeout(() => {
    if (runtime.mode !== "play" || runtime.locked) return;
    updateDeepVerifyStatus();
    const finalCore = runtime.roundIndex === TOTAL_ROUNDS - 1;
    announce("DEEP VERIFY 시간이 끝났습니다.");
    if (!finalCore) setMoriState("observing", WAVE_MORI_DIALOGUE[runtime.roundIndex]);
  }, DEEP_VERIFY_BURST_MS + 20);
}

function startWave() {
  cancelRoundTimers();
  if (runtime.integrity <= 0 || runtime.roundIndex >= TOTAL_ROUNDS) {
    finishGame();
    return;
  }

  const waveNumber = String(runtime.roundIndex + 1).padStart(2, "0");
  const finalCore = runtime.roundIndex === TOTAL_ROUNDS - 1;
  runtime.locked = false;
  runtime.waveConfig = getWaveConfig(runtime.roundIndex);
  runtime.waveChipPool = createChipPool(runtime.catalog, runtime.roundIndex, runtime.seed);
  runtime.waveChipCursor = 0;
  runtime.waveCorrect = 0;
  runtime.waveWrong = 0;
  runtime.waveMissed = 0;
  runtime.nextSpawnAt = performance.now();
  runtime.waveDeadline = performance.now() + getWaveDurationMs(runtime.roundIndex);
  runtime.clockTenths = -1;
  runtime.pressureWarned = false;
  runtime.deepVerifyBonus = getDeepVerifyBonus(runtime.roundIndex);
  clearTriageLane();
  elements.screenStack.dataset.timePressure = "false";
  elements.screenStack.dataset.finalRound = String(finalCore);

  elements.roundKicker.textContent = finalCore
    ? `FINAL CORE / SIGNAL TRIAGE · ${waveNumber}/${String(TOTAL_ROUNDS).padStart(2, "0")}`
    : `SIGNAL TRIAGE · WAVE ${waveNumber}/${String(TOTAL_ROUNDS).padStart(2, "0")}`;
  elements.roundHeading.textContent = PLAY_INSTRUCTION.prompt;
  elements.boardInstruction.textContent = PLAY_INSTRUCTION.instruction;
  elements.roundFeedback.textContent = "";
  elements.roundFeedback.className = "round-feedback";
  resetRoundImpact();
  updateWaveTime();
  updateWaveProgress();
  document.title = finalCore
    ? "[FINAL CORE] STATE//LESS"
    : `[${runtime.roundIndex + 1}/${TOTAL_ROUNDS}] STATE//LESS`;
  updateMemoryRoute(finalCore ? "audit/final-core" : `audit/wave-${waveNumber}`);
  if (finalCore) setMoriState("core-final");
  else setMoriState("observing", WAVE_MORI_DIALOGUE[runtime.roundIndex]);

  updateScoreAndIntegrity();
  if (finalCore) {
    audio.core();
    announce(`마지막 코어 웨이브. ${PLAY_INSTRUCTION.instruction} DEEP VERIFY 정답 보너스가 ${runtime.deepVerifyBonus}점으로 상승했습니다.`);
  } else {
    announce(`${runtime.roundIndex + 1}번째 웨이브 시작. ${PLAY_INSTRUCTION.instruction}`);
  }
  if (runtime.roundIndex === 0 && runtime.memory.runs === 0) {
    showToast("칩 문장을 위 LIVE SIGNAL 값과 비교하세요. '읽을 수 없다'류 문장은 CORRUPTED입니다.");
  }
  runtime.animationFrame = window.requestAnimationFrame(updateWaveFrame);
}

function updateWaveFrame(timestamp) {
  if (runtime.mode !== "play" || runtime.locked) return;

  if (
    timestamp >= runtime.nextSpawnAt
    && runtime.activeChips.size < runtime.waveConfig.maxConcurrent
    && runtime.waveChipCursor < runtime.waveChipPool.length
  ) {
    spawnChip();
    runtime.nextSpawnAt = timestamp + runtime.waveConfig.spawnIntervalMs;
  }

  const expiredIds = [];
  runtime.activeChips.forEach((chip, chipId) => {
    const ratio = clamp01((timestamp - chip.spawnedAt) / runtime.waveConfig.travelMs);
    chip.el.style.setProperty("--chip-progress", String(ratio * 100));
    if (ratio >= 1) expiredIds.push(chipId);
  });
  expiredIds.forEach((chipId) => expireChip(chipId));

  updateWaveTime();

  if (!runtime.pressureWarned && runtime.waveDeadline - timestamp <= 5_000) {
    runtime.pressureWarned = true;
    elements.screenStack.dataset.timePressure = "true";
    setMoriState("time-critical");
    audio.warning();
    announce("5초 남았습니다. 남은 신호를 빠르게 분류하세요.");
  }

  if (timestamp >= runtime.waveDeadline) {
    concludeWave("timeout");
    return;
  }
  runtime.animationFrame = window.requestAnimationFrame(updateWaveFrame);
}

function concludeWave(outcome) {
  if (runtime.mode !== "play" || runtime.locked) return;
  runtime.locked = true;
  window.clearTimeout(runtime.moriPulseTimer);
  window.cancelAnimationFrame(runtime.animationFrame);

  const finalCore = runtime.roundIndex === TOTAL_ROUNDS - 1;
  const correct = outcome === "correct";
  runtime.outcomes[runtime.roundIndex] = outcome;
  if (correct) runtime.correct += 1;

  const recoveredRoundIndex = correct
    ? getSyncRecoveryIndex({
      outcomes: runtime.outcomes,
      streak: runtime.streak,
      used: runtime.syncRecoveryUsed,
    })
    : -1;
  const recoveredRoundNumber = recoveredRoundIndex >= 0
    ? String(recoveredRoundIndex + 1).padStart(2, "0")
    : "";
  if (recoveredRoundIndex >= 0) {
    runtime.outcomes[recoveredRoundIndex] = "recovered";
    runtime.correct += 1;
    runtime.integrity = Math.min(MAX_INTEGRITY, runtime.integrity + 1);
    runtime.syncRecoveryUsed = true;
  }

  const directiveBonus = correct ? awardRunDirectiveBonus() : 0;
  if (directiveBonus) runtime.score += directiveBonus;

  updateScoreAndIntegrity();

  if (correct) {
    audio.correct(runtime.streak);
    setMoriState(recoveredRoundIndex >= 0
      ? "sync-recovery"
      : directiveBonus > 0
        ? "directive-complete"
        : finalCore ? "core-final" : "answer-correct");
    const recoveryNotice = recoveredRoundIndex >= 0
      ? ` · SYNC RECOVERY로 웨이브 ${recoveredRoundNumber} 복구`
      : "";
    const directiveNotice = directiveBonus ? ` · MORI REQUEST +${directiveBonus}` : "";
    elements.roundFeedback.textContent =
      `${finalCore ? "FINAL CORE · " : ""}웨이브 클리어 · 정답 ${runtime.waveCorrect}개${directiveNotice}${recoveryNotice}`;
    elements.roundFeedback.className = "round-feedback is-positive";
    showRoundImpact(
      "correct",
      recoveredRoundIndex >= 0
        ? "SYNC RECOVERY"
        : finalCore
          ? "CORE SEALED"
          : directiveBonus > 0 ? "REQUEST SEALED" : "WAVE CLEARED",
      `+${directiveBonus || runtime.waveCorrect}`,
      `CHAIN ×${runtime.maxStreak} · WRONG ${runtime.waveWrong} · MISS ${runtime.waveMissed}`,
    );
    announce(`웨이브 ${runtime.roundIndex + 1} 클리어. 정답 ${runtime.waveCorrect}개.${directiveBonus ? ` MORI REQUEST 완료 +${directiveBonus}점.` : ""}`);
  } else {
    runtime.streak = 0;
    audio.wrong();
    setMoriState(
      "answer-wrong",
      finalCore ? "마지막 코어를 봉인하지 못했어. 그래도 결과를 보기 전까지는 놓지 마." : "",
    );
    elements.roundFeedback.textContent =
      `${finalCore ? "FINAL CORE · " : ""}웨이브 실패 · 정답 ${runtime.waveCorrect}/${runtime.waveConfig.target}`;
    elements.roundFeedback.className = "round-feedback is-negative";
    showRoundImpact(
      outcome === "timeout" ? "timeout" : "wrong",
      finalCore ? "CORE FRACTURE" : outcome === "timeout" ? "TIME FRACTURE" : "INDEX HURT",
      `${runtime.waveCorrect}/${runtime.waveConfig.target}`,
      outcome === "timeout" ? "SCAN WINDOW CLOSED" : "INTEGRITY DEPLETED",
    );
    announce(`웨이브 ${runtime.roundIndex + 1}을 완료하지 못했습니다. 정답 ${runtime.waveCorrect}/${runtime.waveConfig.target}.`);
  }

  const auditFinished = runtime.integrity <= 0 || runtime.roundIndex >= TOTAL_ROUNDS - 1;
  elements.roundContinueLabel.textContent = auditFinished ? "VIEW RESULT" : "NEXT WAVE";
  elements.roundContinueButton.hidden = false;
  if (runtime.inputMode === "keyboard") {
    elements.roundContinueButton.focus({ preventScroll: true });
  }
  runtime.advanceTimer = window.setTimeout(
    advanceRound,
    reducedMotionQuery.matches ? 700 : 2_200,
  );
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
  elements.resultRecordBody.textContent = "여섯 번 중 다섯 번 이상 성공해 VERIFIED 결말에 도달하면 이 파일이 열립니다.";
  return null;
}

async function finishGame() {
  cancelRoundTimers();
  runtime.mode = "result";
  const provisionalResult = getResult({
    score: runtime.score,
    correct: runtime.correct,
    integrity: runtime.integrity,
    recoveryUsed: runtime.syncRecoveryUsed,
  });
  const finalDirectiveBonus = awardRunDirectiveBonus(provisionalResult.ending);
  runtime.score += finalDirectiveBonus;
  runtime.lastResult = getResult({
    score: runtime.score,
    correct: runtime.correct,
    integrity: runtime.integrity,
    recoveryUsed: runtime.syncRecoveryUsed,
  });

  const result = runtime.lastResult;
  const styleTag = getRunStyleTag({
    deepVerifyWins: runtime.deepVerifyWins,
    syncRecoveryUsed: runtime.syncRecoveryUsed,
    wrongCount: runtime.wrongCount,
    maxStreak: runtime.maxStreak,
  });
  const styleRemark = getRunStyleRemark(styleTag);
  renderResultDirective(result.ending);
  runtime.pendingFragments = getFragmentReward(runtime.memory.fragments, result.ending);
  const foundNewFragment = runtime.pendingFragments > runtime.memory.fragments;
  const recoveredRecord = renderResultArchive(foundNewFragment);
  const completedNow = Boolean(foundNewFragment && recoveredRecord?.final);
  const recoverySummary = runtime.syncRecoveryUsed
    ? " SYNC RECOVERY로 이전 오류 하나를 복구했습니다."
    : "";
  elements.resultKicker.textContent = completedNow
    ? "ARCHIVE COMPLETE"
    : result.ending === "verified" ? "AUDIT COMPLETE" : "AUDIT INTERRUPTED";
  elements.resultGlyph.textContent = result.rank;
  elements.resultHeading.textContent = result.title;
  if (completedNow) {
    elements.resultMessage.textContent = `${result.message}${recoverySummary} 마지막 기억 조각과 MORI의 최종 기록을 복구했습니다.`;
  } else if (foundNewFragment) {
    elements.resultMessage.textContent = `${result.message}${recoverySummary} ${recoveredRecord.code}가 열렸습니다. 저장하면 다음 방문에도 읽을 수 있습니다.`;
  } else if (runtime.pendingFragments >= MAX_MEMORY_FRAGMENTS) {
    elements.resultMessage.textContent = `${result.message}${recoverySummary} MORI의 여섯 기록은 이미 모두 복구되어 있습니다.`;
  } else {
    elements.resultMessage.textContent = `${result.message}${recoverySummary} 이번 감사에서는 새 기억 조각을 얻지 못했습니다.`;
  }
  elements.resultScore.textContent = formatScore(runtime.score);
  elements.resultRank.textContent = result.rank;
  elements.resultTruth.textContent = `${runtime.correct}/${TOTAL_ROUNDS}`;
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
    elements.rememberButton.focus({ preventScroll: true });
  }
  const recordAnnouncement = foundNewFragment ? ` ${recoveredRecord.code}, ${recoveredRecord.title} 공개.` : " 새 기억 조각 없음.";
  const directiveAnnouncement = runtime.directiveCompleted
    ? ` MORI REQUEST 완료, 보너스 ${runtime.directive.bonus}점.`
    : " MORI REQUEST 미완료.";
  announce(`${result.title} 점수 ${formatScore(runtime.score)}, 랭크 ${result.rank}, 기억 조각 ${runtime.pendingFragments}/${MAX_MEMORY_FRAGMENTS}.${directiveAnnouncement}${recordAnnouncement}`);
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
  revealScreenOnStackedLayout(elements.introScreen);
  showToast("게임 쿠키를 지웠습니다. 저장된 상태는 복구되지 않습니다.");
  const target = elements.memoryButtons[0];
  if (runtime.inputMode === "keyboard") target.focus({ preventScroll: true });
}

function regenerateActiveRound(reason, moriState = "observing") {
  if (runtime.mode !== "play" || runtime.locked) return;
  runtime.stateRevision += 1;
  createDeck();
  showToast(reason);
  startWave();
  setMoriState(moriState);
}

function handleVisibilityChange() {
  if (!runtime.ready || !document.hidden) {
    if (!document.hidden && runtime.mode === "paused") {
      runtime.mode = "play";
      updateTelemetry();
      regenerateActiveRound("탭 이탈이 기록되어 현재 문장을 다시 추론했습니다.", "tab-left");
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

function handleEnvironmentChange(message, moriState = "observing") {
  updateTelemetry();
  regenerateActiveRound(message, moriState);
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
      handleEnvironmentChange("같은 페이지의 다른 탭이 감지되었습니다.", "other-self");
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

  if (
    runtime.mode === "play"
    && runtime.locked
    && (event.key === " " || event.key === "Enter")
  ) {
    event.preventDefault();
    if (!event.repeat) advanceRound();
    return;
  }

  if (runtime.mode === "play" && !runtime.locked) {
    if (event.key.toLowerCase() === "d") {
      event.preventDefault();
      if (!event.repeat) triggerDeepVerifyBurst();
      return;
    }
    if (event.key.toLowerCase() === "f") {
      event.preventDefault();
      if (!event.repeat) useArchiveLens();
      return;
    }
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      cycleChipSelection(event.key === "ArrowRight" ? 1 : -1);
      return;
    }
    if (event.key === "1") {
      event.preventDefault();
      assignSelectedChip("true");
      return;
    }
    if (event.key === "2") {
      event.preventDefault();
      assignSelectedChip("false");
      return;
    }
    if (event.key === "3") {
      event.preventDefault();
      assignSelectedChip("corrupted");
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
elements.deepVerifyButton.addEventListener("click", triggerDeepVerifyBurst);
elements.zoneTrue.addEventListener("click", () => assignSelectedChip("true"));
elements.zoneFalse.addEventListener("click", () => assignSelectedChip("false"));
elements.zoneCorrupted.addEventListener("click", () => assignSelectedChip("corrupted"));
elements.roundContinueButton.addEventListener("click", advanceRound);
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
