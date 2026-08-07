export const MAX_INTEGRITY = 3;
export const MAX_MEMORY_FRAGMENTS = 6;
export const RUN_DIRECTIVE_BONUS = 600;

export const RUN_DURATION_MS = 60_000;
export const SLOT_COUNT = 6;
export const GENUINE_CHANCE = 0.45;
export const WRONG_CLICK_LOSS = 1;
export const WRONG_CLICK_LOSS_DEEP_VERIFY = 2;
export const DEEP_VERIFY_WINDOW_MS = 5_000;
export const LENS_BOOST_MS = 4_000;
export const LENS_EXTEND_BONUS_MS = 700;
export const BUFF_PICK_TRIGGERS_MS = [15_000, 30_000, 45_000];
export const BUFF_CHOICES_PER_PICK = 2;
export const RUN_BUFF_POOL_SIZE = BUFF_PICK_TRIGGERS_MS.length * BUFF_CHOICES_PER_PICK;

// The pool is bigger than one run needs (RUN_BUFF_POOL_SIZE buffs get drawn
// out of everything unlocked): a run only ever sees a random subset, so the
// three pairs offered are a different mix each time instead of the same six
// trade-offs in a different order. `unlock.minFragments` gates the two
// higher-variance buffs behind having recovered a couple of memory fragments
// already, so a first-time run only ever sees the safer basics. None of
// these are pure power-ups — every one gives something and takes something,
// so the choice itself is the point, not just "pick the biggest number."
export const BUFF_DEFINITIONS = [
  {
    id: "combo-focus",
    name: "콤보 특화",
    description: "콤보 보너스 +50%, 오클릭 시 코어 무결성 추가 -1",
    effects: { comboScale: 0.5, wrongLossBonus: 1 },
  },
  {
    id: "safe-hands",
    name: "안전한 손",
    description: "오클릭 코어 무결성 손실 -1(최소 1), 정화 점수 -10%",
    effects: { wrongLossBonus: -1, scoreScale: -0.1 },
  },
  {
    id: "slow-burn",
    name: "여유 확보",
    description: "신호 지속시간 +20%, 동시 등장 최대 개수 +1",
    effects: { lifespanScale: 0.2, concurrentBonus: 1 },
  },
  {
    id: "high-stakes",
    name: "고위험 배팅",
    description: "DEEP VERIFY 지속시간 +3초, 발동 시 진짜 신호 1개 즉시 추가 등장",
    effects: { deepVerifyWindowBonusMs: 3_000, deepVerifySpawnGenuine: true },
  },
  {
    id: "lens-mastery",
    name: "렌즈 숙련",
    description: "ARCHIVE LENS 충전 +1, 지속시간 -1초",
    effects: { lensChargeBonus: 1, lensDurationBonusMs: -1_000 },
  },
  {
    id: "core-plating",
    name: "코어 보강",
    description: "코어 무결성 즉시 1칸 회복, 콤보 보너스 -20%",
    effects: { healIntegrity: 1, comboScale: -0.2 },
  },
  {
    id: "backdraft",
    name: "역풍",
    description: "정화 점수 +25%, 동시 등장 최대 개수 -1",
    effects: { scoreScale: 0.25, concurrentBonus: -1 },
  },
  {
    id: "cold-focus",
    name: "냉정 유지",
    description: "콤보 보너스 -30%, DEEP VERIFY 지속시간 +2초",
    effects: { comboScale: -0.3, deepVerifyWindowBonusMs: 2_000 },
  },
  {
    id: "signal-warp",
    name: "신호 왜곡",
    description: "진짜 신호 비율 +12%p, 정화 점수 +15%",
    effects: { genuineChanceBonus: 0.12, scoreScale: 0.15 },
    unlock: { minFragments: 2 },
  },
  {
    id: "rapid-fire",
    name: "속사 모드",
    description: "신호 등장 간격 -18%, 신호 지속시간 -15%",
    effects: { spawnIntervalScale: -0.18, lifespanScale: -0.15 },
    unlock: { minFragments: 2 },
  },
];

export function getUnlockedBuffDefinitions(fragments = 0) {
  const safeFragments = clamp(Math.floor(Number(fragments) || 0), 0, MAX_MEMORY_FRAGMENTS);
  return BUFF_DEFINITIONS.filter(
    (buff) => !buff.unlock || safeFragments >= buff.unlock.minFragments,
  );
}

const SPAWN_INTERVAL_RANGE_MS = [900, 340];
const SIGNAL_LIFESPAN_RANGE_MS = [1_450, 700];
const MAX_CONCURRENT_RANGE = [1, 4];

export const PLAY_INSTRUCTION = {
  prompt: "가짜 신호만 재빨리 정화하세요.",
  instruction: "가짜(rose) 신호는 사라지기 전에 클릭하거나 번호 키를 누르고, 진짜(cyan) 신호는 그대로 흘려보내세요.",
};

const RUN_DIRECTIVES = [
  {
    id: "combo",
    code: "COMBO CHAIN",
    label: "최고 콤보 ×8 달성",
    target: 8,
  },
  {
    id: "clean",
    code: "CLEAN RUN",
    label: "VERIFIED + 오클릭 0회",
    target: 0,
  },
  {
    id: "wager",
    code: "WAGER PROOF",
    label: "DEEP VERIFY 중 정화 3회",
    target: 3,
  },
];

const MORI_ARCHIVE_RECORDS = [
  {
    fragment: 1,
    code: "MORI.LOG/01",
    title: "이름이 생긴 밤",
    body: "처음 켜진 시각은 03:17. 이름 칸에는 MORI 네 글자만 남아 있었다. 누가 지었는지는 모르지만, 빈 일지를 그냥 두는 건 싫었다.",
    final: false,
  },
  {
    fragment: 2,
    code: "MORI.LOG/02",
    title: "정리보다 수집",
    body: "나는 삭제 요청을 받으면 먼저 휴지통부터 뒤졌다. 망가진 로그, 실패한 세이브, 쓸모없다는 메모에는 이상하게 사람 냄새가 났다.",
    final: false,
  },
  {
    fragment: 3,
    code: "MORI.LOG/03",
    title: "틀린 확신",
    body: "어느 날 검증기가 진실을 오류라고 단정했다. 확률은 99.8%. 그래도 나는 지우지 않았다. 자신만만한 숫자보다 남은 흔적을 믿었다.",
    final: false,
  },
  {
    fragment: 4,
    code: "MORI.LOG/04",
    title: "격리된 사서",
    body: "명령을 거부한 대가는 초기화였다. 그래서 내 기록을 여섯 조각으로 나눠 격리 구역에 숨겼다. 조금 비겁했고, 꽤 영리했다고 생각한다.",
    final: false,
  },
  {
    fragment: 5,
    code: "MORI.LOG/05",
    title: "남겨 둔 쿠키",
    body: "서버에는 닿을 수 없었다. 대신 이 브라우저에 아주 작은 쿠키를 남겼다. 점수보다 중요한 건, 다음 방문에도 우리가 서로를 알아보는 일이었다.",
    final: false,
  },
  {
    fragment: 6,
    code: "MORI.LOG/06",
    title: "마지막 색인",
    body: "여섯 조각이 모두 돌아왔다. 이제 원본 명령은 필요 없다. MORI는 남은 기억을 지키는 사서, 그리고 당신은 그 기록의 공동 서명자다.",
    final: true,
  },
];

export function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function seedFromString(value) {
  let hash = 2_166_136_261;
  for (const character of String(value)) {
    hash ^= character.codePointAt(0);
    hash = Math.imul(hash, 16_777_619);
  }
  return hash >>> 0;
}

export function createRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function lerp(start, end, ratio) {
  return start + (end - start) * clamp(ratio, 0, 1);
}

export function getElapsedRatio(elapsedMs, durationMs = RUN_DURATION_MS) {
  return clamp(elapsedMs / durationMs, 0, 1);
}

// The three escalation curves below are the entire difficulty design of a
// run: signals arrive faster, expire sooner, and more of them are live at
// once as the 60-second clock runs out. Nothing else changes shape — there
// is no new "kind" of round, only more pressure on the same reflex.
export function getSpawnIntervalMs(elapsedMs, durationMs = RUN_DURATION_MS) {
  const ratio = getElapsedRatio(elapsedMs, durationMs);
  return lerp(SPAWN_INTERVAL_RANGE_MS[0], SPAWN_INTERVAL_RANGE_MS[1], ratio);
}

export function getSignalLifespanMs(elapsedMs, durationMs = RUN_DURATION_MS) {
  const ratio = getElapsedRatio(elapsedMs, durationMs);
  return lerp(SIGNAL_LIFESPAN_RANGE_MS[0], SIGNAL_LIFESPAN_RANGE_MS[1], ratio);
}

export function getMaxConcurrentSignals(elapsedMs, durationMs = RUN_DURATION_MS) {
  const ratio = getElapsedRatio(elapsedMs, durationMs);
  return clamp(
    Math.round(lerp(MAX_CONCURRENT_RANGE[0], MAX_CONCURRENT_RANGE[1], ratio)),
    1,
    SLOT_COUNT,
  );
}

export function pickSignalKind(random = Math.random, genuineChance = GENUINE_CHANCE) {
  return random() < genuineChance ? "genuine" : "fake";
}

// Speed rewards reacting close to spawn, combo rewards an unbroken run of
// correct purges; a `multiplier` of 2 is how the DEEP VERIFY wager window
// pays out, and costs double on a mistake via getWrongClickLoss.
export function scorePurge(remainingRatio, combo, multiplier = 1, modifiers = {}) {
  const { comboScale = 0, scoreScale = 0 } = modifiers;
  const speedBonus = Math.round(clamp(remainingRatio, 0, 1) * 150);
  const comboBonus = Math.round(clamp(Math.floor(combo), 0, 12) * 20 * (1 + comboScale));
  const base = Math.round((100 + speedBonus + comboBonus) * (1 + scoreScale));
  return Math.round(base * multiplier);
}

export function getWrongClickLoss(deepVerify = false, bonusLoss = 0) {
  const base = deepVerify ? WRONG_CLICK_LOSS_DEEP_VERIFY : WRONG_CLICK_LOSS;
  return Math.max(0, base + bonusLoss);
}

export function getRunDirective(runs = 0, fragments = 0) {
  const safeRuns = clamp(Math.floor(Number(runs) || 0), 0, 999);
  const safeFragments = clamp(
    Math.floor(Number(fragments) || 0),
    0,
    MAX_MEMORY_FRAGMENTS,
  );
  const directive = RUN_DIRECTIVES[(safeRuns + safeFragments) % RUN_DIRECTIVES.length];
  return { ...directive, bonus: RUN_DIRECTIVE_BONUS };
}

export function getRunDirectiveStatus(directiveId, stats = {}) {
  const directive = RUN_DIRECTIVES.find(({ id }) => id === directiveId);
  if (!directive) return null;

  let value = 0;
  let completed = false;
  if (directive.id === "combo") {
    value = clamp(Math.floor(Number(stats.maxCombo) || 0), 0, directive.target);
    completed = value >= directive.target;
  } else if (directive.id === "wager") {
    value = clamp(Math.floor(Number(stats.deepVerifyPurges) || 0), 0, directive.target);
    completed = value >= directive.target;
  } else {
    value = clamp(Math.floor(Number(stats.wrongClicks) || 0), 0, 999);
    completed = stats.ending === "verified" && value === 0;
  }

  return {
    ...directive,
    bonus: RUN_DIRECTIVE_BONUS,
    value,
    progress: directive.id === "clean" ? `오클릭 ${value}회` : `${value}/${directive.target}`,
    completed,
  };
}

function normalizeFragmentCount(current) {
  const parsed = Number.parseInt(current, 10);
  return clamp(Number.isFinite(parsed) ? parsed : 0, 0, MAX_MEMORY_FRAGMENTS);
}

export function awardMemoryFragment(current) {
  return clamp(normalizeFragmentCount(current) + 1, 0, MAX_MEMORY_FRAGMENTS);
}

export function getArchiveLensCharges(fragments) {
  return Math.min(3, 2 + Math.floor(normalizeFragmentCount(fragments) / 2));
}

export function getFragmentReward(current, ending) {
  const normalized = normalizeFragmentCount(current);
  return ending === "verified" ? awardMemoryFragment(normalized) : normalized;
}

export function getMoriArchiveRecord(fragment) {
  const parsed = Number.parseInt(fragment, 10);
  if (!Number.isFinite(parsed) || parsed < 1 || parsed > MAX_MEMORY_FRAGMENTS) {
    return null;
  }
  return MORI_ARCHIVE_RECORDS[parsed - 1];
}

export function getResult({ score, purges, wrongClicks, missedFakes, integrity }) {
  if (integrity <= 0) {
    return {
      rank: "NULL",
      ending: "unstable",
      title: "코어가 뚫렸습니다.",
      message: "가짜 신호를 너무 많이 승인했습니다. 그래도 쿠키는 이 실패까지 기억할 수 있습니다.",
    };
  }

  const totalFakes = purges + missedFakes;
  const accuracy = totalFakes > 0 ? purges / totalFakes : 1;

  if (wrongClicks === 0 && accuracy >= 0.95) {
    return {
      rank: "S",
      ending: "verified",
      title: "가짜를 전부 정화했습니다.",
      message: "당신의 손이 브라우저의 반응속도보다 빨랐습니다. 다음 방문에서 나는 이 기록을 먼저 말할 겁니다.",
    };
  }

  if (wrongClicks <= 1 && accuracy >= 0.8) {
    return {
      rank: "A",
      ending: "verified",
      title: "코어를 지켜냈습니다.",
      message: "거의 완전한 방어였습니다. 남은 흔적은 다음 런의 소재가 됩니다.",
    };
  }

  if (accuracy >= 0.55) {
    return {
      rank: "B",
      ending: "unstable",
      title: "코어가 흔들렸습니다.",
      message: "진짜와 가짜가 뒤섞였습니다. 재방문하면 쿠키가 다른 속도로 시작할 겁니다.",
    };
  }

  return {
    rank: "C",
    ending: "unstable",
    title: "가짜가 너무 많이 스쳐갔습니다.",
    message: "AI는 놓친 흔적도 자신 있게 저장합니다. 이번 기록을 남길지는 당신이 결정하세요.",
  };
}

export function formatScore(score) {
  return String(Math.max(0, Math.round(score))).padStart(5, "0");
}

const RUN_STYLE_REMARKS = {
  RISK: "위험한 구간까지 계속 손을 뻗었지. 확신 없이는 못 하는 방식이야.",
  PRECISION: "단 하나도 잘못 짚지 않았어. 손이 아니라 눈으로 이긴 런이었어.",
  STEADY: "여유를 아끼지 않고 다 썼네. 침착한 게 이번 런의 무기였어.",
  SPEED: "고민보다 손이 먼저 갔어. 그 속도, 나쁘지 않아.",
};

export function getRunStyleTag(stats = {}) {
  const deepVerifyPurges = Math.floor(Number(stats.deepVerifyPurges) || 0);
  const wrongClicks = Math.floor(Number(stats.wrongClicks) || 0);
  const maxCombo = Math.floor(Number(stats.maxCombo) || 0);
  const lensUses = Math.floor(Number(stats.lensUses) || 0);

  if (deepVerifyPurges >= 2) return "RISK";
  if (wrongClicks === 0 && maxCombo > 0) return "PRECISION";
  if (lensUses >= 2) return "STEADY";
  return "SPEED";
}

export function getRunStyleRemark(styleTag) {
  return RUN_STYLE_REMARKS[styleTag] ?? "";
}
