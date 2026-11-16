/* Level / difficulty logic. Pure functions, usable in browser (window.Levels) and Node (tests). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Levels = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  var MAX_LEVEL = 100;
  var MISS_PENALTY = 3;          // seconds lost on a wrong match
  var PAIRS_PER_LEVEL = 2;       // both panels grow by this many words per level
  var BASE_PAIRS = 2;            // level 1 has BASE_PAIRS + PAIRS_PER_LEVEL = 4 words
  var MAX_PAIRS = 30;            // cap so the lists stay playable on a phone
  var PRACTICE_MAX_PAIRS = 8;
  var PRACTICE_MIN_PAIRS = 4;    // short failed lists are padded with filler words
  var PRACTICE_SECONDS_PER_PAIR = 8;

  function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

  /** Difficulty parameters for a level (1..100). Both panels always show `pairs` words. */
  function params(level) {
    level = clamp(Math.round(level), 1, MAX_LEVEL);
    var pairs = Math.min(MAX_PAIRS, BASE_PAIRS + PAIRS_PER_LEVEL * level);
    var perPair = Math.max(3.2, 9 - level * 0.058);              // seconds budget per pair
    var time = Math.round(pairs * perPair);
    return { level: level, pairs: pairs, distractors: 0, time: time, penalty: MISS_PENALTY };
  }

  /** How many vocabulary entries (ordered easy -> hard) are in play at this level. */
  function poolSize(level, total, p) {
    p = p || params(level);
    var min = Math.min(total, p.pairs + 4);
    var size = Math.round(20 + (total - 20) * (clamp(level, 1, MAX_LEVEL) - 1) / (MAX_LEVEL - 1));
    return clamp(size, min, total);
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

  /**
   * Choose vocabulary indexes for a level.
   * `known` (optional) lists indexes the player has already guessed. Words not yet guessed are
   * always taken first, so every level teaches as many new words as possible. If the normal pool
   * holds too few new words it is extended toward harder words until there are enough.
   * Within that, half of the pairs come from the hardest 40% of the pool, so later levels feel harder.
   */
  function pickWords(total, level, rng, known) {
    var p = params(level);
    var isKnown = {}; (known || []).forEach(function (i) { isKnown[i] = true; });
    var size = poolSize(level, total, p);
    function fresh(n) { var c = 0; for (var i = 0; i < n; i++) if (!isKnown[i]) c++; return c; }
    while (size < total && fresh(size) < p.pairs) size++;
    var hardStart = Math.floor(size * 0.6);
    var all = []; for (var i = 0; i < size; i++) all.push(i);
    function group(from, to, wantKnown) {
      return shuffle(all.filter(function (i) { return i >= from && i < to && !!isKnown[i] === wantKnown; }), rng);
    }
    var hardN = group(hardStart, size, false), easyN = group(0, hardStart, false);
    var hardK = group(hardStart, size, true), easyK = group(0, hardStart, true);
    var nHard = Math.ceil(p.pairs / 2);
    var chosen = hardN.slice(0, nHard);
    chosen = chosen.concat(easyN.slice(0, p.pairs - chosen.length));
    // not enough in one half: still prefer new words from the other half over repeating known ones
    chosen = chosen.concat(hardN.slice(chosen.filter(function (i) { return i >= hardStart; }).length),
                           easyN.slice(chosen.filter(function (i) { return i < hardStart; }).length)).slice(0, p.pairs);
    var rest = shuffle(hardK.concat(easyK), rng);
    chosen = chosen.concat(rest.slice(0, p.pairs - chosen.length));
    return { params: p, pairs: shuffle(chosen, rng), distractors: [] };
  }

  /**
   * Practice round built from previously failed vocabulary indexes (no level, no score).
   * Takes up to 8 failed words; if fewer than 4, random filler words pad the round so both
   * panels stay equal in size and the round is not trivial. Fillers are listed separately.
   */
  function practiceRound(failed, total, rng) {
    var words = shuffle(failed, rng).slice(0, PRACTICE_MAX_PAIRS);
    var fillers = [];
    if (words.length && words.length < PRACTICE_MIN_PAIRS) {
      var rest = [];
      for (var i = 0; i < total; i++) if (words.indexOf(i) < 0) rest.push(i);
      fillers = shuffle(rest, rng).slice(0, PRACTICE_MIN_PAIRS - words.length);
    }
    var pairs = shuffle(words.concat(fillers), rng);
    var p = { level: 0, pairs: pairs.length, distractors: 0,
              time: pairs.length * PRACTICE_SECONDS_PER_PAIR, penalty: MISS_PENALTY };
    return { params: p, pairs: pairs, distractors: [], fillers: fillers };
  }

  function score(p, secondsLeft) {
    return p.pairs * 10 + Math.max(0, Math.round(secondsLeft)) * 2;
  }

  return { MAX_LEVEL: MAX_LEVEL, MAX_PAIRS: MAX_PAIRS, params: params, poolSize: poolSize, pickWords: pickWords,
           practiceRound: practiceRound, shuffle: shuffle, score: score };
});
