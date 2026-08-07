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
export const BUFF_PICK_FIRST_MS = 7_000;
export const BUFF_PICK_INTERVAL_MS = 6_500;
export const BUFF_PICK_END_BUFFER_MS = 1_500;
export const BUFF_CHOICES_PER_PICK = 2;

// Picks repeat on a cadence for the whole run instead of stopping after
// three — a 60s run gets roughly eight of them. Values past durationMs -
// BUFF_PICK_END_BUFFER_MS are dropped so a pick never opens right at the
// buzzer with no time left to act on it.
export function getBuffPickTriggers(
  durationMs = RUN_DURATION_MS,
  firstMs = BUFF_PICK_FIRST_MS,
  intervalMs = BUFF_PICK_INTERVAL_MS,
) {
  const triggers = [];
  for (let t = firstMs; t <= durationMs - BUFF_PICK_END_BUFFER_MS; t += intervalMs) {
    triggers.push(t);
  }
  return triggers;
}

// Unlike a typical roguelite, there is no cap on how many items a run can
// hold: the same item can be offered and picked again, and its effects
// stack every time (see `chooseBuff` in main.js, which folds every numeric
// field into a running total). That is the deliberate point of difference
// from genre references like Vampire Survivors — no slot limit, no
// replacing an old pick to make room for a new one. Because stacking is
// unlimited, every consuming call site clamps its own math to a sane floor
// (see `scorePurge` below and the spawn/lifespan call sites in main.js) so
// ten copies of the same item can never divide-by-zero or invert a
// mechanic, only approach a limit. `unlock.minFragments` gates a handful of
// higher-variance items behind having recovered a couple of memory
// fragments already, so a first-time run only ever sees the safer basics.
// None of these are pure power-ups — every one gives something and takes
// something, so the choice itself is the point, not just "pick the biggest
// number."
export const BUFF_DEFINITIONS = [
  {
    id: "combo-focus",
    name: "콤보 특화",
    description: "콤보 보너스 +50%, 오클릭 시 코어 무결성 추가 -1",
    effects: { comboScale: 0.5, wrongLossBonus: 1 },
    moriLine: "몰아치고 싶으면 몰아쳐. 대신 삐끗하면 두 배로 아파.",
  },
  {
    id: "safe-hands",
    name: "안전한 손",
    description: "오클릭 코어 무결성 손실 -1(최소 1), 정화 점수 -10%",
    effects: { wrongLossBonus: -1, scoreScale: -0.1 },
    moriLine: "손 떨리면 이걸로 가. 대신 값은 좀 짜게 받을 거야.",
  },
  {
    id: "slow-burn",
    name: "여유 확보",
    description: "신호 지속시간 +20%, 동시 등장 최대 개수 +1",
    effects: { lifespanScale: 0.2, concurrentBonus: 1 },
    moriLine: "숨 돌릴 시간은 늘렸는데, 화면은 더 복잡해질 거야.",
  },
  {
    id: "high-stakes",
    name: "고위험 배팅",
    description: "DEEP VERIFY 지속시간 +3초, 발동 시 진짜 신호 1개 즉시 추가 등장",
    effects: { deepVerifyWindowBonusMs: 3_000, deepVerifySpawnGenuine: true },
    moriLine: "확신 있으면 오래 걸어봐. 그만큼 함정도 하나 더 깔았어.",
  },
  {
    id: "lens-mastery",
    name: "렌즈 숙련",
    description: "ARCHIVE LENS 충전 +1, 지속시간 -1초",
    effects: { lensChargeBonus: 1, lensDurationBonusMs: -1_000 },
    moriLine: "렌즈는 하나 더 줄게. 대신 한 번 켤 때 짧게 봐야 해.",
  },
  {
    id: "core-plating",
    name: "코어 보강",
    description: "코어 무결성 즉시 1칸 회복, 콤보 보너스 -20%",
    effects: { healIntegrity: 1, comboScale: -0.2 },
    moriLine: "일단 채워줄게. 대신 몰아치는 맛은 좀 죽어.",
  },
  {
    id: "backdraft",
    name: "역풍",
    description: "정화 점수 +25%, 동시 등장 최대 개수 -1",
    effects: { scoreScale: 0.25, concurrentBonus: -1 },
    moriLine: "값은 올려줄게. 대신 동시에 볼 건 줄어들어.",
  },
  {
    id: "cold-focus",
    name: "냉정 유지",
    description: "콤보 보너스 -30%, DEEP VERIFY 지속시간 +2초",
    effects: { comboScale: -0.3, deepVerifyWindowBonusMs: 2_000 },
    moriLine: "몰아치기보단 침착하게 가는 쪽이야.",
  },
  {
    id: "signal-warp",
    name: "신호 왜곡",
    description: "진짜 신호 비율 +12%p, 정화 점수 +15%",
    effects: { genuineChanceBonus: 0.12, scoreScale: 0.15 },
    unlock: { minFragments: 2 },
    moriLine: "진짜가 더 많아질 거야. 그래도 값은 후하게 쳐줄게.",
  },
  {
    id: "rapid-fire",
    name: "속사 모드",
    description: "신호 등장 간격 -18%, 신호 지속시간 -15%",
    effects: { spawnIntervalScale: -0.18, lifespanScale: -0.15 },
    unlock: { minFragments: 2 },
    moriLine: "더 빨리, 더 짧게. 손이 못 따라가면 그건 내 알 바 아니야.",
  },
  {
    id: "guardian-ward",
    name: "보호막",
    description: "다음 오클릭 1회를 완전히 무효화하는 보호막 1개 획득, 정화 점수 -8%",
    effects: { shieldCharges: 1, scoreScale: -0.08 },
    moriLine: "이번 실수는 내가 대신 맞아줄게. 그래도 정산은 좀 짜게 할 거야.",
  },
  {
    id: "second-wind",
    name: "두 번째 숨",
    description: "코어가 파괴될 위기에 무결성 1칸으로 단 1회 부활, 이후 오클릭 손실 +1",
    effects: { reviveCharges: 1, wrongLossBonus: 1 },
    unlock: { minFragments: 4 },
    moriLine: "한 번은 다시 살려줄게. 그다음부터는 진짜 봐줄 사람이 없어.",
  },
  {
    id: "chain-reaction",
    name: "연쇄 반응",
    description: "가짜 정화 시 20% 확률로 다른 가짜 하나도 자동 정화, 콤보 배율 -15%",
    effects: { chainClearChance: 0.2, comboScale: -0.15 },
    moriLine: "하나 지우면 옆도 같이 지워질 수 있어. 대신 몰아치는 맛은 줄었어.",
  },
  {
    id: "milestone-cache",
    name: "마일스톤 캐시",
    description: "콤보 4/8/12 달성마다 +80점 고정 보너스, 진짜 신호 비율 +6%p",
    effects: { milestoneScoreBonus: 80, genuineChanceBonus: 0.06 },
    moriLine: "고비마다 따로 챙겨줄게. 대신 진짜가 더 자주 섞여 나올 거야.",
  },
  {
    id: "wager-addict",
    name: "베팅 중독",
    description: "DEEP VERIFY 1회 추가 사용 가능, 오클릭 손실 +1",
    effects: { extraDeepVerifyUse: 1, wrongLossBonus: 1 },
    unlock: { minFragments: 2 },
    moriLine: "한 번 더 걸게 해줄게. 그만큼 실수의 값도 계속 올라가.",
  },
  {
    id: "overclocked-ward",
    name: "과부하 보호막",
    description: "보호막 1개 획득, 신호 등장 간격 -10%",
    effects: { shieldCharges: 1, spawnIntervalScale: -0.1 },
    moriLine: "막아주는 대신, 더 몰아붙일게.",
  },
  {
    id: "combo-overdrive",
    name: "콤보 오버드라이브",
    description: "콤보 점수 배율 +40%, 오클릭 손실 +1",
    effects: { comboScale: 0.4, wrongLossBonus: 1 },
    moriLine: "화려하게 가고 싶으면, 넘어질 때도 화려하게 넘어져.",
  },
  {
    id: "combo-tunnel-vision",
    name: "콤보 터널비전",
    description: "콤보 점수 배율 +35%, DEEP VERIFY 지속시간 -1.2초",
    effects: { comboScale: 0.35, deepVerifyWindowBonusMs: -1_200 },
    moriLine: "콤보에 눈이 팔리니까, 딴 데 살펴볼 여유가 줄었네.",
  },
  {
    id: "score-surge",
    name: "점수 서지",
    description: "정화 점수 +25%, 오클릭 손실 +1",
    effects: { scoreScale: 0.25, wrongLossBonus: 1 },
    moriLine: "더 챙겨줄게. 대신 실수하면 더 크게 깎여.",
  },
  {
    id: "flat-rate-cash",
    name: "플랫레이트 캐시",
    description: "정화 점수 +30%, 콤보 배율 -25%",
    effects: { scoreScale: 0.3, comboScale: -0.25 },
    moriLine: "매번 확실히 벌게 해줄게. 몰아치는 맛은 좀 죽었어.",
  },
  {
    id: "chain-detonator",
    name: "체인 디토네이터",
    description: "연쇄 정화 확률 +20%, 정화 점수 -10%",
    effects: { chainClearChance: 0.2, scoreScale: -0.1 },
    moriLine: "하나 건드리면 옆도 같이 터져. 근데 한 개당 값은 낮아졌어.",
  },
  {
    id: "snowball-risk",
    name: "스노우볼 리스크",
    description: "연쇄 정화 확률 +15%, 오클릭 손실 +1",
    effects: { chainClearChance: 0.15, wrongLossBonus: 1 },
    moriLine: "번지는 재미는 있는데, 넘어지면 그만큼 아파.",
  },
  {
    id: "milestone-jackpot",
    name: "마일스톤 잭팟",
    description: "콤보 마일스톤(4/8/12) 달성 시 +100점, 콤보 배율 -30%",
    effects: { milestoneScoreBonus: 100, comboScale: -0.3 },
    moriLine: "고비마다 크게 챙겨줄게. 그 사이는 좀 심심할 거야.",
  },
  {
    id: "milestone-overclock",
    name: "마일스톤 오버클럭",
    description: "콤보 마일스톤 달성 시 +130점, 오클릭 손실 +1",
    effects: { milestoneScoreBonus: 130, wrongLossBonus: 1 },
    moriLine: "정점에서 크게 터질게. 실수도 그만큼 크게 터질 거고.",
  },
  {
    id: "verify-gambler",
    name: "베리파이 갬블러",
    description: "DEEP VERIFY 지속시간 +1.5초, 오클릭 손실 +1",
    effects: { deepVerifyWindowBonusMs: 1_500, wrongLossBonus: 1 },
    moriLine: "판단할 시간 늘려줄게. 대신 걸린 값도 늘었어.",
  },
  {
    id: "slow-verify-discount",
    name: "슬로우 베리파이",
    description: "DEEP VERIFY 지속시간 +2초, 정화 점수 -10%",
    effects: { deepVerifyWindowBonusMs: 2_000, scoreScale: -0.1 },
    moriLine: "오래 들여다볼 시간은 주는데, 개당 값은 깎였어.",
  },
  {
    id: "emergency-barrier",
    name: "긴급 차단막",
    description: "보호막 2개 획득, 신호 지속시간 -15%",
    effects: { shieldCharges: 2, lifespanScale: -0.15 },
    moriLine: "막아줄게, 대신 시간은 안 봐줘.",
  },
  {
    id: "last-backup-core",
    name: "최후의 백업 코어",
    description: "코어가 파괴될 위기에 단 1회 부활, 신호 지속시간 -25%",
    effects: { reviveCharges: 1, lifespanScale: -0.25 },
    unlock: { minFragments: 4 },
    moriLine: "한 번은 살려줄게. 그다음부턴 나도 몰라.",
  },
  {
    id: "archive-reserve-permit",
    name: "보관소 예비열람권",
    description: "ARCHIVE LENS 충전 +1, 동시 등장 최대 개수 -1",
    effects: { lensChargeBonus: 1, concurrentBonus: -1 },
    moriLine: "렌즈는 더 줄게. 대신 화면은 좀 심심해질 거야.",
  },
  {
    id: "emergency-suture",
    name: "긴급 봉합",
    description: "코어 무결성 즉시 1칸 회복, 진짜 신호 비율 +8%p",
    effects: { healIntegrity: 1, genuineChanceBonus: 0.08 },
    moriLine: "꿰맸어. 근데 앞으로 진짜가 더 자주 보일 거야, 조심해.",
  },
  {
    id: "multi-scanner-array",
    name: "다중 스캐너 배열",
    description: "동시 등장 최대 개수 +1, 신호 지속시간 -10%",
    effects: { concurrentBonus: 1, lifespanScale: -0.1 },
    moriLine: "더 많이 보여줄게. 대신 오래 안 기다려.",
  },
  {
    id: "focus-filter",
    name: "집중 필터",
    description: "동시 등장 최대 개수 -1, 신호 지속시간 +20%",
    effects: { concurrentBonus: -1, lifespanScale: 0.2 },
    moriLine: "하나씩만 보여줄게. 그러니까 놓치지 마.",
  },
  {
    id: "deep-archive-lens",
    name: "심층 열람 렌즈",
    description: "ARCHIVE LENS 지속시간 +1.2초, 진짜 신호 비율 +10%p",
    effects: { lensDurationBonusMs: 1_200, genuineChanceBonus: 0.1 },
    moriLine: "더 오래 들여다보게 해줄게. 근데 진짜가 늘어날 거야.",
  },
  {
    id: "buffer-barrier",
    name: "완충 배리어",
    description: "보호막 1개 획득, 동시 등장 최대 개수 -1",
    effects: { shieldCharges: 1, concurrentBonus: -1 },
    moriLine: "한 번은 감싸줄게. 대신 기회는 줄어.",
  },
  {
    id: "informant-network",
    name: "정보원 네트워크",
    description: "가짜 신호 비율 +10%p, 신호 지속시간 -15%",
    effects: { genuineChanceBonus: -0.1, lifespanScale: -0.15 },
    moriLine: "가짜를 더 많이 흘려줄게. 잡을 시간은 줄었지만.",
  },
  {
    id: "lens-reserve-bank",
    name: "예비 렌즈 뱅크",
    description: "ARCHIVE LENS 충전 +2, 신호 지속시간 -15%",
    effects: { lensChargeBonus: 2, lifespanScale: -0.15 },
    moriLine: "렌즈는 넉넉하게 채워줄게. 그만큼 밖은 더 빡빡해질 거야.",
  },
  {
    id: "acceleration-pact",
    name: "가속 협정",
    description: "신호 등장 간격 -20%, 연쇄 정화 확률 +12%",
    effects: { spawnIntervalScale: -0.2, chainClearChance: 0.12 },
    moriLine: "빨라진 만큼 정신 차려. 못 따라가면 그건 네 몫이야.",
  },
  {
    id: "dual-verify-warrant",
    name: "이중 열람권",
    description: "DEEP VERIFY 1회 추가 사용 가능, 발동마다 진짜 신호 강제 등장",
    effects: { extraDeepVerifyUse: 1, deepVerifySpawnGenuine: true },
    unlock: { minFragments: 2 },
    moriLine: "한 번 더 걸 수 있어. 대신 매번 진짜 하나씩 끼워줄게.",
  },
  {
    id: "camouflage-overload",
    name: "위장 폭주",
    description: "진짜 신호 비율 +12%p, 연쇄 정화 확률 +15%",
    effects: { genuineChanceBonus: 0.12, chainClearChance: 0.15 },
    unlock: { minFragments: 2 },
    moriLine: "가짜가 줄었어. 걸리면 크게 걸리겠지만.",
  },
  {
    id: "narrow-corridor",
    name: "협소 회랑",
    description: "동시 등장 최대 개수 -1, 진짜 신호 비율 -10%p",
    effects: { concurrentBonus: -1, genuineChanceBonus: -0.1 },
    moriLine: "판이 좁아졌어. 놓칠 것도 별로 없을 거야.",
  },
  {
    id: "milestone-gambit",
    name: "낙차 도박",
    description: "콤보 마일스톤 달성 시 +90점, 진짜 신호 비율 +10%p",
    effects: { milestoneScoreBonus: 90, genuineChanceBonus: 0.1 },
    moriLine: "콤보까지 가면 크게 준다. 가는 길이 문제지.",
  },
  {
    id: "high-tide-alert",
    name: "만조 경보",
    description: "동시 등장 최대 개수 +2, 진짜 신호 비율 +15%p",
    effects: { concurrentBonus: 2, genuineChanceBonus: 0.15 },
    unlock: { minFragments: 2 },
    moriLine: "자리는 늘었어. 진짜도 늘었으니 눈 크게 떠.",
  },
  {
    id: "re-verification-accord",
    name: "재열람 협약",
    description: "DEEP VERIFY 1회 추가 사용 가능, 신호 등장 간격 +20%",
    effects: { extraDeepVerifyUse: 1, spawnIntervalScale: 0.2 },
    unlock: { minFragments: 2 },
    moriLine: "한 번 더 확인할 기회. 그동안 신호는 느긋해질 거야, 너무 느긋하게.",
  },
  {
    id: "chain-vow",
    name: "연쇄 서약",
    description: "연쇄 정화 확률 +20%, 동시 등장 최대 개수 +1",
    effects: { chainClearChance: 0.2, concurrentBonus: 1 },
    moriLine: "하나 건드리면 옆도 무너져. 판도 같이 붐빌 거고.",
  },
  {
    id: "slow-trap",
    name: "저속 함정",
    description: "신호 등장 간격 +25%, 진짜 신호 비율 +12%p",
    effects: { spawnIntervalScale: 0.25, genuineChanceBonus: 0.12 },
    moriLine: "느려졌어. 근데 대부분 손대면 안 되는 것들이야.",
  },
  {
    id: "double-signature-verify",
    name: "이중 서명 열람",
    description: "DEEP VERIFY 발동 시 진짜 신호 강제 등장, 콤보 마일스톤 보너스 +70점",
    effects: { deepVerifySpawnGenuine: true, milestoneScoreBonus: 70 },
    moriLine: "이제 그 순간마다 진짜가 하나 껴. 콤보 보너스로 갚을게.",
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

// Escalation ramp shape: a raw linear ratio hits the same difficulty at 10s
// that it used to hit at 10s, which a first-time player felt as "too fast,
// too soon." Raising the ratio to a power >1 leaves both endpoints
// unchanged (0 and 1 map to themselves) but bends the curve so the early
// game stays close to the easy starting values for longer, then catches up
// with a steeper climb in the back half — same difficulty at 0s and 60s,
// gentler on the way there.
const ESCALATION_EASE_POWER = 1.5;

function easeEscalationRatio(elapsedMs, durationMs) {
  return getElapsedRatio(elapsedMs, durationMs) ** ESCALATION_EASE_POWER;
}

// The three escalation curves below are the entire difficulty design of a
// run: signals arrive faster, expire sooner, and more of them are live at
// once as the 60-second clock runs out. Nothing else changes shape — there
// is no new "kind" of round, only more pressure on the same reflex.
export function getSpawnIntervalMs(elapsedMs, durationMs = RUN_DURATION_MS) {
  const ratio = easeEscalationRatio(elapsedMs, durationMs);
  return lerp(SPAWN_INTERVAL_RANGE_MS[0], SPAWN_INTERVAL_RANGE_MS[1], ratio);
}

export function getSignalLifespanMs(elapsedMs, durationMs = RUN_DURATION_MS) {
  const ratio = easeEscalationRatio(elapsedMs, durationMs);
  return lerp(SIGNAL_LIFESPAN_RANGE_MS[0], SIGNAL_LIFESPAN_RANGE_MS[1], ratio);
}

export function getMaxConcurrentSignals(elapsedMs, durationMs = RUN_DURATION_MS) {
  const ratio = easeEscalationRatio(elapsedMs, durationMs);
  return clamp(
    Math.round(lerp(MAX_CONCURRENT_RANGE[0], MAX_CONCURRENT_RANGE[1], ratio)),
    1,
    SLOT_COUNT,
  );
}

export const ADAPTIVE_METER_RANGE = 6;
export const ADAPTIVE_DIFFICULTY_STRENGTH = 0.12;
export const ADAPTIVE_METER_HIT_DELTA = 1;
export const ADAPTIVE_METER_MISS_DELTA = -2;

// A small hidden "how's this player doing right now" meter, separate from
// the fixed 60s escalation curve above. It moves +1 per purge and -2 per
// mistake (wrong click or missed fake), so three mistakes in a row bottoms
// it out but recovering takes six clean purges — easing off is quicker than
// ramping back up, which is the forgiving direction on purpose. The meter
// only ever nudges spawn rate/signal lifespan by up to ±12% on top of the
// escalation curve; it never overrides it.
export function getAdaptiveDifficultyScale(meter) {
  const clamped = clamp(meter, -ADAPTIVE_METER_RANGE, ADAPTIVE_METER_RANGE);
  return 1 - (clamped / ADAPTIVE_METER_RANGE) * ADAPTIVE_DIFFICULTY_STRENGTH;
}

export function pickSignalKind(random = Math.random, genuineChance = GENUINE_CHANCE) {
  return random() < genuineChance ? "genuine" : "fake";
}

// Speed rewards reacting close to spawn, combo rewards an unbroken run of
// correct purges; a `multiplier` of 2 is how the DEEP VERIFY wager window
// pays out, and costs double on a mistake via getWrongClickLoss.
// comboScale/scoreScale can accumulate from an unbounded number of stacked
// item picks in one run, so the effective multiplier is floored here rather
// than left to go negative — stacking a debuff-heavy item many times can
// only push a bonus toward zero, never invert it into a penalty.
export function scorePurge(remainingRatio, combo, multiplier = 1, modifiers = {}) {
  const { comboScale = 0, scoreScale = 0 } = modifiers;
  const comboMultiplier = Math.max(0, 1 + comboScale);
  const scoreMultiplier = Math.max(0.15, 1 + scoreScale);
  const speedBonus = Math.round(clamp(remainingRatio, 0, 1) * 150);
  const comboBonus = Math.round(clamp(Math.floor(combo), 0, 12) * 20 * comboMultiplier);
  const base = Math.round((100 + speedBonus + comboBonus) * scoreMultiplier);
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
