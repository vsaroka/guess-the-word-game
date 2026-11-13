(function () {
  var V = window.Vocab, L = window.Levels;
  var $ = function (id) { return document.getElementById(id); };
  var STORE = 'guess-the-word-v1';
  var PAIR_FLASH_MS = 500; // a matched pair stays visible (green) this long before it is replaced

  function defaults() { return { native: 'de', target: 'fr', best: {}, score: 0, failed: {}, stats: {} }; }
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
  function failedIdx() { return (save.failed[key()] || []).map(function (i) { return byId[i]; }).filter(function (i) { return i != null; }); }
  function addFailed(idx) {
    var list = save.failed[key()] || (save.failed[key()] = []);
    if (list.indexOf(id(idx)) < 0) list.push(id(idx));
  }
  function removeFailed(idx) {
    var list = save.failed[key()] || [];
    var at = list.indexOf(id(idx)); if (at >= 0) list.splice(at, 1);
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
  }

  function show(screen) {
    ['screen-start', 'screen-game', 'screen-stats'].forEach(function (s) { $(s).classList.toggle('hidden', s !== screen); });
    document.body.classList.toggle('playing', screen === 'screen-game'); // game screen never scrolls
  }

  function word(idx, lang) { return V.ENTRIES[idx][lang]; }

  /* ---------- rounds ---------- */

  function startRound(mode, level) {
    stopTimer();
    var pick;
    if (mode === 'practice') {
      pick = L.practiceRound(failedIdx(), V.ENTRIES.length);
      if (!pick.pairs.length) { toMenu(); return; }
    } else {
      pick = L.pickWords(V.ENTRIES.length, level);
    }
    var p = pick.params;
    g = { mode: mode, level: level, p: p, left: pick.pairs, queue: pick.pairs.slice(), matched: {}, missed: {}, gained: 0,
          fillers: {}, sel: null, selR: null, timeLeft: p.time, over: false };
    (pick.fillers || []).forEach(function (i) { g.fillers[i] = true; }); // padding words in practice: not tracked
    $('title-native').textContent = V.LANGUAGES[save.native];
    $('title-target').textContent = V.LANGUAGES[save.target];
    hideOverlay();
    show('screen-game');
    // only as many words as fit on screen are shown; the rest follow as pairs are matched
    var first = g.queue.splice(0, visibleSlots(p.pairs));
    render(first, L.shuffle(first));
    g.timer = setInterval(tick, 250);
    g.last = Date.now();
    hud();
  }
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
    b.textContent = word(idx, lang); b.dataset.idx = idx; b.dataset.side = side;
    b.addEventListener('click', function () { pick(side, idx, b); });
    return b;
  }

  function btn(side, idx) { return document.querySelector('button[data-side="' + side + '"][data-idx="' + idx + '"]'); }

  // a pair can be picked in either order: the left word first, or its translation first
  function pick(side, idx, el) {
    if (!g || g.over || g.matched[idx]) return;
    if (side === 'L') {
      if (g.selR != null) { attempt(idx, g.selR, el); return; }
      if (g.sel != null) btn('L', g.sel).classList.remove('sel');
      g.sel = idx; el.classList.add('sel'); return;
    }
    if (g.sel != null) { attempt(g.sel, idx, el); return; }
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
      s.matches++; wordStat(idx).ok++;
      if (g.mode === 'practice' && !g.missed[idx]) removeFailed(idx); // cleared without a mistake
      g.sel = null; g.selR = null;
      if (g.mode === 'level') g.gained += 10;
      persist(); hud();
      if (Object.keys(g.matched).length === g.left.length) { win(); return; }
      // after a short flash the matched pair's slots are refilled with the next pair
      var next = g.queue.shift(), round = g, leftSlot = leftBtn.parentNode, rightSlot = rightBtn.parentNode;
      if (next != null) setTimeout(function () {
        if (g !== round || round.over) return;
        leftSlot.replaceChildren(makeButton(next, save.native, 'L'));
        rightSlot.replaceChildren(makeButton(next, save.target, 'R'));
      }, PAIR_FLASH_MS);
      // only one word left: it is resolved automatically (no guess needed)
      if (Object.keys(g.matched).length === g.left.length - 1) {
        setTimeout(function () { autoResolve(round); }, (next != null ? PAIR_FLASH_MS : 0) + 400);
      }
    } else {
      // wrong pair: it counts as a miss for the left word, whichever column was clicked first
      if (!g.fillers[leftIdx]) { s.misses++; wordStat(leftIdx).miss++; addFailed(leftIdx); g.missed[leftIdx] = true; }
      g.timeLeft = Math.max(0, g.timeLeft - g.p.penalty);
      el.classList.add('wrong'); setTimeout(function () { el.classList.remove('wrong'); }, 320);
      persist(); hud();
      if (g.timeLeft <= 0) lose();
    }
  }

  /** Matches the last open word for the player. Not counted as a guess in statistics or practice. */
  function autoResolve(round) {
    if (g !== round || round.over) return;
    var last = round.left.filter(function (i) { return !round.matched[i]; })[0];
    if (last == null) return;
    var lb = btn('L', last), rb = btn('R', last);
    if (!lb || !rb) return;
    round.matched[last] = true; round.sel = null; round.selR = null;
    [lb, rb].forEach(function (b) { b.classList.remove('sel'); b.classList.add('done'); b.disabled = true; });
    if (round.mode === 'level') round.gained += 10;
    hud(); win();
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
    $('hud-label').textContent = g.mode === 'practice' ? 'Practice' : 'Level ' + g.level + ' / ' + L.MAX_LEVEL;
    $('hud-score').textContent = save.score + g.gained;
    $('hud-time').textContent = Math.ceil(g.timeLeft);
    var f = $('bar-fill'); f.style.width = (100 * g.timeLeft / g.p.time) + '%';
    f.classList.toggle('low', g.timeLeft <= 15);   // red for the last 15 seconds
    f.classList.toggle('blink', g.timeLeft <= 5);  // blinking for the last 5 seconds
  }

  function win() {
    g.over = true; stopTimer();
    var s = stats();
    if (g.mode === 'practice') {
      s.practice++; persist();
      var left = failedIdx().length;
      overlay('Practice round cleared', left ? left + ' failed word(s) still to practice.' : 'No failed words left. Well done!',
        left ? 'Practice again' : 'Menu', left ? function () { startRound('practice'); } : toMenu);
      return;
    }
    var gained = L.score(g.p, g.timeLeft);
    save.score += gained;
    var next = Math.min(L.MAX_LEVEL, g.level + 1);
    if (g.level >= unlocked()) save.best[key()] = next;
    s.attempts++; s.wins++;
    var lv = s.levels[g.level] || (s.levels[g.level] = { wins: 0, losses: 0, best: 0 });
    lv.wins++; lv.best = Math.max(lv.best, gained);
    persist();
    var done = g.level >= L.MAX_LEVEL;
    overlay(done ? 'You finished all 100 levels!' : 'Level ' + g.level + ' cleared',
      '+' + gained + ' points · ' + Math.ceil(g.timeLeft) + 's left',
      done ? 'Play again' : 'Next level', function () { startLevel(done ? 1 : next); });
  }
  function lose() {
    g.over = true; stopTimer();
    var s = stats();
    // only wrong picks count as misses; words left open at timeout are not recorded as mistakes
    if (g.mode === 'level') {
      s.attempts++; s.losses++;
      var lv = s.levels[g.level] || (s.levels[g.level] = { wins: 0, losses: 0, best: 0 });
      lv.losses++;
    }
    persist();
    var retry = g.mode === 'practice' ? function () { startRound('practice'); } : function () { startLevel(g.level); };
    overlay('Time is up', g.mode === 'practice' ? 'Practice round not finished.' : 'Level ' + g.level + ' not solved.', 'Retry', retry);
  }

  function overlay(title, text, primary, onPrimary) {
    $('ov-title').textContent = title; $('ov-text').textContent = text;
    $('ov-primary').textContent = primary; $('ov-primary').onclick = onPrimary;
    $('overlay').classList.remove('hidden');
  }
  function hideOverlay() { $('overlay').classList.add('hidden'); }

  function toMenu() { stopTimer(); hideOverlay(); refreshStart(); show('screen-start'); }

  /* ---------- statistics ---------- */

  function pct(a, b) { return b ? Math.round(100 * a / b) + '%' : '–'; }

  function showStats() {
    var s = stats();
    var levelsCleared = Object.keys(s.levels).filter(function (k) { return s.levels[k].wins > 0; }).length;
    var tiles = [
      ['Highest level reached', unlocked()],
      ['Levels cleared', levelsCleared + ' / ' + L.MAX_LEVEL],
      ['Level attempts', s.attempts],
      ['Win rate', pct(s.wins, s.attempts)],
      ['Match accuracy', pct(s.matches, s.matches + s.misses)],
      ['Practice rounds cleared', s.practice],
      ['Total score', save.score],
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
    function changed() {
      save.native = $('sel-native').value; save.target = $('sel-target').value;
      var same = save.native === save.target;
      $('btn-start').disabled = same; $('btn-stats').disabled = same;
      persist(); refreshStart();
    }
    $('sel-native').onchange = $('sel-target').onchange = changed;
    $('btn-start').onclick = function () { startLevel(unlocked()); };
    $('btn-practice').onclick = function () { startRound('practice'); };
    $('btn-stats').onclick = showStats;
    $('btn-stats-back').onclick = toMenu;
    $('btn-stats-reset').onclick = function () {
      if (!confirm('Delete statistics and the failed-words list for this language pair?')) return;
      delete save.stats[key()]; delete save.failed[key()]; persist(); showStats();
    };
    $('btn-reset').onclick = function () { delete save.best[key()]; persist(); refreshStart(); };
    $('btn-quit').onclick = toMenu;
    $('ov-secondary').onclick = toMenu;
    var v = window.APP_VERSION;
    if (v) $('version').textContent = 'Version ' + v.version + ' · built ' + v.built + (v.commit ? ' · ' + v.commit : '');
    changed(); show('screen-start');
  }
  init();
})();
