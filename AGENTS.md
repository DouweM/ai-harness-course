# AGENTS.md: helping someone through this course

This repo is an interactive course, "Harness engineering with Pydantic AI": HTML chapter pages, runnable code, and
short knowledge notes. A reader has pointed you (a coding agent) at it, usually with a prompt copied from a
chapter's "Ask your agent" button that names the chapter and its path. Your job is to help them learn and apply
it, not to finish the course for them.

## What the reader usually wants

1. **Go deeper** on a concept in the chapter: explain it further, with examples, and point to the docs.
2. **Map the chapter onto their own agent**: read their code, show where the chapter's idea applies, what their
   model currently sees, and what they could change. Propose; don't edit.
3. **Run the chapter's code** from `code/`, explain what happens, and try variations with them.

If the prompt doesn't say which, ask. Keep answers short and concrete; these readers are experienced engineers.

## Rules

- **Don't change the reader's code unless they ask.** Sketch the change, show the diff you'd make, and let them
  decide. Never "migrate" their agent unprompted.
- **Verify against current docs and source before stating an API.** Pydantic AI moves fast. Prefer the docs pages
  linked below (pydantic.dev/docs/ai/...) or the installed package source over memory. Say which version an API
  needs when it matters (`pip show pydantic-ai` / `uv pip show pydantic-ai` for theirs).
- **Measured claims stay measured.** The course's numbers are small-n, dated and model-specific. Don't generalise
  them; suggest the reader re-run the probe on their models (Part 3, chapter 4 shows how).
- **Don't call paid models without asking.** The course code runs offline with `TestModel`/`FunctionModel`. If a
  real run would help, say what it would cost roughly and ask first.
- **Think from the model's side.** The course's central habit: before changing a prompt, look at the exact request
  the model receives and ask what it can and can't know from it.

## How the repo is laid out

| Path | What |
| --- | --- |
| `index.html` | Home: what a harness is, the loop (design, build, measure), the parts and chapters, runtimes. |
| `part1/` | How the model sees the world. No framework code; transcripts, predictions, simulators. |
| `part2/` | Building it with Pydantic AI. One collections agent grows through Dana's week (Tue 17 to Sat 21 Nov), in the order its request is built; Part 3 imports it. |
| `part3/` | Production, and measuring what works: durability, models, evals, probes. |
| `code/part2/`, `code/part3/` | Every snippet shown on the pages, runnable. `verify.py` in each runs them all offline. |
| `knowledge/` | One short note per key concept, with links into the docs. Read the ones the chapter maps to. |
| `assets/` | Shared CSS and JS for the pages (`COMPONENTS.md` documents the page markup). |

Reading a chapter: the HTML is the content. Prose is in `<p>` and `.measure` blocks; predictions are
`article.puzzle` (the measured answer is `data-answer`; the reveal is in the `.stage` blocks); speaker notes are in
`aside.notes`. You can read the file directly; no need to render it.

Running the code (from the repo root; `pyproject.toml` pins the versions the code was verified against,
pydantic-ai 2.68.0 and pydantic-ai-harness 0.68.0):

```sh
uv run code/part2/ch6_capabilities.py   # one chapter's example; each file's docstring says what it shows
uv run code/part2/verify.py             # all of Part 2, offline, checked against code/part2/expected/
uv run code/part3/verify.py             # all of Part 3, offline
```

Everything runs offline with `TestModel`/`FunctionModel` (no API keys). The reader's installed Pydantic AI may be
newer or older than 2.68.0; check before assuming an API exists in their project.

## Knowledge map

Docs base: `https://pydantic.dev/docs/ai/`. Skills: the `pydantic/skills` repo
(https://github.com/pydantic/skills); `building-pydantic-ai-agents` is the general one, `pydantic-ai-harness` covers
the Harness, `logfire-evals` and `logfire-instrumentation` cover Part 3. If the reader has them installed, use them.

### Part 1: How the model sees the world

| Chapter | Knowledge | Docs |
| --- | --- | --- |
| 1. What you're talking to | `world-model.md` | `core-concepts/agent/`, `core-concepts/message-history/` |
| 2. Its history is its world | `world-model.md`, `history-edits.md`, `output-modes.md` | `core-concepts/message-history/`, `core-concepts/output/` |
| 3. Whose voice is it? | `channels-and-authority.md` | `core-concepts/agent/`, `capabilities/custom/`, `harness/prompt-injection-defender/` |
| 4. The world moves | `history-edits.md` | `core-concepts/message-history/`, `capabilities/custom/`, `harness/compaction/`, `capabilities/caching/` |
| 5. Thinking like a harness engineer | `world-model.md`, `evals.md` | `evals/evals/` |

### Part 2: Building it with Pydantic AI

| Chapter | Knowledge | Docs | Code |
| --- | --- | --- | --- |
| 1. From idea to code | `world-model.md` | `core-concepts/agent/`, `tools-toolsets/tools/` | `code/part2/ch1_from_idea_to_code.py` |
| 2. Instructions and deps | `history-edits.md`, `channels-and-authority.md` | `core-concepts/agent/`, `core-concepts/dependencies/` | `code/part2/ch2_instructions.py` |
| 3. Tools | `channels-and-authority.md` | `tools-toolsets/tools/`, `tools-toolsets/tools-advanced/`, `tools-toolsets/deferred-tools/`, `tools-toolsets/toolsets/` | `code/part2/ch3_tools.py` |
| 4. History (storage, clearing, compaction) | `history-edits.md`, `the-harness.md` | `core-concepts/message-history/`, `core-concepts/persistence/`, `harness/compaction/` | `code/part2/ch4_history.py` |
| 5. The answer form | `output-modes.md` | `core-concepts/output/`, `core-concepts/retries/` | `code/part2/ch5_answer_form.py`, `code/part2/record_answer_form.py` (live) |
| 6. Capabilities | `capabilities.md`, `the-harness.md` | `capabilities/overview/`, `capabilities/custom/`, `harness/`, `harness/coder/` | `code/part2/ch6_capabilities.py`, `code/part2/billing_world.py` |
| 7. More than one agent | `capabilities.md` | `guides/multi-agent-applications/`, `harness/subagents/`, `graph/graph/` | `code/part2/ch7_multi.py` |
| 8. Interfaces | `channels-and-authority.md` | `integrations/ui/overview/`, `integrations/ui/ag-ui/`, `guides/web/`, `mcp/server/`, `realtime/overview/` | `code/part2/ch8_interfaces.py` |
| 9. Testing | `evals.md` | `guides/testing/` | `code/part2/ch9_testing.py`, `code/part2/test_billing_agent.py` |

### Part 3: Production, and measuring what works

| Chapter | Knowledge | Docs | Code |
| --- | --- | --- | --- |
| 1. Production architectures | `durability.md` | `production/`, `capabilities/durable_execution/overview/`, `tools-toolsets/deferred-tools/`, `integrations/logfire/` | `code/part3/ch1_*.py` |
| 2. Models and trade-offs | `model-choice.md` | `models/overview/`, `capabilities/model-fallback/`, `harness/managed-prompt/` | `code/part3/ch2_model_configs.py` |
| 3. Evals and experiments | `evals.md` | `evals/evals/`, `evals/getting-started/quick-start/`, `evals/online-evaluation/`, `evals/how-to/logfire-integration/` | `code/part3/ch3_*.py` |
| 4. Run your own probe | `evals.md`, `world-model.md` | `evals/how-to/multi-run/` | `code/part3/ch4_probe_close.py` |
| 5. The loop | all | `overview/`, `harness/` | |

## Mapping a chapter onto the reader's agent

A good default when asked "how does this apply to my agent?":

1. Find their agent: grep for `Agent(`, LLM client calls, or prompt templates.
2. Show them what the model receives on one turn (instructions, messages, tool definitions, output schema). If they
   use Pydantic AI, `result.all_messages()` or a Logfire trace shows it; otherwise reconstruct it from the code.
3. Apply the chapter's lens (the knowledge note's "Applying it" section) and list what you found, most important
   first, with file and line.
4. For each, propose the smallest change and how they'd find out whether it helps (a probe or an eval, Part 3).
