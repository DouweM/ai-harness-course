"""Chapter 7: more than one agent, and workflows.

Friday afternoon Dana adds that the amount on INV-2041 looks wrong. The collections agent delegates to a dispute
classifier, as a tool. Each agent counts its own requests unless you hand it the parent's usage: a cost limit on the
parent never sees a classifier stuck retrying.
Run: uv run code/part2/ch7_multi.py
"""

import _offline  # noqa: F401  (placeholder API keys; nothing is sent)

# --8<-- [start:delegate]
from pydantic import BaseModel

from pydantic_ai import Agent, RunContext, ToolOutput, UsageLimits

from billing_world import Deps, read_email  # chapter 1's tool: the email is data, for both agents


class DisputeCheck(BaseModel):
    """The classifier's verdict: typed facts and doubts, so the parent's code can act on them."""

    is_dispute: bool
    invoice_number: str | None = None
    claimed_amount: str | None = None
    doubts: list[str] = []


# --8<-- [start:delegate_core]
classifier = Agent(
    'anthropic:claude-haiku-5-5',
    deps_type=Deps,
    instructions='Decide whether the email you are asked about disputes one of our invoices.',
    output_type=ToolOutput(DisputeCheck),
    tools=[read_email],
)
LIMITS = UsageLimits(request_limit=8)  # your cost ceiling for one email, for the whole tree

collections = Agent(
    'anthropic:claude-sonnet-5-5',
    name='collections',
    deps_type=Deps,
    instructions="You handle customers' emails about their invoices. Check for a dispute before recording a promise.",
    tools=[read_email],
)


@collections.tool
async def check_for_dispute(ctx: RunContext[Deps], email_id: str) -> DisputeCheck:
    """Ask the dispute classifier about an email."""
    ask = f'Does email {email_id} dispute one of our invoices?'
    result = await classifier.run(ask, deps=ctx.deps, usage=ctx.usage, usage_limits=LIMITS)  # one count, one ceiling
    return result.output
# --8<-- [end:delegate_core]
# --8<-- [end:delegate]


from pydantic_ai import UsageLimits
from pydantic_ai.exceptions import UsageLimitExceeded
from pydantic_ai.messages import ModelMessage, ModelResponse, TextPart, ToolCallPart
from pydantic_ai.models.function import AgentInfo, FunctionModel

from billing import DISPUTE_ID, WIRE_RECEIVED, FakeBilling, new_email


sent = [0]  # every request any agent in the tree sends, counted here


def keeps_asking(messages: list[ModelMessage], info: AgentInfo) -> ModelResponse:
    sent[0] += 1
    """The parent asks the classifier four times (its answers keep coming back unsure), then replies."""
    asked = sum(1 for m in messages for p in m.parts if getattr(p, 'tool_name', None) == 'check_for_dispute') // 2
    if asked < 4:
        return ModelResponse(parts=[ToolCallPart('check_for_dispute', {'email_id': DISPUTE_ID})])
    return ModelResponse(parts=[TextPart('A person on the billing team will look at the amount on INV-2041.')])


def retries_once(messages: list[ModelMessage], info: AgentInfo) -> ModelResponse:
    sent[0] += 1
    """The classifier's first answer fails validation every time, so each check costs two requests."""
    verdict = {'is_dispute': 'maybe'} if len(messages) == 1 else {'is_dispute': True, 'invoice_number': 'INV-2041',
                                                                   'claimed_amount': '3900', 'doubts': ['Quoted price not on file.']}
    return ModelResponse(parts=[ToolCallPart(info.output_tools[0].name, verdict)])


# --8<-- [start:limits]
limits = LIMITS

unshared = Agent('anthropic:claude-sonnet-5-5', deps_type=Deps)


@unshared.tool(name='check_for_dispute')
async def check_for_dispute_unshared(ctx: RunContext[Deps], email_id: str) -> DisputeCheck:
    """Ask the dispute classifier about an email."""
    ask = f'Does email {email_id} dispute one of our invoices?'
    return (await classifier.run(ask, deps=ctx.deps)).output  # no usage=: the classifier counts on its own
# --8<-- [end:limits]

for label, agent in (('without usage=ctx.usage', unshared), ('with usage=ctx.usage   ', collections)):
    sent[0] = 0
    with agent.override(model=FunctionModel(keeps_asking)), classifier.override(model=FunctionModel(retries_once)):
        try:
            result = agent.run_sync(new_email(DISPUTE_ID), deps=Deps(FakeBilling(), WIRE_RECEIVED), usage_limits=limits)
            print(f'{label}: finished; the limit counted {result.usage.requests} requests, {sent[0]} were sent')
        except UsageLimitExceeded as e:
            print(f'{label}: stopped: {str(e).split(".")[0]}')


# --8<-- [start:handoff]
class Escalation(BaseModel):
    """Hand this email to a person on the billing team."""

    reason: str
    invoice_number: str | None = None


class Reply(BaseModel):
    """A reply we can send the customer as is."""

    text: str


triage = Agent(  # a handoff is an output type: the run ends, and your code routes it
    'anthropic:claude-sonnet-5-5',
    instructions='Answer the customer, or escalate when a person has to decide.',
    output_type=[ToolOutput(Reply, name='reply'), ToolOutput(Escalation, name='escalate')],
)
# --8<-- [end:handoff]
