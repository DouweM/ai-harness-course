# Capabilities: the unit of harness behavior

**Backs:** Part 2, chapter 6 (and the Part 1 patterns, packaged).

A capability bundles one piece of harness behavior so it can be added to any agent with
`Agent(..., capabilities=[...])`. Anything you'd otherwise scatter across an agent's setup can live in one:

- **Instructions** (`get_instructions`), static or computed per run, optionally `on_change='append'`.
- **Tools** (`get_toolset`), and changes to the tool list per step (`prepare_tools`).
- **Model settings** and the model itself (select, fall back, resolve a model ID).
- **Hooks** around the run, each model request (`before_model_request`, `after_model_request`,
  `wrap_model_request`), and each tool call.
- **History processing**, and events.

Built-in capabilities ship in core (thinking, caching, web search and fetch, tool search, provider-native
compaction, MCP, model fallback, handle deferred tool calls, instrumentation, and more) and many more in the Harness
package (see `the-harness.md`). Check the capabilities overview for the current list rather than trusting a list in
a note.

**Why it matters for harness engineering:** every pattern from Part 1 (tell it the date, announce changes, keep a
ledger, give doubts a place) becomes one capability you can reuse across agents, switch on and off, and compare in
an experiment. A capability is also the natural unit of an A/B test: same agent, one capability changed.

## Applying it to a reader's agent

Group the agent's harness code by concern: what does it tell the model, which tools, which request tweaks, which
history edits? Each group is a candidate capability. Don't rewrite their code unasked; sketch the mapping first.

## Docs

- Capabilities overview: https://pydantic.dev/docs/ai/capabilities/overview/
- Building custom capabilities (hooks, instructions, toolsets): https://pydantic.dev/docs/ai/capabilities/custom/
- On-demand capabilities: https://pydantic.dev/docs/ai/capabilities/on-demand/
- Hooks: https://pydantic.dev/docs/ai/core-concepts/hooks/
- Prepare tools: https://pydantic.dev/docs/ai/capabilities/prepare-tools/
- Model fallback: https://pydantic.dev/docs/ai/capabilities/model-fallback/
- Thinking: https://pydantic.dev/docs/ai/capabilities/thinking/
- Caching: https://pydantic.dev/docs/ai/capabilities/caching/
- Tool search: https://pydantic.dev/docs/ai/capabilities/tool-search/
- API reference: https://pydantic.dev/docs/ai/api/pydantic-ai/capabilities/

Skill: `building-pydantic-ai-agents` (in the `pydantic/skills` repo; see the coding agent skills page:
https://pydantic.dev/docs/ai/overview/coding-agent-skills/).
