const test = require('node:test');
const assert = require('node:assert');
const Levels = require('../src/js/levels.js');
const Vocab = require('../src/js/vocab.js');

test('difficulty never decreases across 200 levels', () => {
  let prev = Levels.params(1);
  for (let l = 2; l <= Levels.MAX_LEVEL; l++) {
    const p = Levels.params(l);
    assert.ok(p.pairs >= prev.pairs, 'pairs @' + l);
    assert.ok(p.distractors >= prev.distractors, 'distractors @' + l);
    assert.ok(p.time / p.pairs <= prev.time / prev.pairs + 0.51, 'time per pair @' + l);
    prev = p;
  }
});

test('both panels hold the same words and grow by one every two levels up to the cap', () => {
  const n = Vocab.ENTRIES.length;
  for (let l = 1; l <= Levels.MAX_LEVEL; l++) {
    const p = Levels.params(l);
    assert.strictEqual(p.pairs, Math.min(Levels.MAX_PAIRS, 3 + Math.ceil(l / 2)));
    assert.strictEqual(p.distractors, 0);
    assert.strictEqual(Levels.pickWords(n, l).pairs.length, p.pairs);
  }
  assert.strictEqual(Levels.params(1).pairs, 4);
  assert.strictEqual(Levels.params(200).pairs, 30);
  assert.ok(Levels.params(50).time / Levels.params(50).pairs >= 6.9, 'first 50 levels are generous');
});

test('practice quiz offers 5 options per failed word, the right one included', () => {
  const n = Vocab.ENTRIES.length;
  const failed = [3, 7];
  const r = Levels.quizRound(failed, n);
  assert.strictEqual(r.pairs.length, 2);
  r.pairs.forEach((w, i) => {
    assert.ok(failed.includes(w));
    assert.strictEqual(r.options[i].length, 5);
    assert.strictEqual(new Set(r.options[i]).size, 5);
    assert.ok(r.options[i].includes(w));
  });
  const many = Levels.quizRound(Array.from({ length: 20 }, (_, i) => i), n);
  assert.strictEqual(many.pairs.length, 10);
  assert.strictEqual(many.params.time, 10 * 8);
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

test('new words per level depend on progress, the rest repeats known words', () => {
  const total = Vocab.ENTRIES.length;
  for (const level of [1, 5, 20, 50, 100, 200]) {
    const p = Levels.params(level);
    for (const knownCount of [0, 3, 10, 40, 110, 300, total]) {
      const known = []; for (let i = 0; i < knownCount; i++) known.push(i);
      for (const weakCount of [0, 8, 20]) {
        const weak = known.slice(0, weakCount);
        const r = Levels.pickWords(total, level, null, known, weak);
        assert.strictEqual(r.pairs.length, p.pairs);
        assert.strictEqual(new Set(r.pairs).size, r.pairs.length, 'dups');
        const fresh = r.pairs.filter(i => i >= knownCount).length;
        const limit = Math.max(Levels.newWordLimit(p.pairs, weak.length), Math.min(total - knownCount, p.pairs - knownCount));
        assert.ok(fresh <= Math.min(limit, total - knownCount), 'too many new @' + level + '/' + knownCount);
        if (knownCount === 0) assert.strictEqual(fresh, p.pairs);
        if (knownCount >= 40) assert.ok(fresh >= 1 || knownCount === total);
        // weak known words are repeated before other known words
        const weakIn = r.pairs.filter(i => weak.includes(i)).length;
        assert.strictEqual(weakIn, Math.min(weak.length, p.pairs - fresh));
      }
    }
  }
});

test('fewer new words while many words are failing', () => {
  assert.ok(Levels.newWordLimit(30, 20) < Levels.newWordLimit(30, 0));
  assert.ok(Levels.newWordLimit(30, 100) >= 1);
});

test('there are at least 500 words and 200 levels', () => {
  assert.ok(Vocab.ENTRIES.length >= 500, 'words: ' + Vocab.ENTRIES.length);
  assert.strictEqual(Levels.MAX_LEVEL, 200);
});

test('pictograms refer to existing words and cover most of the vocabulary', () => {
  const Pictos = require('../src/js/pictos.js');
  const ids = new Set(Vocab.ENTRIES.map(e => e.en));
  Object.keys(Pictos.MAP).forEach(k => assert.ok(ids.has(k), 'unknown word ' + k));
  assert.ok(Vocab.ENTRIES.filter(e => Pictos.forWord(e.en)).length >= 500);
});
