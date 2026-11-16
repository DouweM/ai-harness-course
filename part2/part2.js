/* Part 2 page behavior. Shared components come from ../assets/course.js; this file adds what Part 2 needs:
   focus code cards (only the lines that carry the point, until "show all") and the step player, which walks a
   guided sequence one step at a time (chapters 3, 5 and 6). */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function esc(t) { return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function hiPy(src) { return window.Course && Course.highlight ? Course.highlight.py(src) : esc(src); }
  function tok(el, mood) {
    if (!el) return;
    el.setAttribute('data-mood', mood || '');
    if (window.Course) Course.drawTok(el);
    if (!REDUCED) { el.classList.remove('hop'); void el.offsetWidth; el.classList.add('hop'); }
  }

  /* ---------- focus code cards: only the lines that carry the point, until "show all" ---------- */
  $$('.code.focus').forEach(function (card) {
    var pre = $('pre', card); if (!pre) return;
    var keys = (card.getAttribute('data-keys') || '').split(',').map(Number);
    var lines = pre.textContent.replace(/\n$/, '').split('\n');
    var inDoc = false, out = [];
    lines.forEach(function (line, i) {
      var html, q = (line.match(/"""/g) || []).length;
      if (inDoc) { html = '<span class="tk-s">' + esc(line) + '</span>'; if (q % 2) inDoc = false; }
      else if (q % 2) { var at = line.indexOf('"""'); html = hiPy(line.slice(0, at)) + '<span class="tk-s">' + esc(line.slice(at)) + '</span>'; inDoc = true; }
      else html = hiPy(line);
      var key = keys.indexOf(i) >= 0, cls = 'ln' + (key ? ' key' : '');
      if (key && i > 0 && keys.indexOf(i - 1) < 0) cls += ' gap';
      if (key && i === keys[keys.length - 1] && i < lines.length - 1) cls += ' tail';
      out.push('<span class="' + cls + '">' + html + '\n</span>');
    });
    pre.innerHTML = out.join('');
    var more = document.createElement('div'); more.className = 'more';
    more.innerHTML = '<button type="button" aria-expanded="false">Show all ' + lines.length + ' lines</button>';
    var run = $('.run', card);
    card.insertBefore(more, run && run.parentNode === card ? run : null);
    $('button', more).addEventListener('click', function (e) {
      var open = card.classList.toggle('open');
      e.currentTarget.textContent = open ? 'Show only the key lines' : 'Show all ' + lines.length + ' lines';
      e.currentTarget.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  });

  /* ---------- step player: steps light up one by one ---------- */
  $$('.seq').forEach(function (seq) {
    var steps = $$('.seq-steps > li', seq), face = $('.seq-tok [data-tok]', seq), say = $('.seq-say', seq);
    var playBtn = $('.seq-play', seq), stepBtn = $('.seq-step', seq), i = -1, timer = null;
    function show(n) {
      i = n;
      steps.forEach(function (s, k) { s.classList.toggle('on', k <= n); s.classList.toggle('now', k === n); });
      var cur = steps[n];
      if (cur) { tok(face, cur.getAttribute('data-mood')); if (say) say.textContent = cur.getAttribute('data-say') || ''; }
      stepBtn.textContent = n >= steps.length - 1 ? 'Start over' : 'Next step';
    }
    function stop() { if (timer) { clearInterval(timer); timer = null; } playBtn.textContent = 'Play'; }
    stepBtn.addEventListener('click', function () { stop(); show(i >= steps.length - 1 ? 0 : i + 1); });
    playBtn.addEventListener('click', function () {
      if (timer) { stop(); return; }
      if (REDUCED) { show(steps.length - 1); return; }
      show(i >= steps.length - 1 ? 0 : i + 1); playBtn.textContent = 'Pause';
      timer = setInterval(function () { if (i >= steps.length - 1) { stop(); return; } show(i + 1); }, 1500);
    });
    show(-1);
    stepBtn.textContent = 'Next step';
  });

})();
