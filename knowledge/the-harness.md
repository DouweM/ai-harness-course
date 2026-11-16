# The Harness

**Backs:** Part 2, chapters 4 and 6.

"Harness" is the field's word for everything around the model that turns it into an agent: the loop, the tools,
the context management. Pydantic AI core is a lean harness. The **Pydantic AI Harness** package
(`pydantic-ai-harness`) is a catalog of capabilities for agents that should do more: touch files, run code, browse,
remember, delegate, stay coherent through long runs, and stay safe (guardrails, spend limits, permissions, judges).

The boundary is mechanical: core ships what needs model or framework support; the Harness ships everything else,
so it can move at the speed the field moves.

## Coder is five capabilities: no magic

`Coder`, the Harness's coding agent, is a combined capability: `FileSystem`, `Shell`, `RepoContext`, `SubAgents`
delegating to the agent itself, and context management (`ClearToolResults`, `ToolOutputLimits`), plus default
instructions. Everything people know from coding agents is history management, tools, and keeping the model's view
of the world current. You can use it whole, or rebuild it from those pieces to change any of them.

## Docs

- The Harness: https://pydantic.dev/docs/ai/harness/
- Coder: https://pydantic.dev/docs/ai/harness/coder/
- FileSystem: https://pydantic.dev/docs/ai/harness/filesystem/
- Shell: https://pydantic.dev/docs/ai/harness/shell/
- Repo context: https://pydantic.dev/docs/ai/harness/repo-context/
- Subagents: https://pydantic.dev/docs/ai/harness/subagents/
- Compaction strategies: https://pydantic.dev/docs/ai/harness/compaction/
- Tool output limits: https://pydantic.dev/docs/ai/harness/tool-output-limits/
- Memory: https://pydantic.dev/docs/ai/harness/memory/
- Guardrails: https://pydantic.dev/docs/ai/harness/guardrails/
- Spend limits: https://pydantic.dev/docs/ai/harness/spend/
- Examples: https://pydantic.dev/docs/ai/harness/examples/

Skill: `pydantic-ai-harness` in the `pydantic/skills` repo.
