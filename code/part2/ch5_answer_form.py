"""Chapter 5: the answer form.

The output type is the form the model fills in. Wednesday, Dana splits the payment: half Friday, the rest by the
30th. A form with one amount and one date can't hold that, so every model dropped half of the promise. A form with
installments holds it, and an output validator checks it against the ledger.
Run: uv run code/part2/ch5_answer_form.py
"""

import _offline  # noqa: F401  (placeholder API keys; nothing is sent)

import json
from pathlib import Path

RUNS = json.loads((Path(__file__).parent / 'data' / 'answer_form_runs.json').read_text())

# --8<-- [start:one]
from datetime import date
from decimal import Decimal

from pydantic import BaseModel


class OnePromise(BaseModel):  # Tuesday's form: one amount, one date
    is_commitment: bool
    invoice_number: str | None = None
    amount: Decimal | None = None
    due_date: date | None = None
# --8<-- [end:one]


# --8<-- [start:installments]
from dataclasses import dataclass

from pydantic_ai import Agent, ModelRetry, RunContext, ToolOutput

from billing import FakeBilling
from billing_world import read_email  # chapter 1's tool: Dana's email, as data


class Installment(BaseModel):
    amount: Decimal
    due_date: date


class Promise(BaseModel, use_attribute_docstrings=True):
    is_commitment: bool
    invoice_number: str | None = None
    installments: list[Installment] = []
    """One per amount and date the customer promised. A single payment is one installment."""


@dataclass
class Deps:
    billing: FakeBilling
    received: date


agent = Agent(
    'anthropic:claude-sonnet-5-5',
    deps_type=Deps,
    instructions='Decide whether the customer email you are asked about commits to paying us, and record the promise.',
    output_type=ToolOutput(Promise),
    tools=[read_email],
)


@agent.output_validator  # facts the form can't check on its own: they need your ledger
async def matches_the_ledger(ctx: RunContext[Deps], promise: Promise) -> Promise:
    if promise.invoice_number:
        invoice = await ctx.deps.billing.get_invoice(promise.invoice_number)
        if invoice is None:
            raise ModelRetry(f'There is no invoice {promise.invoice_number}. Leave it empty if unsure.')
        total = sum((i.amount for i in promise.installments), Decimal(0))
        if total > invoice.amount:
            raise ModelRetry(f'{invoice.number} is for {invoice.amount}; the installments add up to {total}.')
    return promise
# --8<-- [end:installments]


# What models did with each form, recorded live on 16 Nov 2026 (record_answer_form.py), counted here.
# --8<-- [start:recorded]
def kept_both_halves(output: dict) -> bool:
    parts = output.get('installments') or [{'amount': output.get('amount'), 'due_date': output.get('due_date')}]
    return sorted((Decimal(p['amount']), p['due_date']) for p in parts if p['amount']) == [
        (Decimal('2060'), '2026-11-20'), (Decimal('2060'), '2026-11-30')]


for arm in ('one', 'installments'):
    for model in dict.fromkeys(r['model'] for r in RUNS['runs']):
        rows = [r for r in RUNS['runs'] if r['arm'] == arm and r['model'] == model]
        kept = sum(kept_both_halves(r['output']) for r in rows)
        seen = sorted({f"{r['output'].get('amount')} on {r['output'].get('due_date')}" for r in rows}) if arm == 'one' else []
        print(f'{arm:12} {model.split(":")[1]:18} kept both halves {kept}/{len(rows)}  {"; ".join(seen)}')
# --8<-- [end:recorded]


# --8<-- [start:retry]
from pydantic_ai.messages import ModelMessage, ModelResponse, ToolCallPart, ToolReturnPart
from pydantic_ai.models.function import AgentInfo, FunctionModel

from billing import CORRECTION_ID, CORRECTION_RECEIVED, new_email


def adds_up_wrong_first(messages: list[ModelMessage], info: AgentInfo) -> ModelResponse:
    if len(messages) == 1:
        return ModelResponse(parts=[ToolCallPart('read_email', {'email_id': CORRECTION_ID})])
    second = '4120.00' if len(messages) == 3 else '2060.00'  # first answer: the rest, written as the full amount
    args = {'is_commitment': True, 'invoice_number': 'INV-2041',
            'installments': [{'amount': '2060.00', 'due_date': '2026-11-20'}, {'amount': second, 'due_date': '2026-11-30'}]}
    return ModelResponse(parts=[ToolCallPart(info.output_tools[0].name, args)])


with agent.override(model=FunctionModel(adds_up_wrong_first)):
    result = agent.run_sync(new_email(CORRECTION_ID), deps=Deps(FakeBilling(), CORRECTION_RECEIVED))
sent_back = result.all_messages()[4].parts[0]
assert isinstance(sent_back, ToolReturnPart)
print('model reads:', sent_back.model_response_str())
print('recorded:   ', [(str(i.amount), str(i.due_date)) for i in result.output.installments])
# --8<-- [end:retry]


# --8<-- [start:modes]
from pydantic_ai import NativeOutput, PromptedOutput

tool_form = ToolOutput(Promise)  # the model "calls" a final_result tool: works with every tool-calling model
native_form = NativeOutput(Promise)  # the provider's own structured-output mode
prompted_form = PromptedOutput(Promise)  # the schema goes in the instructions; the model answers in JSON text
either = [Promise, str]  # a union: the model can also answer in plain text
# --8<-- [end:modes]
