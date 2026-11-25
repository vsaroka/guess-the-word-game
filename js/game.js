(function () {
  var V = window.Vocab, L = window.Levels, P = window.Pictos;
  var $ = function (id) { return document.getElementById(id); };
  var STORE = 'guess-the-word-v1';
  var PAIR_FLASH_MS = 500; // a matched pair stays visible (green) this long before it is replaced

  function defaults() { return { native: 'de', target: 'fr', best: {}, score: 0, failed: {}, stats: {}, last: {}, picto: true }; }
  function load() {
    try { return Object.assign(defaults(), JSON.parse(localStorage.getItem(STORE))); }
    catch (e) { return defaults(); }
  }
  function persist() { try { localStorage.setItem(STORE, JSON.stringify(save)); } catch (e) {} }

  var save = load();
  var g = null; // current round state

  // vocabulary entries are identified by their English word, stable across language pairs
  var byId = {};
  V.ENTRIES.forEach(function (e, i) { byId[e.en] = i; });
  function id(idx) { return V.ENTRIES[idx].en; }

  // everything is tracked per language pair
  function key() { return save.native + '>' + save.target; }
  function unlocked() { return save.best[key()] || 1; }
  function stats() {
    var s = save.stats[key()];
    if (!s) s = save.stats[key()] = { attempts: 0, wins: 0, losses: 0, matches: 0, misses: 0, practice: 0, levels: {}, words: {} };
    return s;
  }
  function wordStat(idx) { var w = stats().words; return w[id(idx)] || (w[id(idx)] = { ok: 0, miss: 0 }); }
  /** Ids of guessed words in the order they were first guessed (older saves are filled in vocabulary order). */
  function learnedList() {
    var s = stats(), list = s.learned || (s.learned = []), seen = {};
    list.forEach(function (k) { seen[k] = true; });
    var missing = [];
    for (var i = 0; i < V.ENTRIES.length; i++) if (isGuessed(i) && !seen[id(i)]) missing.push(id(i));
    if (missing.length) s.learned = missing.concat(list);
    return s.learned;
  }
  function newestIdx(n) { return learnedList().slice(-n).map(function (k) { return byId[k]; }).filter(function (i) { return i != null; }); }
  /** Records a correct answer; returns true when the word was guessed for the first time. */
  function recordOk(idx) {
    var first = !isGuessed(idx);
    if (first) { learnedList(); stats().learned.push(id(idx)); }
    wordStat(idx).ok++;
    return first;
  }
  function isGuessed(idx) { var w = stats().words[id(idx)]; return !!(w && w.ok > 0); }
  function guessedIdx() { var r = []; for (var i = 0; i < V.ENTRIES.length; i++) if (isGuessed(i)) r.push(i); return r; }
  /** Failure counts per word id. Older saves stored a plain list of ids (one failure each). */
  function failedMap() {
    var f = save.failed[key()];
    if (Array.isArray(f)) { var m = {}; f.forEach(function (i) { m[i] = 1; }); f = m; }
    return save.failed[key()] = f || {};
  }
  /** Word indexes to practice, repeated once per outstanding failure. */
  function failedIdx() {
    var f = failedMap(), r = [];
    Object.keys(f).forEach(function (k) { if (byId[k] != null) for (var n = 0; n < f[k]; n++) r.push(byId[k]); });
    return r;
  }
  function weakIdx() { var f = failedMap(); return Object.keys(f).filter(function (k) { return byId[k] != null && f[k] > 0; }).map(function (k) { return byId[k]; }); }
  function addFailed(idx) { var f = failedMap(); f[id(idx)] = Math.min(5, (f[id(idx)] || 0) + 1); }
  function removeFailed(idx) {
    var f = failedMap(), k = id(idx);
    if (f[k] > 1) f[k]--; else delete f[k];
  }

  function fillSelect(sel, value) {
    sel.innerHTML = '';
    Object.keys(V.LANGUAGES).forEach(function (c) {
      var o = document.createElement('option'); o.value = c; o.textContent = V.LANGUAGES[c];
      if (c === value) o.selected = true; sel.appendChild(o);
    });
  }

  function refreshStart() {
    var n = failedIdx().length;
    $('progress-info').textContent = 'Next level: ' + unlocked() + ' (' + key().replace('>', ' → ') + ')';
    $('btn-practice').textContent = 'Practice failed words (' + n + ')';
    $('btn-practice').disabled = n === 0 || save.native === save.target;
    var same = save.native === save.target, last = save.last[key()];
    $('btn-review').disabled = same || newestIdx(REVIEW_WORDS).length === 0;
    $('btn-repeat').textContent = 'Repeat level ' + (last ? last.level : Math.max(1, unlocked() - 1));
    $('btn-repeat').disabled = same || (!last && unlocked() <= 1);
  }

  function show(screen) {
    ['screen-start', 'screen-game', 'screen-stats'].forEach(function (s) { $(s).classList.toggle('hidden', s !== screen); });
    document.body.classList.toggle('playing', screen === 'screen-game'); // game screen never scrolls
  }

  function word(idx, lang) { return V.ENTRIES[idx][lang]; }

  /** Sets a button's label: the word, with its pictogram in front when the word is in the learned language. */
  function setLabel(b, idx, lang) {
    b.textContent = '';
    var pic = save.picto !== false && lang === save.target ? P.forWord(id(idx)) : '';
    if (pic) { var i = document.createElement('span'); i.className = 'picto'; i.setAttribute('aria-hidden', 'true'); i.textContent = pic; b.appendChild(i); }
    b.appendChild(document.createTextNode(word(idx, lang)));
  }

  /* ---------- rounds ---------- */

  var REVIEW_WORDS = 10; // the newest words offered in a review session

  function startRound(mode, level, sameWords) {
    stopTimer();
    var pick, quiz = mode !== 'level';
    if (quiz) {
      pick = L.quizRound(mode === 'review' ? newestIdx(REVIEW_WORDS) : failedIdx(), V.ENTRIES.length);
      if (!pick.pairs.length) { toMenu(); return; }
    } else if (sameWords) {
      // repeating a level: the same words as last time, to beat the old time and score
      pick = { params: L.params(level), pairs: L.shuffle(sameWords), distractors: [] };
    } else {
      pick = L.pickWords(V.ENTRIES.length, level, null, guessedIdx(), weakIdx());
    }
    var p = pick.params;
    g = { mode: mode, level: level, p: p, left: pick.pairs, queue: pick.pairs.slice(), matched: {}, missed: {}, gained: 0, fresh: 0, wrong: {},
          strikes: {}, forfeits: 0, sel: null, selR: null, timeLeft: p.time, over: false, options: pick.options, qi: 0, busy: false, same: sameWords };
    $('title-native').textContent = V.LANGUAGES[save.native];
    $('title-target').textContent = V.LANGUAGES[save.target];
    hideOverlay();
    show('screen-game');
    $('panels').classList.toggle('hidden', quiz);
    $('quiz').classList.toggle('hidden', !quiz);
    if (quiz) {
      showQuestion();
      g.timer = setInterval(tick, 250);
      g.last = Date.now();
      hud();
      return;
    }
    // only as many words as fit on screen are shown; the rest follow as pairs are matched
    var first = g.queue.splice(0, visibleSlots(p.pairs));
    render(first, L.shuffle(first));
    g.timer = setInterval(tick, 250);
    g.last = Date.now();
    hud();
  }
  /* ---------- practice quiz: one word on top, five answers below ---------- */

  function showQuestion() {
    var idx = g.left[g.qi], box = $('quiz-options');
    $('quiz-count').textContent = 'Word ' + (g.qi + 1) + ' / ' + g.left.length;
    $('quiz-prompt').textContent = 'Choose the translation (' + V.LANGUAGES[save.target] + ')';
    $('quiz-word').textContent = word(idx, save.native);
    box.innerHTML = '';
    g.options[g.qi].forEach(function (o) {
      var b = document.createElement('button');
      setLabel(b, o, save.target);
      b.addEventListener('click', function () { answer(o, b); });
      box.appendChild(b);
    });
    g.busy = false; g.qmiss = false;
  }

  function answer(opt, el) {
    if (!g || g.over || g.busy || el.classList.contains('bad')) return;
    var idx = g.left[g.qi], s = stats();
    if (opt === idx) {
      g.busy = true; el.classList.add('done');
      s.matches++; if (recordOk(idx)) g.fresh++;
      if (!g.qmiss) removeFailed(idx); // answered at the first try: one failure paid off
      persist(); hud();
      var round = g;
      setTimeout(function () {
        if (g !== round || round.over) return;
        round.qi++;
        if (round.qi >= round.left.length) win(); else showQuestion();
      }, PAIR_FLASH_MS);
    } else {
      // wrong answer: stays red and cannot be chosen again for this word
      s.misses++; wordStat(idx).miss++; addFailed(idx); g.missed[idx] = true; g.qmiss = true;
      el.classList.add('bad');
      g.timeLeft = Math.max(0, g.timeLeft - g.p.penalty);
      persist(); hud();
      if (g.timeLeft <= 0) lose();
    }
  }

  var MAX_STRIKES = 3, MAX_FORFEITS = 3; // wrong picks per word / given-away words that lose the level

  function startLevel(level) { startRound('level', level); }

  /** How many rows fit between the top of the lists and the bottom of the screen (no scrolling). */
  function visibleSlots(total) {
    var ul = $('list-native');
    ul.innerHTML = '';
    var probe = document.createElement('li'), b = document.createElement('button');
    b.textContent = 'Mg'; probe.appendChild(b); ul.appendChild(probe);
    var rowH = probe.getBoundingClientRect().height;
    var gap = parseFloat(getComputedStyle(ul).rowGap) || 8;
    var avail = window.innerHeight - ul.getBoundingClientRect().top - 28;
    ul.innerHTML = '';
    var n = Math.floor((avail + gap) / (rowH + gap));
    return Math.max(3, Math.min(total, n));
  }

  function render(leftIdx, rightIdx) {
    renderList($('list-native'), leftIdx, save.native, 'L');
    renderList($('list-target'), rightIdx, save.target, 'R');
  }
  function renderList(ul, items, lang, side) {
    ul.innerHTML = '';
    items.forEach(function (idx) {
      var li = document.createElement('li');
      li.appendChild(makeButton(idx, lang, side)); ul.appendChild(li);
    });
  }
  function makeButton(idx, lang, side) {
    var b = document.createElement('button');
    setLabel(b, idx, lang); b.dataset.idx = idx; b.dataset.side = side;
    b.addEventListener('click', function () { pick(side, idx, b); });
    return b;
  }

  function btn(side, idx) { return document.querySelector('button[data-side="' + side + '"][data-idx="' + idx + '"]'); }

  // a pair can be picked in either order: the left word first, or its translation first
  function pick(side, idx, el) {
    if (el.classList.contains('bad')) return; // already tried against the selected word
    pickRaw(side, idx, el);
    if (g) refreshBad();
  }
  /** Words already tried (wrongly) against the currently selected word are marked red and cannot be picked. */
  function refreshBad() {
    var list = document.querySelectorAll('li button');
    for (var i = 0; i < list.length; i++) {
      var b = list[i], idx = +b.dataset.idx, bad = false;
      if (b.dataset.side === 'R' && g.sel != null) bad = !!g.wrong[g.sel + ':' + idx];
      if (b.dataset.side === 'L' && g.selR != null) bad = !!g.wrong[idx + ':' + g.selR];
      b.classList.toggle('bad', bad && !g.matched[idx]);
    }
  }
  function pickRaw(side, idx, el) {
    if (!g || g.over || g.matched[idx]) return;
    if (side === 'L') {
      if (g.selR != null) { attempt(idx, g.selR, el); return; }
      if (g.sel === idx) { el.classList.remove('sel'); g.sel = null; return; } // tap again to unselect
      if (g.sel != null) btn('L', g.sel).classList.remove('sel');
      g.sel = idx; el.classList.add('sel'); return;
    }
    if (g.sel != null) { attempt(g.sel, idx, el); return; }
    if (g.selR === idx) { el.classList.remove('sel'); g.selR = null; return; } // tap again to unselect
    if (g.selR != null) btn('R', g.selR).classList.remove('sel');
    g.selR = idx; el.classList.add('sel');
  }

  /** Compares a left word with a chosen translation. `el` is the button that was clicked second. */
  function attempt(leftIdx, rightIdx, el) {
    var leftBtn = btn('L', leftIdx), rightBtn = btn('R', rightIdx), s = stats();
    if (leftIdx === rightIdx) {
      var idx = leftIdx;
      g.matched[idx] = true;
      [leftBtn, rightBtn].forEach(function (b) { b.classList.remove('sel'); b.classList.add('done'); b.disabled = true; });
      s.matches++; if (recordOk(idx)) g.fresh++;
      g.sel = null; g.selR = null;
      if (g.mode === 'level') g.gained += 10;
      persist(); hud();
      if (Object.keys(g.matched).length === g.left.length) { win(); return; }
      // after a short flash the matched pair's slots are refilled with the next pair
      var next = g.queue.shift(), round = g, leftSlot = leftBtn.parentNode, rightSlot = rightBtn.parentNode;
      if (next != null) setTimeout(function () {
        if (g !== round || round.over) return;
        leftSlot.replaceChildren(makeButton(next, save.native, 'L'));
        // the new translation goes to a random row (swapping with a waiting word), never predictably next to its partner
        var freshRight = makeButton(next, save.target, 'R');
        var slots = [rightSlot];
        Array.prototype.forEach.call($('list-target').children, function (li) {
          var b = li.firstChild;
          if (li !== rightSlot && b && !b.classList.contains('done') && !b.classList.contains('sel')) slots.push(li);
        });
        var target = slots[Math.floor(Math.random() * slots.length)];
        if (target !== rightSlot) rightSlot.replaceChildren(target.firstChild);
        target.replaceChildren(freshRight);
        refreshBad();
      }, PAIR_FLASH_MS);
    } else {
      // wrong pair: it counts as a miss for the left word, whichever column was clicked first
      s.misses++; wordStat(leftIdx).miss++; addFailed(leftIdx); g.missed[leftIdx] = true;
      g.wrong[leftIdx + ':' + rightIdx] = true;
      g.timeLeft = Math.max(0, g.timeLeft - g.p.penalty);
      el.classList.add('wrong'); setTimeout(function () { el.classList.remove('wrong'); }, 320);
      persist(); hud();
      if (g.timeLeft <= 0) { lose(); return; }
      // three wrong picks for one word: it is solved for the player, stays red on screen and costs a life
      g.strikes[leftIdx] = (g.strikes[leftIdx] || 0) + 1;
      if (g.strikes[leftIdx] >= MAX_STRIKES) forfeit(leftIdx);
    }
  }

  function forfeit(idx) {
    g.matched[idx] = true; g.forfeits++;
    [btn('L', idx), btn('R', idx)].forEach(function (b) {
      b.classList.remove('sel', 'bad', 'wrong'); b.classList.add('done', 'forfeit'); b.disabled = true;
    });
    g.sel = null; g.selR = null;
    refreshBad(); hud();
    if (g.forfeits >= MAX_FORFEITS) { lose('Too many mistakes', MAX_FORFEITS + ' words given away on level ' + g.level + '.'); return; }
    if (Object.keys(g.matched).length === g.left.length) win();
  }

  function tick() {
    var now = Date.now(); g.timeLeft = Math.max(0, g.timeLeft - (now - g.last) / 1000); g.last = now;
    hud();
    if (g.timeLeft <= 0) lose();
  }
  function stopTimer() { if (g && g.timer) { clearInterval(g.timer); g.timer = null; } }

  // pause while the app/tab is in the background (e.g. phone call, app switch)
  document.addEventListener('visibilitychange', function () {
    if (!g || g.over) return;
    if (document.hidden) { stopTimer(); }
    else if (!g.timer) { g.last = Date.now(); g.timer = setInterval(tick, 250); }
  });

  function hud() {
    $('hud-label').textContent = g.mode === 'practice' ? 'Practice' : g.mode === 'review' ? 'Review' : 'Level ' + g.level + ' / ' + L.MAX_LEVEL + (g.forfeits ? ' · ✖' + g.forfeits + '/' + MAX_FORFEITS : '');
    $('hud-score').textContent = save.score + g.gained;
    $('hud-time').textContent = Math.ceil(g.timeLeft);
    var f = $('bar-fill'); f.style.width = (100 * g.timeLeft / g.p.time) + '%';
    f.classList.toggle('low', g.timeLeft <= 15);   // red for the last 15 seconds
    f.classList.toggle('blink', g.timeLeft <= 5);  // blinking for the last 5 seconds
  }

  function win() {
    g.over = true; stopTimer();
    var s = stats();
    if (g.mode === 'review') {
      persist();
      overlay('Review done', 'The newest words are fresh again. Words you missed were added to the practice list.',
        'Next level', function () { startLevel(unlocked()); },
        [{ label: 'Review again', fn: function () { startRound('review'); } }]);
      return;
    }
    if (g.mode === 'practice') {
      s.practice++; persist();
      var left = failedIdx().length;
      overlay('Practice round cleared', left ? left + ' failed word(s) still to practice.' : 'No failed words left. Well done!',
        left ? 'Practice again' : 'Menu', left ? function () { startRound('practice'); } : toMenu);
      return;
    }
    var gained = L.score({ pairs: g.p.pairs - g.forfeits }, g.timeLeft);
    save.score += gained;
    var next = Math.min(L.MAX_LEVEL, g.level + 1);
    if (g.level >= unlocked()) save.best[key()] = next;
    s.attempts++; s.wins++;
    var lv = s.levels[g.level] || (s.levels[g.level] = { wins: 0, losses: 0, best: 0 });
    var prevBest = lv.best, repeat = lv.wins > 0;
    lv.wins++; lv.best = Math.max(lv.best, gained);
    save.last[key()] = { level: g.level, words: g.left.map(id) };
    var used = Math.max(0.1, g.p.time - g.timeLeft); // seconds spent, wrong-pick penalties included
    if (!g.forfeits && (!lv.fast || used < lv.fast)) { lv.fast = Math.round(used * 10) / 10; lv.words = g.p.pairs; }
    persist();
    var done = g.level >= L.MAX_LEVEL;
    overlay(done ? 'You finished all ' + L.MAX_LEVEL + ' levels!' : 'Level ' + g.level + ' cleared',
      '+' + gained + ' points · ' + Math.ceil(g.timeLeft) + 's left' + (repeat && gained > prevBest ? ' · New best!' : repeat ? ' · best ' + prevBest : '') + wordsLine(),
      done ? 'Play again' : 'Next level', function () { startLevel(done ? 1 : next); },
      [{ label: 'Review newest words', fn: function () { startRound('review'); } },
       { label: 'Repeat this level', fn: repeatLast }]);
  }
  /** Plays the last cleared level again with the same words, to improve time and score. */
  function repeatLast() {
    var last = save.last[key()];
    if (last && last.level) {
      var words = last.words.map(function (k) { return byId[k]; }).filter(function (i) { return i != null; });
      if (words.length === last.words.length) { startRound('level', last.level, words); return; }
    }
    startRound('level', Math.max(1, unlocked() - 1));
  }
  function wordsLine() {
    var n = guessedIdx().length, t = V.ENTRIES.length;
    return ' · ' + g.fresh + ' new word' + (g.fresh === 1 ? '' : 's') + ' · ' + n + '/' + t + ' learned';
  }
  function lose(title, text) {
    g.over = true; stopTimer();
    var s = stats();
    // only wrong picks count as misses; words left open at timeout are not recorded as mistakes
    if (g.mode === 'level') {
      s.attempts++; s.losses++;
      var lv = s.levels[g.level] || (s.levels[g.level] = { wins: 0, losses: 0, best: 0 });
      lv.losses++;
    }
    persist();
    var retry = g.mode !== 'level' ? function () { startRound(g.mode); } : function () { startRound('level', g.level, g.same); };
    overlay(title || 'Time is up', text || (g.mode !== 'level' ? 'Round not finished.' : 'Level ' + g.level + ' not solved.'), 'Retry', retry);
  }

  function overlay(title, text, primary, onPrimary, extras) {
    var box = $('ov-extra'); box.innerHTML = '';
    (extras || []).forEach(function (x) {
      var b = document.createElement('button'); b.className = 'ghost'; b.textContent = x.label; b.onclick = x.fn; box.appendChild(b);
    });
    $('ov-title').textContent = title; $('ov-text').textContent = text;
    $('ov-primary').textContent = primary; $('ov-primary').onclick = onPrimary;
    $('ov-secondary').classList.toggle('hidden', primary === 'Menu'); // no duplicate Menu button
    $('overlay').classList.remove('hidden');
  }
  function hideOverlay() { $('overlay').classList.add('hidden'); }

  function toMenu() { stopTimer(); hideOverlay(); refreshStart(); show('screen-start'); }

  /* ---------- statistics ---------- */

  function pct(a, b) { return b ? Math.round(100 * a / b) + '%' : '–'; }

  function showStats() {
    var s = stats();
    var levelsCleared = Object.keys(s.levels).filter(function (k) { return s.levels[k].wins > 0; }).length;
    // fastest rounds: seconds per word, best first (level wins recorded since this feature existed)
    var fast = Object.keys(s.levels).filter(function (k) { return s.levels[k].fast; }).map(function (k) {
      var lv = s.levels[k];
      return { level: +k, time: lv.fast, words: lv.words, pace: lv.fast / lv.words };
    }).sort(function (a, b) { return a.pace - b.pace; });
    var tiles = [
      ['Highest level reached', unlocked()],
      ['Levels cleared', levelsCleared + ' / ' + L.MAX_LEVEL],
      ['Level attempts', s.attempts],
      ['Win rate', pct(s.wins, s.attempts)],
      ['Match accuracy', pct(s.matches, s.matches + s.misses)],
      ['Practice rounds cleared', s.practice],
      ['Total score', save.score],
      ['Words guessed', guessedIdx().length + ' / ' + V.ENTRIES.length],
      ['Words left to learn', V.ENTRIES.length - guessedIdx().length],
      ['Fastest pace', fast.length ? fast[0].pace.toFixed(1) + ' s / word' : '–'],
      ['Fastest round', fast.length ? fast[0].time + ' s · ' + fast[0].words + ' words' : '–'],
      ['Failed words to practice', failedIdx().length]
    ];
    var box = $('stats-tiles'); box.innerHTML = '';
    tiles.forEach(function (t) {
      var d = document.createElement('div'); d.className = 'tile';
      var v = document.createElement('strong'); v.textContent = t[1];
      var l = document.createElement('span'); l.textContent = t[0];
      d.appendChild(v); d.appendChild(l); box.appendChild(d);
    });

    $('stats-pair').textContent = V.LANGUAGES[save.native] + ' → ' + V.LANGUAGES[save.target];
    var hard = Object.keys(s.words).filter(function (k) { return s.words[k].miss > 0 && byId[k] != null; })
      .sort(function (a, b) { return s.words[b].miss - s.words[a].miss; }).slice(0, 10);
    var ft = $('stats-fast'); ft.innerHTML = '';
    if (!fast.length) {
      var fr0 = document.createElement('tr'), fd0 = document.createElement('td');
      fd0.colSpan = 4; fd0.textContent = 'Clear a level to see your fastest rounds.'; fr0.appendChild(fd0); ft.appendChild(fr0);
    }
    fast.slice(0, 5).forEach(function (r) {
      var tr = document.createElement('tr');
      ['Level ' + r.level, r.words + ' words', r.time + ' s', r.pace.toFixed(1) + ' s / word']
        .forEach(function (txt) { var td = document.createElement('td'); td.textContent = txt; tr.appendChild(td); });
      ft.appendChild(tr);
    });
    var tb = $('stats-hard'); tb.innerHTML = '';
    if (!hard.length) {
      var tr0 = document.createElement('tr'), td0 = document.createElement('td');
      td0.colSpan = 3; td0.textContent = 'No mistakes recorded yet.'; tr0.appendChild(td0); tb.appendChild(tr0);
    }
    hard.forEach(function (k) {
      var idx = byId[k], tr = document.createElement('tr');
      [word(idx, save.native), word(idx, save.target), s.words[k].miss + ' miss' + (s.words[k].miss > 1 ? 'es' : '')]
        .forEach(function (txt) { var td = document.createElement('td'); td.textContent = txt; tr.appendChild(td); });
      tb.appendChild(tr);
    });
    show('screen-stats');
  }

  /* ---------- init ---------- */

  function init() {
    fillSelect($('sel-native'), save.native); fillSelect($('sel-target'), save.target);
    // the same language can never be chosen on both sides: it is greyed out in the other list
    function lockSame() {
      [['sel-native', 'sel-target'], ['sel-target', 'sel-native']].forEach(function (p) {
        var other = $(p[1]).value;
        Array.prototype.forEach.call($(p[0]).options, function (o) { o.disabled = o.value === other; });
      });
    }
    if (save.native === save.target) { // repair an invalid saved pair
      save.target = Object.keys(V.LANGUAGES).filter(function (c) { return c !== save.native; })[0];
      fillSelect($('sel-target'), save.target);
    }
    function changed() {
      save.native = $('sel-native').value; save.target = $('sel-target').value;
      lockSame();
      var same = save.native === save.target;
      $('btn-start').disabled = same; $('btn-stats').disabled = same;
      persist(); refreshStart();
    }
    lockSame();
    $('sel-native').onchange = $('sel-target').onchange = changed;
    $('chk-picto').checked = save.picto !== false;
    $('chk-picto').onchange = function () { save.picto = $('chk-picto').checked; persist(); };
    $('btn-start').onclick = function () { startLevel(unlocked()); };
    $('btn-practice').onclick = function () { startRound('practice'); };
    $('btn-review').onclick = function () { startRound('review'); };
    $('btn-repeat').onclick = repeatLast;
    $('btn-stats').onclick = showStats;
    $('btn-stats-back').onclick = toMenu;
    $('btn-stats-reset').onclick = function () {
      if (!confirm('Delete statistics and the failed-words list for this language pair?')) return;
      delete save.stats[key()]; delete save.failed[key()]; persist(); showStats();
    };
    $('btn-reset').onclick = function () { delete save.best[key()]; delete save.last[key()]; persist(); refreshStart(); };
    $('btn-quit').onclick = toMenu;
    $('ov-secondary').onclick = toMenu;
    var v = window.APP_VERSION;
    if (v) $('version').textContent = 'Version ' + v.version + ' · built ' + v.built + (v.commit ? ' · ' + v.commit : '');
    changed(); show('screen-start');
  }
  init();
})();
