# The model's world model

**Backs:** Part 1, chapters 1, 2 and 5. Used throughout.

A model call reads one document, top to bottom, every time: the instructions, the conversation so far, tool
calls and their results, and the output schema. That document is everything the model knows about your situation.
It has no window to look out of, no memory of the last request, and no way to check a fact you didn't give it.
"World model" here means the picture of the situation the model builds from that document: what is true, what
time it is, who is asking, what it already did, and what it is allowed to say it doesn't know.

The harness engineer's job is keeping that picture **up to date, accurate and coherent**:

- **Up to date:** when the world changes (an invoice gets paid, a tool goes away), the document has to say so.
  The model cannot infer a change from an absence.
- **Accurate:** facts your code knows and the model doesn't (today's date, when an email arrived, the account's
  state) go into the document, in the right voice. "Fix the world, not the wording": a missing fact beats any
  instruction about how to guess it.
- **Coherent:** the history must not contradict itself. If you edit the past, the model believes the new past and
  starts doubting the decisions it made on the old one.

It also needs **room to be uncertain**. A required field with no way to say "unknown" pushes the model to invent a
value that looks exactly like a real answer. An optional field, or a `doubts` list, gives the uncertainty somewhere
to go.

## The stance

Treat the model like a capable colleague on their first day, every day. What would they need to know to do this
job? What would they ask? Most lines in a prompt are harmless and useless; a few carry the result. You can't tell
which by reading them: change one thing and measure (see `evals.md`).

## Applying it to a reader's agent

1. Print one real request the agent sends (with Logfire, or `result.all_messages()`), and read it as the model would.
2. List the facts the job needs. Mark each: in the request, fetchable by a tool, or missing.
3. Look for required output fields the model can't always know.
4. Look for places the world can change mid-conversation without the request saying so.

## Docs

- Agents and instructions: https://pydantic.dev/docs/ai/core-concepts/agent/
- Dependencies (where your code's facts come from): https://pydantic.dev/docs/ai/core-concepts/dependencies/
- Messages and chat history: https://pydantic.dev/docs/ai/core-concepts/message-history/
- Optional output: https://pydantic.dev/docs/ai/core-concepts/output/
