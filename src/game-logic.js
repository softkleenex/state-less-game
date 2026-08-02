export const TOTAL_ROUNDS = 6;
export const MAX_INTEGRITY = 3;
export const ROUND_DURATION_MS = 12_000;

const ENDING_LABELS = {
  verified: "VERIFIED",
  unstable: "UNSTABLE",
  deleted: "DELETED",
};

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

  return [
    {
      id: "visit",
      label: "VISIT",
      value: isFirstVisit ? "01 / FIRST" : `${String(snapshot.visitCount).padStart(2, "0")} / RETURN`,
      truthText: isFirstVisit
        ? "이번이 첫 번째 방문이다"
        : `이번은 ${snapshot.visitCount}번째 방문이다`,
      lieText: isFirstVisit
        ? "이미 이 페이지에 온 적이 있다"
        : "이번이 첫 번째 방문이다",
    },
    {
      id: "theme",
      label: "THEME",
      value: isDark ? "DARK" : "LIGHT",
      truthText: isDark ? "화면은 어두운 색을 선호한다" : "화면은 밝은 색을 선호한다",
      lieText: isDark ? "화면은 밝은 색을 선호한다" : "화면은 어두운 색을 선호한다",
    },
    {
      id: "time",
      label: "TIME",
      value: isNight ? "NIGHT" : "DAY",
      truthText: isNight ? "이 세션은 밤에 시작되었다" : "이 세션은 낮에 시작되었다",
      lieText: isNight ? "이 세션은 낮에 시작되었다" : "이 세션은 밤에 시작되었다",
    },
    {
      id: "input",
      label: "INPUT",
      value: usedKeyboard ? "KEYBOARD" : "MOUSE",
      truthText: usedKeyboard ? "첫 조작은 키보드였다" : "첫 조작은 마우스였다",
      lieText: usedKeyboard ? "첫 조작은 마우스였다" : "첫 조작은 키보드였다",
    },
    {
      id: "tab",
      label: "TAB TRACE",
      value: snapshot.tabLeft ? "LEFT" : "CLEAN",
      truthText: snapshot.tabLeft ? "이 탭을 떠난 흔적이 있다" : "이 탭을 계속 지켜보고 있었다",
      lieText: snapshot.tabLeft ? "이 탭을 계속 지켜보고 있었다" : "이 탭을 떠난 흔적이 있다",
    },
    {
      id: "peer",
      label: "OTHER SELF",
      value: snapshot.peerPresent ? "DETECTED" : "NONE",
      truthText: snapshot.peerPresent ? "같은 페이지가 다른 탭에도 있다" : "다른 탭의 나는 감지되지 않는다",
      lieText: snapshot.peerPresent ? "다른 탭의 나는 감지되지 않는다" : "같은 페이지가 다른 탭에도 있다",
    },
    {
      id: "viewport",
      label: "VIEWPORT",
      value: isWide ? "WIDE" : "NARROW",
      truthText: isWide ? "현재 화면 폭은 넓은 상태다" : "현재 화면 폭은 좁은 상태다",
      lieText: isWide ? "현재 화면 폭은 좁은 상태다" : "현재 화면 폭은 넓은 상태다",
    },
    {
      id: "motion",
      label: "MOTION",
      value: reducedMotion ? "REDUCED" : "FULL",
      truthText: reducedMotion ? "움직임 감소 설정이 켜져 있다" : "움직임은 기본 속도로 재생된다",
      lieText: reducedMotion ? "움직임은 기본 속도로 재생된다" : "움직임 감소 설정이 켜져 있다",
    },
    {
      id: "network",
      label: "NETWORK",
      value: isOnline ? "ONLINE" : "OFFLINE",
      truthText: isOnline ? "브라우저는 온라인 상태다" : "브라우저는 오프라인 상태다",
      lieText: isOnline ? "브라우저는 오프라인 상태다" : "브라우저는 온라인 상태다",
    },
    {
      id: "ending",
      label: "PREVIOUS END",
      value: hasPreviousEnding ? ENDING_LABELS[snapshot.lastEnding] ?? "UNKNOWN" : "NONE",
      truthText: hasPreviousEnding
        ? `이전 결말은 ${ENDING_LABELS[snapshot.lastEnding] ?? "UNKNOWN"}다`
        : "저장된 이전 결말은 없다",
      lieText: hasPreviousEnding ? "저장된 이전 결말은 없다" : "이전 결말이 쿠키에 남아 있다",
    },
  ];
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
  const pool = shuffle(catalog, random);
  const rounds = [];

  for (let roundIndex = 0; roundIndex < totalRounds; roundIndex += 1) {
    const firstIndex = (roundIndex * 2) % pool.length;
    const facts = [
      pool[firstIndex],
      pool[(firstIndex + 1) % pool.length],
      pool[(firstIndex + 3) % pool.length],
    ];
    const lieIndex = Math.floor(random() * facts.length);
    const statements = facts.map((fact, index) => ({
      factId: fact.id,
      factLabel: fact.label,
      factValue: fact.value,
      text: index === lieIndex ? fact.lieText : fact.truthText,
      isLie: index === lieIndex,
    }));

    rounds.push({
      id: roundIndex + 1,
      statements: shuffle(statements, random),
    });
  }

  return rounds;
}

export function scoreCorrectAnswer(remainingRatio, streak) {
  const speedBonus = Math.round(clamp(remainingRatio, 0, 1) * 500);
  const streakBonus = clamp(streak, 0, 5) * 60;
  return 500 + speedBonus + streakBonus;
}

export function getRoundDuration(roundIndex) {
  return Math.max(8_500, ROUND_DURATION_MS - Math.max(0, roundIndex) * 600);
}

export function getResult({ score, correct, integrity, total = TOTAL_ROUNDS }) {
  if (integrity <= 0) {
    return {
      rank: "NULL",
      ending: "unstable",
      title: "기억이 붕괴했습니다.",
      message: "거짓이 너무 많이 남았습니다. 그래도 쿠키는 이 실패까지 기억할 수 있습니다.",
    };
  }

  if (correct === total && score >= 5_600) {
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
