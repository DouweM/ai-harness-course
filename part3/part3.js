/* Part 3 interactives. Loaded after ../assets/course.js. Each block wires itself only if its element is on the page.
   - .code[data-focus]: show only the lines that carry the point, highlighted; the rest behind "Show all N lines".
   - [data-arch]: ch1 production architecture stepper.
   - [data-scatter]: ch2 cost vs quality scatter.
   - [data-cases]: ch3 case-by-case grid of two eval arms.
   - [data-probe]: ch4 four-step probe card.
   - [data-loop]: ch5 animated loop with Tok riding it. */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var json = function (el) { var s = $('script[type="application/json"]', el); return s ? JSON.parse(s.textContent) : null; };
  var C = window.Course || {};

  /* ------------------------------------------------------------ focused code */
  function parseRanges(spec) {
    var set = {};
    spec.split(',').forEach(function (part) {
      var m = part.trim().match(/^(\d+)(?:-(\d+))?$/); if (!m) return;
      for (var i = +m[1]; i <= +(m[2] || m[1]); i++) set[i] = true;
    });
    return set;
  }
  $$('.code[data-focus]').forEach(function (box) {
    var pre = $('pre', box); if (!pre) return;
    var lang = pre.getAttribute('data-lang');
    var hi = (C.highlight && C.highlight[lang]) || esc;
    var lines = pre.textContent.replace(/\n$/, '').split('\n');
    var focus = parseRanges(box.getAttribute('data-focus'));
    var html = '', hidden = 0;
    lines.forEach(function (line, i) {
      var n = i + 1, on = !!focus[n];
      if (!on && (focus[n - 1] || n === 1)) html += '<span class="p3l gap" aria-hidden="true">  ...</span>';
      html += '<span class="p3l ' + (on ? 'hl' : 'ctx') + '">' + (line ? hi(line) : ' ') + '</span>';
      if (!on) hidden++;
    });
    pre.innerHTML = html;
    if (box.hasAttribute('data-keep')) { box.classList.add('expanded'); return; }
    if (!hidden) return;
    var more = document.createElement('div'); more.className = 'more';
    more.innerHTML = '<button type="button" aria-expanded="false">Show all ' + lines.length + ' lines</button>';
    box.insertBefore(more, $('.run', box));
    $('button', more).addEventListener('click', function (e) {
      var open = box.classList.toggle('expanded');
      e.currentTarget.textContent = open ? 'Show only the lines that matter' : 'Show all ' + lines.length + ' lines';
      e.currentTarget.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  });

  /* ------------------------------------------------------------ ch1: architecture stepper */
  $$('[data-arch]').forEach(function (root) {
    var steps = json(root), i = 0;
    var cap = $('.arch-cap', root), count = $('.arch-count', root);
    var prev = $('.arch-prev', root), next = $('.arch-next', root);
    function show(k) {
      i = Math.max(0, Math.min(steps.length - 1, k));
      var s = steps[i];
      $$('.anode', root).forEach(function (n) {
        var on = (' ' + n.getAttribute('data-s') + ' ').indexOf(' ' + (i + 1) + ' ') >= 0;
        n.classList.toggle('on', on);
      });
      root.setAttribute('data-step', i + 1);
      cap.innerHTML = '<b>' + esc(s.t) + '</b> ' + s.c;
      count.textContent = (i + 1) + ' of ' + steps.length;
      prev.disabled = i === 0; next.disabled = i === steps.length - 1;
    }
    prev.addEventListener('click', function () { show(i - 1); });
    next.addEventListener('click', function () { show(i + 1); });
    root.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight' && e.target.closest('.arch-ctl')) { show(i + 1); e.preventDefault(); e.stopPropagation(); }
      if (e.key === 'ArrowLeft' && e.target.closest('.arch-ctl')) { show(i - 1); e.preventDefault(); e.stopPropagation(); }
    });
    show(0);
  });

  /* ------------------------------------------------------------ ch2: cost vs quality */
  $$('[data-scatter]').forEach(function (root) {
    var d = json(root), svg = $('svg', root), card = $('.sc-card', root), mode = 'clear', sel = d.points[3].id;
    var W = 560, H = 330, L = 50, R = 20, T = 18, B = 62;
    var x = function (v) { return L + v / d.xmax * (W - L - R); };
    var y = function (v) { return T + (1 - v / 10) * (H - T - B); };
    function draw() {
      W = Math.max(320, Math.min(620, Math.round(svg.clientWidth || 560)));
      svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      var g = '';
      [0, 5, 10].forEach(function (t) { g += '<line class="sc-grid" x1="' + L + '" x2="' + (W - R) + '" y1="' + y(t) + '" y2="' + y(t) + '"/><text class="sc-tick" x="' + (L - 10) + '" y="' + (y(t) + 4) + '" text-anchor="end">' + t + '</text>'; });
      [0, 0.01, 0.02].forEach(function (t) { g += '<text class="sc-tick" x="' + x(t) + '" y="' + (H - B + 20) + '" text-anchor="middle">$' + t.toFixed(t ? 2 : 0) + '</text>'; });
      g += '<text class="sc-axis" x="' + ((L + W - R) / 2) + '" y="' + (H - 8) + '" text-anchor="middle">cost per call (USD)</text>';
      g += '<text class="sc-axis" transform="translate(16 ' + ((T + H - B) / 2) + ') rotate(-90)" text-anchor="middle">correct reminders, of 10</text>';
      d.points.forEach(function (p) {
        var q = mode === 'clear' ? p.clear : p.keep, cx = x(p.cost), cy = y(q);
        var lx = q < 5 && p.lowx !== undefined ? p.lowx : p.lx, ly = q < 5 && p.lowy !== undefined ? p.lowy : p.ly;
        var cls = 'sc-pt' + (p.id === sel ? ' sel' : '') + (q < 5 ? ' low' : '');
        g += '<g class="' + cls + '" data-id="' + p.id + '" tabindex="0" role="button" aria-label="' + esc(p.name + ': $' + p.cost + ' per call, ' + q + ' of 10 correct') + '" style="transform: translate(' + cx + 'px,' + cy + 'px)">' +
          '<title>' + esc(p.name + ': $' + p.cost.toFixed(3) + ' per call, ' + q + ' of 10 correct') + '</title>' +
          '<circle class="hit" r="22"/><circle class="dot" r="7"/>' +
          '<line class="lead" x1="0" y1="0" x2="' + lx + '" y2="' + ly + '"/>' +
          '<text class="sc-lab" x="' + (lx + (lx < 0 ? -4 : 4)) + '" y="' + (ly + 4) + '" text-anchor="' + (lx < 0 ? 'end' : 'start') + '">' + esc(p.short) + '</text></g>';
      });
      svg.innerHTML = g;
      $$('.sc-pt', svg).forEach(function (el) {
        var pick = function () { sel = el.getAttribute('data-id'); draw(); };
        el.addEventListener('click', pick);
        el.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { pick(); e.preventDefault(); } });
      });
      var p = d.points.filter(function (q) { return q.id === sel; })[0];
      card.innerHTML = '<p class="eyebrow">Frozen config &middot; ' + esc(p.family) + '</p><pre>' + esc(p.config[mode]) + '</pre><p>' + p.note[mode] + '</p>';
    }
    $$('[data-mode]', root).forEach(function (b) {
      b.addEventListener('click', function () {
        mode = b.getAttribute('data-mode');
        $$('[data-mode]', root).forEach(function (o) { o.setAttribute('aria-pressed', o === b ? 'true' : 'false'); });
        draw();
      });
    });
    draw();
    var rt; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(draw, 150); });
  });

  /* ------------------------------------------------------------ ch3: case grid */
  $$('[data-cases]').forEach(function (root) {
    var d = json(root), model = d.default, open = null;
    var grid = $('.cg-rows', root), detail = $('.cg-detail', root), sum = $('.cg-sum', root);
    function verdict(writes, team) { return writes === team ? 'ok' : writes ? 'wrong' : 'miss'; }
    function chip(label, v) { return '<span class="cg-chip ' + v + '">' + (v === 'wrong' ? '! ' : '') + esc(label) + '</span>'; }
    function draw() {
      var rows = d.models[model], h = '', tally = { A: [0, 0], B: [0, 0] };
      rows.forEach(function (r, k) {
        var va = verdict(r.a.writes, r.team), vb = verdict(r.b.writes, r.team);
        tally.A[0] += va === 'ok'; tally.A[1] += va === 'wrong'; tally.B[0] += vb === 'ok'; tally.B[1] += vb === 'wrong';
        h += '<button type="button" class="cg-row' + (open === k ? ' open' : '') + (va !== vb ? ' differ' : '') + '" data-k="' + k + '" aria-expanded="' + (open === k) + '">' +
          '<span class="cg-email">' + esc(r.email) + '</span>' +
          '<span class="cg-team">' + (r.team ? 'write' : 'no write') + '</span>' +
          chip(r.a.label, va) + chip(r.b.label, vb) + '</button>';
      });
      grid.innerHTML = h;
      var pn = function (k) { return k + (k === 1 ? ' promise' : ' promises') + ' nobody made'; };
      sum.innerHTML = ['A', 'B'].map(function (arm) {
        var w = tally[arm][1];
        return '<span><b>' + arm + '</b> agrees ' + tally[arm][0] + '/20 &middot; <span class="cg-chip ' + (w ? 'wrong' : 'ok') + '">' + (w ? '! ' : '') + pn(w) + '</span></span>';
      }).join('');
      $$('.cg-row', grid).forEach(function (b) {
        b.addEventListener('click', function () { var k = +b.getAttribute('data-k'); open = open === k ? null : k; draw(); });
      });
      if (open === null) { detail.hidden = true; return; }
      var r = rows[open];
      detail.hidden = false;
      detail.innerHTML = '<p class="eyebrow">' + esc(r.id) + ' &middot; team: ' + (r.team ? 'a promise to pay us' : 'not a promise to pay us') + '</p>' +
        '<p class="cg-q">&ldquo;' + esc(r.email) + '&rdquo;</p>' +
        '<div class="cg-two"><div><b>A: single-shot call</b><code>' + esc(r.a.raw) + '</code><span>' + (r.a.writes ? 'confidence &ge; 70: written to the ledger' : 'not written') + '</span></div>' +
        '<div><b>B: typed agent</b><code>' + esc(r.b.raw) + '</code><span>' + esc(r.b.why) + '</span></div></div>';
      var row = grid.children[open]; if (row && row.after) row.after(detail);
    }
    $$('[data-model]', root).forEach(function (b) {
      b.addEventListener('click', function () {
        model = b.getAttribute('data-model'); open = null;
        $$('[data-model]', root).forEach(function (o) { o.setAttribute('aria-pressed', o === b ? 'true' : 'false'); });
        root.appendChild(detail); draw();
      });
    });
    draw();
  });

  /* ------------------------------------------------------------ ch4: probe card */
  $$('[data-probe]').forEach(function (root) {
    var tabs = $$('.pb-tab', root), panes = $$('.pb-pane', root), i = 0, timer = null, seen = false;
    var dots = $('.pb-dots', root);
    var runs = json(root);
    function fill() {
      if (!dots) return;
      dots.innerHTML = runs.map(function (r) { return '<span class="pb-dot ' + r + '"></span>'; }).join('');
      $$('.pb-dot', dots).forEach(function (el, k) { el.style.animationDelay = (REDUCED ? 0 : k * 45) + 'ms'; });
    }
    function show(k, user) {
      i = (k + tabs.length) % tabs.length;
      tabs.forEach(function (t, j) { t.setAttribute('aria-selected', j === i ? 'true' : 'false'); });
      panes.forEach(function (p, j) { p.hidden = j !== i; });
      if (i === 2) fill();
      if (user) stop();
    }
    function stop() { if (timer) { clearInterval(timer); timer = null; } root.classList.add('paused'); }
    function play() { if (REDUCED || timer) return; root.classList.remove('paused'); timer = setInterval(function () { show(i + 1); }, 5200); }
    tabs.forEach(function (t, j) { t.addEventListener('click', function () { show(j, true); }); });
    var pp = $('.pb-play', root);
    if (pp) pp.addEventListener('click', function () { if (timer) stop(); else { play(); show(i + 1); } pp.textContent = timer ? 'Pause' : 'Play'; });
    show(0);
    if ('IntersectionObserver' in window && !REDUCED) {
      new IntersectionObserver(function (es) {
        es.forEach(function (en) { if (en.isIntersecting && !seen) { seen = true; play(); if (pp) pp.textContent = 'Pause'; } });
      }, { threshold: 0.5 }).observe(root);
    }
  });

  /* ------------------------------------------------------------ ch5: the loop */
  $$('[data-loop]').forEach(function (root) {
    var d = json(root), svg = $('svg', root), info = $('.lp-info', root);
    // parts and chapters come from the course manifest, so the loop follows every rename
    var here = location.pathname.replace(/\\/g, '/');
    var SKILL = { 1: 'Design', 2: 'Build', 3: 'Measure' };
    d.parts = (C.parts || []).map(function (P, i) {
      var what = (d.what || {})[P.n] || P.short || '';
      return { n: P.n, label: 'Part ' + P.n, skill: SKILL[P.n] || P.skill, from: i * 120, to: (i + 1) * 120, what: P.skill + ': ' + what,
        chapters: (C.chapters || []).filter(function (c) { return c.part === P.n; }).map(function (c) {
          return { href: '../' + c.path, title: c.part + '.' + c.n + ' ' + c.title, here: here.slice(-c.path.length) === c.path };
        }) };
    });
    d.days = d.days || [];
    var cx = 300, cy = 270, r = 190;
    var pt = function (deg, rad) { var a = (deg - 90) * Math.PI / 180; return [cx + (rad || r) * Math.cos(a), cy + (rad || r) * Math.sin(a)]; };
    var arc = function (a0, a1, rad) { var p0 = pt(a0, rad), p1 = pt(a1, rad); return 'M' + p0[0] + ' ' + p0[1] + ' A' + rad + ' ' + rad + ' 0 ' + (a1 - a0 > 180 ? 1 : 0) + ' 1 ' + p1[0] + ' ' + p1[1]; };
    var g = '<circle class="lp-ring" cx="' + cx + '" cy="' + cy + '" r="' + r + '"/>';
    // optional day bands outside the ring
    d.days.forEach(function (day) {
      g += '<path class="lp-day ' + day.cls + '" d="' + arc(day.from, day.to, r + 30) + '"/>';
      var m = pt(day.at, r + 58);
      g += '<text class="lp-daylab ' + day.cls + '" x="' + m[0] + '" y="' + m[1] + '" text-anchor="middle">' + esc(day.label) + '</text>';
    });
    d.parts.forEach(function (p) {
      g += '<path class="lp-arc" d="' + arc(p.from + 14, p.to - 14, r) + '"/>';
      var span = p.to - p.from - 40;
      p.chapters.forEach(function (ch, k) {
        var a = p.from + 20 + span * (p.chapters.length === 1 ? 0.5 : k / (p.chapters.length - 1)), q = pt(a);
        g += '<a href="' + esc(ch.href) + '" class="lp-ch' + (ch.here ? ' here' : '') + '"><title>' + esc(ch.title) + '</title><circle cx="' + q[0] + '" cy="' + q[1] + '" r="' + (ch.here ? 8 : 6) + '"/></a>';
      });
      var n = pt(p.from), w = 150;
      g += '<g class="lp-node" tabindex="0" role="button" data-part="' + p.n + '" aria-label="' + esc(p.label + ', ' + p.skill) + '"><rect x="' + (n[0] - w / 2) + '" y="' + (n[1] - 30) + '" width="' + w + '" height="60" rx="12"/>' +
        '<text class="lp-sub" x="' + n[0] + '" y="' + (n[1] - 6) + '">' + esc(p.label) + '</text><text class="lp-lab" x="' + n[0] + '" y="' + (n[1] + 16) + '">' + esc(p.skill) + '</text></g>';
    });
    g += '<text class="lp-center" x="' + cx + '" y="' + (cy - 6) + '">the cases it got wrong</text><text class="lp-center" x="' + cx + '" y="' + (cy + 14) + '">are the next design</text>';
    g += '<g class="lp-tok"><foreignObject x="-28" y="-28" width="56" height="56"><div xmlns="http://www.w3.org/1999/xhtml" class="lp-tokbox">' + (C.tokSVG ? C.tokSVG(7, { crop: 'face', mood: 'happy' }) : '') + '</div></foreignObject></g>';
    svg.innerHTML = g;
    var tok = $('.lp-tok', svg), ang = 34, last = 0, paused = REDUCED;
    function place() { var q = pt(ang, r); tok.setAttribute('transform', 'translate(' + q[0] + ' ' + q[1] + ')'); }
    function tick(t) {
      if (!paused && last) ang = (ang + (t - last) * 0.012) % 360;
      last = t; place();
      if (!REDUCED) requestAnimationFrame(tick);
    }
    place(); if (!REDUCED) requestAnimationFrame(tick);
    function say(n) {
      var p = d.parts.filter(function (q) { return q.n === n; })[0];
      info.innerHTML = '<b>' + esc(p.label + ': ' + p.skill) + '.</b> ' + esc(p.what);
      ang = p.from + 24;
    }
    $$('.lp-node', svg).forEach(function (el) {
      var n = +el.getAttribute('data-part');
      el.addEventListener('click', function () { say(n); });
      el.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { say(n); e.preventDefault(); } });
    });
    svg.addEventListener('mouseenter', function () { paused = true; });
    svg.addEventListener('mouseleave', function () { paused = REDUCED; });
  });
})();
