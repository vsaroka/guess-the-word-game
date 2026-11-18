const test = require('node:test');
const assert = require('node:assert');
const Levels = require('../src/js/levels.js');
const Vocab = require('../src/js/vocab.js');

test('difficulty never decreases across 150 levels', () => {
  let prev = Levels.params(1);
  for (let l = 2; l <= Levels.MAX_LEVEL; l++) {
    const p = Levels.params(l);
    assert.ok(p.pairs >= prev.pairs, 'pairs @' + l);
    assert.ok(p.distractors >= prev.distractors, 'distractors @' + l);
    assert.ok(p.time / p.pairs <= prev.time / prev.pairs + 0.51, 'time per pair @' + l);
    prev = p;
  }
});

test('both panels hold the same words and grow by two per level up to the cap', () => {
  const n = Vocab.ENTRIES.length;
  for (let l = 1; l <= Levels.MAX_LEVEL; l++) {
    const p = Levels.params(l);
    assert.strictEqual(p.pairs, Math.min(Levels.MAX_PAIRS, 2 + 2 * l));
    assert.strictEqual(p.distractors, 0);
    assert.strictEqual(Levels.pickWords(n, l).pairs.length, p.pairs);
  }
  assert.strictEqual(Levels.params(1).pairs, 4);
  assert.strictEqual(Levels.params(150).pairs, 30);
});

test('practice round uses the failed words, padded with fillers to at least 4', () => {
  const n = Vocab.ENTRIES.length;
  const failed = [3, 7];
  const r = Levels.practiceRound(failed, n);
  assert.strictEqual(r.pairs.length, 4);
  assert.strictEqual(r.fillers.length, 2);
  failed.forEach(f => assert.ok(r.pairs.includes(f)));
  r.fillers.forEach(f => assert.ok(!failed.includes(f) && r.pairs.includes(f)));
  assert.strictEqual(r.distractors.length, 0);
  const many = Levels.practiceRound(Array.from({ length: 20 }, (_, i) => i), n);
  assert.strictEqual(many.pairs.length, 8);
  assert.strictEqual(many.fillers.length, 0);
  assert.strictEqual(many.params.time, 8 * 8);
});

test('every level picks valid, unique words', () => {
  const n = Vocab.ENTRIES.length;
  for (let l = 1; l <= Levels.MAX_LEVEL; l++) {
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

test('levels prefer words the player has not guessed yet', () => {
  const total = Vocab.ENTRIES.length;
  for (const level of [1, 5, 10, 20, 40, 70, 100, 150]) {
    const p = Levels.params(level);
    for (const knownCount of [0, 10, 40, 80, 110, total]) {
      const known = []; for (let i = 0; i < knownCount; i++) known.push(i);
      const r = Levels.pickWords(total, level, null, known);
      assert.strictEqual(r.pairs.length, Math.min(p.pairs, total));
      assert.strictEqual(new Set(r.pairs).size, r.pairs.length, 'dups');
      const fresh = r.pairs.filter(i => i >= knownCount).length;
      assert.strictEqual(fresh, Math.min(r.pairs.length, total - knownCount), 'level ' + level + ' known ' + knownCount);
    }
  }
});

test('there are at least 500 words and 150 levels', () => {
  assert.ok(Vocab.ENTRIES.length >= 500, 'words: ' + Vocab.ENTRIES.length);
  assert.strictEqual(Levels.MAX_LEVEL, 150);
});
