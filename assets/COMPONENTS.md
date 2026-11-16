# Chapter page contract

Every page links `assets/theme.css` and ends with `<script src="../assets/course.js"></script>`. Start from
`templates/chapter.html`. The class names
match v3's, so moving a v3 component over mostly means deleting the page-specific JavaScript that used to wire it.

## Page identity

- File names: `partN/NN-short-name.html`. `course.js` holds the manifest (`CHAPTERS` at the top): order,
  titles, runtimes, the Tok stage each chapter unlocks, and the ask-your-agent follow-ups. If your
  file name or title differs from the manifest, tell the shell builder (or edit the manifest entry yourself).
- `<body data-page="chapter">` (`home` for `index.html`, `workshop` for workshop pages). `data-title`,
  `data-part`, `data-n`, `data-runtime` on `<body>` are only a fallback for pages not in the manifest.
- `<header class="topbar" data-auto></header>`: course.js fills it in (brand, Tok, part crumb, score,
  ask-your-agent, chapters, talk mode, theme). Don't hand-build the top bar.

## Layout

| Element | What it is |
| --- | --- |
| `header.chapter-head > .wrap.head-grid` | Title block: eyebrow, `h1`, `p.meta-row[data-auto]` (part, chapter, runtime, filled in), `p.lede`, and a `.tok-box` on the right. |
| `.chapter-body > .wrap[data-chapter-end] > section` | The chapter. Each `section` is one stop in talk mode. The ask card and previous/next links are appended to `[data-chapter-end]`. |
| `.prose`, `.measure`, `.lede`, `.story`, `.learn`, `.skipline`, `.inpai`, `.np` | Reading-only: hidden in talk mode, except inside a `.puzzle` or `.stage`, or when also `.talk-keep`. |
| `.talk-only` | Shown only in talk mode: a big one-liner standing in for collapsed prose. |
| `aside.notes` | Speaker notes. Never shown while reading; in talk mode `N` shows the notes of the current stop. |
| `[data-stop]` | Make any other element a talk-mode stop. `.puzzle`, `.sim`, `.play` are stops automatically. |

## Tok

- `<span data-tok="3" data-mood="happy" data-crop="face"></span>`: Tok at stage 3. `data-tok="current"` uses the
  reader's progress. Moods: (none), `happy`, `curious`, `unsure`, `worried`, `confused`, `sleepy`. Crops:
  `full`, `hero`, `wide`, `face`.
- Stages (0 to 8): a token tile (0), eyes that read (1), an antenna that lights for facts it was told (2), ears
  striped in the three voices (3), a body with an append-only chest log (4), legs and a wave (5), tools in hand
  (6, Part 2), a trace under its feet (7, Part 3), the Pydantic mark (8). Each chapter's `evolve` in the manifest is
  the stage reached when it is done.
- `data-lit="false"` turns the antenna off (a fact it wasn't given); `data-listen="s|u|t"` lights the ear stripe for
  the voice it is hearing (instructions, user, tool).
- A chapter is done when every `.puzzle` on it is revealed, or (no predictions) when the reader reaches the end.
- `<div data-evolve="Optional sentence."></div>`: the evolution card, filled in for you.
- Tap-to-talk: `<button class="tok-btn" data-tok-lines='["line 1","line 2"]' data-tok-moods="happy,curious">`
  containing a `[data-tok]`; lines go to the next `.tok-line` in the same parent (or `data-tok-out="#id"`).
- `.tok-says > .tk[data-tok] + div > p.eyebrow + p`: a static "From where Tok sits" callout.

## Message and request cards (the one shared component)

Every message, tool definition, tool result and answer form on every page uses the same card, so a part of a
request always looks the same wherever it appears. Styles live in `assets/theme.css`; don't restyle them per part.

```html
<div class="transcript" aria-label="What the model sees">
  <div class="tr-title">// what the model sees</div>
  <div class="msg sys"><span class="who">instructions</span><div class="body">...</div></div>          <!-- the operator's voice -->
  <div class="msg sys"><span class="who">tool definitions</span><div class="body mono">...</div></div>  <!-- also the operator -->
  <div class="msg user"><span class="who">user</span><div class="body">...</div></div>                  <!-- the user's voice -->
  <div class="msg call"><span class="who">model &rarr; tool call</span><div class="body mono">...</div></div>
  <div class="msg tool"><span class="who">tool result</span><div class="body">...</div></div>          <!-- data -->
  <div class="msg asst"><span class="who">model</span><div class="body">...</div></div>
  <div class="msg note"><span class="who">notice from your app</span><div class="body">...</div></div>  <!-- an appended change -->
  <div class="msg retry">...</div>  <div class="msg good">...</div>
  <div class="msg offstage"><span class="who">off the page</span><div class="body">...</div></div>  <!-- what happened but isn't on the page -->
  <div class="msg next"><span class="who">model</span><div class="body"><span class="caret"></span></div></div>
</div>
```

Order on screen follows the request: instructions, tool definitions, messages, then the optional answer form
(`.msg.sys` with `who` "answer form"). Use `<mark>` inside a body to highlight the line that matters.

**Request walk** (`ol.vwalk`): the same cards, one per `li`, each followed by a `<p>` saying whose voice it is and
what it is for. Use it to walk through one request in order (Part 1, chapter 3).

**Hops** (`ol.hops`): a request on its way to the model, one `li` per hop with `<b>` name and `<span>` what it does.

## Prediction card

```html
<article class="puzzle" id="p1" data-answer="b">          <!-- data-answer omitted or data-unmeasured: open question -->
  <div class="pz-top"><p class="eyebrow">...</p><div class="pz-tok" aria-hidden="true"></div></div>
  <div class="pz-grid">
    <div class="transcript">... .msg.sys / .user / .asst / .call / .tool / .note / .retry / .next ...</div>
    <div class="pz-ask">
      <p class="q">Question?</p>
      <div class="choices" role="radiogroup"><button class="choice" data-choice="a" type="button"><span class="key">A</span><span>...</span></button>...</div>
      <p class="room-hint">Room: hands up. Then press R.</p>
      <div class="pz-actions"><button class="btn reveal" type="button" disabled>Pick an answer first</button><button class="linkbtn skip np" type="button">Skip and show me</button></div>
      <p class="verdict" aria-live="polite" hidden></p>
    </div>
  </div>
  <div class="stage" data-label="What models did" hidden>...</div>   <!-- revealed one by one -->
  <div class="stage" data-label="Why" hidden>...</div>
</article>
```

Optional: `data-answer-tag="our guess"` (tag on the answer, default "measured"), `data-reveal-label`,
`data-open-note` (verdict text for open questions). Picks and reveals persist per page in localStorage. In talk
mode, R reveals without a pick ("revealed for the room").

## Results

`.result-grid.two > .arm > h4 (+ small) + .tally[data-k][data-n][data-label]`, plus `.tally.good` (green),
`.tally.fail` (red rings), `data-alt`, `data-maybe`, `data-num` (custom count text), `data-cd`/`data-cm`
(columns desktop/mobile). Follow with `p.source` naming date, n and models.

## Reveals outside predictions

`.peek > button.peek-btn[data-open-label] + .peek-body`. Talk mode R opens the next closed peek in the current stop.
Switches: `[data-switch]` containing buttons `[data-show="x"]` and panes `[data-pane="x"]`. Tabs (v3):
`.tabs > .tab[role=tab][data-show]` with `[data-tabpane]` siblings. X-ray blocks: `button.blk.c-sys|c-user|c-tool|c-out`
with `.who`, `.body`, `.exp`.

## Code

```html
<div class="code long" data-run="uv run code/part2/05_capabilities.py">
  <div class="code-head"><span class="file">code/part2/05_capabilities.py · pydantic-ai 1.x+</span></div>
  <pre data-lang="py">...</pre>
</div>
```

`data-lang`: `py`, `json`, `sh`. A Copy button is added if missing. `.long` collapses past 22 lines (`data-lines`
to change) with "Show all N lines". `data-run` adds a "Run it" line with a copy button. Every snippet must also live
in `code/`.

## Simulators and toys

- `<div class="sim" data-sim="name"><p class="eyebrow">...</p><h4>...</h4><p class="intro">...</p></div>`, then in a
  page script after course.js: `Course.registerSim('name', { init, controls, build, labels })`. Same shape as v3's
  `SCN`. `build(st)` returns
  `{ msgs, beliefs, likely, likelyLabel, cache, hideKeys, tok, tokStage, lit, listen }` (`tok` is `[mood, line, sub,
  stage]`; `tokStage` or a scenario-level `tokStage` pins Tok's stage in the belief pane); belief states: known, unknown, unsure, stale,
  wrong, incoherent.
- Next-token toy: `<div class="play" data-toy="next-token"><script type="application/json">{"frames": {"key":
  {"label", "meta", "line", "dist": [[token, pct, continuation], ...]}}, "note": "illustrative numbers"}</script></div>`.

## Ask your agent

Automatic: a top-bar button and an end-of-chapter card copy a prompt naming the chapter and its path in the repo
and pointing the agent at `AGENTS.md`. Follow-ups come from the manifest; override per page with
`<ul class="ask-followups" hidden><li>...</li></ul>`.

## Talk mode

`P` toggles (or `?talk` in the URL; it stays on across chapters). Arrows, Page Up/Down (clickers) move between
stops; past the last stop goes to the next chapter. `R`/space reveal, `1` to `4` pick A to D, `N` notes, `?` keys,
`Esc` leaves. Check your page at 1920x1080 and on a laptop with talk mode on.

## JavaScript API

`Course.registerSim`, `Course.tokSVG(stage, {mood, crop})`, `Course.drawTok(el)`, `Course.refresh(root)` (after you
inject HTML), `Course.toast(text)`, `Course.copyText(text, cb)`, `Course.complete()` (mark the chapter done
yourself), `Course.state` and `Course.save()`.

## Rules

Sentence-case headings, no em dashes, no customer or framework names, 44px targets, 13px minimum text, no
horizontal scroll at 360px.

## `.deeper`: a short "go deeper" note

`<div class="deeper measure"><p class="eyebrow">Go deeper: ...</p><p>...</p></div>`. Always open, never a fold:
for the advanced reader who needs one more paragraph (when a variant is the right call, an edge of a guarantee).
