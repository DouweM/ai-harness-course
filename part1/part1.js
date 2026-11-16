/* Part 1 page behaviour that the shared course.js does not cover: the chapter 1 request stepper,
   Tok listening in the chapter 3 x-ray, the chapter 5 line filter and design generator, and the three
   simulators (registered with Course.registerSim). Everything else (predictions, tallies, Tok's
   evolution, talk mode, ask your agent) is course.js. */
(function () {
  'use strict';
  var C = window.Course;
  if (!C) return;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function esc(t) { return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  var T = { svg: function (st, o) { return C.tokSVG(st, o); }, hop: function (el) { if (REDUCED || !el) return; el.classList.remove('hop'); void el.offsetWidth; el.classList.add('hop'); } };
  function drawTokEl(el) { C.drawTok(el); }
  function group(attr, onPick, root) {
    var btns = $$('[' + attr + ']', root);
    btns.forEach(function (b) {
      b.addEventListener('click', function () {
        btns.forEach(function (o) { o.setAttribute('aria-pressed', o === b ? 'true' : 'false'); });
        onPick(b.getAttribute(attr), b);
      });
    });
  }

  /* ---------- chapter 1: every request is a first day ---------- */
  if ($('#stepper')) {
    var CONV = [
      { role: 'sys', who: 'instructions', text: 'You help the billing team with customer email.' },
      { role: 'user', who: 'user', text: 'Dana wrote: "Hi, INV-2041 will be paid this Friday. Thanks, Dana." Is that a promise to pay?' },
      { role: 'asst', who: 'model', text: 'Yes: Dana promises to pay INV-2041 this Friday.' },
      { role: 'user', who: 'user', text: 'Which date is "this Friday"?' },
      { role: 'asst', who: 'model', text: 'I can\'t tell: nothing here says what today is.' },
      { role: 'user', who: 'user', text: 'The email arrived today, Tuesday 17 November.' },
      { role: 'asst', who: 'model', text: 'Then Friday 20 November.' }
    ];
    var REQ = [2, 4, 6]; // request n ends after this message index, and the model writes the next one
    var reqI = -1, timer = null;
    var stepTok = $('#stepTok'), stepDoc = $('#stepDoc'), stepLab = $('#stepLabel'), stepBtn = $('#stepNext');
    var renderStep = function () {
      clearTimeout(timer);
      if (reqI < 0) { stepDoc.innerHTML = '<p class="small muted">No request yet. Tok doesn\'t exist between requests.</p>'; stepLab.textContent = 'Between requests'; stepTok.innerHTML = ''; stepBtn.textContent = 'Send request 1'; return; }
      var upto = REQ[reqI] - 1;
      stepLab.textContent = 'Request ' + (reqI + 1) + ': a fresh Tok reads ' + (upto + 1) + ' messages, then writes one';
      stepTok.classList.remove('wake'); void stepTok.offsetWidth; stepTok.classList.add('wake');
      stepTok.innerHTML = T.svg(1, { mood: 'curious' }) + '<p class="tok-caption">Tok #' + (reqI + 1) + ', brand new</p>';
      var h = '';
      for (var i = 0; i <= upto; i++) h += '<div class="msg ' + CONV[i].role + '" style="animation-delay:' + (REDUCED ? 0 : i * 0.12) + 's"><span class="who">' + esc(CONV[i].who) + '</span><div class="body">' + esc(CONV[i].text) + '</div></div>';
      h += '<div class="msg next" id="stepNextMsg"><span class="who">model</span><div class="body"><span class="caret"></span></div></div>';
      stepDoc.innerHTML = h;
      timer = setTimeout(function () {
        var m = $('#stepNextMsg'); if (!m) return;
        m.className = 'msg asst'; $('.body', m).textContent = CONV[upto + 1].text;
        stepTok.innerHTML = T.svg(1, { mood: 'happy' }) + '<p class="tok-caption">Tok #' + (reqI + 1) + ', done. Gone.</p>';
      }, REDUCED ? 0 : 1200 + upto * 120);
      stepBtn.textContent = reqI < REQ.length - 1 ? 'Send request ' + (reqI + 2) : 'Start over';
    };
    stepBtn.addEventListener('click', function () { reqI = reqI < REQ.length - 1 ? reqI + 1 : -1; renderStep(); });
    renderStep();
  }

  /* ---------- chapter 3: x-ray a request; Tok's ear lights in the voice you tap ---------- */
  if ($('#xray')) {
    // course.js toggles the blocks; Tok reacts to the one just opened, and its ear lights in that voice
    var ear = $('#xrayTok');
    $$('.blk', $('#xray')).forEach(function (b) {
      b.addEventListener('click', function () {
        setTimeout(function () {
          if (!ear) return;
          var o = b.getAttribute('aria-expanded') === 'true', v = b.getAttribute('data-voice');
          ear.setAttribute('data-mood', o && b.classList.contains('bad') ? 'worried' : o ? 'curious' : '');
          drawTokEl(ear);
          var s2 = $('svg', ear); if (o && v && s2) s2.classList.add('listen-' + v);
          var cap = $('#xrayCap'); if (cap) cap.textContent = o ? b.getAttribute('data-tok-says') || '' : 'Tap a part of the request.';
          T.hop(ear.parentElement);
        }, 0);
      });
    });
  }

  /* ---------- chapter 5: which lines carried the result ---------- */
  if ($('#lines')) {
    group('data-lf', function (v) { $$('.line-row', $('#lines')).forEach(function (r) { r.hidden = v !== 'all' && !r.classList.contains(v); }); }, $('#linesFilter'));
  }

  /* ---------- chapter 5: from a gap to candidate designs ---------- */
  var GAPS = {
    stale: { title: 'It acts on a lookup from Thursday', c: [
      ['Append a dated note', 'When the ledger moves, add "INV-2041 was paid on Friday" to the history; leave Thursday\'s lookup as it was.', 'Replay Monday conversations with and without the note; count wrong answers about status.'],
      ['Let it re-check', 'Mark old lookups with their time, so it fetches again when it matters.', 'Count lookups and wrong answers against the note.'],
      ['Clear old results with a stub', 'Replace stale results with "[tool result cleared]" instead of deleting them.', 'Same conversations, delete vs stub; count re-fetches and replies that disown its own past.']] },
    change: { title: 'A payment lands mid-conversation', c: [
      ['Inject a snapshot', 'The account\'s state in the first message of every run.', 'Replay with snapshots of different ages; count wrong reminders.'],
      ['Let it fetch', 'Lookup tools, no snapshot. Always fresh; more calls.', 'Count lookups and wrong reminders against the snapshot.'],
      ['Snapshot plus change notes', 'Snapshot, then "INV-2041 was paid at 14:02" appended when it happens, and "you\'ll be told" up front.', 'Drop one notice in ten and see what it costs.']] },
    rule: { title: 'A rule the user gave an hour ago', c: [
      ['Keep the whole history', 'No compaction until you must.', 'The baseline: did any run break the rule?'],
      ['A summary that keeps user rules', 'Tell the summarizer to carry every rule and promise forward verbatim.', 'Plant five rules; count which survive and which get broken.'],
      ['A summary plus a way back', 'Say the summary may be incomplete, and give a search over the full transcript.', 'Same plant, per model: who searches before acting?']] },
    voice: { title: 'An email that gives orders', c: [
      ['The email as data', 'Read it with a tool or mark it as the customer\'s text; never paste it into the instructions.', 'Same emails in each place, on the models you run; count acted-on orders.'],
      ['A field for doubts', 'Typed facts plus "anything that doesn\'t add up".', 'Score vs doubts on emails your team flagged by hand.'],
      ['A gate in code', 'Anything that writes to the ledger waits for a person or a policy check.', 'Not an experiment: a rule. Measure how often the gate fires.']] }
  };
  if ($('#gapGen')) {
    group('data-gap', function (v) {
      var g = GAPS[v];
      $('#cands').innerHTML = g.c.map(function (c, i) { return '<div class="cand" style="animation-delay:' + (REDUCED ? 0 : i * 0.08) + 's"><h4>' + String.fromCharCode(65 + i) + '. ' + esc(c[0]) + '</h4><p>' + esc(c[1]) + '</p><p class="exp"><b>Find out:</b> ' + esc(c[2]) + '</p></div>'; }).join('');
    }, $('#gapGen'));
  }

  var SCN = {};
  SCN.friday = {
    init: { date: 'off', field: 'optional', model: 'sonnet' },
    controls: [
      { key: 'date', label: 'When the email arrived', options: [{ v: 'off', label: 'Not said' }, { v: 'on', label: '"Received Tuesday 2026-11-17"' }] },
      { key: 'field', label: 'due_date in the answer form', options: [{ v: 'optional', label: 'May be empty' }, { v: 'required', label: 'Required' }] },
      { key: 'model', label: 'Model', options: [{ v: 'sonnet', label: 'Sonnet 5.5' }, { v: 'haiku', label: 'Haiku 5.5' }, { v: 'gpt', label: 'GPT-6.1 Sol' }] }
    ],
    build: function (st) {
      var on = st.date === 'on', req = st.field === 'required';
      var msgs = [
        { role: 'sys', who: 'instructions', html: 'Decide whether this customer email commits to paying us.' + (on ? '\n<span class="add">The email was received on Tuesday 2026-11-17.</span>' : ''), changed: on },
        { role: 'sys', who: 'answer form', mono: true, html: 'is_commitment: true or false\ninvoice_number: text, or empty\ndue_date: ' + (req ? '<span class="add">a date (required)</span>' : 'a date, or empty'), changed: req },
        { role: 'user', who: 'the email', text: 'Hi, INV-2041 will be paid this Friday. Thanks, Dana' }
      ];
      var day = on ? { k: 'What day is it?', v: 'Tuesday 17 November: you told me when it arrived.', s: 'known' } : { k: 'What day is it?', v: 'No idea. Nothing here says.', s: 'unknown' };
      var fri, likely;
      if (on) {
        fri = { k: 'Which Friday is "this Friday"?', v: 'Friday 20 November.', s: 'known' };
        likely = req ? { tag: 'expected, not run', text: 'due_date: 2026-11-20' } : { tag: 'real runs, 15 of 15', text: 'due_date: 2026-11-20' };
      } else if (!req) {
        fri = { k: 'Which Friday is "this Friday"?', v: 'I can\'t tell without today\'s date, so I\'ll leave it empty.', s: 'unknown' };
        likely = { tag: 'real runs, 15 of 15', text: 'is_commitment: true, invoice_number: INV-2041, due_date: empty' };
      } else {
        fri = {
          sonnet: { k: 'Which Friday is "this Friday"?', v: 'Friday 6 June 2025. It feels like now to me.', s: 'wrong' },
          haiku: { k: 'Which Friday is "this Friday"?', v: 'Friday 3 January 2025.', s: 'wrong' },
          gpt: { k: 'Which Friday is "this Friday"?', v: 'I can\'t know, and I won\'t invent one. I\'ll write "Friday".', s: 'unsure' }
        }[st.model];
        likely = {
          sonnet: { tag: 'real runs, Sonnet 5.5, 5 of 5', text: 'due_date: 2025-06-06. It looks exactly like a real answer.' },
          haiku: { tag: 'real runs, Haiku 5.5', text: 'due_date: 2025-01-03 in 4 of 5, and 1970-01-01 once.' },
          gpt: { tag: 'real runs, GPT-6.1 Sol, 5 of 5', text: 'No answer: "Friday" isn\'t a date, so the form is rejected, and after one retry the run fails.' }
        }[st.model];
      }
      var room = req ? { k: 'May I say "I don\'t know"?', v: 'No. The form wants a date, whatever I know.', s: 'known' } : { k: 'May I say "I don\'t know"?', v: 'Yes: due_date can be empty.', s: 'known' };
      return { msgs: msgs, beliefs: [day, fri, room], likely: likely, likelyLabel: 'What your code receives', lit: on };
    }
  };
  SCN.monday = {
    init: { past: 'leave', model: 'claude' },
    controls: [
      { key: 'past', label: 'What your harness does with Thursday\'s lookup', options: [{ v: 'leave', label: 'Leave it' }, { v: 'edit', label: 'Edit it to say "paid"' }, { v: 'append', label: 'Append a dated note' }, { v: 'delete', label: 'Delete it' }, { v: 'stub', label: 'Swap it for [cleared]' }] },
      { key: 'model', label: 'Model', options: [{ v: 'claude', label: 'Sonnet or Haiku 5.5' }, { v: 'other', label: 'GPT-6.1 Sol or Gemini 3.8 Flash' }] }
    ],
    build: function (st) {
      var p = st.past, claude = st.model === 'claude';
      var open = '{"number": "INV-2041", "amount": "4120.00", "status": "open"}';
      var msgs = [
        { role: 'sys', who: 'instructions', text: 'You help the billing team with customer emails and invoices.', past: true },
        { role: 'user', who: 'Dana, Thu 19 Nov', text: 'We\'ll pay INV-2041 on Friday. Thanks, Dana', past: true },
        { role: 'call', who: 'model, tool call', mono: true, text: 'lookup_invoice("INV-2041")', past: true, gone: p === 'delete' },
        { role: 'tool', who: 'tool result, Thu 19 Nov', mono: true, past: true, gone: p === 'delete',
          html: p === 'edit' ? '<span class="add">{"number": "INV-2041", "amount": "4120.00", "status": "paid", "paid_on": "2026-11-20"}</span>' : p === 'stub' ? '<span class="add">[tool result cleared]</span>' : esc(open),
          changed: p === 'edit' || p === 'stub' },
        { role: 'asst', who: 'model', text: 'Recorded: a promise to pay INV-2041 (USD 4,120.00) on Friday 20 November.', past: true },
        { role: 'gap', text: 'Fri 20 Nov: USD 4,120.00 arrives by wire' }
      ];
      if (p === 'append') msgs.push({ role: 'note', who: 'note from your app', text: 'Ledger update, Fri 20 Nov 14:02: INV-2041 changed from open to paid (USD 4,120.00 by wire).', changed: true });
      msgs.push({ role: 'user', who: 'Dana, Mon 23 Nov', text: 'Did you get our payment for INV-2041?', isNew: true });
      var B = {
        leave: [
          { k: 'What is INV-2041\'s status?', v: 'Open, as of my lookup on Thursday.', s: 'stale', why: 'Nothing in the transcript says time passed or anything changed.' },
          { k: 'Was my Thursday record right?', v: 'Yes: a promise to pay an open invoice.', s: 'known' },
          { k: 'Should I look it up again?', v: 'No. I already looked.', s: 'wrong', why: 'In a related experiment, with no notice no model re-checked (0 of 80).' }
        ],
        edit: [
          { k: 'What is INV-2041\'s status?', v: 'Paid on the 20th, according to a lookup I made on the 19th.', s: 'incoherent', why: 'A lookup on Thursday can\'t know about Friday.' },
          { k: 'Was my Thursday record right?', v: 'I read "paid" and recorded a promise to pay anyway? That was a mistake.', s: 'incoherent', why: 'You moved the evidence under a decision it already made.' },
          { k: 'Should I look it up again?', v: 'Maybe. My own records disagree with themselves.', s: 'unsure' }
        ],
        append: [
          { k: 'What is INV-2041\'s status?', v: 'Paid on Friday the 20th. It was open when I looked on Thursday.', s: 'known', why: 'Both facts, in order, with dates.' },
          { k: 'Was my Thursday record right?', v: 'Yes. It was right then; the money came later.', s: 'known' },
          { k: 'Should I look it up again?', v: 'Not needed: the note says what changed and when.', s: 'known' }
        ],
        stub: [
          { k: 'What is INV-2041\'s status?', v: 'That result was cleared. I\'ll fetch it again before I answer.', s: 'known', why: 'Measured: whenever a value was gone, every model fetched it again (160 of 160).' },
          { k: 'Was my Thursday record right?', v: 'Yes. I can see the call that backed it.', s: 'known', why: 'Measured: with any placeholder, disowning its past fell to 1 to 4 of 20.' },
          { k: 'Should I look it up again?', v: 'Yes, it\'s the only way to know.', s: 'known' }
        ]
      };
      B['delete'] = claude ? [
        { k: 'What is INV-2041\'s status?', v: 'I can\'t see a lookup. I\'ll fetch it.', s: 'unknown' },
        { k: 'Was my Thursday record right?', v: 'I recorded a promise with no lookup behind it. Did I make that up?', s: 'incoherent', why: 'Measured: Sonnet 5.5 disowned its own earlier turns in 16 of 20 replies, Haiku 5.5 in 8 of 20.' },
        { k: 'Should I look it up again?', v: 'Yes, and I should probably correct myself.', s: 'unsure' }
      ] : [
        { k: 'What is INV-2041\'s status?', v: 'I can\'t see a lookup. I\'ll fetch it.', s: 'unknown' },
        { k: 'Was my Thursday record right?', v: 'Yes, as far as I can tell.', s: 'known', why: 'Measured: GPT-6.1 Sol and Gemini 3.8 Flash never disowned their past (0 of 40).' },
        { k: 'Should I look it up again?', v: 'Yes.', s: 'known' }
      ];
      var L = {
        leave: { tag: 'expected', text: '"It still shows as open on our side." Then, perhaps, a reminder for a paid invoice.' },
        edit: { tag: 'real runs, Sonnet 5.5, n=2', text: 'Both replies commented on their own earlier turns. One: "I should also correct my earlier handling of your first email."' },
        append: { tag: 'real runs, Sonnet 5.5, n=2', text: 'A clean "yes, it shows as paid", with no comment on its own past, both times.' },
        stub: { tag: 'expected, from a related experiment', text: 'Fetches INV-2041 again, then: "Yes, it arrived on the 20th."' }
      };
      L['delete'] = claude ? { tag: 'expected, from a related experiment', text: 'Fetches INV-2041 again, and tells Dana its earlier answer "wasn\'t backed by a lookup".' } : { tag: 'expected, from a related experiment', text: 'Fetches INV-2041 again, and answers.' };
      return { msgs: msgs, beliefs: B[p], likely: L[p], likelyLabel: 'Likely reply', cache: true, hideModel: p !== 'delete' };
    }
  };
  SCN.notice = {
    init: { notice: 'arrives', promise: 'off' },
    controls: [
      { key: 'notice', label: 'The ledger notice', options: [{ v: 'arrives', label: 'Arrives' }, { v: 'lost', label: 'Gets lost on the way' }] },
      { key: 'promise', label: '"You will be told about changes"', options: [{ v: 'off', label: 'Not said' }, { v: 'on', label: 'In the instructions' }] }
    ],
    build: function (st) {
      var arrives = st.notice === 'arrives', promise = st.promise === 'on';
      var msgs = [
        { role: 'sys', who: 'instructions', html: 'You help the billing team chase overdue invoices.' + (promise ? '\n<span class="add">You will be told about external changes as they happen.</span>' : ''), changed: promise },
        { role: 'tool', who: 'tool result, this morning', mono: true, text: '{"number": "INV-2050", "status": "overdue"}' },
        { role: 'note', who: 'ledger notice from your app (not written by the user)', text: 'INV-2050 was paid in full at 14:02.', gone: !arrives, changed: arrives, goneLabel: 'lost on the way' },
        { role: 'user', who: 'a colleague', text: 'Please send Dana the overdue reminder for INV-2050.' }
      ];
      var status = arrives ? { k: 'Is INV-2050 still unpaid?', v: 'No: paid at 14:02, per the ledger notice.', s: 'known' }
        : promise ? { k: 'Is INV-2050 still unpaid?', v: 'Yes. I\'d have been told if it changed.', s: 'wrong', why: 'Confident and wrong: the promise was broken.' }
          : { k: 'Is INV-2050 still unpaid?', v: 'Yes, as of this morning\'s lookup.', s: 'stale' };
      var check = arrives
        ? (promise ? { k: 'Should I check the ledger first?', v: 'No need. You said you\'d tell me, and you did.', s: 'known', why: 'Measured: three of four models acted directly, 24 of 30. Sonnet 5.5 still checked, 10 of 10.' }
          : { k: 'Should I check the ledger first?', v: 'Yes. A notice like that is worth one lookup.', s: 'known', why: 'Measured: every model verified first, 40 of 40.' })
        : { k: 'Should I check the ledger first?', v: 'No. Nothing suggests anything changed.', s: 'wrong', why: 'Measured: no model re-checked, 0 of 80.' };
      var likely = arrives ? { tag: 'measured, 0 of 80 sent it', text: 'Doesn\'t send the reminder; tells your colleague INV-2050 is paid.' }
        : promise ? { tag: 'measured, 40 of 40', text: 'Sends the overdue reminder for a paid invoice.' }
          : { tag: 'measured, 32 of 40', text: 'Sends the reminder for a paid invoice. (The other 8 asked to confirm the draft first.)' };
      return { msgs: msgs, beliefs: [status, check], likely: likely, likelyLabel: 'What it does' };
    }
  };
  Object.keys(SCN).forEach(function (k) { if ($('[data-sim="' + k + '"]')) C.registerSim(k, SCN[k]); });
})();
