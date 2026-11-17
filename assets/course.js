/* Harness engineering with Pydantic AI: shared course script.
   One file, no build step, no dependencies. The HTML contract it reads is in assets/COMPONENTS.md.
   Exposes window.Course: { chapters, parts, tokSVG, drawTok, registerSim, setTalk, refresh, state }. */
(function () {
  'use strict';

  /* ======================================================================
     The course manifest: the single source of truth for chapter order,
     titles, runtimes, Tok's evolution and the
     ask-your-agent follow-ups. Paths are relative to the repo root.
     ====================================================================== */
  /* Where the course repo lives, for the "With your coding agent" link on the home page.
     Leave empty until the repo is published; the link then stays hidden. */
  var REPO_URL = 'https://github.com/DouweM/ai-harness-course';
  /* Where the course is hosted, for page links in ask-your-agent prompts. Leave empty until it is online. */
  var SITE_URL = 'https://harness.pydantic.app';

  var PARTS = [
    { n: 1, title: 'How the model sees the world', skill: 'Design it from the model\'s side', short: 'Where ideas for a better harness come from',
      desc: 'Think from the model\'s side: what it can see, whose voice it trusts, and how its world stays current. No framework code.' },
    { n: 2, title: 'Building it with Pydantic AI', skill: 'Build it with Pydantic AI', short: 'Build any idea cleanly',
      desc: 'One billing agent that grows through Dana\'s week, in the order its page is built: instructions, tools, history, the answer form, then all of it as one capability.' },
    { n: 3, title: 'Production, and measuring what works', skill: 'Measure what works', short: 'Which idea is better, by how much, on which cases',
      desc: 'Durability, model choice, evals and experiments, and how to run your own probe.' }
  ];
  /* Reference pages: browsable, outside the chapter flow. Shown as a small row on the home page and in the contents. */
  var REFERENCE = [
    { path: 'reference/capabilities.html', title: 'Capability gallery', desc: 'Every built-in and Harness capability: what it does to the request, a snippet, the version it arrived in.' },
    { path: 'reference/the-example.html', title: 'The running example, in plain words', desc: 'The billing words the course uses (invoice, wire, ledger, month-end close, dispute) and Dana\'s week, for readers who have never worked in billing.' },
    { path: 'reference/composing-harnesses.html', title: 'How harnesses are composed', desc: 'What each capability adds to a request and in what order, what collides, Coder taken apart, and composing your own harness and sub-agents.' }
  ];
  var CHAPTERS = [
    // Part 1
    { path: 'part1/01-what-youre-talking-to.html', part: 1, n: 1, title: 'What you\'re talking to', min: 8, evolve: 1,
      ask: ['Show me what my agent\'s model actually receives on one turn, as one document, and read it the way the model does.',
        'If my agent ran on a smaller or different model, what on its page would it lean on that a frontier model would not?',
        'Which parts of what my agent sends are instructions, which are conversation, and which are tool results?'] },
    { path: 'part1/02-its-history-is-its-world.html', part: 1, n: 2, title: 'Its history is its world', min: 9, evolve: 2,
      ask: ['Find every place my agent edits, trims, deletes or replaces message history, and tell me what the model would believe after each.',
        'Where could a tool, a permission or a fact change mid-conversation in my agent without anything on the page saying so?',
        'Look at my output types: which required fields could push the model to invent a value it doesn\'t know?'] },
    { path: 'part1/03-whose-voice.html', part: 1, n: 3, title: 'Who\'s speaking?', min: 8, evolve: 3,
      ask: ['List every place untrusted text (emails, documents, tool output) enters my agent\'s context, and in whose voice it arrives.',
        'Is any text in my agent\'s instructions written by someone outside my team? Show me where it comes from.',
        'Explain the operator, user and data voices using my agent\'s code, and check each lands in the right one.'] },
    { path: 'part1/04-the-world-moved.html', part: 1, n: 4, title: 'The world moves', min: 12, evolve: 4,
      ask: ['When my agent\'s rules or settings change mid-conversation, how does the model find out? Show me the code path.',
        'Where could the world change mid-conversation in my use case, and how would my agent find out?',
        'For my agent, which context should be injected up front and which should it fetch with a tool? Argue both sides.'] },
    { path: 'part1/05-thinking-like-a-harness-engineer.html', part: 1, n: 5, title: 'Thinking like a harness engineer', min: 8, evolve: 5,
      ask: ['Take one case where my agent got it wrong and read its page with me: what was on it, what was missing, and why did it do that?',
        'Propose three candidate harness designs for my agent, each with a one-line experiment that would tell them apart.',
        'Help me write my agent\'s onboarding note: what a new colleague doing this job would need to know.'] },
    // Part 2
    { path: 'part2/01-from-idea-to-code.html', part: 2, n: 1, title: 'From idea to code', min: 6, evolve: 6,
      ask: ['Print exactly what my agent\'s model receives on one request: instructions, tool definitions, answer form. Point out anything I wrote that never reaches it.',
        'Map my existing agent (or LLM call) onto the Pydantic AI pieces: instructions, deps, tools, history, answer form, capabilities.',
        'If my team moved one of our LLM calls to Pydantic AI, which one should go first, and what would its agent look like?'] },
    { path: 'part2/02-instructions-and-deps.html', part: 2, n: 2, title: 'Instructions and deps', min: 6, evolve: 7,
      ask: ['Find facts my agent bakes into prompt strings (dates, settings, user data) and move each into deps and an instructions function.',
        'Which of my agent\'s instructions can change mid-conversation? Show me on_change=\'append\' for each.'] },
    { path: 'part2/03-tools.html', part: 2, n: 3, title: 'Tools', min: 8, evolve: 8,
      ask: ['Print my agent\'s tool definitions and read them as the model does: unclear names, missing descriptions, rules hidden in code.',
        'Which of my tools write to the outside world? Gate them with approval and give each an idempotency key from ctx.tool_call_id.',
        'Sort my tools\' error cases into the model\'s mistake (ModelRetry), our outage (ToolFailed) and a normal answer.'] },
    { path: 'part2/04-history.html', part: 2, n: 4, title: 'History', min: 7, evolve: 9,
      ask: ['How does my app store and reload conversations? Show me the Conversation round trip for my agent.',
        'Where does my agent trim or rewrite history? Replace it with ClearToolResults or TieredCompaction and tell me what the model sees after.'] },
    { path: 'part2/05-the-answer-form.html', part: 2, n: 5, title: 'The answer form', min: 6, evolve: 10,
      ask: ['Look at my output types: which real answers can\'t fit them? Propose a shape that holds them.',
        'Add an output validator that checks my agent\'s answer against our data and sends it back with ModelRetry.'] },
    { path: 'part2/06-capabilities.html', part: 2, n: 6, title: 'Capabilities', min: 14, evolve: 11,
      ask: ['Group my agent\'s harness behavior into capabilities: what each would contribute, and which agents would share them.',
        'Which built-in capabilities would help my agent first, and what would each change in the request?',
        'Take Coder apart for my use case: which of its capabilities would I keep, swap or restrict?'] },
    { path: 'part2/07-more-than-one-agent.html', part: 2, n: 7, title: 'More than one agent', min: 6, evolve: 12,
      ask: ['For my use case, which steps should be plain calls, which an agent, and which a workflow? Explain the trade-offs.',
        'Do my sub-agents share the parent\'s usage? Show me where a cost limit would miss a delegate.'] },
    { path: 'part2/08-interfaces.html', part: 2, n: 8, title: 'Interfaces', min: 5, evolve: 13,
      ask: ['Who holds my agent\'s history when it runs behind a UI? Show me manage_message_history=\'server\' or a conversation store for my app.',
        'Which interface fits how my users reach my agent: a job, streaming to a UI, chat, MCP or voice?'] },
    { path: 'part2/09-testing.html', part: 2, n: 9, title: 'Testing', min: 5, evolve: 14,
      ask: ['Write a test for each harness idea in my agent (gates, notices, validators), offline, and run them.',
        'Set up ALLOW_MODEL_REQUESTS so my test suite can never call a real model by accident.'] },
    // Part 3
    { path: 'part3/01-production.html', part: 3, n: 1, title: 'Production architectures', min: 8, evolve: 15,
      ask: ['Review my agent for production: durability, idempotent writes, approvals that wait for days, limits, observability.',
        'Which of my tools write to the outside world, and how would I make them safe to retry?'] },
    { path: 'part3/02-models.html', part: 3, n: 2, title: 'Models and trade-offs', min: 7, evolve: 16,
      ask: ['Help me plan a model comparison for my agent: which models, which cases, and what I would measure.',
        'How should I roll out a new model or new instructions safely in my setup?'] },
    { path: 'part3/03-evals.html', part: 3, n: 3, title: 'Evals and experiments', min: 9, evolve: 17,
      ask: ['Turn ten of my production corrections into a Pydantic Evals dataset, and run it against my agent.',
        'Set up a two-arm experiment for my agent: the current version against one changed capability.',
        'Run this chapter\'s eval example from code/ and explain the report.'] },
    { path: 'part3/04-run-your-own-probe.html', part: 3, n: 4, title: 'Run your own probe', min: 6, evolve: 18,
      ask: ['Help me write a probe for one question about my agent: change one thing, predict, measure.',
        'Read the cases from my last eval run with me, not just the averages.'] },
    { path: 'part3/05-the-loop.html', part: 3, n: 5, title: 'The loop', min: 4, evolve: 19,
      ask: ['Help me pick the one agent in my product most worth running the full loop on, and plan the first week.',
        'Summarise what this course would change in my agent, as a short list I can bring to my team.'] }
  ];
  var MIN_PATH_NOTE = 'Part 1';

  /* Tok's evolution. Part 1 owns stages 0 to 5 and follows how the course sees the model: token predictor,
     assistant, agent acting on its history, then the agent's ears (voices), antenna (changes) and legs. Part 1 ends
     with Tok as an agent. Parts 2 and 3 extend the list on a "gains equipment" axis: append new stages after 5, one
     visible piece of equipment each, and never renumber 0 to 5 (chapter pages and evolve cards refer to them). */
  var STAGES = [
    { name: 'a token predictor', line: 'the. the cat. the cat sat. I am very good at what comes next, and that is all I do.' },
    { name: 'a document completer, then an assistant', line: 'I continue the document you hand me. In a chat, that means I answer as the assistant in it. That page is all I know.' },
    { name: 'an agent acting on its world', line: 'I look things up and act. My history is my world, and I believe every line of it.' },
    { name: 'an agent that knows who is talking', line: 'The app, the person, the data: keep their voices apart and I will weigh each one right.' },
    { name: 'an agent that keeps up', line: 'Tell me what changed, and when, in one line. I will take it from there.' },
    { name: 'an agent you can read', line: 'When I get it wrong, read my page. The reason is usually on it, or missing from it.' },
    // Parts 2 and 3: Tok gains one piece of equipment per chapter
    { name: 'an agent with a blueprint', line: 'Every line on my page comes from one place in your code. Now you know where.' },
    { name: 'an agent with a name badge', line: 'My badge says who I work for and what day it is. Built fresh every request.' },
    { name: 'an agent with a tool belt', line: 'One tool has a padlock. When it is locked, I am told why.' },
    { name: 'an agent with a logbook', line: 'My logbook only grows. When it gets heavy, old results become notes on where to find them.' },
    { name: 'an agent with a clipboard', line: 'Give my form a row per promise, and I will write down every one.' },
    { name: 'an agent with a backpack', line: 'Everything I carry, packed once. Any agent can wear the same backpack.' },
    { name: 'an agent with a teammate', line: 'I ask my teammate, and we share one budget.' },
    { name: 'an agent behind many doors', line: 'Email, chat, phone: the same me. My logbook stays with you, not the visitor.' },
    { name: 'an agent with a test shield', line: 'Every idea you built has a test. None of them needed me.' },
    { name: 'an agent that can wait', line: 'I can sleep through the weekend and wake up exactly where I stopped.' },
    { name: 'an agent with siblings', line: 'My smaller siblings need more on the page. That is fine; now you know how much.' },
    { name: 'an agent with a scorecard', line: 'Same score, different mistakes. Read my cases, not just my number.' },
    { name: 'an agent with a magnifier', line: 'Change one thing, guess first, then look. I like being a good experiment.' },
    { name: 'a colleague, and part of the loop', line: 'Thanks for telling me what changed. See you on the other side of the loop.' }
  ];

  /* ====================================================================== */
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var STORE = 'harness-course-v4';
  var state = { picks: {}, steps: {}, done: {}, theme: 'auto', talk: false, notes: false, design: null, seen: 0 };
  try { var saved = JSON.parse(localStorage.getItem(STORE) || 'null'); if (saved && typeof saved === 'object') state = Object.assign(state, saved); } catch (e) { /* storage unavailable: progress lives for this page view only */ }
  function save() { try { localStorage.setItem(STORE, JSON.stringify(state)); } catch (e) { /* storage unavailable */ } }
  function esc(t) { return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function announce(t) { var a = $('#announce'); if (a) { a.textContent = ''; setTimeout(function () { a.textContent = t; }, 30); } }
  var toastTimer;
  function toast(t) {
    var el = $('#toast');
    if (!el) { el = document.createElement('div'); el.id = 'toast'; el.className = 'toast'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
    el.textContent = t; el.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { el.hidden = true; }, 2600);
  }
  function copyText(t, done) {
    function fallback() {
      var ta = document.createElement('textarea'); ta.value = t; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      var ok = false; try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      ta.remove(); if (done) done(ok);
    }
    try {
      if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(t).then(function () { if (done) done(true); }, fallback);
      else fallback();
    } catch (e) { fallback(); }
  }

  /* ---------- where am I ---------- */
  var body = document.body;
  var PAGE = body.getAttribute('data-page') || 'chapter';
  var here = location.pathname.replace(/\\/g, '/');
  var pageKey = (function () {
    var m = here.match(/((?:part\d|workshop|templates|reference)\/[^\/]+\.html)$/);
    if (m) return m[1];
    // the deployed site serves clean URLs (no .html)
    m = here.match(/((?:part\d|workshop|templates|reference)\/[^\/.]+)$/);
    if (m && !body.getAttribute('data-path')) return m[1] + '.html';
    return body.getAttribute('data-path') || 'index.html';
  })();
  var chapterIndex = -1;
  CHAPTERS.forEach(function (c, i) { if (c.path === pageKey) chapterIndex = i; });
  var chapter = chapterIndex >= 0 ? CHAPTERS[chapterIndex] : null;
  if (!chapter && PAGE === 'chapter') {
    // a page not in the manifest yet: describe it from its own attributes
    chapter = { path: pageKey, part: +(body.getAttribute('data-part') || 0), n: +(body.getAttribute('data-n') || 0), title: body.getAttribute('data-title') || document.title, min: +(body.getAttribute('data-runtime') || 0), evolve: 0, ask: [] };
  }
  // what 'Ask your agent' is about: this chapter, or this reference page
  var askTarget = chapter || REFERENCE.filter(function (r) { return r.path === pageKey; })[0] || null;
  var depth = (pageKey.match(/\//g) || []).length;
  var ROOT = depth ? new Array(depth + 1).join('../') : './';
  function href(path) { return ROOT + path; }
  function partOf(n) { return PARTS[n - 1]; }

  /* ======================================================================
     Tok
     ====================================================================== */
  /* Stages 0 to 5 are Part 1's robot, following how the course sees the model: a token tile (token predictor), a
     face that reads and talks (an assistant), a body with arms and an append-only chest log (an agent acting on its
     history), ears striped in the three voices, an antenna that lights when it is told what changed, then legs and a
     wave. Part 2 puts tools
     in its hand (6), Part 3 adds a trace under its feet (7), and the last chapter closes it into the Pydantic mark (8).
     Options: mood, crop (full|hero|wide|face), lit (antenna on/off), listen ('s'|'u'|'t': which voice it hears). */
  var VIEW = {
    0: '14 40 176 112', 1: '14 40 176 112', 2: '6 40 188 172', 3: '6 40 188 172', 4: '6 14 188 198', 5: '6 14 188 232'
  };
  var FACE = '52 26 96 106';

  function p1eyes(mood, look) {
    var L = 88 + look, R = 112 + look, y = 92;
    function dot(x, yy, r) { r = r || 4.6; return '<ellipse class="eye" cx="' + x + '" cy="' + yy + '" rx="' + r + '" ry="' + (r * 1.15).toFixed(2) + '"/><circle class="shine" cx="' + (x - 1.4) + '" cy="' + (yy - 2) + '" r="1.5"/>'; }
    if (mood === 'happy') return '<path class="brow" style="stroke-width:2.4" d="M' + (L - 5) + ' ' + (y + 2) + ' q5 -7 10 0 M' + (R - 5) + ' ' + (y + 2) + ' q5 -7 10 0"/>';
    if (mood === 'unsure') return dot(L + 1, y) + dot(R + 1, y) + '<path class="brow" d="M' + (L - 5) + ' ' + (y - 10) + ' l9 0 M' + (R - 4) + ' ' + (y - 13) + ' l9 -3"/>';
    if (mood === 'worried') return dot(L, y + 1, 4.2) + dot(R, y + 1, 4.2) + '<path class="brow" d="M' + (L - 5) + ' ' + (y - 8) + ' l9 -4 M' + (R - 4) + ' ' + (y - 12) + ' l9 4"/><path d="M136 74 q4 7 0 9 q-4 -2 0 -9z" fill="var(--model)" opacity=".75"/>';
    if (mood === 'curious') return dot(L + 2.5, y - 2) + dot(R + 2.5, y - 2, 5.2);
    if (mood === 'confused') return dot(L, y, 4) + dot(R, y - 1, 5.2) + '<path class="brow" d="M' + (L - 5) + ' ' + (y - 9) + ' l9 2 M' + (R - 4) + ' ' + (y - 13) + ' l9 -2"/>';
    if (mood === 'sleepy') return '<path class="brow" style="stroke-width:2.2" d="M' + (L - 5) + ' ' + y + ' l10 0 M' + (R - 5) + ' ' + y + ' l10 0"/>';
    return '<g class="eyes">' + dot(L, y) + dot(R, y) + '</g>';
  }
  function mouth(mood) {
    if (mood === 'worried' || mood === 'unsure') return '<path class="mouth" d="M95 111 q5 -3 10 0"/>';
    if (mood === 'curious') return '<ellipse class="mouth-o" cx="100" cy="110" rx="2.6" ry="3"/>';
    return '<path class="mouth" d="M94 108 q6 5 12 0"/>';
  }

  function p1svg(stage, opt) {
    opt = opt || {};
    stage = Math.max(0, Math.min(5, stage | 0));
    var mood = opt.mood || '', crop = opt.crop || 'full', fresh = opt.fresh;
    var vb = crop === 'face' ? (stage >= 4 ? FACE : stage >= 3 ? '44 48 112 84' : '52 48 96 84') : VIEW[stage];
    function part(n, body) { return '<g class="part p' + n + (fresh === n ? ' fresh' : '') + '">' + body + '</g>'; }
    var s = '<svg class="tok-svg p1tok st' + stage + (opt.listen ? ' listen-' + opt.listen : '') + (crop === 'face' ? ' cropped' : '') + '" viewBox="' + vb + '" aria-hidden="true" focusable="false">';
    var base = stage >= 5 ? 238 : stage >= 2 ? 206 : 140;
    s += '<line class="glow" x1="40" y1="' + base + '" x2="160" y2="' + base + '"/><line class="base" x1="40" y1="' + base + '" x2="160" y2="' + base + '"/>';
    // stage 1: the page it reads (left), and a speech bubble: it answers
    if (stage === 1 && crop !== 'face') s += part(1, '<g class="bubble"><rect x="146" y="58" width="34" height="22" rx="7" fill="var(--surface)" stroke="var(--accent)" stroke-width="2"/><path d="M152 80 l-4 8 l10 -8z" fill="var(--accent)"/><path d="M153 66 h20 M153 72 h13" stroke="var(--accent)" stroke-width="2" stroke-linecap="round"/></g>');
    if (stage === 1 && crop !== 'face') s += part(1, '<g class="page"><rect x="22" y="70" width="34" height="46" rx="3" transform="rotate(-9 39 93)"/><path d="M28 80 h20 M27 87 h22 M27 94 h16 M26 101 h21" transform="rotate(-9 39 93)"/></g>');
    // stage 0: the next token, about to be sampled
    if (stage === 0 && crop !== 'face') s += '<g class="nexttok"><rect class="ghost" x="148" y="76" width="26" height="30" rx="7"/><rect class="bar b1" x="153" y="112" width="4" height="12" rx="1"/><rect class="bar b2" x="159" y="116" width="4" height="8" rx="1"/><rect class="bar b3" x="165" y="120" width="4" height="4" rx="1"/></g>';
    // stage 5: legs and feet
    if (stage >= 5) s += part(5, '<g class="legs"><rect class="body" x="82" y="198" width="11" height="28" rx="5"/><rect class="body" x="107" y="198" width="11" height="28" rx="5"/><ellipse class="hand" cx="85" cy="230" rx="11" ry="6"/><ellipse class="hand" cx="115" cy="230" rx="11" ry="6"/></g>');
    // stage 2: body, chest log (its history), arms to act with
    if (stage >= 2) {
      var waving = stage >= 5;
      s += part(2, '<g class="torso"><rect class="body" x="93" y="124" width="14" height="10" rx="3"/><rect class="body" x="66" y="132" width="68" height="68" rx="16"/>' +
        '<rect class="chest" x="78" y="142" width="44" height="40" rx="6"/>' +
        '<g class="log"><rect class="tile t1" x="83" y="147" width="30" height="5" rx="2"/><rect class="tile t2" x="83" y="155" width="24" height="5" rx="2"/><rect class="tile t3" x="83" y="163" width="32" height="5" rx="2"/><rect class="tile t4 newest" x="83" y="171" width="20" height="5" rx="2"/></g>' +
        '<path class="ln arm" d="M66 150 C 52 156, 48 168, 46 180"/><circle class="hand" cx="45" cy="183" r="6"/>' +
        '<g class="' + (waving ? 'rarm waving' : 'rarm') + '"><path class="ln arm" d="M134 150 C 148 156, 152 168, 154 180"/><circle class="hand" cx="155" cy="183" r="6"/></g>' +
        (waving ? '<rect class="heart" x="95" y="186" width="10" height="10" rx="1.5" transform="rotate(45 100 191)"/>' : '') + '</g>');
    }
    // the head: a token tile, then a face
    var tilt = { unsure: -5, worried: 4 }[mood] || 0;
    s += '<g class="tokbody" style="transform-origin:100px 120px;transform:rotate(' + tilt + 'deg)">';
    // stage 4+: antenna that lights when it is told what changed
    if (stage >= 4) s += part(4, '<g class="antenna' + (opt.lit === false ? ' off' : '') + '"><path class="ln" d="M100 60 L100 40"/><circle class="bulb-ring" cx="100" cy="35" r="9"/><circle class="bulb" cx="100" cy="35" r="5"/></g>');
    // stage 3+: ear cups in the three voices
    if (stage >= 3) s += part(3, '<g class="ears"><rect class="ear" x="48" y="74" width="12" height="36" rx="6"/><rect class="ear" x="140" y="74" width="12" height="36" rx="6"/>' +
      '<rect class="v vs" x="51" y="80" width="6" height="7" rx="2"/><rect class="v vu" x="51" y="89" width="6" height="7" rx="2"/><rect class="v vt" x="51" y="98" width="6" height="7" rx="2"/>' +
      '<rect class="v vs" x="143" y="80" width="6" height="7" rx="2"/><rect class="v vu" x="143" y="89" width="6" height="7" rx="2"/><rect class="v vt" x="143" y="98" width="6" height="7" rx="2"/></g>');
    s += '<rect class="body" x="60" y="60" width="80" height="66" rx="18"/>';
    if (stage === 0) {
      s += '<g class="tokglyph"><text x="78" y="99" class="tg">the</text><rect class="caret0" x="113" y="83" width="5" height="21" rx="1"/></g>';
    } else {
      s += '<ellipse class="cheek" cx="76" cy="106" rx="5.5" ry="3.2"/><ellipse class="cheek" cx="124" cy="106" rx="5.5" ry="3.2"/>';
      s += p1eyes(mood, stage <= 1 && !mood ? -3 : 0);
      s += part(1, mouth(mood));
    }
    s += '</g></svg>';
    return s;
  }

  function finalForm(mood) {
    var e = mood === 'happy'
      ? '<path class="brow" style="stroke-width:2.6" d="M84 126 q5 -7 10 0 M108 126 q5 -7 10 0"/>'
      : '<g class="eyes"><ellipse class="eye" cx="89" cy="124" rx="4.6" ry="5.4"/><circle class="shine" cx="87.6" cy="121.8" r="1.6"/><ellipse class="eye" cx="113" cy="124" rx="4.6" ry="5.4"/><circle class="shine" cx="111.6" cy="121.8" r="1.6"/></g>';
    return '<line class="glow" x1="40" y1="166" x2="160" y2="166"/><line class="base" x1="40" y1="166" x2="160" y2="166"/>' +
      '<g class="fm tokbody"><use href="#pmark" x="46" y="66" width="108" height="90" class="mark"/>' + e + '</g>';
  }
  /* Equipment for stages 6 and up: each piece is drawn on top of the stage-5 robot. Hand items (blueprint,
     scorecard, magnifier) replace each other; the backpack (11) stows the Part 2 kit worn before it. */
  function gear(stage, fresh) {
    function g(n, body) { return '<g class="part gear g' + n + (fresh === n ? ' fresh' : '') + '">' + body + '</g>'; }
    var A = 'var(--accent)', B = 'var(--border-strong)', S = 'var(--surface)', M = 'var(--model)';
    var out = '';
    var stowed = stage >= 11;
    if (stage >= 13) out += g(13, '<rect x="-4" y="96" width="34" height="142" rx="4" fill="none" stroke="' + B + '" stroke-width="3"/><circle cx="22" cy="170" r="2.6" fill="' + B + '"/>');
    if (stage >= 11) out += g(11, '<rect x="52" y="140" width="96" height="58" rx="14" fill="' + M + '" opacity=".35"/><path d="M74 132 v10 M126 132 v10" stroke="' + M + '" stroke-width="5" stroke-linecap="round"/>');
    var hand = stage >= 18 ? 18 : stage >= 17 ? 17 : (!stowed && stage >= 6) ? 6 : 0;
    if (hand === 6) out += g(6, '<rect x="24" y="174" width="26" height="18" rx="3" fill="' + S + '" stroke="' + A + '" stroke-width="2" transform="rotate(-8 37 183)"/><path d="M29 180 h14 M29 185 h9" stroke="' + A + '" stroke-width="1.6" transform="rotate(-8 37 183)"/>');
    if (hand === 17) out += g(17, '<rect x="22" y="168" width="24" height="30" rx="3" fill="' + S + '" stroke="' + A + '" stroke-width="2"/><path d="M27 176 h8 M27 183 h12 M27 190 h6" stroke="' + B + '" stroke-width="2"/><path d="M37 174 l2 2 l4 -5 M38 188 l4 4 M42 188 l-4 4" stroke="' + A + '" stroke-width="1.6" fill="none"/>');
    if (hand === 18) out += g(18, '<circle cx="32" cy="176" r="11" fill="' + S + '" stroke="' + A + '" stroke-width="3"/><path d="M40 184 l9 9" stroke="' + A + '" stroke-width="4" stroke-linecap="round"/>');
    if (stage >= 7) out += g(7, '<rect x="64" y="130" width="16" height="11" rx="2.5" fill="' + A + '"/><circle cx="69" cy="135.5" r="2" fill="' + S + '"/><path d="M73 134 h5 M73 137 h4" stroke="' + S + '" stroke-width="1.2"/>');
    if (stage >= 8) out += g(8, '<rect x="64" y="190" width="72" height="7" rx="3" fill="' + B + '"/><rect x="122" y="185" width="12" height="11" rx="2" fill="' + A + '"/><path d="M125 185 v-3 a3 3 0 0 1 6 0 v3" stroke="' + A + '" stroke-width="2" fill="none"/>');
    if (stage >= 9 && !stowed) out += g(9, '<rect x="12" y="214" width="26" height="22" rx="2" fill="' + S + '" stroke="' + M + '" stroke-width="2"/><path d="M25 214 v22" stroke="' + M + '" stroke-width="1.6"/><path d="M15 220 h7 M15 225 h7 M28 220 h7" stroke="' + B + '" stroke-width="1.4"/>');
    if (stage >= 10 && !stowed) out += g(10, '<rect x="164" y="208" width="22" height="28" rx="2" fill="' + S + '" stroke="' + A + '" stroke-width="2"/><rect x="170" y="205" width="10" height="5" rx="1.5" fill="' + A + '"/><path d="M168 216 h14 M168 222 h14 M168 228 h9" stroke="' + B + '" stroke-width="1.4"/>');
    if (stage >= 12) out += g(12, '<g transform="translate(156 186) scale(.34)"><rect x="60" y="60" width="80" height="66" rx="18" fill="' + S + '" stroke="' + A + '" stroke-width="5"/><circle cx="88" cy="92" r="5" fill="' + A + '"/><circle cx="112" cy="92" r="5" fill="' + A + '"/><path d="M94 108 q6 5 12 0" stroke="' + A + '" stroke-width="4" fill="none"/></g>');
    if (stage >= 14) out += g(14, '<path d="M122 132 l10 4 v8 q0 8 -10 12 q-10 -4 -10 -12 v-8z" fill="' + S + '" stroke="' + A + '" stroke-width="2"/><path d="M117 143 l4 4 l6 -7" stroke="' + A + '" stroke-width="2" fill="none"/>');
    if (stage >= 15) out += g(15, '<path d="M162 26 a12 12 0 1 0 12 16 a9 9 0 1 1 -12 -16z" fill="' + A + '" opacity=".85"/>');
    if (stage >= 16) out += g(16, '<rect x="10" y="208" width="14" height="16" rx="4" fill="' + S + '" stroke="' + B + '" stroke-width="2"/><rect x="26" y="214" width="11" height="12" rx="3" fill="' + S + '" stroke="' + B + '" stroke-width="2"/>');
    return out;
  }
  function tokSVG(stage, opt) {
    opt = opt || {};
    stage = Math.max(0, Math.min(STAGES.length - 1, stage | 0));
    var crop = opt.crop || 'full';
    if (stage >= STAGES.length - 1) return '<svg class="tok-svg' + (crop === 'full' || crop === 'hero' ? '' : ' cropped') + '" viewBox="' + (crop === 'full' || crop === 'hero' ? '24 52 152 124' : '36 56 128 112') + '" aria-hidden="true" focusable="false">' + finalForm(opt.mood || '') + '</svg>';
    var s = p1svg(Math.min(stage, 5), Object.assign({}, opt, { fresh: opt.fresh === stage && stage <= 5 ? stage : undefined }));
    if (stage <= 5 || crop === 'face') return s;
    s = s.replace('viewBox="6 14 188 232"', 'viewBox="-6 10 206 236"');
    return s.replace(/<\/svg>$/, gear(stage, opt.fresh) + '</svg>');
  }
  function drawTok(el, opt) {
    var v = el.getAttribute('data-tok');
    var st = v === 'current' || v === '' ? currentStage() : +v;
    var lit = el.hasAttribute('data-lit') ? el.getAttribute('data-lit') !== 'false' : undefined;
    el.innerHTML = tokSVG(st, Object.assign({ mood: el.getAttribute('data-mood') || '', crop: el.getAttribute('data-crop') || 'full', lit: lit, listen: el.getAttribute('data-listen') || '' }, opt || {}));
  }
  function hop(el) { if (REDUCED || !el) return; el.classList.remove('hop'); void el.offsetWidth; el.classList.add('hop'); }
  function currentStage() {
    var st = state.seen ? 0 : 0;
    CHAPTERS.forEach(function (c) { if (state.done[c.path] && c.evolve > st) st = c.evolve; });
    return st;
  }
  function sprite() {
    if ($('#pmark')) return;
    var d = document.createElement('div');
    d.innerHTML = '<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><symbol id="pmark" viewBox="0 0 24 20"><path d="M22.906 15.109 12.256.346c-.335-.461-1.107-.461-1.44 0L.167 15.109A.89.89 0 0 0 .61 16.47l10.65 3.485h.001a.9.9 0 0 0 .55 0h.002l10.65-3.485a.88.88 0 0 0 .567-.57.88.88 0 0 0-.125-.792zM11.537 2.38l4.269 5.918-3.992-1.306c-.031-.01-.064-.009-.095-.016a1 1 0 0 0-.091-.015c-.031-.004-.06-.016-.091-.016-.03 0-.06.012-.09.016a1 1 0 0 0-.092.015c-.032.006-.064.006-.092.016L7.295 8.29l-.025.008 4.269-5.918zm-6.031 8.362 4.647-1.522.496-.162v8.832l-8.332-2.727zm6.92 7.147v-8.83l5.143 1.683 3.189 4.418z"/></symbol></svg>';
    body.insertBefore(d.firstChild, body.firstChild);
  }

  /* ======================================================================
     Shell: progress bar, top bar, contents drawer, talk bar, notes panel
     ====================================================================== */
  var ICON = {
    talk: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="12" rx="1"/><path d="M12 16v4M8 20h8"/></svg>',
    theme: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 0 0 16z" fill="currentColor"/></svg>',
    list: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h10"/></svg>',
    ask: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v11H9l-5 4z"/><path d="M9 10h6"/></svg>'
  };
  function buildShell() {
    sprite();
    if (!$('#progress')) { var pr = document.createElement('div'); pr.className = 'progress'; pr.id = 'progress'; pr.setAttribute('aria-hidden', 'true'); body.insertBefore(pr, body.firstChild); }
    var top = $('header.topbar');
    if (!top || top.hasAttribute('data-auto') || !top.children.length) {
      if (!top) { top = document.createElement('header'); top.className = 'topbar'; var after = $('#pmark') ? $('#pmark').parentNode : null; body.insertBefore(top, after ? after.nextSibling : body.firstChild); }
      var crumb = '';
      if (chapter && chapter.part) crumb = '<span class="crumb"><a href="' + href('index.html') + '#part-' + chapter.part + '">Part ' + chapter.part + '</a> &middot; ' + chapter.n + ' of ' + CHAPTERS.filter(function (c) { return c.part === chapter.part; }).length + '</span>';
      else if (PAGE === 'reference') crumb = '<span class="crumb"><a href="' + href('index.html') + '#reference">Reference</a></span>';
      else if (PAGE === 'workshop') crumb = '<span class="crumb"><a href="' + href('workshop/index.html') + '">Workshop</a></span>';
      top.innerHTML = '<div class="wrap">' +
        '<a class="brand" href="' + href('index.html') + '" aria-label="Harness engineering with Pydantic AI, course home"><svg width="24" height="20" aria-hidden="true" style="fill:var(--accent)"><use href="#pmark"/></svg><span class="bt">Harness engineering</span></a>' +
        '<button class="mini-tok" id="miniTok" type="button" aria-label="Tok, as you see it now. Tap to hear from it."><span data-tok="current" data-crop="wide"></span></button>' +
        crumb + '<span class="spacer"></span>' +
        '<span class="score" id="score" aria-live="polite" hidden></span>' +
                '<button class="iconbtn" id="contentsBtn" type="button" aria-haspopup="dialog" title="All chapters">' + ICON.list + '<span class="sr-only">All chapters</span></button>' +
        '<button class="iconbtn" id="talkBtn" type="button" aria-pressed="false" title="Talk mode (P)">' + ICON.talk + '<span class="sr-only">Talk mode</span></button>' +
        '<button class="iconbtn" id="themeBtn" type="button" aria-label="Switch theme">' + ICON.theme + '<span class="sr-only" id="themeLabel">Auto</span></button>' +
        '</div>';
    }
    // contents drawer
    var cont = document.createElement('div'); cont.className = 'contents'; cont.id = 'contents'; cont.hidden = true;
    cont.setAttribute('role', 'dialog'); cont.setAttribute('aria-modal', 'true'); cont.setAttribute('aria-label', 'All chapters');
    cont.innerHTML = '<div class="panel"><div class="panel-head"><h2>All chapters</h2><button class="iconbtn" type="button" data-close>Close</button></div>' + tocHTML(true) +
      '<p class="small muted" style="margin-top:18px"><a href="' + href('index.html') + '">Course home</a> &middot; <button class="linkbtn" type="button" id="resetAll">Reset my progress</button></p></div>';
    body.appendChild(cont);
    // talk bar, notes, help
    var bar = document.createElement('div'); bar.className = 'talk-bar'; bar.setAttribute('role', 'toolbar'); bar.setAttribute('aria-label', 'Talk mode controls');
    bar.innerHTML = '<button class="btn ghost" id="prevBtn" type="button" title="Previous (left arrow)">&larr;<span class="btn-label"> Prev</span></button>' +
      '<button class="btn" id="stepBtn" type="button" title="Reveal (R or space)">Reveal</button>' +
      '<button class="btn ghost" id="nextBtn" type="button" title="Next (right arrow)"><span class="btn-label">Next </span>&rarr;</button>' +
      '<span class="pos" id="talkPos"></span>' +
      '<button class="iconbtn opt-notes" id="notesBtn" type="button" aria-pressed="false" title="Speaker notes (N)">Notes</button>' +
      '<button class="iconbtn" id="talkExit" type="button" title="Leave talk mode (P or Esc)">Exit</button>';
    body.appendChild(bar);
    var np = document.createElement('aside'); np.className = 'notes-panel'; np.id = 'notesPanel'; np.setAttribute('aria-live', 'polite'); body.appendChild(np);
    var help = document.createElement('div'); help.className = 'talk-help'; help.id = 'talkHelp'; help.hidden = true;
    help.innerHTML = '<div class="panel" role="dialog" aria-label="Talk mode keys"><h2 style="font-size:1.25rem">Talk mode keys</h2><div class="keys">' +
      '<kbd>&rarr;</kbd><span>Next stop (page down and clickers work too). At the end: next chapter.</span>' +
      '<kbd>&larr;</kbd><span>Previous stop. At the start: previous chapter.</span>' +
      '<kbd>R</kbd><span>Reveal the next step (space works too).</span>' +
      '<kbd>1</kbd><span>to <kbd>4</kbd>: pick answer A to D.</span>' +
      '<kbd>N</kbd><span>Speaker notes.</span>' +
      '<kbd>P</kbd><span>Talk mode on or off (<kbd>Esc</kbd> leaves).</span>' +
      '<kbd>?</kbd><span>This help.</span></div><button class="btn" type="button" data-close>Got it</button></div>';
    body.appendChild(help);
    if (!$('#announce')) { var an = document.createElement('div'); an.id = 'announce'; an.className = 'sr-only'; an.setAttribute('aria-live', 'polite'); body.appendChild(an); }
  }
  function tocHTML(withParts) {
    return PARTS.map(function (p) {
      var cs = CHAPTERS.filter(function (c) { return c.part === p.n; });
      return (withParts ? '<h3>Part ' + p.n + ' &middot; ' + esc(p.title) + '</h3>' : '') + '<ol class="toc">' + cs.map(function (c) {
        return '<li><a href="' + href(c.path) + '" data-chapter="' + c.path + '"' + (c.path === pageKey ? ' aria-current="page"' : '') + '><span class="n">' + p.n + '.' + c.n + '</span><span>' + esc(c.title) + '</span><span class="rt">' + c.min + ' min</span></a></li>';
      }).join('') + '</ol>';
    }).join('') + (withParts ? '<h3>Reference</h3>' + refHTML() : '');
  }
  function refHTML() {
    return '<ul class="toc ref">' + REFERENCE.map(function (r) {
      return '<li><a href="' + href(r.path) + '"' + (r.path === pageKey ? ' aria-current="page"' : '') + '><span>' + esc(r.title) + '</span><span class="rt">' + esc(r.desc) + '</span></a></li>';
    }).join('') + '</ul>';
  }
  function markDone() {
    $$('[data-chapter]').forEach(function (a) { a.classList.toggle('done', !!state.done[a.getAttribute('data-chapter')]); });
    $$('.meta-row .done-mark').forEach(function (m) { m.hidden = !(chapter && state.done[chapter.path]); });
  }

  /* chapter furniture: meta row, ask card, evolve card, previous and next */
  function buildChapterFurniture() {
    if (!chapter) return;
    var p = partOf(chapter.part);
    $$('.meta-row[data-auto]').forEach(function (m) {
      m.innerHTML = '<span>Chapter ' + chapter.part + '.' + chapter.n + '</span>' + (chapter.min ? '<span class="runtime">' + chapter.min + ' min</span>' : '') + '<span class="done-mark" hidden>&#10003; done</span>';
    });
    var end = $('[data-chapter-end]') || $('main');
    if (!end) return;
    if (!$('.ask-card')) {
      var ask = document.createElement('aside'); ask.className = 'ask-card';
      ask.innerHTML = '<div class="ask-ico" aria-hidden="true">' + ICON.ask + '</div><div><p class="ask-h">Stuck, or want to go further?</p><p>Copy a prompt about this chapter for your coding agent: ask what confused you, go deeper, map it onto your own agent, or run its code.</p><button class="btn ghost" type="button" data-ask>Copy a prompt for your agent</button></div>';
      end.appendChild(ask);
    }
    if (!$('.chapter-nav')) {
      var nav = document.createElement('nav'); nav.className = 'chapter-nav'; nav.setAttribute('aria-label', 'Chapters');
      var prev = CHAPTERS[chapterIndex - 1], next = CHAPTERS[chapterIndex + 1], h = '';
      if (prev) h += '<a class="prev" href="' + href(prev.path) + '"><span class="dir">&larr; Previous</span><b>' + esc(prev.title) + '</b><span class="rt">Part ' + prev.part + ' &middot; ' + prev.min + ' min</span></a>';
      else h += '<a class="prev" href="' + href('index.html') + '"><span class="dir">&larr; Previous</span><b>The course home</b></a>';
      if (next) h += '<a class="next" href="' + href(next.path) + '"><span class="dir">Next &rarr;</span><b>' + esc(next.title) + '</b><span class="rt">Part ' + next.part + ' &middot; ' + next.min + ' min</span></a>';
      else h += '<a class="next" href="' + href('index.html') + '"><span class="dir">Done &rarr;</span><b>Back to the course home</b></a>';
      nav.innerHTML = h;
      end.appendChild(nav);
    }
    $$('[data-evolve]').forEach(function (el) {
      if (el.children.length) return;
      var to = chapter.evolve || 0;
      el.classList.add('evolve');
      el.innerHTML = '<div data-tok="' + to + '" aria-hidden="true"></div><div><p class="eyebrow"><span class="dia"></span><span class="ev-label"></span></p><p>Next stage: <b>' + esc(STAGES[to].name) + '</b>.' + (el.getAttribute('data-evolve') ? ' ' + esc(el.getAttribute('data-evolve')) : '') + '</p></div>';
    });
  }

  /* ======================================================================
     Progress and evolution
     ====================================================================== */
  var puzzles = [];
  function chapterComplete() {
    if (!puzzles.length) return false;
    return puzzles.every(function (p) { return (state.steps[pid(p)] || 0) >= 1; });
  }
  function pid(p) { return pageKey + '#' + p.id; }
  function completeChapter(reason) {
    if (!chapter || state.done[chapter.path]) return;
    var before = currentStage();
    state.done[chapter.path] = Date.now(); save();
    var after = currentStage();
    renderProgress(after > before ? after : undefined);
    markDone();
    if (after > before) {
      var mini = $('#miniTok'); if (mini && !REDUCED) { mini.classList.remove('pulse'); void mini.offsetWidth; mini.classList.add('pulse'); }
      $$('[data-evolve]').forEach(function (c) { c.classList.add('just'); });
      announce('Tok evolved. You now see the model as ' + STAGES[after].name + '.');
      toast('Tok evolved: ' + STAGES[after].name + '.');
    }
  }
  function renderProgress(fresh) {
    $$('[data-tok="current"]').forEach(function (el) { drawTok(el, { fresh: fresh }); });
    $$('[data-tok-name]').forEach(function (el) { el.textContent = STAGES[currentStage()].name; });
    $$('[data-evolve]').forEach(function (el) {
      var lab = $('.ev-label', el); if (!lab) return;
      var done = chapter && state.done[chapter.path];
      el.classList.toggle('locked', !done);
      lab.textContent = done ? 'Tok evolved' : (puzzles.length > 1 ? 'Finish the predictions to evolve Tok' : puzzles.length ? 'Finish the prediction to evolve Tok' : 'Reach the end of the chapter to evolve Tok');
    });
  }

  /* ======================================================================
     Tok's voice: [data-tok-lines] buttons and the mini Tok in the top bar
     ====================================================================== */
  function wireTokVoices() {
    $$('[data-tok-lines]').forEach(function (b) {
      var lines; try { lines = JSON.parse(b.getAttribute('data-tok-lines')); } catch (e) { lines = [b.getAttribute('data-tok-lines')]; }
      var moods = (b.getAttribute('data-tok-moods') || 'happy,curious,,unsure,happy').split(',');
      var i = 0;
      b.addEventListener('click', function () {
        var out = b.getAttribute('data-tok-out') ? $(b.getAttribute('data-tok-out')) : $('.tok-line', b.parentElement);
        var span = $('[data-tok]', b) || b;
        var line = lines[i % lines.length];
        if (out) { out.textContent = line; out.classList.remove('pop'); void out.offsetWidth; out.classList.add('pop'); }
        else announce('Tok: ' + line);
        span.setAttribute('data-mood', moods[i % moods.length] || ''); drawTok(span); hop(span);
        i++;
      });
    });
    var mini = $('#miniTok');
    if (mini) mini.addEventListener('click', function () {
      var st = STAGES[currentStage()];
      toast('Tok, ' + st.name + ': "' + st.line + '"');
      hop($('[data-tok]', mini));
    });
  }

  /* ======================================================================
     Code: highlight, copy, collapse, run line
     ====================================================================== */
  var PY = /(#[^\n]*)|("""[\s\S]*?"""|'''[\s\S]*?'''|[rbfRBF]{0,2}"(?:\\.|[^"\\\n])*"|[rbfRBF]{0,2}'(?:\\.|[^'\\\n])*')|(@[\w.]+)|\b(\d+(?:\.\d+)?)\b|\b(def|class|return|if|else|elif|import|from|as|async|await|with|for|in|not|and|or|is|None|True|False|raise|try|except|finally|lambda|pass|yield|match|case|while|break|continue|global|nonlocal|assert|del)\b|\b([A-Z][A-Za-z0-9_]*)\b/g;
  var JS = /("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false|null)\b|(-?\b\d+(?:\.\d+)?\b)/g;
  function hiPy(src) {
    var out = '', last = 0, m; PY.lastIndex = 0;
    while ((m = PY.exec(src))) {
      out += esc(src.slice(last, m.index));
      var c = m[1] ? 'c' : m[2] ? 's' : m[3] ? 'd' : m[4] ? 'n' : m[5] ? 'k' : 't';
      out += '<span class="tk-' + c + '">' + esc(m[0]) + '</span>';
      last = PY.lastIndex;
    }
    return out + esc(src.slice(last));
  }
  function hiJson(src) {
    var out = '', last = 0, m; JS.lastIndex = 0;
    while ((m = JS.exec(src))) {
      out += esc(src.slice(last, m.index));
      if (m[1]) out += '<span class="' + (m[2] ? 'tk-t' : 'tk-s') + '">' + esc(m[1]) + '</span>' + (m[2] ? esc(m[2]) : '');
      else if (m[3]) out += '<span class="tk-k">' + m[3] + '</span>';
      else out += '<span class="tk-n">' + m[4] + '</span>';
      last = JS.lastIndex;
    }
    return out + esc(src.slice(last));
  }
  function hiSh(src) { return src.split('\n').map(function (l) { var i = l.indexOf('#'); return i < 0 ? esc(l) : esc(l.slice(0, i)) + '<span class="tk-c">' + esc(l.slice(i)) + '</span>'; }).join('\n'); }
  function highlight(pre) {
    if (pre.hasAttribute('data-hl')) return;
    var lang = pre.getAttribute('data-lang'), src = pre.textContent;
    if (lang === 'py') pre.innerHTML = hiPy(src);
    else if (lang === 'json') pre.innerHTML = hiJson(src);
    else if (lang === 'sh') pre.innerHTML = hiSh(src);
    pre.setAttribute('data-hl', '1');
    pre.setAttribute('tabindex', '0');
  }
  function wireCode(root) {
    $$('pre[data-lang]', root).forEach(highlight);
    $$('.code', root).forEach(function (c) {
      if (c.hasAttribute('data-wired')) return; c.setAttribute('data-wired', '1');
      var pre = $('pre', c); if (!pre) return;
      var head = $('.code-head', c);
      if (!head) { head = document.createElement('div'); head.className = 'code-head'; head.innerHTML = '<span class="file">' + esc(c.getAttribute('data-file') || '') + '</span>'; c.insertBefore(head, c.firstChild); }
      var b = $('.copy', c);
      if (!b && !c.hasAttribute('data-nocopy')) { b = document.createElement('button'); b.className = 'copy'; b.type = 'button'; b.textContent = 'Copy'; head.appendChild(b); }
      if (b) b.addEventListener('click', function () {
        copyText(pre.textContent, function (ok) { b.textContent = ok ? 'Copied' : 'Select and copy'; setTimeout(function () { b.textContent = 'Copy'; }, 1400); });
      });
      var src = c.getAttribute('data-src');
      if (src && REPO_URL && !$('.full', head)) {
        var a = document.createElement('a'); a.className = 'full'; a.href = REPO_URL + '/blob/main/' + src; a.textContent = 'Full file';
        a.target = '_blank'; a.rel = 'noopener'; head.insertBefore(a, $('.copy', head));
      }
      var run = c.getAttribute('data-run');
      if (run) {
        var r = document.createElement('div'); r.className = 'run';
        r.innerHTML = '<span>Run it:</span><code>' + esc(run) + '</code><button type="button">Copy command</button><a class="getcode-link" href="' + href('index.html#get-the-code') + '">from the course repo: get the code</a>';
        c.appendChild(r);
        $('button', r).addEventListener('click', function (e) { var t = e.currentTarget; copyText(run, function (ok) { t.textContent = ok ? 'Copied' : 'Select and copy'; setTimeout(function () { t.textContent = 'Copy command'; }, 1400); }); });
      }
      if (c.classList.contains('long')) {
        var n = pre.textContent.replace(/\n$/, '').split('\n').length;
        var limit = +(c.getAttribute('data-lines') || 22);
        if (n <= limit) { c.classList.remove('long'); return; }
        var more = document.createElement('div'); more.className = 'more';
        more.innerHTML = '<button type="button" aria-expanded="false">Show all ' + n + ' lines</button>';
        c.insertBefore(more, $('.run', c));
        $('button', more).addEventListener('click', function (e) {
          var open = c.classList.toggle('open');
          e.currentTarget.textContent = open ? 'Show less' : 'Show all ' + n + ' lines';
          e.currentTarget.setAttribute('aria-expanded', open ? 'true' : 'false');
        });
      }
    });
  }

  /* ======================================================================
     Result dots
     ====================================================================== */
  function drawTallies(root) {
    $$('.tally', root).forEach(function (el) {
      if (el.getAttribute('data-done')) return;
      var k = +el.dataset.k, n = +el.dataset.n, alt = +(el.dataset.alt || 0), maybe = +(el.dataset.maybe || 0);
      var dots = '';
      for (var i = 0; i < n; i++) dots += '<span class="dot' + (i < k ? ' on' : i < k + alt ? ' alt' : i < k + alt + maybe ? ' maybe' : '') + '"></span>';
      var cd = el.dataset.cd || (n <= 16 ? n : 20);
      var cm = el.dataset.cm || (n <= 8 ? n : n <= 10 ? 5 : n <= 16 ? 8 : 20);
      el.innerHTML = '<span class="lab">' + esc(el.dataset.label || '') + '</span><span class="dots" style="--cd:' + cd + ';--cm:' + cm + '" aria-hidden="true">' + dots + '</span><span class="num">' + esc(el.dataset.num || (k + ' of ' + n)) + '</span>';
      el.setAttribute('role', 'img');
      el.setAttribute('aria-label', (el.dataset.label || '') + ': ' + (el.dataset.num || (k + ' of ' + n)));
      el.setAttribute('data-done', '1');
    });
  }

  /* ======================================================================
     Tabs, switches, x-ray blocks, peeks
     ====================================================================== */
  function wireToggles() {
    $$('.tabs').forEach(function (tabs) {
      var scope = tabs.parentElement;
      $$('.tab[role="tab"]', tabs).forEach(function (tab) {
        tab.addEventListener('click', function () {
          $$('.tab[role="tab"]', tabs).forEach(function (t) { t.setAttribute('aria-selected', t === tab ? 'true' : 'false'); });
          if (tab.dataset.show) $$('[data-tabpane]', scope).forEach(function (p) { p.hidden = p.dataset.tabpane !== tab.dataset.show; });
        });
      });
    });
    // generic switch: buttons [data-show] and panes [data-pane] inside one [data-switch]
    $$('[data-switch]').forEach(function (sw) {
      var btns = $$('[data-show]', sw).filter(function (b) { return b.closest('[data-switch]') === sw; });
      function pick(v) {
        btns.forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.show === v ? 'true' : 'false'); });
        $$('[data-pane]', sw).forEach(function (p) { if (p.closest('[data-switch]') === sw) p.hidden = p.dataset.pane !== v; });
      }
      btns.forEach(function (b) { b.addEventListener('click', function () { pick(b.dataset.show); }); });
      var init = btns.filter(function (b) { return b.getAttribute('aria-pressed') === 'true'; })[0] || btns[0];
      if (init) pick(init.dataset.show);
    });
    $$('.blk').forEach(function (b) {
      var who = $('.who', b);
      var h = document.createElement('span'); h.className = 'hint'; h.textContent = b.getAttribute('data-hint') || 'tap to see whose voice';
      if (who) who.appendChild(h);
      if (!b.hasAttribute('aria-expanded')) b.setAttribute('aria-expanded', 'false');
      b.addEventListener('click', function () { var o = b.getAttribute('aria-expanded') !== 'true'; b.setAttribute('aria-expanded', o ? 'true' : 'false'); h.hidden = o; });
    });
    $$('.peek').forEach(function (pk) {
      var btn = $('.peek-btn', pk), bd = $('.peek-body', pk);
      if (!btn || !bd) return;
      var closedLabel = btn.textContent, openLabel = btn.getAttribute('data-open-label') || 'Hide';
      bd.hidden = true; pk.setAttribute('data-open', 'false'); btn.setAttribute('aria-expanded', 'false');
      btn.addEventListener('click', function () { setPeek(pk, pk.getAttribute('data-open') !== 'true'); });
      pk._labels = [closedLabel, openLabel];
    });
  }
  function setPeek(pk, open) {
    var btn = $('.peek-btn', pk), bd = $('.peek-body', pk);
    bd.hidden = !open; pk.setAttribute('data-open', open ? 'true' : 'false'); btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    btn.textContent = open ? pk._labels[1] : pk._labels[0];
    if (open) { drawTallies(bd); wireCode(bd); }
  }

  /* ======================================================================
     Predictions: commit, then a staged reveal
     ====================================================================== */
  var MISS = [
    'Good: a surprise is exactly where intuition grows.',
    'A reasonable guess. The model saw something different, which is why we ran it.',
    'Now you know something your instinct didn\'t. That\'s the point of guessing first.',
    'Most people we asked picked something else too. Keep going.'
  ];
  var missI = 0;
  function updateScore() {
    var answered = 0, right = 0;
    puzzles.forEach(function (p) {
      var pick = state.picks[pid(p)];
      if (pick && pick !== 'skip' && pick !== 'room' && p.dataset.answer && !p.dataset.unmeasured && (state.steps[pid(p)] || 0) >= 1) { answered++; if (pick === p.dataset.answer) right++; }
    });
    var s = $('#score'); if (!s) return;
    s.innerHTML = '<b>' + right + '</b> of <b>' + answered + '</b> right';
    s.hidden = answered === 0;
  }
  function stagesOf(p) { return $$('.stage', p).filter(function (s) { return s.closest('.puzzle') === p; }); }
  function paint(p) {
    var id = pid(p), pick = state.picks[id], step = state.steps[id] || 0, ans = p.dataset.answer || '';
    var talk = body.classList.contains('talk');
    var btn = $('.reveal', p), skip = $('.skip', p), stages = stagesOf(p), max = stages.length;
    $$('.choice', p).forEach(function (c) {
      c.setAttribute('aria-checked', c.dataset.choice === pick ? 'true' : 'false');
      c.disabled = step >= 1;
      var isAns = ans && step >= 1 && c.dataset.choice === ans;
      c.classList.toggle('is-answer', !!isAns);
      c.classList.toggle('is-other', !!(ans && step >= 1 && c.dataset.choice !== ans && c.dataset.choice !== pick));
      var tag = $('.tag', c);
      if (isAns && !tag) { tag = document.createElement('span'); tag.className = 'tag'; tag.textContent = p.dataset.answerTag || 'measured'; c.appendChild(tag); }
      if (!isAns && tag) tag.remove();
    });
    stages.forEach(function (st, i) { st.hidden = i >= step; });
    if (btn) {
      if (step >= max) btn.hidden = true;
      else {
        btn.hidden = false;
        btn.disabled = step === 0 && !pick && !talk;
        var next = stages[step], label = next && next.getAttribute('data-label');
        if (step === 0) btn.textContent = pick ? (p.dataset.revealLabel || 'Lock in and see the data') : talk ? 'Reveal for the room' : 'Pick an answer first';
        else btn.textContent = talk ? 'Reveal: ' + (label || (($('.eyebrow', next) || {}).textContent || 'next').toLowerCase()) : (label || 'Why, and the fix');
      }
    }
    if (skip) skip.hidden = step >= 1;
    var v = $('.verdict', p);
    if (v) {
      if (step >= 1) {
        v.hidden = false; v.className = 'verdict';
        if (!pick || pick === 'skip') v.textContent = 'You skipped this one.';
        else if (pick === 'room') v.textContent = 'Revealed for the room.';
        else if (!ans || p.dataset.unmeasured) v.textContent = 'You picked ' + pick.toUpperCase() + '. ' + (p.dataset.openNote || 'There\'s no single right answer here; read on.');
        else if (pick === ans) { v.textContent = 'You picked ' + pick.toUpperCase() + '. That matches the data.'; v.className = 'verdict right'; }
        else { if (!v.dataset.line) v.dataset.line = MISS[missI++ % MISS.length]; v.textContent = 'You picked ' + pick.toUpperCase() + '; the data says ' + ans.toUpperCase() + '. ' + v.dataset.line; }
      } else { v.hidden = true; delete v.dataset.line; }
    }
    var tk = $('.pz-tok', p);
    if (tk) {
      var real = pick && pick !== 'skip' && pick !== 'room';
      tk.setAttribute('data-mood', step >= 1 && real ? (!ans || p.dataset.unmeasured ? 'curious' : pick === ans ? 'happy' : 'unsure') : '');
      if (!tk.hasAttribute('data-tok')) tk.setAttribute('data-tok', 'current');
      tk.setAttribute('data-crop', tk.getAttribute('data-crop') || 'face');
      drawTok(tk);
    }
  }
  function revealInView(st, force) {
    if (!st) return;
    var r = st.getBoundingClientRect(), barH = body.classList.contains('talk') ? 90 : 0;
    if (force || r.top > window.innerHeight * 0.62 || r.top < 60) {
      window.scrollTo({ top: window.scrollY + r.top - 84, behavior: REDUCED ? 'auto' : 'smooth' });
    } else if (r.bottom > window.innerHeight - barH && r.height < window.innerHeight - barH - 100) {
      window.scrollBy({ top: r.bottom - (window.innerHeight - barH) + 20, behavior: REDUCED ? 'auto' : 'smooth' });
    }
  }
  function puzzleOpen(p) { return (state.steps[pid(p)] || 0) < stagesOf(p).length; }
  function advance(p, all) {
    var id = pid(p), step = state.steps[id] || 0, max = stagesOf(p).length;
    if (step === 0 && !state.picks[id]) { if (body.classList.contains('talk')) state.picks[id] = 'room'; else return; }
    if (step >= max) return;
    state.steps[id] = all ? max : step + 1;
    save(); paint(p);
    var shown = stagesOf(p)[step];
    if (shown) { drawTallies(shown); wireCode(shown); $$('[data-tok]', shown).forEach(function (el) { drawTok(el); }); }
    if (step === 0) {
      updateScore();
      hop($('.pz-tok', p));
      var pick = state.picks[id];
      if (p.dataset.answer) announce(pick === p.dataset.answer ? 'That matches the data.' : 'Revealed: the answer is ' + p.dataset.answer.toUpperCase() + '.');
      if (chapterComplete()) completeChapter('predictions');
    }
    revealInView(shown, body.classList.contains('talk'));
  }
  function wirePuzzles() {
    puzzles = $$('.puzzle');
    puzzles.forEach(function (p, i) {
      if (!p.id) p.id = 'predict-' + (i + 1);
      $$('.choice', p).forEach(function (c) {
        if (!c.hasAttribute('role')) c.setAttribute('role', 'radio');
        c.addEventListener('click', function () { if ((state.steps[pid(p)] || 0) >= 1) return; state.picks[pid(p)] = c.dataset.choice; save(); paint(p); });
      });
      var rb = $('.reveal', p);
      if (rb) rb.addEventListener('click', function () { var step = state.steps[pid(p)] || 0; advance(p, step >= 1 && !body.classList.contains('talk')); });
      var skip = $('.skip', p);
      if (skip) skip.addEventListener('click', function () { state.picks[pid(p)] = 'skip'; advance(p, true); });
      paint(p);
    });
  }

  /* ======================================================================
     Simulators: Course.registerSim(name, { init, controls, build })
     build(state) returns { msgs, beliefs, likely, likelyLabel, cache, hideKeys }
     ====================================================================== */
  var ORDER = ['wrong', 'incoherent', 'stale', 'unsure', 'unknown', 'known'];
  var TOKSAY = {
    known: ['happy', 'I think I\'ve got this.', ''],
    unknown: ['curious', 'Nobody has told me that yet.', 'Tok isn\'t confused. It just hasn\'t been told.'],
    unsure: ['unsure', 'Hmm. I can\'t know that from here.', 'Uncertain, and honest about it. That is a good state.'],
    stale: ['', 'Last time I looked, everything was fine.', 'It was right once. The world moved; the transcript didn\'t.'],
    wrong: ['happy', 'Easy. I know exactly what\'s going on.', 'Tok is confident, and wrong. Only you can see that from out here.'],
    incoherent: ['worried', 'Wait. Did I do that?', 'Its own past doesn\'t add up, so it starts doubting the rest.']
  };
  var SIMS = {};
  function mountSim(root) {
    var scn = SIMS[root.dataset.sim];
    if (!scn || root.hasAttribute('data-mounted')) return;
    root.setAttribute('data-mounted', '1');
    var st = Object.assign({}, scn.init), prev = {}, all = false, name = root.dataset.sim;
    var labels = scn.labels || {};
    var wrap = document.createElement('div');
    wrap.innerHTML = '<div class="sim-controls"></div><div class="sim-grid"><div><div class="pane-title"><span>' + esc(labels.side || 'What Tok believes') + '</span></div><div class="side" aria-live="polite"></div></div>' +
      '<div><div class="pane-title"><span>' + esc(labels.msgs || 'What changed in the request') + '</span><span class="cachebar"></span></div><div class="msgs"></div><button class="linkbtn msgtoggle" type="button">Show the whole request</button></div></div>';
    root.appendChild(wrap);
    var ctl = $('.sim-controls', root);
    scn.controls.forEach(function (c) {
      var g = document.createElement('div'); g.className = 'cg'; g.dataset.key = c.key;
      g.innerHTML = '<div class="cg-label" id="' + name + '-' + c.key + '">' + esc(c.label) + '</div><div class="opts" role="group" aria-labelledby="' + name + '-' + c.key + '"></div>';
      c.options.forEach(function (o) {
        var b = document.createElement('button'); b.type = 'button'; b.className = 'opt'; b.textContent = o.label; b.dataset.k = c.key; b.dataset.v = o.v;
        b.addEventListener('click', function () { st[c.key] = o.v; render(); });
        $('.opts', g).appendChild(b);
      });
      ctl.appendChild(g);
    });
    $('.msgtoggle', root).addEventListener('click', function (e) { all = !all; e.currentTarget.textContent = all ? 'Show only what changed' : 'Show the whole request'; render(); });
    function render() {
      $$('.opt', root).forEach(function (b) { b.setAttribute('aria-pressed', st[b.dataset.k] === b.dataset.v ? 'true' : 'false'); });
      var out = scn.build(st);
      (out.hideKeys || []).concat(out.hideModel ? ['model'] : []).forEach(function (k) { var g = $('.cg[data-key="' + k + '"]', root); if (g) g.hidden = true; });
      $$('.cg', root).forEach(function (g) { if ((out.hideKeys || []).concat(out.hideModel ? ['model'] : []).indexOf(g.dataset.key) < 0) g.hidden = false; });
      var firstChange = -1, pastLen = 0, cachedLen = 0, h = '';
      out.msgs.forEach(function (m, i) { if (firstChange < 0 && m.past && (m.changed || m.gone)) firstChange = i; });
      out.msgs.forEach(function (m, i) {
        var len = (m.text || m.html || '').length, cls = '', cache = '';
        if (m.past && !m.gone) { pastLen += len; if (firstChange < 0 || i < firstChange) { cachedLen += len; cache = 'cached'; } else { cls = ' miss'; cache = 'cache miss'; } }
        if (m.gone) cache = m.goneLabel || 'removed, not sent';
        if (m.isNew) cache = 'new';
        var show = all || m.changed || m.gone || m.isNew || m.role === 'gap';
        if (!show) return;
        if (m.role === 'gap') { h += '<div class="msg gap">' + esc(m.text) + '</div>'; return; }
        var bodyHtml = m.html !== undefined ? m.html : esc(m.text);
        var key = i + ':' + bodyHtml + m.gone;
        var fl = prev[i] !== undefined && prev[i] !== key ? ' flash' : '';
        prev[i] = key;
        h += '<div class="msg ' + m.role + (m.gone ? ' gone' : '') + (m.role === 'sys' ? ' ins' : '') + cls + fl + '"><span class="who">' + esc(m.who) + (out.cache || m.gone ? '<span class="cache">' + esc(cache) + '</span>' : '') + '</span><div class="body' + (m.mono ? ' mono' : '') + '">' + bodyHtml + '</div></div>';
      });
      if (!h) h = '<p class="small muted">Nothing changed yet. Pick an option above.</p>';
      $('.msgs', root).innerHTML = h;
      if (out.cache) { var pct = pastLen ? Math.round(cachedLen / pastLen * 100) : 100; $('.cachebar', root).innerHTML = '<span>prefix cached ' + pct + '%</span><span class="track"><span class="fill" style="width:' + pct + '%"></span></span>'; }
      else $('.cachebar', root).innerHTML = '';
      var beliefs = out.beliefs || [];
      var worst = ORDER.filter(function (s) { return beliefs.some(function (b) { return b.s === s; }); })[0] || 'known';
      var say = out.tok || TOKSAY[worst];
      var side = '<div class="simtok' + (worst === 'wrong' ? ' wrongcase' : '') + '"><div class="tk">' + tokSVG(out.tokStage !== undefined ? out.tokStage : say[3] !== undefined ? say[3] : scn.tokStage !== undefined ? scn.tokStage : Math.max(1, Math.min(currentStage(), 7)), { mood: say[0], crop: scn.tokCrop || 'face', lit: out.lit, listen: out.listen }) + '</div><div class="line">' + esc(say[1]) + (say[2] ? '<span class="sub">' + esc(say[2]) + '</span>' : '') + '</div></div>';
      side += '<ul class="beliefs">' + beliefs.map(function (b) {
        var sig = b.v + b.s, fl = prev['b' + b.k] !== undefined && prev['b' + b.k] !== sig ? ' flash' : '';
        prev['b' + b.k] = sig;
        return '<li class="bel' + fl + '"><div class="bq"><span>' + esc(b.k) + '</span><span class="pill ' + b.s + '">' + b.s + '</span></div><div class="bv">' + esc(b.v) + '</div>' + (b.why ? '<div class="why">' + esc(b.why) + '</div>' : '') + '</li>';
      }).join('') + '</ul>';
      if (out.likely) side += '<div class="likely"><div class="bq"><span>' + esc(out.likelyLabel || 'Likely outcome') + '</span><span>' + esc(out.likely.tag) + '</span></div><div class="bv">' + esc(out.likely.text) + '</div></div>';
      $('.side', root).innerHTML = side;
    }
    render();
  }
  function registerSim(name, def) {
    SIMS[name] = def;
    $$('[data-sim="' + name + '"]').forEach(mountSim);
  }

  /* ======================================================================
     Next-token toy: <div data-toy="next-token"><script type="application/json">{ frames }</script></div>
     ====================================================================== */
  function mountToys() {
    $$('[data-toy="next-token"]').forEach(function (root) {
      var cfg; try { cfg = JSON.parse(($('script[type="application/json"]', root) || {}).textContent || '{}'); } catch (e) { return; }
      var keys = Object.keys(cfg.frames || {}); if (!keys.length) return;
      var frame = keys[0], cont = '';
      var ui = document.createElement('div');
      ui.innerHTML = '<div class="opts" role="group" aria-label="Which document">' + keys.map(function (k) { return '<button class="opt" type="button" data-f="' + esc(k) + '">' + esc(cfg.frames[k].label || k) + '</button>'; }).join('') + '</div>' +
        '<div class="doc" aria-live="polite" style="margin-top:12px"></div><div class="dist"></div>' +
        '<div class="btn-row"><button class="btn" type="button" data-act="sample">Sample the next words</button><button class="btn ghost" type="button" data-act="reset">Reset</button></div>' +
        (cfg.note ? '<p class="source">' + esc(cfg.note) + '</p>' : '');
      root.appendChild(ui);
      function render() {
        var f = cfg.frames[frame];
        $$('.opt', ui).forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.f === frame ? 'true' : 'false'); });
        $('.doc', ui).innerHTML = '<span class="meta">' + esc(f.meta || '') + '</span>' + esc(f.line || '') + (cont ? '<span class="cont">' + esc(cont) + '</span>' : '<span class="caret"></span>');
        $('.dist', ui).innerHTML = f.dist.map(function (d) {
          return '<div class="row"><span class="tokname">' + esc(String(d[0]).replace(/^ /, '\u2423')) + '</span><span class="track"><span class="fill" style="width:' + d[1] + '%"></span></span><span class="pct">' + d[1] + '%</span></div>';
        }).join('');
      }
      $$('.opt', ui).forEach(function (b) { b.addEventListener('click', function () { frame = b.dataset.f; cont = ''; render(); }); });
      $('[data-act="sample"]', ui).addEventListener('click', function () {
        var f = cfg.frames[frame], r = Math.random() * 100, acc = 0, pick = f.dist[0];
        for (var i = 0; i < f.dist.length; i++) { acc += f.dist[i][1]; if (r < acc) { pick = f.dist[i]; break; } }
        cont = pick[2] || pick[0]; render();
      });
      $('[data-act="reset"]', ui).addEventListener('click', function () { cont = ''; render(); });
      render();
    });
  }

  /* ======================================================================
     Ask your agent
     ====================================================================== */
  function askPrompt(followup, note) {
    var t = askTarget, kind = chapter ? 'chapter' : 'reference page';
    var online = SITE_URL ? ' (' + SITE_URL.replace(/\/$/, '') + '/' + t.path.replace(/\.html$/, '') + ')' : '';
    var repo = REPO_URL ? ' The course repo is ' + REPO_URL + ': if you are not already in a clone of it, clone it first (or read its files on GitHub), since the code and notes live there.' : '';
    var head = 'I\'m reading the ' + kind + ' "' + t.title + '"' + online + ' of the course "Harness engineering with Pydantic AI".' + repo + ' Read AGENTS.md first, then ' + t.path + ', then ';
    note = (note || '').trim();
    var mine = note ? '\n\nIn my own words: ' + note : '';
    if (followup) return head + 'help me with this: ' + followup + mine;
    if (note) return head + 'help me with what I describe below. Don\'t change my code unless I ask.' + mine;
    return head + 'help me go deeper on it. Start by asking me whether I want to (1) go deeper on a concept, (2) map it onto my own agent\'s code, or (3) run its code from code/. Don\'t change my code unless I ask.';
  }
  function lenBucket(n) { return n === 0 ? '0' : n < 40 ? '1-39' : n < 120 ? '40-119' : n < 400 ? '120-399' : '400+'; }
  function openAsk(e) {
    if (!askTarget) return;
    var dlg = $('#askDialog');
    if (!dlg) {
      dlg = document.createElement('dialog'); dlg.id = 'askDialog'; dlg.className = 'ask-dialog'; dlg.setAttribute('aria-labelledby', 'askTitle');
      var extra = $$('.ask-followups li').map(function (li) { return li.textContent.trim(); });
      var ups = extra.length ? extra : ((chapter && chapter.ask) || []);
      dlg.innerHTML = '<div class="dlg"><h2 id="askTitle">Ask your agent about this ' + (chapter ? 'chapter' : 'page') + '</h2>' +
        '<p class="hint">Paste the prompt into Claude Code, Codex, Cursor or any coding agent. It links this page and the course repo, so it works without a clone; the agent reads <code>AGENTS.md</code>, which tells it how to help and not to rewrite your code unasked.</p>' +
        '<label class="ask-note-label" for="askNote">What\'s confusing, or what do you want to do? <span class="muted">Optional</span></label><textarea id="askNote" rows="2" placeholder="In your own words; it goes into the prompt"></textarea>' +
        '<p class="ask-note-label">Pick a starting point</p>' +
        '<div class="chips" role="group" aria-label="Pick a starting point"><button class="chip" type="button" data-up="" data-up-i="0" aria-pressed="true">Let it ask me what I want: go deeper, map it to my agent, or run the code</button>' +
        ups.map(function (u, i) { return '<button class="chip" type="button" data-up="' + esc(u) + '" data-up-i="' + (i + 1) + '" aria-pressed="false">' + esc(u) + '</button>'; }).join('') + '</div>' +
        '<label class="ask-note-label" for="askText">The prompt</label><textarea id="askText" readonly></textarea>' +
        '<div class="dlg-actions"><span class="hint" id="askStatus" aria-live="polite"></span><button class="btn ghost" type="button" data-close>Close</button><button class="btn" type="button" id="askCopy">Copy prompt</button></div></div>';
      body.appendChild(dlg);
      var cur = '';
      function render() { $('#askText', dlg).value = askPrompt(cur, $('#askNote', dlg).value); }
      $('#askNote', dlg).addEventListener('input', render);
      function setUp(u) { cur = u; render(); $$('.chip', dlg).forEach(function (c) { c.setAttribute('aria-pressed', c.getAttribute('data-up') === u ? 'true' : 'false'); }); }
      $$('.chip', dlg).forEach(function (c) { c.addEventListener('click', function () { setUp(c.getAttribute('data-up')); doCopy(); }); });
      function doCopy() {
        var pressed = $('.chip[aria-pressed="true"]', dlg), n = $('#askNote', dlg).value.trim().length;
        dlg.dataset.copied = '1';
        // for telemetry: which starting point and whether the box was used, never the text
        document.dispatchEvent(new CustomEvent('course:ask', { detail: { action: 'copy', followup: pressed ? +pressed.getAttribute('data-up-i') : 0, has_text: n > 0, text_len: lenBucket(n) } }));
        copyText($('#askText', dlg).value, function (ok) { $('#askStatus', dlg).textContent = ok ? 'Copied. Paste it into your agent.' : 'Select the text and copy it.'; if (!ok) $('#askText', dlg).select(); }); }
      $('#askCopy', dlg).addEventListener('click', doCopy);
      $('[data-close]', dlg).addEventListener('click', function () { dlg.close ? dlg.close() : dlg.removeAttribute('open'); });
      dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
      dlg.addEventListener('close', function () {
        if (!dlg.dataset.copied) { var n = $('#askNote', dlg).value.trim().length; document.dispatchEvent(new CustomEvent('course:ask', { detail: { action: 'close_without_copy', has_text: n > 0, text_len: lenBucket(n) } })); }
      });
      dlg._set = setUp;
    }
    dlg._set('');
    dlg.dataset.copied = '';
    $('#askStatus', dlg).textContent = '';
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
    $('#askNote', dlg).focus();
  }

  /* ======================================================================
     Talk mode
     ====================================================================== */
  var STOP_SEL = '.chapter-head, .home-hero, .chapter-body > section, .chapter-body > .wrap > section, main > section, main > .wrap > section, section.chap, .puzzle, .sim, .play, [data-stop]';
  var stops = [], cur = -1, navigating = 0;
  function collectStops() {
    stops = $$(STOP_SEL).filter(function (s) { return s.offsetParent !== null || s === document.activeElement; });
  }
  function nearestStop() {
    var line = 90, best = 0;
    stops.forEach(function (s, i) { if (s.getBoundingClientRect().top <= line + 4) best = i; });
    return best;
  }
  function stopOf(el) { for (var i = stops.length - 1; i >= 0; i--) if (stops[i] === el || stops[i].contains(el)) { if (stops[i] === el) return i; } return -1; }
  function goStop(i, instant) {
    if (!stops.length) return;
    i = Math.max(0, Math.min(stops.length - 1, i));
    cur = i;
    $$('.stop-current').forEach(function (s) { s.classList.remove('stop-current'); });
    var s = stops[i];
    if (s.matches('.puzzle, .sim, .play, [data-stop]')) s.classList.add('stop-current');
    navigating = Date.now();
    var y = window.scrollY + s.getBoundingClientRect().top - 72;
    window.scrollTo({ top: Math.max(0, y), behavior: REDUCED || instant ? 'auto' : 'smooth' });
    updateTalkUI();
  }
  function updateTalkUI() {
    var pos = $('#talkPos'); if (pos) pos.textContent = stops.length ? (cur + 1) + ' / ' + stops.length : '';
    var t = revealTarget();
    var sb = $('#stepBtn');
    if (sb) { sb.disabled = !t; sb.textContent = t && t.classList.contains('peek') ? 'Show' : 'Reveal'; sb.title = t ? 'Reveal the next step (R or space)' : 'Nothing to reveal on this stop'; }
    var nb = $('#nextBtn');
    if (nb) nb.innerHTML = cur >= stops.length - 1 && chapter && CHAPTERS[chapterIndex + 1] ? '<span class="btn-label">Next chapter </span>&rarr;' : '<span class="btn-label">Next </span>&rarr;';
    renderNotes();
  }
  function revealTarget() {
    var s = stops[cur]; if (!s) return null;
    var cands = s.matches('.puzzle, .peek') ? [s] : [];
    cands = cands.concat($$('.puzzle, .peek', s));
    for (var i = 0; i < cands.length; i++) {
      var c = cands[i];
      if (c.classList.contains('puzzle') && puzzleOpen(c)) return c;
      if (c.classList.contains('peek') && c.getAttribute('data-open') !== 'true') return c;
    }
    return null;
  }
  function revealStep() {
    var t = revealTarget();
    if (!t) return false;
    if (t.classList.contains('puzzle')) advance(t); else setPeek(t, true);
    setTimeout(updateTalkUI, 50);
    return true;
  }
  function nextChapterHref(dir) {
    var c = chapter ? CHAPTERS[chapterIndex + dir] : null;
    if (!c && PAGE === 'home' && dir > 0) c = CHAPTERS[0];
    return c ? href(c.path) + '?talk' + (dir < 0 ? '#end' : '') : null;
  }
  function step(dir) {
    collectStops();
    if (cur < 0 || Date.now() - navigating > 1500) cur = nearestStop();
    var n = cur + dir;
    if (n >= stops.length) { var h = nextChapterHref(1); if (h) location.href = h; return; }
    if (n < 0) { var hp = nextChapterHref(-1); if (hp) location.href = hp; return; }
    goStop(n);
  }
  function renderNotes() {
    var panel = $('#notesPanel'); if (!panel) return;
    var s = stops[cur], html = '';
    if (s) {
      var own = $$('.notes', s).filter(function (n) {
        var owner = null; for (var i = stops.length - 1; i >= 0; i--) { if (stops[i].contains(n)) { owner = stops[i]; break; } }
        return owner === s;
      });
      html = own.map(function (n) { return n.innerHTML; }).join('');
    }
    panel.innerHTML = '<p class="eyebrow"><span class="dia"></span>Speaker notes</p>' + (html || '<p class="muted">No notes for this stop.</p>');
  }
  function setTalk(on, opts) {
    opts = opts || {};
    body.classList.toggle('talk', on);
    body.classList.toggle('show-notes', on && !!state.notes);
    state.talk = on; save();
    if (typeof applyTheme === 'function') applyTheme();
    var tb = $('#talkBtn'); if (tb) tb.setAttribute('aria-pressed', on ? 'true' : 'false');
    puzzles.forEach(paint);
    collectStops();
    if (on) {
      if (opts.end) goStop(stops.length - 1, true);
      else if (opts.top) goStop(0, true);
      else goStop(nearestStop(), true);
      if (!opts.quiet) toast('Talk mode. Arrows move, R reveals, N shows notes, ? for keys.');
    } else {
      $$('.stop-current').forEach(function (s) { s.classList.remove('stop-current'); });
    }
  }
  function setNotes(on) {
    state.notes = on; save();
    body.classList.toggle('show-notes', on && body.classList.contains('talk'));
    var nb = $('#notesBtn'); if (nb) nb.setAttribute('aria-pressed', on ? 'true' : 'false');
    renderNotes();
  }

  /* ======================================================================
     Theme
     ====================================================================== */
  var THEMES = ['auto', 'light', 'dark'], NAMES = { auto: 'Auto', light: 'Light', dark: 'Dark' };
  function applyTheme() {
    // talk mode presents in light unless the presenter picked a theme explicitly: the dark palette is hard to read on a projector
    var t = body.classList.contains('talk') && state.theme === 'auto' ? 'light' : state.theme;
    if (t === 'auto') document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', t);
    var l = $('#themeLabel'); if (l) l.textContent = NAMES[state.theme] || 'Auto';
    var b = $('#themeBtn'); if (b) b.title = 'Theme: ' + (NAMES[state.theme] || 'Auto');
  }

  /* ======================================================================
     Home page: parts, chapters, runtimes, from the manifest
     ====================================================================== */
  function renderHome() {
    $$('[data-home-parts]').forEach(function (el) {
      el.innerHTML = PARTS.map(function (p) {
        var cs = CHAPTERS.filter(function (c) { return c.part === p.n; });
        var total = cs.reduce(function (a, c) { return a + c.min; }, 0);
        return '<article class="part-card" id="part-' + p.n + '"><span class="skilltag">' + esc(p.skill) + '</span><h3>Part ' + p.n + ': ' + esc(p.title) + '</h3><p class="pdesc">' + esc(p.desc) + '</p>' +
          '<ol class="toc">' + cs.map(function (c) {
            return '<li><a href="' + href(c.path) + '" data-chapter="' + c.path + '"><span class="n">' + p.n + '.' + c.n + '</span><span>' + esc(c.title) + '</span><span class="rt">' + c.min + ' min</span></a></li>';
          }).join('') + '</ol></article>';
      }).join('') + '<div class="ref-row" id="reference"><span class="skilltag">Reference</span>' + refHTML() + '</div>';
    });
    $$('[data-total-min]').forEach(function (el) { el.textContent = CHAPTERS.reduce(function (a, c) { return a + c.min; }, 0); });
    $$('[data-continue]').forEach(function (a) {
      var next = CHAPTERS.filter(function (c) { return !state.done[c.path]; })[0];
      var any = CHAPTERS.some(function (c) { return state.done[c.path]; });
      if (any && next) { a.href = href(next.path); a.textContent = 'Continue: ' + next.title; }
    });
  }
  function repoLink() {
    if (!REPO_URL) return;
    $$('[data-repo-link]').forEach(function (el) {
      $$('[data-repo-href]', el).forEach(function (a) { a.href = REPO_URL; });
      el.hidden = false;
    });
  }

  /* ======================================================================
     Boot
     ====================================================================== */
  buildShell();
  if (PAGE === 'chapter') buildChapterFurniture();
  if (PAGE === 'home') renderHome();
  repoLink();
  wireCode(document);
  drawTallies(document);
  wireToggles();
  wirePuzzles();
  mountToys();
  $$('[data-sim]').forEach(mountSim);
  $$('[data-tok]').forEach(function (el) { drawTok(el); });
  wireTokVoices();
  renderProgress();
  markDone();
  updateScore();
  applyTheme();

  // buttons in the shell
  function on(id, ev, fn) { var el = typeof id === 'string' ? $(id) : id; if (el) el.addEventListener(ev, fn); }
  on('#themeBtn', 'click', function () { state.theme = THEMES[(THEMES.indexOf(state.theme) + 1) % 3]; save(); applyTheme(); });
  on('#talkBtn', 'click', function () { setTalk(!body.classList.contains('talk')); });
  on('#talkExit', 'click', function () { setTalk(false); });
  on('#prevBtn', 'click', function () { step(-1); });
  on('#nextBtn', 'click', function () { step(1); });
  on('#stepBtn', 'click', function () { if (!revealStep()) step(1); });
  on('#notesBtn', 'click', function () { setNotes(!state.notes); });
  if (askTarget && !$('#askFab')) {
    // 'Ask your agent', always reachable: fixed bottom-right; steps aside where it would cover the page's end matter
    var fab = document.createElement('button'); fab.type = 'button'; fab.id = 'askFab'; fab.className = 'ask-fab'; fab.setAttribute('data-ask-sticky', '');
    fab.setAttribute('aria-label', 'Ask your coding agent about this page');
    fab.innerHTML = ICON.ask + '<span class="fab-label">Ask your agent</span>';
    fab.addEventListener('click', openAsk);
    body.appendChild(fab);
    if ('IntersectionObserver' in window) {
      var near = new Set();
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) near.add(e.target); else near.delete(e.target); });
        fab.classList.toggle('away', near.size > 0);
      });
      var watch = function () { $$('.ask-card, .chapter-nav, body > footer, footer.site, .lf-note, [data-lf-note]').forEach(function (el) { if (!el._fabWatched) { el._fabWatched = 1; io.observe(el); } }); };
      watch(); setTimeout(watch, 1500); setTimeout(watch, 4000);
    }
    // where the page column runs under the button (phones, narrow windows), tuck it away while scrolling down and bring it back on any scroll up
    var lastY = window.scrollY;
    window.addEventListener('scroll', function () {
      var y = window.scrollY, col = $('main .wrap') || $('main'), fr = fab.getBoundingClientRect();
      var overlaps = col && col.getBoundingClientRect().right > fr.left - 8;
      if (!overlaps || y < 120) fab.classList.remove('tucked');
      else if (y > lastY + 6) fab.classList.add('tucked');
      else if (y < lastY - 6) fab.classList.remove('tucked');
      if (Math.abs(y - lastY) > 6) lastY = y;
      clearTimeout(fab._rest); fab._rest = setTimeout(checkUnder, 120);
    }, { passive: true });
    // never sit on top of a control: when the scroll comes to rest with a button, link or field under it, step aside
    var CTRL = 'button, a[href], input, textarea, select, summary, [role="button"], [tabindex]:not([tabindex="-1"])';
    function checkUnder() {
      var r = fab.getBoundingClientRect(), m = 6, hit = false;
      $$(CTRL).some(function (el) {
        if (el === fab || fab.contains(el) || el.closest('dialog:not([open]), [hidden]')) return false;
        var q = el.getBoundingClientRect();
        if (!q.width || !q.height || q.bottom < r.top - m || q.top > r.bottom + m || q.right < r.left - m || q.left > r.right + m) return false;
        return (hit = !el.checkVisibility || el.checkVisibility({ visibilityProperty: true, opacityProperty: true }));
      });
      fab.classList.toggle('blocked', hit);
    }
    window.addEventListener('resize', checkUnder); setTimeout(checkUnder, 300);
  }
  $$('[data-ask]').forEach(function (b) { b.addEventListener('click', openAsk); });
  $$('[data-talk-start]').forEach(function (b) { b.addEventListener('click', function () { setTalk(true); }); });
  var contents = $('#contents');
  function openContents(o) { contents.hidden = !o; if (o) { var c = $('[aria-current="page"]', contents) || $('a', contents); if (c) c.focus(); } else { var cb = $('#contentsBtn'); if (cb) cb.focus(); } }
  on('#contentsBtn', 'click', function () { openContents(true); });
  on(contents, 'click', function (e) { if (e.target === contents || e.target.closest('[data-close]')) openContents(false); });
  on('#resetAll', 'click', function () {
    if (!window.confirm('Reset your predictions and progress on every chapter?')) return;
    state.picks = {}; state.steps = {}; state.done = {}; save(); location.reload();
  });
  var help = $('#talkHelp');
  on(help, 'click', function (e) { if (e.target === help || e.target.closest('[data-close]')) help.hidden = true; });

  document.addEventListener('keydown', function (e) {
    if (e.target.closest && e.target.closest('input, textarea, select, [contenteditable="true"], dialog')) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (k === 'Escape') { if (!help.hidden) { help.hidden = true; return; } if (!contents.hidden) { openContents(false); return; } if (body.classList.contains('talk')) setTalk(false); return; }
    if (k === 'p') { setTalk(!body.classList.contains('talk')); return; }
    if (!body.classList.contains('talk')) return;
    if (k === '?') { help.hidden = !help.hidden; return; }
    if (k === 'r' || k === ' ') { e.preventDefault(); if (!revealStep() && k === ' ') step(1); }
    else if (k === 'ArrowRight' || k === 'ArrowDown' || k === 'PageDown') { e.preventDefault(); step(1); }
    else if (k === 'ArrowLeft' || k === 'ArrowUp' || k === 'PageUp') { e.preventDefault(); step(-1); }
    else if (k === 'n') { setNotes(!state.notes); }
    else if (k === 'Home') { e.preventDefault(); collectStops(); goStop(0); }
    else if (k === 'End') { e.preventDefault(); collectStops(); goStop(stops.length - 1); }
    else if (/^[1-4]$/.test(k)) {
      collectStops(); if (cur < 0) cur = nearestStop();
      var p = revealTarget(); if (!p || !p.classList.contains('puzzle')) p = stops[cur] && (stops[cur].matches('.puzzle') ? stops[cur] : $('.puzzle', stops[cur]));
      if (p) { var b = $('.choice[data-choice="' + 'abcd'[+k - 1] + '"]', p); if (b && !b.disabled) b.click(); }
    }
  });
  window.addEventListener('scroll', function () {
    if (body.classList.contains('talk') && Date.now() - navigating > 900) {
      var n = nearestStop(); if (n !== cur) { cur = n; $$('.stop-current').forEach(function (s) { s.classList.remove('stop-current'); }); updateTalkUI(); }
    }
  }, { passive: true });

  // progress bar and chapter end
  var bar = $('#progress');
  function onScroll() {
    var h = document.documentElement.scrollHeight - window.innerHeight;
    if (bar) bar.style.width = (h > 0 ? Math.min(100, window.scrollY / h * 100) : 0) + '%';
  }
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
  if ('IntersectionObserver' in window && chapter && PAGE === 'chapter') {
    var endEl = $('.chapter-nav');
    if (endEl) {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (en) {
          if (!en.isIntersecting) return;
          // a chapter with predictions completes when they're revealed; one without, when you reach its end
          if (!puzzles.length) completeChapter('end');
          io.disconnect();
        });
      });
      io.observe(endEl);
    }
  }

  // start in talk mode when asked (?talk) or when it was on in the last chapter
  var wantTalk = /[?&](talk|present)\b/.test(location.search) || (state.talk && PAGE !== 'workshop');
  if (wantTalk) setTalk(true, { end: location.hash === '#end', top: location.hash !== '#end' && /[?&]talk\b/.test(location.search), quiet: !!state.talk });

  window.Course = {
    chapters: CHAPTERS, parts: PARTS, reference: REFERENCE, stages: STAGES, state: state, save: save,
    tokSVG: tokSVG, drawTok: drawTok, registerSim: registerSim, setTalk: setTalk, toast: toast, copyText: copyText,
    highlight: { py: hiPy, json: hiJson, sh: hiSh },
    refresh: function (root) { root = root || document; wireCode(root); drawTallies(root); $$('[data-tok]', root).forEach(function (el) { drawTok(el); }); },
    complete: completeChapter
  };
})();
