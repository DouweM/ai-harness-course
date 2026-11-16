# Harness engineering with Pydantic AI

An interactive course in harness engineering: improving everything around an agent's model (its instructions,
tools, history and the code that decides what happens next) one idea at a time. You see the agent from the model's
side to find ideas, build them with Pydantic AI, and measure each against what you have: which is better, by how
much, on which cases.

It takes two to three hours to read everything; skim what you already know.

## Open it

```sh
git clone https://github.com/DouweM/harness-engineering-with-pydantic-ai
cd harness-engineering-with-pydantic-ai
uv run serve.py        # or: python3 serve.py
```

That serves the course on localhost and opens your browser. Opening `index.html` straight from disk works too;
`serve.py` just makes the "Ask your agent" prompts name the exact paths on your machine.

## Three ways to use it

**Read it.** Each chapter has a runtime on the home page. You'll be asked to predict what a model does before you
see what real models did. Guess first; the surprises are the point. Your progress stays in your browser.

**Present it.** Press `P` (or the screen icon) on any page for talk mode: prose collapses, transcripts and
reveals get big. Arrow keys (or a clicker) move between stops and on to the next chapter, `R` reveals, `1` to `4`
pick an answer, `N` shows speaker notes, `?` lists the keys. Built for 1920x1080 projectors and laptops alike.

**Use it with your coding agent.** Every chapter has an "Ask your agent" button that copies a prompt naming the
chapter and its path in this repo. Start Claude Code (or any coding agent) here and paste it:

```sh
cd harness-engineering-with-pydantic-ai
claude
```

The agent reads `AGENTS.md` (`CLAUDE.md` points to it), which tells it which notes in `knowledge/` and which
Pydantic AI docs pages back each chapter, how to run the chapter's code, and to propose changes to your own agent
rather than rewrite it unasked. Good questions: "map this chapter onto my agent in ../my-service", "run this
chapter's example and change one thing", "what does my agent's model actually see on one turn?"

## What's in here

| Path | What |
| --- | --- |
| `index.html` | Start here. |
| `part1/` | How the model sees the world. No framework code. |
| `part2/` | Building it with Pydantic AI. |
| `part3/` | Production, and measuring what works. |
| `code/` | Every snippet on the pages, runnable offline. `verify.py` in each part runs them all. |
| `knowledge/` | Short notes per concept, with links into the docs. Written for you and for your agent. |
| `assets/` | Shared styles and script. `assets/COMPONENTS.md` documents the page markup. |

## Running the code

From the repo root, `uv run code/part2/ch6_capabilities.py` runs one chapter's example, and
`uv run code/part2/verify.py` / `uv run code/part3/verify.py` run a whole part. The examples use `TestModel` or
`FunctionModel`, so they run without API keys and without calling a model.

## Checking the course

`uv run tools/test_shell.py` checks talk mode and the ask-your-agent prompt on every chapter in a headless browser.


```sh
python3 tools/check_docs_links.py ~/path/to/pydantic-ai
```

checks every pydantic.dev docs link in the course against the docs navigation in a Pydantic AI checkout.
