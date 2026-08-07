import test from "node:test";
import assert from "node:assert/strict";

import {
  BUFF_CHOICES_PER_PICK,
  BUFF_DEFINITIONS,
  BUFF_PICK_END_BUFFER_MS,
  BUFF_PICK_FIRST_MS,
  BUFF_PICK_INTERVAL_MS,
  GENUINE_CHANCE,
  MAX_MEMORY_FRAGMENTS,
  RUN_DIRECTIVE_BONUS,
  RUN_DURATION_MS,
  SLOT_COUNT,
  WRONG_CLICK_LOSS,
  WRONG_CLICK_LOSS_DEEP_VERIFY,
  awardMemoryFragment,
  createRandom,
  getArchiveLensCharges,
  getBuffPickTriggers,
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
  getUnlockedBuffDefinitions,
  getWrongClickLoss,
  pickSignalKind,
  scorePurge,
  seedFromString,
} from "../src/game-logic.js";
import {
  decodeMemory,
  encodeMemory,
  readCookieValue,
  sanitizeMemory,
} from "../src/state-store.js";

test("seeded random sequence is deterministic", () => {
  const seed = seedFromString("same-session");
  const first = createRandom(seed);
  const second = createRandom(seed);
  assert.deepEqual(
    [first(), first(), first(), first()],
    [second(), second(), second(), second()],
  );
});

test("spawn interval and signal lifespan shrink while concurrency grows across the run", () => {
  const early = { interval: getSpawnIntervalMs(0), lifespan: getSignalLifespanMs(0), concurrent: getMaxConcurrentSignals(0) };
  const mid = { interval: getSpawnIntervalMs(RUN_DURATION_MS / 2), lifespan: getSignalLifespanMs(RUN_DURATION_MS / 2), concurrent: getMaxConcurrentSignals(RUN_DURATION_MS / 2) };
  const late = { interval: getSpawnIntervalMs(RUN_DURATION_MS), lifespan: getSignalLifespanMs(RUN_DURATION_MS), concurrent: getMaxConcurrentSignals(RUN_DURATION_MS) };

  assert.ok(early.interval > mid.interval);
  assert.ok(mid.interval > late.interval);
  assert.ok(early.lifespan > mid.lifespan);
  assert.ok(mid.lifespan > late.lifespan);
  assert.ok(early.concurrent <= mid.concurrent);
  assert.ok(mid.concurrent <= late.concurrent);
  assert.ok(late.concurrent <= SLOT_COUNT);

  // Values past the run duration clamp instead of continuing to escalate.
  assert.equal(getSpawnIntervalMs(RUN_DURATION_MS * 2), late.interval);
  assert.equal(getMaxConcurrentSignals(-100), early.concurrent);
});

test("signal kind sampling matches the configured genuine ratio", () => {
  const random = createRandom(seedFromString("kind-sample"));
  let genuine = 0;
  const samples = 4_000;
  for (let index = 0; index < samples; index += 1) {
    if (pickSignalKind(random) === "genuine") genuine += 1;
  }
  const ratio = genuine / samples;
  assert.ok(Math.abs(ratio - GENUINE_CHANCE) < 0.05);

  const boosted = createRandom(seedFromString("kind-sample-boosted"));
  let boostedGenuine = 0;
  for (let index = 0; index < samples; index += 1) {
    if (pickSignalKind(boosted, GENUINE_CHANCE + 0.12) === "genuine") boostedGenuine += 1;
  }
  assert.ok(Math.abs(boostedGenuine / samples - (GENUINE_CHANCE + 0.12)) < 0.05);
});

test("purge scoring rewards fast reactions and combo without an unbounded cap, and the wager multiplier doubles it", () => {
  const slow = scorePurge(0, 0);
  const fast = scorePurge(1, 0);
  const highCombo = scorePurge(0, 12);
  const overCombo = scorePurge(0, 999);
  assert.ok(fast > slow);
  assert.ok(highCombo > slow);
  assert.equal(highCombo, overCombo);
  assert.equal(scorePurge(1, 12, 2), scorePurge(1, 12) * 2);
});

test("a wrong click on a genuine signal costs more during the deep verify wager", () => {
  assert.equal(getWrongClickLoss(), WRONG_CLICK_LOSS);
  assert.equal(getWrongClickLoss(false), WRONG_CLICK_LOSS);
  assert.equal(getWrongClickLoss(true), WRONG_CLICK_LOSS_DEEP_VERIFY);
  assert.equal(WRONG_CLICK_LOSS_DEEP_VERIFY, WRONG_CLICK_LOSS * 2);
  assert.equal(getWrongClickLoss(false, 1), WRONG_CLICK_LOSS + 1);
  assert.equal(getWrongClickLoss(false, -1), WRONG_CLICK_LOSS - 1);
  assert.equal(getWrongClickLoss(false, -99), 0);
});

test("buff modifiers scale purge scoring without breaking the unmodified default", () => {
  const base = scorePurge(1, 8);
  assert.equal(scorePurge(1, 8, 1, {}), base);
  assert.ok(scorePurge(1, 8, 1, { comboScale: 0.5 }) > base);
  assert.ok(scorePurge(1, 8, 1, { comboScale: -0.2 }) < base);
  assert.ok(scorePurge(1, 8, 1, { scoreScale: -0.1 }) < base);
  assert.equal(
    scorePurge(1, 8, 2, { comboScale: 0.5 }),
    scorePurge(1, 8, 1, { comboScale: 0.5 }) * 2,
  );
});

test("buff picks repeat on a cadence for the whole run instead of stopping after a fixed count", () => {
  assert.equal(BUFF_CHOICES_PER_PICK, 2);
  const triggers = getBuffPickTriggers(RUN_DURATION_MS);
  assert.ok(triggers.length >= 6, "a 60s run should offer well more than the old fixed three picks");
  assert.equal(triggers[0], BUFF_PICK_FIRST_MS);
  for (let index = 1; index < triggers.length; index += 1) {
    assert.equal(triggers[index] - triggers[index - 1], BUFF_PICK_INTERVAL_MS);
  }
  assert.ok(triggers.at(-1) <= RUN_DURATION_MS - BUFF_PICK_END_BUFFER_MS);
  // A short run yields no picks rather than one crammed right at the end.
  assert.deepEqual(getBuffPickTriggers(5_000), []);

  assert.equal(new Set(BUFF_DEFINITIONS.map((buff) => buff.id)).size, BUFF_DEFINITIONS.length);
  assert.ok(BUFF_DEFINITIONS.length >= 30, "the pool should be large — unlimited stacking is the point");
  for (const buff of BUFF_DEFINITIONS) {
    assert.ok(buff.name.length > 0);
    assert.ok(buff.description.length > 0);
    assert.ok(buff.effects && typeof buff.effects === "object");
  }
});

test("locked buffs only join the pool once enough memory fragments are recovered", () => {
  const lockedIds = BUFF_DEFINITIONS.filter((buff) => buff.unlock).map((buff) => buff.id);
  assert.ok(lockedIds.length > 0);

  const zeroFragmentIds = getUnlockedBuffDefinitions(0).map((buff) => buff.id);
  lockedIds.forEach((id) => assert.ok(!zeroFragmentIds.includes(id)));
  assert.ok(zeroFragmentIds.length >= BUFF_CHOICES_PER_PICK);

  const maxFragmentIds = getUnlockedBuffDefinitions(MAX_MEMORY_FRAGMENTS).map((buff) => buff.id);
  lockedIds.forEach((id) => assert.ok(maxFragmentIds.includes(id)));
});

test("purge scoring floors comboScale/scoreScale instead of letting stacked debuffs invert them", () => {
  const base = scorePurge(1, 8);
  assert.ok(scorePurge(1, 8, 1, { comboScale: -50 }) > 0);
  assert.equal(scorePurge(1, 8, 1, { comboScale: -50 }), scorePurge(1, 8, 1, { comboScale: -1 }));
  assert.ok(scorePurge(1, 8, 1, { scoreScale: -50 }) > 0);
  assert.ok(scorePurge(1, 8, 1, { scoreScale: -50 }) < base);
});

test("run directives rotate and complete only at their stated thresholds", () => {
  assert.equal(RUN_DIRECTIVE_BONUS, 600);
  assert.equal(getRunDirective(0, 0).id, "combo");
  assert.equal(getRunDirective(1, 1).id, "wager");
  assert.equal(getRunDirective(2, 2).id, "clean");
  assert.equal(getRunDirective(3, 3).id, "combo");

  assert.equal(getRunDirectiveStatus("combo", { maxCombo: 7 }).completed, false);
  assert.deepEqual(
    getRunDirectiveStatus("combo", { maxCombo: 8 }),
    {
      id: "combo",
      code: "COMBO CHAIN",
      label: "최고 콤보 ×8 달성",
      target: 8,
      bonus: RUN_DIRECTIVE_BONUS,
      value: 8,
      progress: "8/8",
      completed: true,
    },
  );
  assert.equal(getRunDirectiveStatus("wager", { deepVerifyPurges: 2 }).completed, false);
  assert.equal(getRunDirectiveStatus("wager", { deepVerifyPurges: 3 }).completed, true);
  assert.equal(getRunDirectiveStatus("clean", { wrongClicks: 0, ending: null }).completed, false);
  assert.equal(getRunDirectiveStatus("clean", { wrongClicks: 0, ending: "verified" }).completed, true);
  assert.equal(getRunDirectiveStatus("clean", { wrongClicks: 1, ending: "verified" }).completed, false);
  assert.equal(getRunDirectiveStatus("unknown", {}), null);
});

test("result rank distinguishes a perfect defense, a survived run, and a breached core", () => {
  assert.equal(getResult({ score: 9_000, purges: 20, wrongClicks: 0, missedFakes: 0, integrity: 3 }).rank, "S");
  assert.equal(getResult({ score: 6_000, purges: 16, wrongClicks: 1, missedFakes: 2, integrity: 2 }).rank, "A");
  assert.equal(getResult({ score: 3_000, purges: 8, wrongClicks: 2, missedFakes: 5, integrity: 1 }).rank, "B");
  assert.equal(getResult({ score: 1_000, purges: 2, wrongClicks: 3, missedFakes: 8, integrity: 1 }).rank, "C");
  assert.equal(getResult({ score: 4_000, purges: 10, wrongClicks: 0, missedFakes: 1, integrity: 0 }).rank, "NULL");
  assert.equal(getResult({ score: 0, purges: 0, wrongClicks: 0, missedFakes: 0, integrity: 3 }).rank, "S");
});

test("run style tag picks the most distinctive way a run was played", () => {
  assert.equal(getRunStyleTag({ deepVerifyPurges: 2, wrongClicks: 1, maxCombo: 5 }), "RISK");
  assert.equal(getRunStyleTag({ deepVerifyPurges: 0, wrongClicks: 0, maxCombo: 5 }), "PRECISION");
  assert.equal(getRunStyleTag({ deepVerifyPurges: 0, wrongClicks: 2, maxCombo: 3, lensUses: 2 }), "STEADY");
  assert.equal(getRunStyleTag({ deepVerifyPurges: 0, wrongClicks: 2, maxCombo: 3, lensUses: 0 }), "SPEED");
  assert.equal(getRunStyleTag({}), "SPEED");
  assert.ok(getRunStyleRemark("RISK").length > 0);
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
  assert.equal(getArchiveLensCharges(0), 2);
  assert.equal(getArchiveLensCharges(1), 2);
  assert.equal(getArchiveLensCharges(2), 3);
  assert.equal(getArchiveLensCharges(3), 3);
  assert.equal(getArchiveLensCharges(4), 3);
  assert.equal(getArchiveLensCharges(MAX_MEMORY_FRAGMENTS), 3);
  assert.equal(getArchiveLensCharges("invalid"), 2);
});

test("only a verified run awards the next memory fragment", () => {
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
