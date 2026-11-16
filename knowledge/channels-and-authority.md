# Channels and authority: whose voice is it?

**Backs:** Part 1, chapter 3; Part 2, chapters 2, 3 and 8.

Everything in the request arrives in a channel, and models give channels different authority:

| Channel | Who speaks | How much the model trusts it |
| --- | --- | --- |
| Instructions (system prompt) | You, the developer | Most. Only your own words belong here. |
| User messages | The person using the agent | Taken as requests, weighed against the instructions. |
| Tool results | Your systems, or text they fetched | Believed as facts about the world, but not as orders. |
| The model's own earlier turns | The model | Believed as what it did and decided. |

Three practical rules follow:

1. **Put each piece of text in the voice it really has.** An email body pasted into the instructions gets the
   authority of your instructions. A customer's email is data: pass it in the user message or a tool result, framed
   so the model knows where it came from.
2. **Untrusted text never goes into instructions.** Pydantic AI's docs are explicit about this for dynamic
   instructions; tag data with where it came from when it goes into prompt text.
3. **Give doubts somewhere to go.** A model that notices something odd (an instruction hidden in an email, an
   amount that doesn't match) needs an output field, a tool, or a way to ask, or the doubt is silently dropped.

Notes your app adds to the conversation (a ledger update, "this tool is no longer available") should say they come
from your app, not from the user.

## Applying it to a reader's agent

List every place external text enters the request and which channel carries it. Flag any f-string that puts user
or third-party text into instructions. Check whether the output type has a field for doubts or flags.

## Docs

- Instructions, and keeping untrusted text out of them: https://pydantic.dev/docs/ai/core-concepts/agent/
- Framing data in prompt text (in custom capabilities): https://pydantic.dev/docs/ai/capabilities/custom/
- Function tools: https://pydantic.dev/docs/ai/tools-toolsets/tools/
- Prompt injection defender (Harness): https://pydantic.dev/docs/ai/harness/prompt-injection-defender/
- Ask user (Harness): https://pydantic.dev/docs/ai/harness/ask-user/
