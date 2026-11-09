(function () {
  var V = window.Vocab, L = window.Levels;
  var $ = function (id) { return document.getElementById(id); };
  var STORE = 'guess-the-word-v1';

  var save = load();
  var g = null; // current game state

  function load() {
    try { return Object.assign({ native: 'de', target: 'fr', best: {}, score: 0 }, JSON.parse(localStorage.getItem(STORE))); }
    catch (e) { return { native: 'de', target: 'fr', best: {}, score: 0 }; }
  }
  function persist() { try { localStorage.setItem(STORE, JSON.stringify(save)); } catch (e) {} }

  // progress is tracked per language pair: highest unlocked level
  function key() { return save.native + '>' + save.target; }
  function unlocked() { return save.best[key()] || 1; }

  function fillSelect(sel, value) {
    sel.innerHTML = '';
    Object.keys(V.LANGUAGES).forEach(function (c) {
      var o = document.createElement('option'); o.value = c; o.textContent = V.LANGUAGES[c];
      if (c === value) o.selected = true; sel.appendChild(o);
    });
  }

  function refreshStart() {
    $('progress-info').textContent = 'Next level: ' + unlocked() + ' (' + key().replace('>', ' → ') + ')';
  }

  function show(id) {
    ['screen-start', 'screen-game'].forEach(function (s) { $(s).classList.toggle('hidden', s !== id); });
  }

  function word(idx, lang) { return V.ENTRIES[idx][lang]; }

  function startLevel(level) {
    stopTimer();
    var pick = L.pickWords(V.ENTRIES.length, level);
    var p = pick.params;
    // the right list holds the translations plus distractors, shuffled
    var right = L.shuffle(pick.pairs.concat(pick.distractors));
    g = { level: level, p: p, left: pick.pairs, right: right, matched: {}, sel: null, timeLeft: p.time, over: false };
    $('title-native').textContent = V.LANGUAGES[save.native];
    $('title-target').textContent = V.LANGUAGES[save.target];
    render();
    hideOverlay();
    show('screen-game');
    g.timer = setInterval(tick, 250);
    g.last = Date.now();
    hud();
  }

  function render() {
    renderList($('list-native'), g.left, save.native, 'L');
    renderList($('list-target'), g.right, save.target, 'R');
  }
  function renderList(ul, items, lang, side) {
    ul.innerHTML = '';
    items.forEach(function (idx) {
      var li = document.createElement('li'), b = document.createElement('button');
      b.textContent = word(idx, lang); b.dataset.idx = idx; b.dataset.side = side;
      b.addEventListener('click', function () { pick(side, idx, b); });
      li.appendChild(b); ul.appendChild(li);
    });
  }

  function btn(side, idx) { return document.querySelector('button[data-side="' + side + '"][data-idx="' + idx + '"]'); }

  function pick(side, idx, el) {
    if (!g || g.over || g.matched[idx]) return;
    if (side === 'L') {
      if (g.sel != null) btn('L', g.sel).classList.remove('sel');
      g.sel = idx; el.classList.add('sel'); return;
    }
    if (g.sel == null) return; // choose a left word first
    var leftBtn = btn('L', g.sel);
    if (g.sel === idx) {
      g.matched[idx] = true;
      [leftBtn, el].forEach(function (b) { b.classList.remove('sel'); b.classList.add('done'); b.disabled = true; });
      g.sel = null; g.p.score = (g.p.score || 0) + 10;
      hud();
      if (Object.keys(g.matched).length === g.left.length) win();
    } else {
      g.timeLeft = Math.max(0, g.timeLeft - g.p.penalty);
      el.classList.add('wrong'); setTimeout(function () { el.classList.remove('wrong'); }, 320);
      hud();
      if (g.timeLeft <= 0) lose();
    }
  }

  function tick() {
    var now = Date.now(); g.timeLeft = Math.max(0, g.timeLeft - (now - g.last) / 1000); g.last = now;
    hud();
    if (g.timeLeft <= 0) lose();
  }
  function stopTimer() { if (g && g.timer) { clearInterval(g.timer); g.timer = null; } }

  function hud() {
    $('hud-level').textContent = g.level;
    $('hud-score').textContent = save.score + (g.p.score || 0);
    $('hud-time').textContent = Math.ceil(g.timeLeft);
    var f = $('bar-fill'); f.style.width = (100 * g.timeLeft / g.p.time) + '%';
    f.classList.toggle('low', g.timeLeft / g.p.time < 0.25);
  }

  function win() {
    g.over = true; stopTimer();
    var gained = L.score(g.p, g.timeLeft);
    save.score += gained;
    var next = Math.min(L.MAX_LEVEL, g.level + 1);
    if (g.level >= unlocked()) save.best[key()] = next;
    persist();
    var done = g.level >= L.MAX_LEVEL;
    overlay(done ? 'You finished all 100 levels!' : 'Level ' + g.level + ' cleared',
      '+' + gained + ' points · ' + Math.ceil(g.timeLeft) + 's left',
      done ? 'Play again' : 'Next level', function () { startLevel(done ? 1 : next); });
  }
  function lose() {
    g.over = true; stopTimer();
    overlay('Time is up', 'Level ' + g.level + ' not solved.', 'Retry', function () { startLevel(g.level); });
  }

  function overlay(title, text, primary, onPrimary) {
    $('ov-title').textContent = title; $('ov-text').textContent = text;
    $('ov-primary').textContent = primary; $('ov-primary').onclick = onPrimary;
    $('overlay').classList.remove('hidden');
  }
  function hideOverlay() { $('overlay').classList.add('hidden'); }

  function toMenu() { stopTimer(); hideOverlay(); refreshStart(); show('screen-start'); }

  function init() {
    fillSelect($('sel-native'), save.native); fillSelect($('sel-target'), save.target);
    function changed() {
      save.native = $('sel-native').value; save.target = $('sel-target').value;
      $('btn-start').disabled = save.native === save.target;
      persist(); refreshStart();
    }
    $('sel-native').onchange = $('sel-target').onchange = changed;
    $('btn-start').onclick = function () { startLevel(unlocked()); };
    $('btn-reset').onclick = function () { delete save.best[key()]; persist(); refreshStart(); };
    $('btn-quit').onclick = toMenu;
    $('ov-secondary').onclick = toMenu;
    changed(); show('screen-start');
  }
  init();
})();
