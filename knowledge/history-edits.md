# History edits: edit, append or clear

**Backs:** Part 1, chapters 2 and 4; Part 2, chapters 2 and 4.

Message history is the model's past. Every agent that runs for long enough changes it: to save tokens, to correct
a value, to drop a tool. How you change it decides what the model believes afterwards.

| What you do | What the model believes | Prompt cache |
| --- | --- | --- |
| **Leave it** | The old world, confidently. It won't re-check without a reason. | Kept |
| **Edit the past** (rewrite an old tool result) | The new past, and then doubts its own earlier decisions, which no longer fit the evidence. | Broken from the edit on |
| **Append a dated note** ("at 14:02 INV-2041 changed from open to paid") | Both facts, in order. Its past stays coherent. | Kept |
| **Delete** old turns or results | Some models disown their earlier turns ("did I make that up?"). | Broken |
| **Replace with a stub** ("[tool result cleared]") | Knows something was there; fetches it again when it matters. | Broken from the stub on |

Patterns that follow:

- **Append, don't rewrite.** When instructions or facts change mid-conversation, add the change to the history.
  In Pydantic AI, an instruction part with `on_change='append'` does this for you, and keeps the cached prefix.
- **Announce changes, and promise to.** "You will be told about external changes" makes models act on notices
  without re-checking; it is only safe if the notices really arrive.
- **Compaction is a history edit.** A summary can drop the one rule that mattered. Prefer clearing old tool results
  to a stub over summarising away decisions, and test what a compaction keeps.
- **Inject or let it fetch.** Injecting a snapshot is cheap and goes stale; a lookup tool is fresh and costs calls.
  Snapshot plus change notes is a common middle ground. Which is right is an experiment, not a rule.

## Docs

- Messages and chat history: https://pydantic.dev/docs/ai/core-concepts/message-history/
- Instructions that change during a conversation: https://pydantic.dev/docs/ai/capabilities/custom/
- Process history capability: https://pydantic.dev/docs/ai/capabilities/process-history/
- Compaction strategies (Harness, incl. clearing tool results): https://pydantic.dev/docs/ai/harness/compaction/
- Provider-native compaction: https://pydantic.dev/docs/ai/capabilities/compaction/
- System reminders (Harness): https://pydantic.dev/docs/ai/harness/system-reminders/
- Caching: https://pydantic.dev/docs/ai/capabilities/caching/
- Persistence: https://pydantic.dev/docs/ai/core-concepts/persistence/
