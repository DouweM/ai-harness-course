# Durability and production

**Backs:** Part 3, chapter 1.

Agents in production run long, call systems that write, wait for people, and crash. The questions to answer for
every agent:

- **What happens when the process dies mid-run?** Durable execution (Temporal and other backends) checkpoints each
  step so a run resumes instead of restarting.
- **What if a tool runs twice?** Make writes idempotent, keyed on the tool call ID, so a retry or a resume doesn't
  send two emails or post two payments.
- **How does a person approve a risky action days later?** Deferred tools end the run with the pending call; your
  app stores it and resumes the run with the decision. `HandleDeferredToolCalls` handles them in-process.
- **How do I bound cost and runaway loops?** Usage limits, spend limits, loop detection.
- **What does the model see when something fails?** Error strings are written for three readers: the model (what
  to do next), the operator (what broke), and the user (what to tell them). Don't leak one into another.
- **How do I see what happened?** Instrument with Logfire (OpenTelemetry): every model request and tool call as a
  span, with run metadata.

## Docs

- Production overview (each question above has a section): https://pydantic.dev/docs/ai/production/
- Enterprise: https://pydantic.dev/docs/ai/production/enterprise/
- Durable execution: https://pydantic.dev/docs/ai/capabilities/durable_execution/overview/
- Deferred tools: https://pydantic.dev/docs/ai/tools-toolsets/deferred-tools/
- Handle deferred tool calls: https://pydantic.dev/docs/ai/capabilities/handle-deferred-tool-calls/
- Persistence: https://pydantic.dev/docs/ai/core-concepts/persistence/
- Spend limits (Harness): https://pydantic.dev/docs/ai/harness/spend/
- Detect loops (Harness): https://pydantic.dev/docs/ai/harness/detect-loops/
- Observability with Logfire: https://pydantic.dev/docs/ai/integrations/logfire/
- Timeouts: https://pydantic.dev/docs/ai/core-concepts/timeouts/
