# Model choice

**Backs:** Part 3, chapter 2.

The model is one dimension of the experiment, not a constant:

- **A frontier model with a simple harness often does great.** A smaller, cheaper or faster model usually needs a
  more tuned harness: more facts injected, tighter tools, clearer output types. Whether the savings pay for the
  tuning is an experiment.
- **Models differ in behavior, not just quality.** In this course's probes, models from different providers reacted
  differently to the same history edit or the same missing fact. Results are dated and model-specific.
- **Models change under you.** Freeze the configuration that works for a model family, test a new model against
  the same dataset (with instructions iterated for it if needed), and roll out gradually.
- **Roll out configurations safely.** Managed prompts and variables (in Logfire) let you change instructions or the
  model without a deploy, and target a share of traffic.

Pydantic AI runs the same agent on any supported provider; `ModelFallback` (and fallback models) handle outages per
request. Check the current docs on per-model instructions before relying on them: the guidance in this course is
to keep one set of instructions and test each model against it.

## Docs

- Models overview: https://pydantic.dev/docs/ai/models/overview/
- Decision models: https://pydantic.dev/docs/ai/models/decision/
- Model fallback: https://pydantic.dev/docs/ai/capabilities/model-fallback/
- Select model: https://pydantic.dev/docs/ai/capabilities/select-model/
- Gateway: https://pydantic.dev/docs/ai/overview/gateway/
- Managed prompt (Harness): https://pydantic.dev/docs/ai/harness/managed-prompt/
- Evals: see `evals.md`
