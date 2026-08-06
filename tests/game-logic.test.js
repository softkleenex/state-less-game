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
  WAVE_CHIP_TARGET,
  WAVE_CORRUPTED_CHANCE,
  WAVE_MAX_CONCURRENT,
  WAVE_SPAWN_INTERVAL_MS,
  WAVE_TRAVEL_MS,
  awardMemoryFragment,
  createChipPool,
  createFactCatalog,
  createRandom,
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

test("wave config arrays are sized for all six waves and escalate monotonically", () => {
  for (const array of [WAVE_CHIP_TARGET, WAVE_SPAWN_INTERVAL_MS, WAVE_TRAVEL_MS, WAVE_MAX_CONCURRENT, WAVE_CORRUPTED_CHANCE]) {
    assert.equal(array.length, TOTAL_ROUNDS);
  }
  for (let index = 1; index < TOTAL_ROUNDS; index += 1) {
    assert.ok(WAVE_CHIP_TARGET[index] >= WAVE_CHIP_TARGET[index - 1]);
    assert.ok(WAVE_SPAWN_INTERVAL_MS[index] <= WAVE_SPAWN_INTERVAL_MS[index - 1]);
    assert.ok(WAVE_TRAVEL_MS[index] <= WAVE_TRAVEL_MS[index - 1]);
    assert.ok(WAVE_MAX_CONCURRENT[index] >= WAVE_MAX_CONCURRENT[index - 1]);
    assert.ok(WAVE_CORRUPTED_CHANCE[index] >= WAVE_CORRUPTED_CHANCE[index - 1]);
  }

  const config = getWaveConfig(2);
  assert.equal(config.target, WAVE_CHIP_TARGET[2]);
  assert.equal(config.spawnIntervalMs, WAVE_SPAWN_INTERVAL_MS[2]);
  assert.equal(config.travelMs, WAVE_TRAVEL_MS[2]);
  assert.equal(config.maxConcurrent, WAVE_MAX_CONCURRENT[2]);
  assert.equal(config.corruptedChance, WAVE_CORRUPTED_CHANCE[2]);

  assert.equal(getWaveConfig(-1).target, WAVE_CHIP_TARGET[0]);
  assert.equal(getWaveConfig(999).target, WAVE_CHIP_TARGET.at(-1));

  assert.equal(
    getWaveDurationMs(0),
    Math.round(WAVE_CHIP_TARGET[0] * WAVE_SPAWN_INTERVAL_MS[0] * 1.8),
  );
});

test("chip pool draws only from the fact catalog's truth/lie/decoy fields and is seed-reproducible", () => {
  const catalog = createFactCatalog(snapshot);
  const factsById = new Map(catalog.map((fact) => [fact.id, fact]));

  for (let waveIndex = 0; waveIndex < TOTAL_ROUNDS; waveIndex += 1) {
    const pool = createChipPool(catalog, waveIndex, "seed-a");
    assert.ok(pool.length > 0);
    for (const chip of pool) {
      assert.ok(["true", "false", "corrupted"].includes(chip.zone));
      const fact = factsById.get(chip.factId);
      assert.ok(fact);
      const expectedText = { true: fact.truthText, false: fact.lieText, corrupted: fact.decoyText }[chip.zone];
      assert.equal(chip.text, expectedText);
    }
  }

  assert.deepEqual(
    createChipPool(catalog, 3, "reproduce-me"),
    createChipPool(catalog, 3, "reproduce-me"),
  );
  assert.notDeepEqual(
    createChipPool(catalog, 3, "seed-a").map((chip) => chip.id),
    createChipPool(catalog, 3, "seed-b").map((chip) => chip.id),
  );
});

test("corrupted chip chance rises across waves as configured", () => {
  const catalog = createFactCatalog(snapshot);
  const sampleCorruptedRatio = (waveIndex) => {
    let corrupted = 0;
    let total = 0;
    for (let sample = 0; sample < 40; sample += 1) {
      const pool = createChipPool(catalog, waveIndex, `sample-${sample}`);
      corrupted += pool.filter((chip) => chip.zone === "corrupted").length;
      total += pool.length;
    }
    return corrupted / total;
  };

  assert.equal(sampleCorruptedRatio(0), 0);
  const laterRatio = sampleCorruptedRatio(5);
  assert.ok(laterRatio > 0.15);
});

test("score rewards remaining time and streak without exceeding its cap", () => {
  assert.equal(scoreCorrectAnswer(0, 0), 500);
  assert.equal(scoreCorrectAnswer(1, 1), 1_060);
  assert.equal(scoreCorrectAnswer(1.5, 99), 1_300);
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

test("run style tag picks the most distinctive way a run was played", () => {
  assert.equal(getRunStyleTag({ syncRecoveryUsed: true, deepVerifyWins: 3 }), "RECOVERY");
  assert.equal(getRunStyleTag({ deepVerifyWins: 2, wrongCount: 0, maxStreak: 5 }), "RISK");
  assert.equal(getRunStyleTag({ deepVerifyWins: 0, wrongCount: 0, maxStreak: 5 }), "PRECISION");
  assert.equal(getRunStyleTag({ deepVerifyWins: 0, wrongCount: 2, maxStreak: 3 }), "SPEED");
  assert.equal(getRunStyleTag({}), "SPEED");
  assert.ok(getRunStyleRemark("RECOVERY").length > 0);
  assert.equal(getRunStyleRemark("unknown-tag"), "");
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
