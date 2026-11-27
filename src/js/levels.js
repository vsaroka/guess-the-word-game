/* Level / difficulty logic. Pure functions, usable in browser (window.Levels) and Node (tests). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Levels = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  var MAX_LEVEL = 400;
  var MISS_PENALTY = 3;          // seconds lost on a wrong match
  var PAIRS_PER_LEVEL = 0.5;     // both panels grow by one word every two levels
  var BASE_PAIRS = 3;            // level 1 has 4 words
  var MAX_PAIRS = 30;            // cap so the lists stay playable on a phone
  var PRACTICE_MAX_PAIRS = 10;
  var QUIZ_OPTIONS = 5;          // answers offered per practice question
  var PRACTICE_SECONDS_PER_PAIR = 8;

  function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

  /** Difficulty parameters for a level (1..200). Both panels always show `pairs` words. */
  function params(level) {
    level = clamp(Math.round(level), 1, MAX_LEVEL);
    var pairs = Math.min(MAX_PAIRS, BASE_PAIRS + Math.ceil(PAIRS_PER_LEVEL * level));
    // seconds budget per pair: generous 10 -> 7 over levels 1-50, then 7 -> 3.2 at level 400
    var perPair = level <= 50 ? 10 - level * 0.06 : 7 - (level - 50) * 0.010857;
    var time = Math.round(pairs * perPair);
    return { level: level, pairs: pairs, distractors: 0, time: time, penalty: MISS_PENALTY };
  }

  function shuffle(arr, rng) {
    rng = rng || Math.random;
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rng() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  /** How many new words a level may introduce. Fewer when many words are still failing. */
  function newWordLimit(pairs, weakCount) {
    return clamp(Math.ceil(pairs * 0.4) - Math.floor(weakCount / 4), 1, pairs);
  }

  /**
   * Choose vocabulary indexes for a level.
   * `known` lists indexes the player has already guessed, `weak` those still failing (repeat first).
   * New words come in vocabulary order (easy -> hard), but only as many as the player's progress
   * allows (see newWordLimit); the rest of the level repeats known words, weak ones first.
   */
  function pickWords(total, level, rng, known, weak) {
    var p = params(level);
    known = known || []; weak = weak || [];
    var isKnown = {}; known.forEach(function (i) { isKnown[i] = true; });
    var fresh = []; for (var i = 0; i < total; i++) if (!isKnown[i]) fresh.push(i);
    var nNew = Math.min(fresh.length, newWordLimit(p.pairs, weak.length));
    nNew = Math.max(nNew, Math.min(fresh.length, p.pairs - known.length)); // not enough known words to repeat
    nNew = Math.min(nNew, p.pairs);
    var weakK = shuffle(weak.filter(function (i) { return isKnown[i]; }), rng);
    var isWeak = {}; weakK.forEach(function (i) { isWeak[i] = true; });
    var otherK = shuffle(known.filter(function (i) { return !isWeak[i]; }), rng);
    var chosen = fresh.slice(0, nNew).concat(weakK.concat(otherK).slice(0, p.pairs - nNew));
    return { params: p, pairs: shuffle(chosen, rng), distractors: [], newCount: nNew };
  }

  /**
   * Practice quiz built from previously failed vocabulary indexes (no level, no score).
   * Takes up to 10 failed words (a word may repeat once per failure). Each question shows one word and QUIZ_OPTIONS translations:
   * the right one plus random wrong ones, in random order. options[i] belongs to pairs[i].
   */
  function quizRound(failed, total, rng) {
    var words = shuffle(failed, rng).slice(0, PRACTICE_MAX_PAIRS);
    var options = words.map(function (w) {
      var others = [];
      for (var i = 0; i < total; i++) if (i !== w) others.push(i);
      return shuffle([w].concat(shuffle(others, rng).slice(0, Math.min(QUIZ_OPTIONS, total) - 1)), rng);
    });
    var p = { level: 0, pairs: words.length, distractors: 0,
              time: words.length * PRACTICE_SECONDS_PER_PAIR, penalty: MISS_PENALTY };
    return { params: p, pairs: words, options: options };
  }

  function score(p, secondsLeft) {
    return p.pairs * 10 + Math.max(0, Math.round(secondsLeft)) * 2;
  }

  return { MAX_LEVEL: MAX_LEVEL, MAX_PAIRS: MAX_PAIRS, params: params, newWordLimit: newWordLimit, pickWords: pickWords,
           quizRound: quizRound, shuffle: shuffle, score: score };
});
