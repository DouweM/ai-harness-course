"""Chapter 4: history.

The agent keeps nothing between runs: you store the conversation and pass it back. By Friday Dana's thread is long,
and something has to make room. Cutting old messages loses Wednesday's correction; clearing old tool results keeps
every message and leaves a stub that says how to get the result back.
Run: uv run code/part2/ch4_history.py
"""

import _offline  # noqa: F401  (placeholder API keys; nothing is sent)

from dataclasses import dataclass
from datetime import date

from pydantic_ai import Agent, RunContext
from pydantic_ai.messages import ModelMessage, ModelResponse, TextPart, ToolCallPart, ToolReturnPart, UserPromptPart
from pydantic_ai.models.function import AgentInfo, FunctionModel

from billing import CLOSE_STARTS, CORRECTION, CORRECTION_RECEIVED, DANA, RECEIVED, WIRE, WIRE_RECEIVED, FakeBilling, Invoice


@dataclass
class Deps:
    billing: FakeBilling
    received: date


def make_agent(*capabilities) -> Agent[Deps, str]:
    agent = Agent('anthropic:claude-sonnet-5-5', deps_type=Deps, capabilities=list(capabilities),
                  instructions="You handle customers' emails about their invoices with us.")

    @agent.instructions
    def when_it_arrived(ctx: RunContext[Deps]) -> str:
        return f'This message was received on {ctx.deps.received:%A %Y-%m-%d}.'

    @agent.tool
    async def lookup_invoice(ctx: RunContext[Deps], invoice_number: str) -> Invoice | None:
        """Look up one of our invoices: amount, currency and status."""
        return await ctx.deps.billing.get_invoice(invoice_number)

    return agent


sent: list[list[ModelMessage]] = []


def looks_up_then_answers(messages: list[ModelMessage], info: AgentInfo) -> ModelResponse:
    """A stand-in for the model: look the invoice up once per day, then answer."""
    sent.append(messages)
    if isinstance(messages[-1].parts[-1], UserPromptPart):
        return ModelResponse(parts=[ToolCallPart('lookup_invoice', {'invoice_number': 'INV-2041'})])
    return ModelResponse(parts=[TextPart('Noted, thank you.')])


# --8<-- [start:store]
from pydantic_ai import ConversationTypeAdapter

agent = make_agent()
database: dict[str, bytes] = {}  # yours: a table keyed by conversation id

with agent.override(model=FunctionModel(looks_up_then_answers)):
    for day, email in [(RECEIVED, DANA), (CORRECTION_RECEIVED, CORRECTION), (CLOSE_STARTS, 'Is INV-2041 still open?')]:
        stored = database.get('dana')
        conversation = ConversationTypeAdapter.validate_json(stored) if stored else None  # maybe another process
        result = agent.run_sync(email, deps=Deps(FakeBilling(), day), conversation=conversation)
        database['dana'] = ConversationTypeAdapter.dump_json(result.conversation)  # store the whole thing

print('stored messages by Thursday night:', len(result.all_messages()))
# --8<-- [end:store]


def friday_page(*capabilities) -> list[ModelMessage]:
    """Run Friday's turn with these capabilities and return what the first request carried."""
    sent.clear()
    friday = make_agent(*capabilities)
    with friday.override(model=FunctionModel(looks_up_then_answers)):
        friday.run_sync(WIRE, deps=Deps(FakeBilling(), WIRE_RECEIVED),
                        conversation=ConversationTypeAdapter.validate_json(database['dana']))
    return sent[0]


def describe(page: list[ModelMessage]) -> None:
    prompts = [p.content for m in page for p in m.parts if isinstance(p, UserPromptPart)]
    results = [str(p.content)[:58] for m in page for p in m.parts if isinstance(p, ToolReturnPart)]
    print('  messages on the page: ', len(page))
    print("  Wednesday's correction:", 'there' if CORRECTION in prompts else 'GONE')
    print('  starts with:           ', type(page[0]).__name__, [type(p).__name__ for p in page[0].parts])
    print("  oldest lookup result:  ", results[0] if results else 'none')


# --8<-- [start:trim]
from pydantic_ai.capabilities import ProcessHistory

keep_the_last_four = ProcessHistory(lambda messages: messages[-4:])  # the old workaround: cut from the front
# --8<-- [end:trim]

# --8<-- [start:clear]
from pydantic_ai_harness.compaction import ClearToolResults

clear_old_results = ClearToolResults(
    max_messages=8,  # in production: max_fraction=0.7 of the model's window
    keep_pairs=1,  # the newest lookup stays
    placeholder='[Cleared to save space. Call lookup_invoice again if you need it.]',  # a stub, not a hole
)
# --8<-- [end:clear]

print('Friday, cut to the last four messages:')
describe(friday_page(keep_the_last_four))
print('Friday, old tool results cleared:')
describe(friday_page(clear_old_results))


# --8<-- [start:compaction]
from pydantic_ai_harness.compaction import SummarizingCompaction, TieredCompaction

compaction = TieredCompaction(
    tiers=[
        ClearToolResults(max_tokens=1, placeholder='[Cleared to save space. Call the tool again if you need it.]'),
        SummarizingCompaction(  # only when clearing isn't enough: a model call writes the summary
            model='anthropic:claude-haiku-5-5',
            max_messages=1,
            summary_prompt=(
                'Summarize this collections conversation so the agent can continue it. Keep every payment promise, '
                'correction, amount and date the customer gave, word for word.\n\n<messages>\n{messages}\n</messages>'
            ),
        ),
    ],
    target_fraction=0.7,  # of the model's context window, resolved per request
)
# --8<-- [end:compaction]
