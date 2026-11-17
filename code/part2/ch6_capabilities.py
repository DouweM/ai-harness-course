"""Chapter 6, second half: capabilities package what goes on the page, for any agent.

Chapters 2 to 5 put the harness on one agent. Friday a second agent needs the same world: copy it, or package it.
This module moves the pieces into a capability one at a time and records what the reminders agent's request carries
after each move, during month-end close. Then the built-ins, the building blocks, and Coder taken apart.
Run: uv run code/part2/ch6_capabilities.py
"""

import _offline  # noqa: F401  (placeholder API keys; nothing is sent)

from dataclasses import dataclass
from datetime import date

from pydantic_ai import Agent, DeferredToolRequests, ModelMessagesTypeAdapter, RunContext, ToolDefinition
from pydantic_ai.capabilities import Capability
from pydantic_ai.messages import ModelMessage, ModelResponse, TextPart, ToolCallPart, UserPromptPart
from pydantic_ai.models.function import AgentInfo, FunctionModel

from billing import CLOSE_STARTS, FakeBilling


@dataclass
class Deps:
    billing: FakeBilling
    received: date
    closing: bool = False


def world(*, hide: bool, notice: bool, approval: bool) -> Capability[Deps]:
    """billing_world with some of its pieces moved in."""
    cap = Capability[Deps](id='billing_world')

    if notice:
        @cap.instructions(name='close', on_change='append')
        def close_notice(ctx: RunContext[Deps]) -> str | None:
            return 'Month-end close is running until Monday: mark_paid is unavailable, so say so.' if ctx.deps.closing else None

    async def hide_during_close(ctx: RunContext[Deps], tool_def: ToolDefinition) -> ToolDefinition | None:
        return None if ctx.deps.closing else tool_def

    @cap.tool(requires_approval=approval, prepare=hide_during_close if hide else None)
    async def mark_paid(ctx: RunContext[Deps], invoice_number: str) -> str:
        """Mark one of our invoices as paid."""
        await ctx.deps.billing.mark_paid(invoice_number, idempotency_key=ctx.tool_call_id)
        return f'{invoice_number} is marked as paid.'

    return cap


def reads_its_page(messages: list[ModelMessage], info: AgentInfo) -> ModelResponse:
    """A stand-in for the model: it marks the invoice paid if it can, and answers from what its page says."""
    if isinstance(messages[-1].parts[-1], UserPromptPart):
        return ModelResponse(parts=[ToolCallPart('mark_paid', {'invoice_number': 'INV-2045'}, tool_call_id='c1')])
    page = ModelMessagesTypeAdapter.dump_json(messages).decode()
    if 'close is running' in page:
        return ModelResponse(parts=[TextPart('Close is running, so I can mark INV-2045 paid on Monday.')])
    if 'Unknown tool' in page:
        return ModelResponse(parts=[TextPart("I wasn't able to mark INV-2045 paid. Please try again later.")])
    return ModelResponse(parts=[TextPart('Done: INV-2045 is marked paid.')])


# --8<-- [start:steps]
STEPS = [  # each step moves one more piece of chapters 2 to 5 into the capability
    ('Only the tool is copied, none of its rules', dict(hide=False, notice=False, approval=False), True),
    ('Add the rule that hides mark_paid during close', dict(hide=True, notice=False, approval=False), True),
    ('Add the close notice too', dict(hide=True, notice=True, approval=False), True),
    ('Add approval too (now it is Monday, close is over)', dict(hide=True, notice=True, approval=True), False),
]
# --8<-- [end:steps]

for title, pieces, closing in STEPS:
    seen: list[AgentInfo] = []

    def record(messages: list[ModelMessage], info: AgentInfo) -> ModelResponse:
        seen.append(info)
        return reads_its_page(messages, info)

    billing = FakeBilling()
    reminders = Agent(FunctionModel(record), deps_type=Deps, output_type=[str, DeferredToolRequests],
                      instructions='Draft the reminder for this invoice, or say why none should go out.',
                      capabilities=[world(**pieces)])
    result = reminders.run_sync('INV-2045 was paid in full by wire this morning. Mark it paid.', deps=Deps(billing, CLOSE_STARTS, closing))
    out = result.output
    print(title)
    print('  tools offered:', [t.name for t in seen[0].function_tools] or 'none')
    print('  close notice: ', 'on the page' if 'close is running' in (seen[0].instructions or '') else 'none')
    print('  outcome:      ', 'waits for a person' if isinstance(out, DeferredToolRequests) else out)
    print('  ledger writes:', len(billing.writes))


import contextlib
import io

with contextlib.redirect_stdout(io.StringIO()):
    import ch4_history  # noqa: F401  (runs chapter 4 once, quietly, so the import below prints nothing)

# --8<-- [start:builtins]
from pydantic_ai.capabilities import Caching, ModelFallback
from pydantic_ai_harness.compaction import ClearToolResults
from pydantic_ai_harness.system_reminders import Reminder, SystemReminders

from ch4_history import compaction  # chapter 4's: clear first, then summarize with its who-said-what prompt

builtins = [
    compaction,
    SystemReminders(reminders=[Reminder('Amounts come from lookup_invoice, never the email.', interval=5, tag=None)]),
    # chapter 1's rule that never reached the model, re-stated every fifth request of a long run
    Caching(),  # reuse the unchanged start of the conversation, where the provider supports it
    ModelFallback('openai:gpt-6.1-sol'),  # per request: API errors, refusals, cut-off replies (2.64+)
]
# --8<-- [end:builtins]


# --8<-- [start:subclass]
from pydantic_ai.capabilities import AbstractCapability
from pydantic_ai.messages import InstructionPart


@dataclass
class ReadOnlyDuringClose(AbstractCapability[Deps]):
    """The close rule as a class: hide every writing tool, and say so. Configurable, testable, publishable."""

    writing_tools: frozenset[str] = frozenset({'mark_paid', 'record_payment'})
    id: str | None = 'read_only_during_close'

    def get_instructions(self):  # what the model is told
        def notice(ctx: RunContext[Deps]) -> InstructionPart | None:
            if not ctx.deps.closing:
                return None
            return InstructionPart('Month-end close is running: you can read, not write.', name='close', on_change='append')

        return notice

    async def prepare_tools(self, ctx: RunContext[Deps], tool_defs: list[ToolDefinition]) -> list[ToolDefinition]:
        if not ctx.deps.closing:  # which tools this request offers
            return tool_defs
        return [t for t in tool_defs if t.name not in self.writing_tools]
# --8<-- [end:subclass]


# --8<-- [start:coder]
from pydantic_ai_harness.coder import Coder  # uv add "pydantic-ai-harness[coder]"

coder = Coder()
print([type(part).__name__ for part in coder.capabilities if not type(part).__name__.startswith('_')])
cleared = next(part for part in coder.capabilities if isinstance(part, ClearToolResults))
print(f'a cleared file read becomes: {cleared.placeholder!r}, past {cleared.max_fraction:.0%} of the window')
# --8<-- [end:coder]


# --8<-- [start:reviewer]
from pydantic_ai.capabilities import LocalWorkspace
from pydantic_ai_harness.filesystem import FileSystem
from pydantic_ai_harness.repo_context import RepoContext
from pydantic_ai_harness.shell import Shell

reviewer = Agent(  # Coder's pieces, chosen yourself: no write tools; shell limited to git and pytest
    'anthropic:claude-sonnet-5-5',
    instructions='Review the change in this repository. Run the tests. Do not edit files.',
    capabilities=[
        LocalWorkspace('.'),
        FileSystem(read_only=True),
        Shell(allowed_commands=['git', 'pytest']),
        RepoContext(),
        ClearToolResults(max_fraction=0.7, placeholder='[Cleared to save space. Read the file again if you need it.]'),
    ],
)
# --8<-- [end:reviewer]
