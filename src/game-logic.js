export const TOTAL_ROUNDS = 6;
export const MAX_INTEGRITY = 3;
export const MAX_MEMORY_FRAGMENTS = 6;
export const VERIFIED_CORRECT_REQUIRED = TOTAL_ROUNDS - 1;
export const ROUND_DURATION_MS = 18_000;
export const SYNC_RECOVERY_STREAK = 3;
export const DEEP_VERIFY_BONUS = 350;
export const DEEP_VERIFY_INTEGRITY_LOSS = 2;
export const FINAL_CORE_DEEP_VERIFY_BONUS = DEEP_VERIFY_BONUS * 2;
export const RUN_DIRECTIVE_BONUS = 600;

const ROUND_TYPE_SEQUENCE = [
  "trace",
  "purge",
  "restore",
  "redact",
  "crosscheck",
  "checksum",
];
const BASIC_ROUND_TYPE_COUNT = 4;

const RUN_DIRECTIVES = [
  {
    id: "sync",
    code: "SYNC CHAIN",
    label: "연속 정답 4회 달성",
    target: 4,
  },
  {
    id: "wager",
    code: "WAGER PROOF",
    label: "DEEP VERIFY 정답 2회",
    target: 2,
  },
  {
    id: "clean",
    code: "CLEAN ARCHIVE",
    label: "VERIFIED + 종료 무결성 3칸",
    target: MAX_INTEGRITY,
  },
];

const COMPLEX_ROUND_BONUS_MS = {
  crosscheck: 4_000,
  checksum: 7_000,
};

const ROUND_COPY = {
  purge: {
    kicker: "CORRUPTION HUNT",
    prompt: "충돌한 기억 하나를 지우세요.",
    instruction: "세 개의 흔적을 교차해 거짓 기억을 고르세요.",
    successText: "거짓 제거 완료",
    failureText: "진실을 지웠습니다",
  },
  trace: {
    kicker: "TRACE DECODE",
    prompt: "이 신호의 의미를 해석하세요.",
    instruction: "브라우저 흔적과 정확히 일치하는 해석을 고르세요.",
    successText: "신호 해독 완료",
    failureText: "신호 해석에 실패했습니다",
  },
  restore: {
    kicker: "MEMORY RESTORE",
    prompt: "살아남은 진실 하나를 복구하세요.",
    instruction: "오염된 두 문장 사이에서 실제 기록을 고르세요.",
    successText: "진실 복구 완료",
    failureText: "오염된 기억을 복구했습니다",
  },
  redact: {
    kicker: "REDACTION FILL",
    prompt: "가려진 색인 값을 복원하세요.",
    instruction: "원본 신호를 읽고 대괄호 필드에 들어갈 값을 고르세요.",
    successText: "색인 값 복원 완료",
    failureText: "잘못된 값을 색인했습니다",
  },
  crosscheck: {
    kicker: "DOUBLE ENTRY",
    prompt: "두 기록을 동시에 만족시키세요.",
    instruction: "TRACE A와 TRACE B에 모두 맞는 필드 쌍을 고르세요.",
    successText: "교차 검증 완료",
    failureText: "한쪽 기록과 어긋났습니다",
  },
  checksum: {
    kicker: "CHECKSUM AUDIT",
    prompt: "오염된 필드 수를 계산하세요.",
    instruction: "세 CHECK에서 신호와 오른쪽 후보 값이 다른 횟수를 세세요.",
    successText: "체크섬 검증 완료",
    failureText: "오염 개수를 잘못 계산했습니다",
  },
};

const ENDING_LABELS = {
  verified: "VERIFIED",
  unstable: "UNSTABLE",
  deleted: "DELETED",
};

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

export function createFactCatalog(snapshot) {
  const isFirstVisit = snapshot.visitCount <= 1;
  const isDark = snapshot.theme === "dark";
  const isNight = snapshot.timePhase === "night";
  const usedKeyboard = snapshot.inputMode === "keyboard";
  const isWide = snapshot.viewport === "wide";
  const reducedMotion = snapshot.motion === "reduced";
  const isOnline = snapshot.network === "online";
  const hasPreviousEnding = Boolean(snapshot.lastEnding);
  const fragmentCount = clamp(Math.floor(Number(snapshot.fragments) || 0), 0, MAX_MEMORY_FRAGMENTS);
  const completedRuns = clamp(Math.floor(Number(snapshot.runs) || 0), 0, 999);
  const bestScore = clamp(Math.floor(Number(snapshot.bestScore) || 0), 0, 999_999);
  const persistentMemory = snapshot.policy === "persistent";
  const alternateFragmentCount = fragmentCount < MAX_MEMORY_FRAGMENTS
    ? fragmentCount + 1
    : fragmentCount - 1;
  const alternateRunCount = completedRuns < 999 ? completedRuns + 1 : completedRuns - 1;
  const alternateBestScore = bestScore <= 999_899 ? bestScore + 100 : bestScore - 100;
  const localHour = Number.isFinite(snapshot.localHour)
    ? clamp(Math.round(snapshot.localHour), 0, 23)
    : isNight ? 23 : 12;
  const viewportWidth = Number.isFinite(snapshot.viewportWidth)
    ? Math.max(1, Math.round(snapshot.viewportWidth))
    : isWide ? 1280 : 480;

  const facts = [
    {
      id: "visit",
      label: "VISIT",
      value: isFirstVisit ? "01 / FIRST" : `${String(snapshot.visitCount).padStart(2, "0")} / RETURN`,
      alternateValue: isFirstVisit ? "02 / RETURN" : "01 / FIRST",
      unknownValue: "UNINDEXED",
      evidenceText: `COOKIE LEDGER · ${String(snapshot.visitCount).padStart(2, "0")} CHECK-INS`,
      truthText: isFirstVisit
        ? "이번이 첫 번째 방문이다"
        : `이번은 ${snapshot.visitCount}번째 방문이다`,
      lieText: isFirstVisit
        ? "이미 이 페이지에 온 적이 있다"
        : "이번이 첫 번째 방문이다",
      decoyText: "방문 횟수는 아직 기록되지 않았다",
    },
    {
      id: "theme",
      label: "THEME",
      value: isDark ? "DARK" : "LIGHT",
      alternateValue: isDark ? "LIGHT" : "DARK",
      evidenceText: `MEDIA QUERY · ${isDark ? "DARK" : "LIGHT"} SIGNAL`,
      truthText: isDark ? "화면은 어두운 색을 선호한다" : "화면은 밝은 색을 선호한다",
      lieText: isDark ? "화면은 밝은 색을 선호한다" : "화면은 어두운 색을 선호한다",
      decoyText: "화면 색상 선호는 현재 읽을 수 없다",
    },
    {
      id: "time",
      label: "TIME",
      value: isNight ? "NIGHT" : "DAY",
      alternateValue: isNight ? "DAY" : "NIGHT",
      evidenceText: `SESSION CLOCK · ${String(localHour).padStart(2, "0")}:00`,
      truthText: isNight ? "이 세션은 밤에 시작되었다" : "이 세션은 낮에 시작되었다",
      lieText: isNight ? "이 세션은 낮에 시작되었다" : "이 세션은 밤에 시작되었다",
      decoyText: "세션 시작 시각은 기록에서 제거되었다",
    },
    {
      id: "input",
      label: "INPUT",
      value: usedKeyboard ? "KEYBOARD" : "MOUSE",
      alternateValue: usedKeyboard ? "MOUSE" : "KEYBOARD",
      evidenceText: `FIRST EVENT · ${usedKeyboard ? "KEYDOWN" : "POINTERDOWN"}`,
      truthText: usedKeyboard ? "첫 조작은 키보드였다" : "첫 조작은 마우스였다",
      lieText: usedKeyboard ? "첫 조작은 마우스였다" : "첫 조작은 키보드였다",
      decoyText: "첫 조작 방식은 아직 정해지지 않았다",
    },
    {
      id: "tab",
      label: "TAB TRACE",
      value: snapshot.tabLeft ? "LEFT" : "CLEAN",
      alternateValue: snapshot.tabLeft ? "CLEAN" : "LEFT",
      evidenceText: `VISIBILITY LOG · HIDDEN ${snapshot.tabLeft ? "1" : "0"}`,
      truthText: snapshot.tabLeft ? "이 탭을 떠난 흔적이 있다" : "이 탭을 계속 지켜보고 있었다",
      lieText: snapshot.tabLeft ? "이 탭을 계속 지켜보고 있었다" : "이 탭을 떠난 흔적이 있다",
      decoyText: "탭 가시성 기록은 손상되어 판독할 수 없다",
    },
    {
      id: "peer",
      label: "OTHER SELF",
      value: snapshot.peerPresent ? "DETECTED" : "NONE",
      alternateValue: snapshot.peerPresent ? "NONE" : "DETECTED",
      evidenceText: `BROADCAST ACK · ${snapshot.peerPresent ? "1" : "0"}`,
      truthText: snapshot.peerPresent ? "같은 페이지가 다른 탭에도 있다" : "다른 탭의 나는 감지되지 않는다",
      lieText: snapshot.peerPresent ? "다른 탭의 나는 감지되지 않는다" : "같은 페이지가 다른 탭에도 있다",
      decoyText: "다른 탭 신호는 확인할 수 없는 상태다",
    },
    {
      id: "viewport",
      label: "VIEWPORT",
      value: isWide ? "WIDE" : "NARROW",
      alternateValue: isWide ? "NARROW" : "WIDE",
      evidenceText: `FRAME WIDTH · ${viewportWidth}px`,
      truthText: isWide ? "현재 화면 폭은 넓은 상태다" : "현재 화면 폭은 좁은 상태다",
      lieText: isWide ? "현재 화면 폭은 좁은 상태다" : "현재 화면 폭은 넓은 상태다",
      decoyText: "현재 화면 폭 정보는 기록되지 않았다",
    },
    {
      id: "motion",
      label: "MOTION",
      value: reducedMotion ? "REDUCED" : "FULL",
      alternateValue: reducedMotion ? "FULL" : "REDUCED",
      evidenceText: `MOTION QUERY · REDUCE ${reducedMotion ? "1" : "0"}`,
      truthText: reducedMotion ? "움직임 감소 설정이 켜져 있다" : "움직임은 기본 속도로 재생된다",
      lieText: reducedMotion ? "움직임은 기본 속도로 재생된다" : "움직임 감소 설정이 켜져 있다",
      decoyText: "움직임 선호 설정은 읽을 수 없다",
    },
    {
      id: "network",
      label: "NETWORK",
      value: isOnline ? "ONLINE" : "OFFLINE",
      alternateValue: isOnline ? "OFFLINE" : "ONLINE",
      evidenceText: `HEARTBEAT · ${isOnline ? "ACK" : "NO ACK"}`,
      truthText: isOnline ? "브라우저는 온라인 상태다" : "브라우저는 오프라인 상태다",
      lieText: isOnline ? "브라우저는 오프라인 상태다" : "브라우저는 온라인 상태다",
      decoyText: "네트워크 상태는 아직 확인 중이다",
    },
    {
      id: "ending",
      label: "PREVIOUS END",
      value: hasPreviousEnding ? ENDING_LABELS[snapshot.lastEnding] ?? "UNKNOWN" : "NONE",
      alternateValue: hasPreviousEnding ? "NONE" : "VERIFIED",
      unknownValue: "CORRUPTED",
      evidenceText: `COOKIE ARCHIVE · ${hasPreviousEnding ? ENDING_LABELS[snapshot.lastEnding] ?? "UNKNOWN" : "EMPTY"}`,
      truthText: hasPreviousEnding
        ? `이전 결말은 ${ENDING_LABELS[snapshot.lastEnding] ?? "UNKNOWN"}다`
        : "저장된 이전 결말은 없다",
      lieText: hasPreviousEnding ? "저장된 이전 결말은 없다" : "이전 결말이 쿠키에 남아 있다",
      decoyText: "이전 결말 정보에는 접근할 수 없다",
    },
    {
      id: "shards",
      label: "SHARDS",
      value: `${String(fragmentCount).padStart(2, "0")} / ${String(MAX_MEMORY_FRAGMENTS).padStart(2, "0")}`,
      alternateValue: `${String(alternateFragmentCount).padStart(2, "0")} / ${String(MAX_MEMORY_FRAGMENTS).padStart(2, "0")}`,
      unknownValue: "CORRUPTED",
      evidenceText: `COOKIE SHARDS · ${String(fragmentCount).padStart(2, "0")} / ${String(MAX_MEMORY_FRAGMENTS).padStart(2, "0")} RECOVERED`,
      truthText: `복구한 MORI 기억 조각은 ${fragmentCount}개다`,
      lieText: `복구한 MORI 기억 조각은 ${alternateFragmentCount}개다`,
      decoyText: "기억 조각 일지는 손상되어 읽을 수 없다",
    },
    {
      id: "runs",
      label: "RUNS",
      value: `${String(completedRuns).padStart(2, "0")} COMPLETE`,
      alternateValue: `${String(alternateRunCount).padStart(2, "0")} COMPLETE`,
      unknownValue: "UNINDEXED",
      evidenceText: `COOKIE RUNS · ${String(completedRuns).padStart(2, "0")} COMPLETE`,
      truthText: `완료한 기억 감사는 ${completedRuns}회다`,
      lieText: `완료한 기억 감사는 ${alternateRunCount}회다`,
      decoyText: "완료한 감사 횟수는 아직 색인되지 않았다",
    },
    {
      id: "retention",
      label: "RETENTION",
      value: persistentMemory ? "7 DAYS" : "TAB ONLY",
      alternateValue: persistentMemory ? "TAB ONLY" : "7 DAYS",
      unknownValue: "UNSET",
      evidenceText: `COOKIE RETENTION · ${persistentMemory ? "EXPIRES 7D" : "SESSION END"}`,
      truthText: persistentMemory ? "기억은 7일 동안 보존된다" : "기억은 이번 탭에만 보존된다",
      lieText: persistentMemory ? "기억은 이번 탭에만 보존된다" : "기억은 7일 동안 보존된다",
      decoyText: "기억 보존 기한은 설정되지 않았다",
    },
    {
      id: "best",
      label: "BEST",
      value: formatScore(bestScore),
      alternateValue: formatScore(alternateBestScore),
      unknownValue: "-----",
      evidenceText: `COOKIE HIGH SCORE · ${formatScore(bestScore)}`,
      truthText: `저장된 최고 점수는 ${formatScore(bestScore)}점이다`,
      lieText: `저장된 최고 점수는 ${formatScore(alternateBestScore)}점이다`,
      decoyText: "최고 점수 기록은 비어 있다",
    },
  ];

  return facts.map(({ alternateValue, unknownValue = "UNKNOWN", ...fact }) => ({
    ...fact,
    valueOptions: [fact.value, alternateValue, unknownValue],
  }));
}

function shuffle(items, random) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

export function createRoundDeck(catalog, totalRounds, seed) {
  if (catalog.length < 3) {
    throw new Error("At least three facts are required to build a round.");
  }

  const random = createRandom(seed);
  const kindSequence = [
    ...shuffle(ROUND_TYPE_SEQUENCE.slice(0, BASIC_ROUND_TYPE_COUNT), random),
    ...shuffle(ROUND_TYPE_SEQUENCE.slice(BASIC_ROUND_TYPE_COUNT), random),
  ];
  const pool = shuffle(catalog, random);
  const rounds = [];

  for (let roundIndex = 0; roundIndex < totalRounds; roundIndex += 1) {
    const kind = kindSequence[roundIndex % kindSequence.length];
    const copy = ROUND_COPY[kind];
    const firstIndex = (roundIndex * 2) % pool.length;
    const facts = [
      pool[firstIndex],
      pool[(firstIndex + 1) % pool.length],
      pool[(firstIndex + 3) % pool.length],
    ];
    let statements;
    let evidence;
    let explanation;

    if (kind === "trace") {
      const answerFact = facts[Math.floor(random() * facts.length)];
      evidence = [{ label: "SIGNAL 01", text: answerFact.evidenceText }];
      statements = [
        {
          factId: answerFact.id,
          text: answerFact.truthText,
          claim: "truth",
          isCorrect: true,
        },
        {
          factId: answerFact.id,
          text: answerFact.lieText,
          claim: "lie",
          isCorrect: false,
        },
        {
          factId: answerFact.id,
          text: answerFact.decoyText,
          claim: "decoy",
          isCorrect: false,
        },
      ];
      explanation = `${answerFact.evidenceText} · 실제 기록은 “${answerFact.truthText}”입니다.`;
    } else if (kind === "redact") {
      const answerFact = facts[Math.floor(random() * facts.length)];
      const claims = ["value", "alternate", "unknown"];
      evidence = [{ label: "SOURCE TRACE", text: answerFact.evidenceText }];
      statements = answerFact.valueOptions.map((value, index) => ({
        factId: answerFact.id,
        text: `${answerFact.id.toUpperCase()}=${value}`,
        claim: claims[index],
        isCorrect: index === 0,
      }));
      explanation = `${answerFact.evidenceText} · 복원 값은 ${answerFact.id.toUpperCase()}=${answerFact.value}입니다.`;
    } else if (kind === "crosscheck") {
      const [leftFact, rightFact] = facts;
      const formatPair = (leftValue, rightValue) => (
        `${leftFact.id.toUpperCase()}=${leftValue} · ${rightFact.id.toUpperCase()}=${rightValue}`
      );
      evidence = [
        { label: "TRACE A", text: leftFact.evidenceText },
        { label: "TRACE B", text: rightFact.evidenceText },
      ];
      statements = [
        {
          factId: `${leftFact.id}+${rightFact.id}`,
          text: formatPair(leftFact.value, rightFact.value),
          claim: "verified-pair",
          isCorrect: true,
        },
        {
          factId: `${leftFact.id}+${rightFact.id}`,
          text: formatPair(leftFact.valueOptions[1], rightFact.value),
          claim: "left-corrupt",
          isCorrect: false,
        },
        {
          factId: `${leftFact.id}+${rightFact.id}`,
          text: formatPair(leftFact.value, rightFact.valueOptions[1]),
          claim: "right-corrupt",
          isCorrect: false,
        },
      ];
      explanation = `${leftFact.evidenceText} / ${rightFact.evidenceText} · 두 필드가 모두 원본 신호와 일치합니다.`;
    } else if (kind === "checksum") {
      const corruptionCount = 1 + Math.floor(random() * 3);
      const corruptedIndexes = new Set(
        shuffle([0, 1, 2], random).slice(0, corruptionCount),
      );
      evidence = facts.map((fact, index) => {
        const candidateValue = corruptedIndexes.has(index)
          ? fact.valueOptions[1]
          : fact.value;
        return {
          label: `CHECK ${String(index + 1).padStart(2, "0")}`,
          text: `${fact.evidenceText} ↔ ${fact.id.toUpperCase()}=${candidateValue}`,
        };
      });
      const countOptions = [1, 2, 3];
      statements = countOptions.map((count) => ({
        factId: `checksum-${count}`,
        text: `오염 필드 ${count}개`,
        claim: `count-${count}`,
        isCorrect: count === corruptionCount,
      }));
      const corruptedLabels = facts
        .filter((_, index) => corruptedIndexes.has(index))
        .map((fact) => fact.label)
        .join(", ");
      explanation = `신호와 후보 값이 다른 필드는 ${corruptionCount}개(${corruptedLabels})입니다.`;
    } else {
      const answerIndex = Math.floor(random() * facts.length);
      const answerClaim = kind === "purge" ? "lie" : "truth";
      evidence = facts.map((fact, index) => ({
        label: `TRACE ${String(index + 1).padStart(2, "0")}`,
        text: fact.evidenceText,
      }));
      statements = facts.map((fact, index) => {
        const claim = index === answerIndex ? answerClaim : answerClaim === "lie" ? "truth" : "lie";
        return {
          factId: fact.id,
          text: claim === "truth" ? fact.truthText : fact.lieText,
          claim,
          isCorrect: index === answerIndex,
        };
      });
      const answerFact = facts[answerIndex];
      explanation = `${answerFact.evidenceText} · 실제 기록은 “${answerFact.truthText}”입니다.`;
    }

    rounds.push({
      id: roundIndex + 1,
      kind,
      ...copy,
      evidence,
      explanation,
      statements: shuffle(statements, random),
    });
  }

  return rounds;
}

export function getDeepVerifyBonus(roundIndex, total = TOTAL_ROUNDS) {
  return roundIndex === total - 1
    ? FINAL_CORE_DEEP_VERIFY_BONUS
    : DEEP_VERIFY_BONUS;
}

export function scoreCorrectAnswer(
  remainingRatio,
  streak,
  deepVerify = false,
  deepVerifyBonus = DEEP_VERIFY_BONUS,
) {
  const speedBonus = Math.round(clamp(remainingRatio, 0, 1) * 500);
  const streakBonus = clamp(streak, 0, 5) * 60;
  const wagerBonus = deepVerify ? deepVerifyBonus : 0;
  return 500 + speedBonus + streakBonus + wagerBonus;
}

export function getWrongAnswerIntegrityLoss(deepVerify = false) {
  return deepVerify ? DEEP_VERIFY_INTEGRITY_LOSS : 1;
}

export function getRoundDuration(roundIndex, kind = "") {
  const baseDuration = Math.max(12_000, ROUND_DURATION_MS - Math.max(0, roundIndex) * 1_000);
  return baseDuration + (COMPLEX_ROUND_BONUS_MS[kind] ?? 0);
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
  if (directive.id === "sync") {
    value = clamp(Math.floor(Number(stats.maxStreak) || 0), 0, directive.target);
    completed = value >= directive.target;
  } else if (directive.id === "wager") {
    value = clamp(Math.floor(Number(stats.deepVerifyWins) || 0), 0, directive.target);
    completed = value >= directive.target;
  } else {
    value = clamp(Math.floor(Number(stats.integrity) || 0), 0, directive.target);
    completed = stats.ending === "verified" && value >= directive.target;
  }

  return {
    ...directive,
    bonus: RUN_DIRECTIVE_BONUS,
    value,
    progress: `${value}/${directive.target}`,
    completed,
  };
}

export function getAuditGateStatus({
  correct,
  answered,
  integrity,
  total = TOTAL_ROUNDS,
  required = Math.max(1, total - 1),
}) {
  const safeCorrect = clamp(Math.floor(Number(correct) || 0), 0, total);
  const safeAnswered = clamp(Math.floor(Number(answered) || 0), safeCorrect, total);
  const remaining = total - safeAnswered;
  const needed = Math.max(0, required - safeCorrect);

  if (needed === 0) return { state: "open", label: "GATE OPEN", needed };
  if (integrity <= 0 || safeCorrect + remaining < required) {
    return { state: "lost", label: "GATE LOST", needed };
  }
  return { state: "active", label: `${needed} MORE`, needed };
}

export function getSyncRecoveryIndex({ outcomes, streak, used = false }) {
  if (used || Number(streak) < SYNC_RECOVERY_STREAK || !Array.isArray(outcomes)) {
    return -1;
  }

  for (let index = outcomes.length - 1; index >= 0; index -= 1) {
    if (outcomes[index] === "wrong" || outcomes[index] === "timeout") {
      return index;
    }
  }
  return -1;
}

function normalizeFragmentCount(current) {
  const parsed = Number.parseInt(current, 10);
  return clamp(Number.isFinite(parsed) ? parsed : 0, 0, MAX_MEMORY_FRAGMENTS);
}

export function awardMemoryFragment(current) {
  return clamp(normalizeFragmentCount(current) + 1, 0, MAX_MEMORY_FRAGMENTS);
}

export function getArchiveLensCharges(fragments) {
  return Math.min(3, 1 + Math.floor(normalizeFragmentCount(fragments) / 2));
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

export function getResult({
  score,
  correct,
  integrity,
  total = TOTAL_ROUNDS,
  recoveryUsed = false,
}) {
  if (integrity <= 0) {
    return {
      rank: "NULL",
      ending: "unstable",
      title: "기억이 붕괴했습니다.",
      message: "거짓이 너무 많이 남았습니다. 그래도 쿠키는 이 실패까지 기억할 수 있습니다.",
    };
  }

  if (!recoveryUsed && correct === total && score >= 5_600) {
    return {
      rank: "S",
      ending: "verified",
      title: "모든 거짓이 제거되었습니다.",
      message: "당신은 브라우저의 기억보다 빨랐습니다. 다음 방문에서 나는 이 결말을 먼저 말할 겁니다.",
    };
  }

  if (correct >= total - 1) {
    return {
      rank: "A",
      ending: "verified",
      title: "기억이 검증되었습니다.",
      message: "거의 완전한 기록입니다. 남은 작은 노이즈는 다음 세션의 문장이 됩니다.",
    };
  }

  if (correct >= Math.ceil(total * 0.6)) {
    return {
      rank: "B",
      ending: "unstable",
      title: "기억은 아직 불안정합니다.",
      message: "진실과 추론이 섞였습니다. 재방문하면 쿠키가 다른 문제를 만들 겁니다.",
    };
  }

  return {
    rank: "C",
    ending: "unstable",
    title: "거짓이 기억에 남았습니다.",
    message: "AI는 틀린 문장도 자신 있게 저장합니다. 이번 기록을 남길지는 당신이 결정하세요.",
  };
}

export function formatScore(score) {
  return String(Math.max(0, Math.round(score))).padStart(5, "0");
}
