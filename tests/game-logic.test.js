import test from "node:test";
import assert from "node:assert/strict";

import {
  DEEP_VERIFY_BONUS,
  DEEP_VERIFY_INTEGRITY_LOSS,
  FINAL_CORE_DEEP_VERIFY_BONUS,
  MAX_MEMORY_FRAGMENTS,
  RUN_DIRECTIVE_BONUS,
  SYNC_RECOVERY_STREAK,
  TOTAL_ROUNDS,
  awardMemoryFragment,
  createFactCatalog,
  createRandom,
  createRoundDeck,
  getResult,
  getArchiveLensCharges,
  getAuditGateStatus,
  getFragmentReward,
  getDeepVerifyBonus,
  getMoriArchiveRecord,
  getRoundDuration,
  getRunDirective,
  getRunDirectiveStatus,
  getSyncRecoveryIndex,
  getWrongAnswerIntegrityLoss,
  precisionMultiplierFor,
  resolveLockPrecision,
  scoreCorrectAnswer,
  seedFromString,
} from "../src/game-logic.js";
import {
  decodeMemory,
  encodeMemory,
  readCookieValue,
  sanitizeMemory,
} from "../src/state-store.js";

const snapshot = {
  visitCount: 2,
  lastEnding: "verified",
  theme: "dark",
  timePhase: "night",
  inputMode: "keyboard",
  tabLeft: false,
  peerPresent: false,
  viewport: "wide",
  motion: "full",
  network: "online",
  localHour: 23,
  viewportWidth: 1440,
  fragments: 4,
  runs: 3,
  bestScore: 5_880,
  policy: "persistent",
};

test("seeded random sequence is deterministic", () => {
  const seed = seedFromString("same-session");
  const first = createRandom(seed);
  const second = createRandom(seed);
  assert.deepEqual(
    [first(), first(), first(), first()],
    [second(), second(), second(), second()],
  );
});

test("fact catalog exposes indirect evidence and three distinct interpretations", () => {
  const catalog = createFactCatalog(snapshot);
  assert.equal(catalog.length, 14);
  for (const fact of catalog) {
    assert.ok(fact.id);
    assert.ok(fact.label);
    assert.ok(fact.value);
    assert.equal(fact.valueOptions[0], fact.value);
    assert.equal(new Set(fact.valueOptions).size, 3);
    assert.ok(fact.evidenceText);
    assert.notEqual(fact.truthText, fact.lieText);
    assert.notEqual(fact.truthText, fact.decoyText);
    assert.notEqual(fact.lieText, fact.decoyText);
  }

  const factsById = Object.fromEntries(catalog.map((fact) => [fact.id, fact]));
  assert.equal(factsById.shards.value, "04 / 06");
  assert.equal(factsById.runs.value, "03 COMPLETE");
  assert.equal(factsById.retention.value, "7 DAYS");
  assert.equal(factsById.best.value, "05880");
  assert.match(factsById.shards.evidenceText, /^COOKIE SHARDS/);
  assert.match(factsById.retention.evidenceText, /^COOKIE RETENTION/);
});

test("cookie progression facts keep distinct options at their storage caps", () => {
  const catalog = createFactCatalog({
    ...snapshot,
    fragments: 6,
    runs: 999,
    bestScore: 999_999,
    policy: "session",
  });
  const factsById = Object.fromEntries(catalog.map((fact) => [fact.id, fact]));

  assert.equal(factsById.shards.value, "06 / 06");
  assert.equal(factsById.runs.value, "999 COMPLETE");
  assert.equal(factsById.best.value, "999999");
  assert.equal(factsById.retention.value, "TAB ONLY");
  for (const id of ["shards", "runs", "best", "retention"]) {
    assert.equal(new Set(factsById[id].valueOptions).size, 3);
  }
});

test("seeded replay decks can surface every browser and cookie fact", () => {
  const catalog = createFactCatalog(snapshot);
  const factsByEvidence = new Map(catalog.map((fact) => [fact.evidenceText, fact.id]));
  const seenFactIds = new Set();

  for (let seedIndex = 0; seedIndex < 120; seedIndex += 1) {
    const rounds = createRoundDeck(catalog, TOTAL_ROUNDS, seedFromString(`coverage-${seedIndex}`));
    for (const round of rounds) {
      for (const item of round.evidence) {
        const evidenceText = item.text.split(" ↔ ")[0];
        const factId = factsByEvidence.get(evidenceText);
        if (factId) seenFactIds.add(factId);
      }
    }
  }

  assert.deepEqual(
    [...seenFactIds].sort(),
    catalog.map((fact) => fact.id).sort(),
  );
});

test("round deck preserves its difficulty curve with six distinct puzzle rules", () => {
  const catalog = createFactCatalog(snapshot);
  const rounds = createRoundDeck(catalog, TOTAL_ROUNDS, seedFromString("audit"));
  assert.equal(rounds.length, TOTAL_ROUNDS);
  assert.deepEqual(
    new Set(rounds.slice(0, 4).map((round) => round.kind)),
    new Set(["trace", "purge", "restore", "redact"]),
  );
  assert.deepEqual(
    new Set(rounds.slice(4).map((round) => round.kind)),
    new Set(["crosscheck", "checksum"]),
  );
  assert.equal(new Set(rounds.map((round) => round.kind)).size, TOTAL_ROUNDS);

  for (const round of rounds) {
    assert.equal(round.statements.length, 3);
    assert.equal(round.statements.filter((statement) => statement.isCorrect).length, 1);
    assert.ok(round.prompt);
    assert.ok(round.instruction);
    assert.ok(round.explanation);
    assert.ok(round.evidence.length >= 1);
  }

  const purgeRounds = rounds.filter((round) => round.kind === "purge");
  assert.ok(purgeRounds.every((round) => (
    round.statements.filter((statement) => statement.claim === "lie").length === 1
  )));

  const restoreRounds = rounds.filter((round) => round.kind === "restore");
  assert.ok(restoreRounds.every((round) => (
    round.statements.filter((statement) => statement.claim === "truth").length === 1
  )));

  const traceRounds = rounds.filter((round) => round.kind === "trace");
  assert.ok(traceRounds.every((round) => (
    new Set(round.statements.map((statement) => statement.claim)).size === 3
  )));

  const redactRound = rounds.find((round) => round.kind === "redact");
  assert.equal(redactRound.evidence.length, 1);
  assert.equal(redactRound.statements.find((statement) => statement.isCorrect).claim, "value");
  assert.ok(redactRound.statements.every((statement) => statement.text.includes("=")));

  const crosscheckRound = rounds.find((round) => round.kind === "crosscheck");
  assert.equal(crosscheckRound.evidence.length, 2);
  assert.equal(
    crosscheckRound.statements.find((statement) => statement.isCorrect).claim,
    "verified-pair",
  );
  assert.ok(crosscheckRound.statements.every((statement) => statement.text.includes("·")));

  const checksumRound = rounds.find((round) => round.kind === "checksum");
  assert.equal(checksumRound.evidence.length, 3);
  assert.ok(checksumRound.evidence.every((item) => item.text.includes("↔")));
  assert.match(
    checksumRound.statements.find((statement) => statement.isCorrect).text,
    /^오염 필드 [123]개$/,
  );
  assert.deepEqual(
    checksumRound.statements.map((statement) => statement.text).sort(),
    ["오염 필드 1개", "오염 필드 2개", "오염 필드 3개"],
  );
});

test("different seeds vary puzzle order without moving complex rules forward", () => {
  const catalog = createFactCatalog(snapshot);
  const orders = new Set();
  for (let seedIndex = 0; seedIndex < 24; seedIndex += 1) {
    const rounds = createRoundDeck(
      catalog,
      TOTAL_ROUNDS,
      seedFromString("order-" + seedIndex),
    );
    const kinds = rounds.map((round) => round.kind);
    orders.add(kinds.join(","));
    assert.deepEqual(
      new Set(kinds.slice(0, 4)),
      new Set(["trace", "purge", "restore", "redact"]),
    );
    assert.deepEqual(
      new Set(kinds.slice(4)),
      new Set(["crosscheck", "checksum"]),
    );
  }
  assert.ok(orders.size >= 6);
});

test("round deck is reproducible for the same state and seed", () => {
  const catalog = createFactCatalog(snapshot);
  const seed = seedFromString("visit-2-run-1");
  assert.deepEqual(
    createRoundDeck(catalog, TOTAL_ROUNDS, seed),
    createRoundDeck(catalog, TOTAL_ROUNDS, seed),
  );
});

test("generated puzzle options stay unique and checksum evidence matches its answer", () => {
  const catalog = createFactCatalog(snapshot);
  for (let seedIndex = 0; seedIndex < 80; seedIndex += 1) {
    const rounds = createRoundDeck(catalog, TOTAL_ROUNDS, seedFromString(`case-${seedIndex}`));
    for (const round of rounds) {
      assert.equal(round.statements.filter((statement) => statement.isCorrect).length, 1);
      assert.equal(new Set(round.statements.map((statement) => statement.text)).size, 3);
      assert.ok(round.evidence.every((item) => item.label && item.text));
    }

    const checksumRound = rounds.find((round) => round.kind === "checksum");
    const mismatches = checksumRound.evidence.filter((item) => {
      const [evidenceText, indexedField] = item.text.split(" ↔ ");
      const fact = catalog.find((candidate) => candidate.evidenceText === evidenceText);
      const separator = indexedField.indexOf("=");
      const candidateValue = indexedField.slice(separator + 1);
      return fact.value !== candidateValue;
    }).length;
    const correctCount = Number.parseInt(
      checksumRound.statements.find((statement) => statement.isCorrect).text.match(/\d+/)[0],
      10,
    );
    assert.equal(correctCount, mismatches);
  }
});

test("score rewards remaining time and streak without exceeding its cap", () => {
  assert.equal(scoreCorrectAnswer(0, 0), 500);
  assert.equal(scoreCorrectAnswer(1, 1), 1_060);
  assert.equal(scoreCorrectAnswer(1.5, 99), 1_300);
});

test("signal lock precision multiplier scales the same base score", () => {
  assert.equal(scoreCorrectAnswer(0, 0, false, undefined, 1), 500);
  assert.equal(scoreCorrectAnswer(0, 0, false, undefined, precisionMultiplierFor("perfect")), 600);
  assert.equal(scoreCorrectAnswer(0, 0, false, undefined, precisionMultiplierFor("miss")), 250);
  assert.equal(precisionMultiplierFor("good"), 1);
});

test("lock precision resolves perfect, good, and miss from marker position", () => {
  assert.equal(resolveLockPrecision(0.5, 0.4, 0.2), "perfect");
  assert.equal(resolveLockPrecision(0.42, 0.4, 0.2), "good");
  assert.equal(resolveLockPrecision(0.6, 0.4, 0.2), "good");
  assert.equal(resolveLockPrecision(0.3, 0.4, 0.2), "miss");
  assert.equal(resolveLockPrecision(0.61, 0.4, 0.2), "miss");
});

test("deep verify adds a base wager and doubles an error's integrity loss", () => {
  assert.equal(DEEP_VERIFY_BONUS, 350);
  assert.equal(DEEP_VERIFY_INTEGRITY_LOSS, 2);
  assert.equal(scoreCorrectAnswer(1, 1, true), 1_410);
  assert.equal(getWrongAnswerIntegrityLoss(false), 1);
  assert.equal(getWrongAnswerIntegrityLoss(true), 2);
});

test("the final core doubles only the last round's deep verify reward", () => {
  assert.equal(FINAL_CORE_DEEP_VERIFY_BONUS, 700);
  assert.equal(getDeepVerifyBonus(0), DEEP_VERIFY_BONUS);
  assert.equal(getDeepVerifyBonus(TOTAL_ROUNDS - 2), DEEP_VERIFY_BONUS);
  assert.equal(
    getDeepVerifyBonus(TOTAL_ROUNDS - 1),
    FINAL_CORE_DEEP_VERIFY_BONUS,
  );
  assert.equal(
    scoreCorrectAnswer(1, 1, true, FINAL_CORE_DEEP_VERIFY_BONUS),
    1_760,
  );
});

test("complex rounds receive enough reading time while simple rounds get faster", () => {
  assert.equal(getRoundDuration(0), 18_000);
  assert.equal(getRoundDuration(5), 13_000);
  assert.equal(getRoundDuration(999), 12_000);
  assert.equal(getRoundDuration(4, "crosscheck"), 18_000);
  assert.equal(getRoundDuration(5, "checksum"), 20_000);
});

test("run directives rotate and complete only at their stated thresholds", () => {
  assert.equal(RUN_DIRECTIVE_BONUS, 600);
  assert.equal(getRunDirective(0, 0).id, "sync");
  assert.equal(getRunDirective(1, 1).id, "clean");
  assert.equal(getRunDirective(2, 2).id, "wager");
  assert.equal(getRunDirective(3, 3).id, "sync");

  assert.equal(getRunDirectiveStatus("sync", { maxStreak: 3 }).completed, false);
  assert.deepEqual(
    getRunDirectiveStatus("sync", { maxStreak: 4 }),
    {
      id: "sync",
      code: "SYNC CHAIN",
      label: "연속 정답 4회 달성",
      target: 4,
      bonus: RUN_DIRECTIVE_BONUS,
      value: 4,
      progress: "4/4",
      completed: true,
    },
  );
  assert.equal(
    getRunDirectiveStatus("wager", { deepVerifyWins: 1 }).completed,
    false,
  );
  assert.equal(
    getRunDirectiveStatus("wager", { deepVerifyWins: 2 }).completed,
    true,
  );
  assert.equal(
    getRunDirectiveStatus("clean", { integrity: 3, ending: null }).completed,
    false,
  );
  assert.equal(
    getRunDirectiveStatus("clean", { integrity: 3, ending: "verified" }).completed,
    true,
  );
  assert.equal(
    getRunDirectiveStatus("clean", { integrity: 2, ending: "verified" }).completed,
    false,
  );
  assert.equal(getRunDirectiveStatus("unknown", {}), null);
});

test("verification gate shows progress, success, and an unrecoverable run", () => {
  assert.deepEqual(
    getAuditGateStatus({ correct: 0, answered: 0, integrity: 3 }),
    { state: "active", label: "5 MORE", needed: 5 },
  );
  assert.deepEqual(
    getAuditGateStatus({ correct: 5, answered: 5, integrity: 1 }),
    { state: "open", label: "GATE OPEN", needed: 0 },
  );
  assert.deepEqual(
    getAuditGateStatus({ correct: 1, answered: 3, integrity: 1 }),
    { state: "lost", label: "GATE LOST", needed: 4 },
  );
  assert.equal(
    getAuditGateStatus({ correct: 3, answered: 3, integrity: 0 }).state,
    "lost",
  );
});

test("three-answer sync can recover the latest failed round only once", () => {
  const outcomes = ["wrong", "correct", "timeout", "correct", "correct", "correct"];
  assert.equal(SYNC_RECOVERY_STREAK, 3);
  assert.equal(getSyncRecoveryIndex({ outcomes, streak: 2 }), -1);
  assert.equal(getSyncRecoveryIndex({ outcomes, streak: 3 }), 2);
  assert.equal(getSyncRecoveryIndex({ outcomes, streak: 4, used: true }), -1);
  assert.equal(
    getSyncRecoveryIndex({ outcomes: ["correct", "recovered", "correct"], streak: 3 }),
    -1,
  );
});

test("result rank distinguishes perfect, surviving, and failed audits", () => {
  assert.equal(getResult({ score: 6_000, correct: 6, integrity: 3 }).rank, "S");
  assert.equal(
    getResult({ score: 6_000, correct: 6, integrity: 3, recoveryUsed: true }).rank,
    "A",
  );
  assert.equal(getResult({ score: 4_000, correct: 5, integrity: 1 }).rank, "A");
  assert.equal(getResult({ score: 2_000, correct: 2, integrity: 1 }).rank, "C");
  assert.equal(getResult({ score: 4_000, correct: 5, integrity: 0 }).rank, "NULL");
});

test("memory encoding round-trips only the allowed game fields", () => {
  const memory = {
    version: 99,
    visits: 4,
    runs: 3,
    bestScore: 5_880,
    lastEnding: "verified",
    policy: "persistent",
    fragments: 4,
    injected: "not stored",
  };
  assert.deepEqual(decodeMemory(encodeMemory(memory)), {
    version: 2,
    visits: 4,
    runs: 3,
    bestScore: 5_880,
    lastEnding: "verified",
    policy: "persistent",
    fragments: 4,
  });
});

test("legacy memories migrate safely and memory fragments stop at the collection cap", () => {
  assert.deepEqual(sanitizeMemory({ version: 1, visits: 2, bestScore: 900 }), {
    version: 2,
    visits: 2,
    runs: 0,
    bestScore: 900,
    lastEnding: null,
    policy: null,
    fragments: 0,
  });
  assert.equal(awardMemoryFragment(0), 1);
  assert.equal(awardMemoryFragment(MAX_MEMORY_FRAGMENTS), MAX_MEMORY_FRAGMENTS);
  assert.equal(awardMemoryFragment(999), MAX_MEMORY_FRAGMENTS);
});

test("archive lens charges grow with recovered fragments and stop at three", () => {
  assert.equal(getArchiveLensCharges(0), 1);
  assert.equal(getArchiveLensCharges(1), 1);
  assert.equal(getArchiveLensCharges(2), 2);
  assert.equal(getArchiveLensCharges(3), 2);
  assert.equal(getArchiveLensCharges(4), 3);
  assert.equal(getArchiveLensCharges(MAX_MEMORY_FRAGMENTS), 3);
  assert.equal(getArchiveLensCharges("invalid"), 1);
});

test("only a verified audit awards the next memory fragment", () => {
  assert.equal(getFragmentReward(2, "verified"), 3);
  assert.equal(getFragmentReward(2, "unstable"), 2);
  assert.equal(getFragmentReward(2, null), 2);
  assert.equal(
    getFragmentReward(MAX_MEMORY_FRAGMENTS, "verified"),
    MAX_MEMORY_FRAGMENTS,
  );
});

test("each memory fragment unlocks one distinct MORI archive record", () => {
  assert.equal(getMoriArchiveRecord(0), null);
  assert.equal(getMoriArchiveRecord(MAX_MEMORY_FRAGMENTS + 1), null);

  const records = Array.from(
    { length: MAX_MEMORY_FRAGMENTS },
    (_, index) => getMoriArchiveRecord(index + 1),
  );
  assert.deepEqual(records.map((record) => record.fragment), [1, 2, 3, 4, 5, 6]);
  assert.equal(new Set(records.map((record) => record.code)).size, MAX_MEMORY_FRAGMENTS);
  assert.equal(new Set(records.map((record) => record.title)).size, MAX_MEMORY_FRAGMENTS);
  assert.ok(records.every((record) => record.body.length >= 40));
  assert.equal(records.at(-1).final, true);
});

test("malformed memory and unrelated cookies are handled safely", () => {
  assert.deepEqual(decodeMemory("%E0%A4%A"), sanitizeMemory(null));
  assert.equal(readCookieValue("alpha=1; state_less_memory_v1=hello%20world; omega=3"), "hello%20world");
  assert.equal(readCookieValue("alpha=1; omega=3"), null);
});
