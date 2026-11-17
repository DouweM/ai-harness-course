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

  /* ---------- step player: the reader steps through by hand ----------
     Each step has a plain caption (data-caption); the .seq's data-intro is the caption before step 1. No autoplay:
     Back and Next, and a visible "Step n of N". Tok's line (data-say) is a reaction under the caption. */
  $$('.seq').forEach(function (seq) {
    var steps = $$('.seq-steps > li', seq), face = $('.seq-tok [data-tok]', seq), say = $('.seq-say', seq);
    var row = $('.btn-row', seq), i = -1;
    row.innerHTML = '';
    var cap = document.createElement('div'); cap.className = 'seq-cap'; cap.setAttribute('aria-live', 'polite');
    var back = document.createElement('button'); back.type = 'button'; back.className = 'btn ghost seq-back'; back.textContent = 'Back';
    var next = document.createElement('button'); next.type = 'button'; next.className = 'btn seq-next';
    var count = document.createElement('span'); count.className = 'seq-count';
    row.appendChild(back); row.appendChild(next); row.appendChild(count);
    var list = $('.seq-steps', seq);  // the caption and the buttons come first, so the point is read before the steps
    list.parentNode.insertBefore(cap, list); list.parentNode.insertBefore(row, list);
    function show(n) {
      i = Math.max(-1, Math.min(steps.length - 1, n));
      steps.forEach(function (s, k) { s.classList.toggle('on', k <= i); s.classList.toggle('now', k === i); });
      var cur = steps[i];
      cap.innerHTML = i < 0 ? '<b>Before you start.</b> ' + (seq.getAttribute('data-intro') || '')
        : '<b>Step ' + (i + 1) + '.</b> ' + (cur.getAttribute('data-caption') || '');
      count.textContent = i < 0 ? steps.length + ' steps' : 'Step ' + (i + 1) + ' of ' + steps.length;
      back.disabled = i < 0;
      next.textContent = i < 0 ? 'Start' : i >= steps.length - 1 ? 'Start over' : 'Next step';
      if (face) tok(face, cur ? cur.getAttribute('data-mood') : '');
      if (say) say.textContent = cur ? cur.getAttribute('data-say') || '' : '';
    }
    back.addEventListener('click', function () { show(i - 1); });
    next.addEventListener('click', function () { show(i >= steps.length - 1 ? -1 : i + 1); });
    show(-1);
  });

})();
