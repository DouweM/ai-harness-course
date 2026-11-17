"""Chapter 3: tools.

A tool is a contract the model reads: a name, a description and a JSON schema. Your code decides which tools a
request offers, which need a person, and what the model hears back. Thursday, month-end close starts: mark_paid
leaves the page. Hidden alone, the model can't say why. One appended line fixes that.
Run: uv run code/part2/ch3_tools.py
"""

import _offline  # noqa: F401  (placeholder API keys; nothing is sent)

# --8<-- [start:tools]
from dataclasses import dataclass
from datetime import date

from pydantic_ai import Agent, DeferredToolRequests, ModelRetry, RunContext, ToolDefinition

from billing import FakeBilling, Invoice


@dataclass
class Deps:
    billing: FakeBilling
    received: date
    closing: bool = False  # month-end close is running


# --8<-- [start:tools_core]
agent = Agent(
    'anthropic:claude-sonnet-5-5',
    deps_type=Deps,
    instructions="You handle customers' emails about their invoices with us.",
    output_type=[str, DeferredToolRequests],  # a run can end by asking a person to approve a call
)


@agent.tool
async def lookup_invoice(ctx: RunContext[Deps], invoice_number: str) -> Invoice:
    """Look up one of our invoices: amount, currency and status."""
    invoice = await ctx.deps.billing.get_invoice(invoice_number)
    if invoice is None:
        raise ModelRetry(f'There is no invoice {invoice_number}. Check the number in the email.')
    return invoice


async def hide_during_close(ctx: RunContext[Deps], tool_def: ToolDefinition) -> ToolDefinition | None:
    return None if ctx.deps.closing else tool_def  # None: this request doesn't offer the tool


@agent.tool(requires_approval=True, prepare=hide_during_close)  # a person decides; gone during close
async def mark_paid(ctx: RunContext[Deps], invoice_number: str) -> str:
    """Mark one of our invoices as paid."""
    await ctx.deps.billing.mark_paid(invoice_number, idempotency_key=ctx.tool_call_id)  # safe to retry
    return f'{invoice_number} is marked as paid.'
# --8<-- [end:tools_core]
# --8<-- [end:tools]


from pydantic_ai import ModelMessagesTypeAdapter
from pydantic_ai.messages import ModelMessage, ModelResponse, TextPart, ToolCallPart, ToolReturnPart
from pydantic_ai.models.function import AgentInfo, FunctionModel

from billing import CLOSE_STARTS


def page_text(messages: list[ModelMessage], info: AgentInfo) -> str:
    return (info.instructions or '') + ModelMessagesTypeAdapter.dump_json(messages).decode()


def tries_mark_paid(messages: list[ModelMessage], info: AgentInfo) -> ModelResponse:
    """A stand-in for the model. It used mark_paid on Wednesday, so it tries again; then it answers from its page."""
    if len(messages) == 1:
        return ModelResponse(parts=[ToolCallPart('mark_paid', {'invoice_number': 'INV-2041'})])
    if 'close is running' in page_text(messages, info):
        return ModelResponse(parts=[TextPart('Month-end close is running, so I can mark INV-2041 paid on Monday.')])
    return ModelResponse(parts=[TextPart("I wasn't able to mark INV-2041 as paid. Please try again later.")])


# --8<-- [start:hidden]
billing = FakeBilling()
with agent.override(model=FunctionModel(tries_mark_paid)):
    result = agent.run_sync('Please mark INV-2041 paid, the wire went out.', deps=Deps(billing, CLOSE_STARTS, closing=True))

sent_back = result.all_messages()[2].parts[0]
assert isinstance(sent_back, ToolReturnPart)
print('model reads:', sent_back.model_response_str())
print('model says: ', result.output)
print('ledger writes:', billing.writes)
# --8<-- [end:hidden]


# --8<-- [start:notice]
@agent.instructions(name='close', on_change='append')  # say why, on the page, when it changes
def close_notice(ctx: RunContext[Deps]) -> str | None:
    if ctx.deps.closing:
        return 'Month-end close is running until Monday: mark_paid is unavailable, so say so.'
    return None
# --8<-- [end:notice]


# --8<-- [start:fixed]
with agent.override(model=FunctionModel(tries_mark_paid)):
    result = agent.run_sync('Please mark INV-2041 paid, the wire went out.', deps=Deps(billing, CLOSE_STARTS, closing=True))
print('model says: ', result.output)
# --8<-- [end:fixed]


# --8<-- [start:approval]
def asks_to_mark_paid(messages: list[ModelMessage], info: AgentInfo) -> ModelResponse:
    return ModelResponse(parts=[ToolCallPart('mark_paid', {'invoice_number': 'INV-2041'}, tool_call_id='call_1')])


billing = FakeBilling()
with agent.override(model=FunctionModel(asks_to_mark_paid)):
    result = agent.run_sync('Please mark INV-2041 paid.', deps=Deps(billing, CLOSE_STARTS))

assert isinstance(result.output, DeferredToolRequests)  # the run ends; nothing holds a process open
print('waiting for a person:', [(call.tool_name, call.args) for call in result.output.approvals])
print('ledger writes:', billing.writes)
# --8<-- [end:approval]


# --8<-- [start:errors]
from decimal import Decimal

from pydantic_ai import ToolFailed

from billing import WIRE_RECEIVED, LedgerUnavailable


@agent.tool
async def record_payment(ctx: RunContext[Deps], invoice_number: str, amount: Decimal) -> str:
    """Record a payment we received against one of our invoices."""
    if await ctx.deps.billing.get_invoice(invoice_number) is None or amount <= 0:
        raise ModelRetry('Use one of our invoice numbers and a positive amount, like 2060.00.')  # its mistake
    try:
        return await ctx.deps.billing.record_payment(invoice_number, amount, idempotency_key=ctx.tool_call_id)
    except LedgerUnavailable:  # our outage: not the model's to fix, and nothing happened
        raise ToolFailed('Nothing was recorded: the ledger is unavailable. Tell the customer it will be recorded later.')
# --8<-- [end:errors]


def records_once(messages: list[ModelMessage], info: AgentInfo) -> ModelResponse:
    if len(messages) == 1:
        return ModelResponse(parts=[ToolCallPart('record_payment', {'invoice_number': 'INV-2041', 'amount': '2060.00'})])
    return ModelResponse(parts=[TextPart('ok')])


for down in (False, True):
    billing = FakeBilling(down=down)
    with agent.override(model=FunctionModel(records_once)):
        result = agent.run_sync('Dana wired 2,060.00 for INV-2041.', deps=Deps(billing, WIRE_RECEIVED))
    part = result.all_messages()[2].parts[0]
    print(f'ledger {"down" if down else "up  "}: {part.outcome:7} {part.model_response_str()[:70]}')
