"""Chapter 2: instructions and deps.

Instructions are the operator's voice; deps are the facts your code knows. A fact baked into a prompt string at
import time goes stale while the service keeps running. An instructions function rebuilds it from this run's deps.
Run: uv run code/part2/ch2_instructions.py
"""

import _offline  # noqa: F401  (placeholder API keys; nothing is sent)

import re
from datetime import date, timedelta

from pydantic_ai.messages import ModelMessage, ModelResponse, ToolCallPart
from pydantic_ai.models.function import AgentInfo, FunctionModel

from billing import DANA_ID


def reads_the_page(messages: list[ModelMessage], info: AgentInfo) -> ModelResponse:
    """A stand-in for the model that does what models do: it reads the email, then works out "this Friday" from the date
    on its page."""
    if len(messages) == 1:
        return ModelResponse(parts=[ToolCallPart('read_email', {'email_id': DANA_ID})])
    today = date.fromisoformat(re.search(r'\d{4}-\d{2}-\d{2}', info.instructions or '')[0])
    friday = today + timedelta(days=(4 - today.weekday()) % 7)
    answer = {'is_commitment': True, 'invoice_number': 'INV-2041', 'due_date': friday.isoformat()}
    return ModelResponse(parts=[ToolCallPart(info.output_tools[0].name, answer)])


# --8<-- [start:baked]
from pydantic import BaseModel

from pydantic_ai import Agent, ToolOutput

from billing_world import read_email  # chapter 1's tool: Dana's email, as data


class PaymentCommitment(BaseModel):
    is_commitment: bool
    invoice_number: str | None = None
    due_date: date | None = None


STARTED = date(2026, 11, 12)  # the service was deployed last Thursday; stands in for date.today() at import

baked = Agent(
    'anthropic:claude-sonnet-5-5',
    instructions=f'Decide whether the customer email you are asked about commits to paying us. Today is {STARTED:%A %Y-%m-%d}.',
    output_type=ToolOutput(PaymentCommitment),
    tools=[read_email],
)
# --8<-- [end:baked]


# --8<-- [start:deps]
from dataclasses import dataclass

from pydantic_ai import RunContext

from billing import FakeBilling


@dataclass
class Deps:
    billing: FakeBilling
    received: date  # when this email arrived: a fact your code knows, per run


agent = Agent(
    'anthropic:claude-sonnet-5-5',
    deps_type=Deps,
    instructions='Decide whether the customer email you are asked about commits to paying us.',  # standing: static
    output_type=ToolOutput(PaymentCommitment),
    tools=[read_email],
)


@agent.instructions  # rebuilt for every request, from this run's deps
def when_it_arrived(ctx: RunContext[Deps]) -> str:
    return f'The email was received on {ctx.deps.received:%A %Y-%m-%d}.'
# --8<-- [end:deps]


# --8<-- [start:run]
from billing import DANA_ID, RECEIVED, new_email

deps = Deps(billing=FakeBilling(), received=RECEIVED)  # Tuesday 17 Nov, five days after deploy
with baked.override(model=FunctionModel(reads_the_page)):
    print('baked at import:', baked.run_sync(new_email(DANA_ID), deps=deps).output.due_date)
with agent.override(model=FunctionModel(reads_the_page)):
    print('from deps:      ', agent.run_sync(new_email(DANA_ID), deps=deps).output.due_date)
# --8<-- [end:run]


# --8<-- [start:append]
@dataclass
class CloseDeps(Deps):
    closing: bool = False  # month-end close is running


agent_with_close = Agent('anthropic:claude-sonnet-5-5', deps_type=CloseDeps, instructions='Handle this customer email.')


@agent_with_close.instructions(name='close', on_change='append')  # a value that can change mid-conversation
def close_notice(ctx: RunContext[CloseDeps]) -> str | None:
    return 'Month-end close is running: invoices cannot be marked paid until Monday.' if ctx.deps.closing else None
# --8<-- [end:append]
