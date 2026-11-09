const test = require('node:test');
const assert = require('node:assert');
const Levels = require('../src/js/levels.js');
const Vocab = require('../src/js/vocab.js');

test('difficulty never decreases across 100 levels', () => {
  let prev = Levels.params(1);
  for (let l = 2; l <= 100; l++) {
    const p = Levels.params(l);
    assert.ok(p.pairs >= prev.pairs, 'pairs @' + l);
    assert.ok(p.distractors >= prev.distractors, 'distractors @' + l);
    assert.ok(p.time / p.pairs <= prev.time / prev.pairs + 0.51, 'time per pair @' + l);
    prev = p;
  }
});

test('options grow by one per level up to the cap', () => {
  for (let l = 1; l <= 100; l++) {
    assert.strictEqual(Levels.params(l).distractors, Math.min(Levels.MAX_DISTRACTORS, l));
  }
  assert.strictEqual(Levels.params(1).distractors, 1);
  assert.strictEqual(Levels.params(2).distractors, 2);
});

test('practice round uses only failed words plus distractors', () => {
  const n = Vocab.ENTRIES.length;
  const failed = [3, 7, 9];
  const r = Levels.practiceRound(failed, n);
  assert.deepStrictEqual([...r.pairs].sort((a, b) => a - b), failed);
  assert.strictEqual(r.distractors.length, 2);
  r.distractors.forEach(d => assert.ok(!failed.includes(d)));
  const many = Levels.practiceRound(Array.from({ length: 20 }, (_, i) => i), n);
  assert.strictEqual(many.pairs.length, 8);
  assert.strictEqual(many.params.time, 8 * 8);
});

test('every level picks valid, unique words', () => {
  const n = Vocab.ENTRIES.length;
  for (let l = 1; l <= 100; l++) {
    const r = Levels.pickWords(n, l);
    const all = r.pairs.concat(r.distractors);
    assert.strictEqual(r.pairs.length, r.params.pairs);
    assert.strictEqual(r.distractors.length, r.params.distractors);
    assert.strictEqual(new Set(all).size, all.length, 'duplicates @' + l);
    all.forEach(i => assert.ok(i >= 0 && i < n));
  }
});

test('vocabulary is complete and unambiguous per language', () => {
  Object.keys(Vocab.LANGUAGES).forEach(lang => {
    const seen = new Set();
    Vocab.ENTRIES.forEach(e => {
      assert.ok(e[lang], 'missing ' + lang);
      assert.ok(!seen.has(e[lang]), 'duplicate ' + lang + ': ' + e[lang]);
      seen.add(e[lang]);
    });
  });
});
