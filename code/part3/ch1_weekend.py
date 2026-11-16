# /// script
# requires-python = ">=3.11"
# dependencies = ["pydantic-ai==2.68.0"]
# ///
"""Chapter 1: Dana's wire, approved over a weekend, on Part 2's collections agent.

Friday 17:40 the agent asks to record 2,060.00 against INV-2041. record_payment needs approval (Part 2, chapter 3),
so the run ends and the conversation is stored. Nothing runs over the weekend: the ledger has an outage on Saturday
and you deploy on Sunday. Monday a person approves, and a new run continues the stored conversation.

What Part 3 adds on top of Part 2:
  - the write is keyed on the tool call ID, so a step that runs again after a crash records once;
  - an outage at approval time is a ToolFailed, so the model doesn't tell Dana it was recorded;
  - a policy (HandleDeferredToolCalls) approves small amounts inside the run, and leaves the rest for a person;
  - limits and metadata on every run.

Runs offline: a FunctionModel plays the model. Run: uv run code/part3/ch1_weekend.py
"""

from __future__ import annotations

import asyncio
from decimal import Decimal

import _part2  # noqa: F401  (Part 2's code on the path)
from billing import WIRE, WIRE_RECEIVED, FakeBilling
from billing_world import Deps, collections
from pydantic_ai import (
    ConversationTypeAdapter,
    DeferredToolRequests,
    DeferredToolResults,
    ModelMessage,
    ModelResponse,
    RunContext,
    TextPart,
    ToolCallPart,
    UsageLimits,
)
from pydantic_ai.capabilities import HandleDeferredToolCalls
from pydantic_ai.messages import ToolReturnPart
from pydantic_ai.models.function import AgentInfo, FunctionModel


def model_that_records(invoice: str, amount: str) -> FunctionModel:
    """Looks the invoice up, asks to record the payment, then reports what the tool said."""

    def respond(messages: list[ModelMessage], info: AgentInfo) -> ModelResponse:
        returns = [p for m in messages for p in m.parts if isinstance(p, ToolReturnPart)]
        recorded = [p for p in returns if p.tool_name == 'record_payment']
        if recorded:
            return ModelResponse(parts=[TextPart(f'Tool said: {recorded[-1].model_response_str()}')])
        if returns:
            args = {'invoice_number': invoice, 'amount': amount}
            return ModelResponse(parts=[ToolCallPart('record_payment', args, tool_call_id='call_fri_1740')])
        return ModelResponse(parts=[ToolCallPart('lookup_invoice', {'invoice_number': invoice}, tool_call_id='call_lookup')])

    return FunctionModel(respond, model_name='stand-in')


STORE: dict[str, bytes] = {}  # your database: one row per conversation


# --8<-- [start:friday]
async def friday(billing: FakeBilling) -> str:
    result = await collections.run(
        WIRE,
        deps=Deps(billing=billing, received=WIRE_RECEIVED),
        usage_limits=UsageLimits(request_limit=8),  # a stuck loop stops at 8 requests
        metadata={'tenant': 't_042', 'agent_version': 'collections-2026-11-20'},  # lands on the run's trace
    )
    assert isinstance(result.output, DeferredToolRequests)  # the run is over: it waits for a person
    STORE[result.conversation_id] = ConversationTypeAdapter.dump_json(result.conversation)
    return result.conversation_id
# --8<-- [end:friday]


# --8<-- [start:monday]
async def monday(billing: FakeBilling, conversation_id: str) -> str:
    conversation = ConversationTypeAdapter.validate_json(STORE[conversation_id])  # in any process, after any deploy
    pending = conversation.deferred_tool_requests
    approvals = {call.tool_call_id: True for call in pending.approvals}  # what the person clicked
    result = await collections.run(
        conversation=conversation,
        deferred_tool_results=pending.build_results(approvals=approvals),
        deps=Deps(billing=billing, received=WIRE_RECEIVED),
    )
    return result.output
# --8<-- [end:monday]


# --8<-- [start:policy]
async def small_amounts(ctx: RunContext[Deps], requests: DeferredToolRequests) -> DeferredToolResults | None:
    """Approve payments up to 1,000 inside the run; return None for the rest, so they wait for a person."""
    small = {c.tool_call_id: True for c in requests.approvals if Decimal(str(c.args_as_dict()['amount'])) <= 1000}
    return requests.build_results(approvals=small) if small else None


# per run: collections.run(..., capabilities=[HandleDeferredToolCalls(small_amounts)])
# --8<-- [end:policy]


async def main() -> None:
    with collections.override(model=model_that_records('INV-2041', '2060.00')):
        billing = FakeBilling()
        conversation_id = await friday(billing)
        call = ConversationTypeAdapter.validate_json(STORE[conversation_id]).deferred_tool_requests.approvals[0]
        print(f'Friday 17:40: waiting for a person: {call.tool_name}({call.args_as_dict()}), key {call.tool_call_id}')
        print('Saturday, Sunday: ledger outage, a deploy. Nothing is running; one stored conversation.')

        print(f'Monday 09:15, approved: {await monday(billing, conversation_id)}')
        # The process died after the write, before the result was saved: the same approval runs again.
        await monday(billing, conversation_id)
        print(f'  crash, same call again: tool ran twice, payments recorded: {billing.payments}')
        assert billing.payments == [('INV-2041', Decimal('2060.00'))]

        down = FakeBilling(down=True)
        conversation_id = await friday(down)
        print(f'Monday, ledger still down: {await monday(down, conversation_id)}')
        print(f'  payments recorded: {down.payments}')
        assert down.payments == []

    print('A policy answers inside the run (HandleDeferredToolCalls):')
    for invoice, amount in (('INV-2050', '980.00'), ('INV-2041', '2060.00')):
        billing = FakeBilling()
        with collections.override(model=model_that_records(invoice, amount)):
            result = await collections.run(
                'Payment received.',
                deps=Deps(billing=billing, received=WIRE_RECEIVED),
                capabilities=[HandleDeferredToolCalls(small_amounts)],
            )
        kind = 'waits for a person' if isinstance(result.output, DeferredToolRequests) else 'approved by the policy'
        print(f'  {invoice} {amount}: {kind}  payments: {billing.payments}')


if __name__ == '__main__':
    asyncio.run(main())
