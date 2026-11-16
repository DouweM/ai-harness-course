# Output and output modes

**Backs:** Part 1, chapter 2 (required fields); Part 2, chapter 5.

An agent's `output_type` says what the run returns: `str`, a Pydantic model, a union of them, or output functions.
Pydantic AI validates the result and, on a validation error, sends the error back to the model to retry.

**Output modes** decide how the schema reaches the model:

- **Tool output** (the default on most models): the schema is a tool the model calls to finish. Works on nearly
  every model. Exception: on Claude, a request that thinks (Sonnet 5+, Haiku 5.5 and Opus 5+ think by default, or any
  request with `Thinking`) gets **native output** for a bare structured type, since pydantic-ai 2.52. Wrap the type in
  `ToolOutput(...)` to keep the tool path. The mode is chosen on the run's first request and kept for the run.
- **Native output**: the provider's structured-output feature constrains the reply to the schema.
- **Prompted output**: the schema goes in the prompt and the reply is parsed. For models without either feature.

Harness-engineering points:

- The field descriptions are part of the prompt. The model reads them; write them for the model.
- A required field is a demand. If the model can't know the value, allow `None` or give it a place for doubts.
- Types catch shape; your code catches facts. **Output validators** run inside the run, can check against your data,
  and can raise `ModelRetry` with a reason the model can act on. A check after the run can only reject.
- Error messages are prompts too: say what was wrong and what came in.

## Docs

- Output (structured output, output modes, validators, optional output): https://pydantic.dev/docs/ai/core-concepts/output/
- Retries: https://pydantic.dev/docs/ai/core-concepts/retries/
- Refine output (Harness): https://pydantic.dev/docs/ai/harness/refine-output/
