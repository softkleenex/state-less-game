import test from "node:test";
import assert from "node:assert/strict";

import {
  TOTAL_ROUNDS,
  createFactCatalog,
  createRandom,
  createRoundDeck,
  getResult,
  getRoundDuration,
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

test("fact catalog exposes a distinct truth and lie for every browser fact", () => {
  const catalog = createFactCatalog(snapshot);
  assert.equal(catalog.length, 10);
  for (const fact of catalog) {
    assert.ok(fact.id);
    assert.ok(fact.label);
    assert.ok(fact.value);
    assert.notEqual(fact.truthText, fact.lieText);
  }
});

test("every round has three different facts and exactly one lie", () => {
  const catalog = createFactCatalog(snapshot);
  const rounds = createRoundDeck(catalog, TOTAL_ROUNDS, seedFromString("audit"));
  assert.equal(rounds.length, TOTAL_ROUNDS);

  for (const round of rounds) {
    assert.equal(round.statements.length, 3);
    assert.equal(round.statements.filter((statement) => statement.isLie).length, 1);
    assert.equal(new Set(round.statements.map((statement) => statement.factId)).size, 3);
  }
});

test("round deck is reproducible for the same state and seed", () => {
  const catalog = createFactCatalog(snapshot);
  const seed = seedFromString("visit-2-run-1");
  assert.deepEqual(
    createRoundDeck(catalog, TOTAL_ROUNDS, seed),
    createRoundDeck(catalog, TOTAL_ROUNDS, seed),
  );
});

test("score rewards remaining time and streak without exceeding its cap", () => {
  assert.equal(scoreCorrectAnswer(0, 0), 500);
  assert.equal(scoreCorrectAnswer(1, 1), 1_060);
  assert.equal(scoreCorrectAnswer(1.5, 99), 1_300);
});

test("later rounds get faster but retain a readable eight-and-a-half-second floor", () => {
  assert.equal(getRoundDuration(0), 12_000);
  assert.equal(getRoundDuration(5), 9_000);
  assert.equal(getRoundDuration(999), 8_500);
});

test("result rank distinguishes perfect, surviving, and failed audits", () => {
  assert.equal(getResult({ score: 6_000, correct: 6, integrity: 3 }).rank, "S");
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
    injected: "not stored",
  };
  assert.deepEqual(decodeMemory(encodeMemory(memory)), {
    version: 1,
    visits: 4,
    runs: 3,
    bestScore: 5_880,
    lastEnding: "verified",
    policy: "persistent",
  });
});

test("malformed memory and unrelated cookies are handled safely", () => {
  assert.deepEqual(decodeMemory("%E0%A4%A"), sanitizeMemory(null));
  assert.equal(readCookieValue("alpha=1; state_less_memory_v1=hello%20world; omega=3"), "hello%20world");
  assert.equal(readCookieValue("alpha=1; omega=3"), null);
});
