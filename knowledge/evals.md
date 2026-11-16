# Evals and experiments

**Backs:** Part 3, chapters 3 and 4; Part 1, chapter 5.

Pydantic AI can implement any agent. It can't tell you which harness, model and context are right for your use
case at a cost and latency you accept. That takes experiments.

**Pydantic Evals** structures them: a `Dataset` of `Case`s (inputs, optional expected output, metadata), a task
(your agent, or the old call it might replace), and evaluators (exact checks, your own Python, LLM judges). Run
it, get a report, compare runs in Logfire.

How to make experiments worth having:

- **Start from production corrections.** Every time a person fixed the agent's output, that's a case with a known
  right answer.
- **Two arms, one change.** Old call vs agent, or the same agent with one capability changed. Change one thing.
- **Predict first.** Write down what you expect before you run it. Surprises are where intuition improves.
- **Read cases, not averages.** Look at the failures one by one; the average hides why.
- **Small n means big effects only.** Five runs can show "always vs never"; they can't show 60% vs 70%.
- **Online evals** score production traffic continuously, so a model or prompt change shows up in the numbers.

## Docs

- Evals overview: https://pydantic.dev/docs/ai/evals/evals/
- Quick start: https://pydantic.dev/docs/ai/evals/getting-started/quick-start/
- Core concepts: https://pydantic.dev/docs/ai/evals/getting-started/core-concepts/
- Evaluators: https://pydantic.dev/docs/ai/evals/evaluators/overview/
- Multi-run evaluation: https://pydantic.dev/docs/ai/evals/how-to/multi-run/
- Logfire integration: https://pydantic.dev/docs/ai/evals/how-to/logfire-integration/
- Online evaluation: https://pydantic.dev/docs/ai/evals/online-evaluation/
- Testing (offline, with TestModel and FunctionModel): https://pydantic.dev/docs/ai/guides/testing/

Skill: `logfire-evals` in the `pydantic/skills` repo.
