"""Reference: how harnesses are composed in Pydantic AI.

A harness is the list of capabilities on an agent. This module shows, offline, what that list does to one request:
the order contributions combine in, how hooks nest, what happens when two capabilities collide, Coder taken apart,
a collections harness of our own built from Part 2's billing world, and delegation to a sub-agent.
Run: uv run code/reference/composing_harnesses.py
"""

import _part2  # noqa: F401  (Part 2's billing world on the path; placeholder API keys, nothing is sent)

import logging
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from pydantic_ai import Agent, ModelSettings
from pydantic_ai.exceptions import UserError
from pydantic_ai.messages import ModelMessage, ModelResponse, TextPart, ToolCallPart, ToolReturnPart
from pydantic_ai.models.function import AgentInfo, FunctionModel

from billing import CLOSE_STARTS, DISPUTE_ID, WIRE_RECEIVED, FakeBilling, new_email
from billing_world import Deps, audit, billing_world

logging.getLogger('billing').addHandler(logging.NullHandler())


def section(title: str) -> None:
    print(f'\n== {title}')


def stand_in(script):
    """A FunctionModel for a scripted stand-in. Some capabilities stream, so it answers both ways."""

    async def stream(messages: list[ModelMessage], info: AgentInfo):
        response = script(messages, info)
        text = ''.join(p.content for p in response.parts if isinstance(p, TextPart))
        yield text

    return FunctionModel(script, stream_function=stream)


# --8<-- [start:harness]
from pydantic_ai.capabilities import AbstractCapability, CombinedCapability
from pydantic_ai_harness.compaction import ClearToolResults


@dataclass
class Temperature(AbstractCapability[Any]):
    """Model settings, as a capability: one fixed id, so two of them on an agent merge."""

    temperature: float = 0.0
    id: str | None = 'temperature'

    def get_model_settings(self) -> ModelSettings:
        return ModelSettings(temperature=self.temperature)


class CollectionsHarness(CombinedCapability[Deps]):
    """Every agent in the collections world gets this list. Change a piece by flag, or compose your own list."""

    def __init__(self, *, audit_tools: bool = True, history: AbstractCapability[Deps] | None = None):
        parts: list[AbstractCapability[Deps]] = [
            billing_world,  # instructions and tools: Part 2, chapters 2 to 6
            Temperature(temperature=0.0),  # model settings: the same email gets the same reading
            history or ClearToolResults(max_fraction=0.7),  # history: clear old tool results past 70% of the window
        ]
        if audit_tools:
            parts.append(audit)  # a hook after every tool call
        super().__init__(parts)


collections = Agent(
    'anthropic:claude-sonnet-5-5',
    deps_type=Deps,
    instructions="You handle customers' emails about their invoices with us, and record what they promise.",
    capabilities=[CollectionsHarness()],
)
reminders = Agent(  # the same harness, one setting changed by adding a capability after it
    'anthropic:claude-sonnet-5-5',
    deps_type=Deps,
    instructions='Draft the reminder for this invoice, or say why none should go out.',
    capabilities=[CollectionsHarness(audit_tools=False), Temperature(temperature=0.4)],
)
# --8<-- [end:harness]

section('one request from the collections agent, Thursday during close')
seen: list[AgentInfo] = []


def look(messages: list[ModelMessage], info: AgentInfo) -> ModelResponse:
    seen.append(info)
    return ModelResponse(parts=[TextPart('Close is running, so I can mark INV-2041 paid on Monday.')])


for name, agent in (('collections', collections), ('reminders', reminders)):
    seen.clear()
    with agent.override(model=stand_in(look)):
        agent.run_sync('Mark INV-2041 paid.', deps=Deps(FakeBilling(), CLOSE_STARTS, closing=True))
    info = seen[0]
    print(f'{name}:')
    for i, part in enumerate((info.instructions or '').split('\n\n'), 1):
        print(f'  instructions {i}: ' + part.replace('\n', '\n' + ' ' * 18))
    print('  tools offered: ', [t.name for t in info.function_tools])
    print('  model settings:', info.model_settings)


section('hooks from two capabilities around one model request and one tool call')
# --8<-- [start:order]
from pydantic_ai.capabilities import Hooks

trace: list[str] = []


def traced(name: str) -> Hooks[Deps]:
    hooks = Hooks[Deps]()

    @hooks.on.model_request  # wrap_model_request
    async def around_request(ctx, *, request_context, handler):
        trace.append(f'{name}: wrap enter')
        response = await handler(request_context)
        trace.append(f'{name}: wrap exit')
        return response

    @hooks.on.before_model_request
    async def before_request(ctx, request_context):
        trace.append(f'{name}: before')
        return request_context

    @hooks.on.after_model_request
    async def after_request(ctx, *, request_context, response):
        trace.append(f'{name}: after')
        return response

    @hooks.on.tool_execute  # wrap_tool_execute
    async def around_tool(ctx, *, call, tool_def, args, handler):
        trace.append(f'{name}: wraps {tool_def.name}')
        return await handler(args)

    return hooks


ordered = Agent('anthropic:claude-sonnet-5-5', deps_type=Deps, capabilities=[traced('A'), traced('B'), billing_world])
# --8<-- [end:order]


def lookup_then_answer(messages: list[ModelMessage], info: AgentInfo) -> ModelResponse:
    if len(messages) == 1:
        return ModelResponse(parts=[ToolCallPart('lookup_invoice', {'invoice_number': 'INV-2041'})])
    return ModelResponse(parts=[TextPart('INV-2041 is open.')])


with ordered.override(model=stand_in(lookup_then_answer)):
    ordered.run_sync('Is INV-2041 open?', deps=Deps(FakeBilling(), CLOSE_STARTS))
first_request = trace[: trace.index('A: wraps lookup_invoice')]
print('model request:', ' > '.join(first_request))
print('tool call:    ', ' > '.join(t for t in trace if 'wraps' in t))


section('conflicts')
# --8<-- [start:conflicts]
from pydantic_ai.capabilities import Capability

ledger = Capability[Deps](id='ledger')


@ledger.tool_plain
def lookup_invoice(invoice_number: str) -> str:
    """Look up an invoice in the general ledger."""
    return f'{invoice_number}: posted'


clash = Agent('anthropic:claude-sonnet-5-5', deps_type=Deps, capabilities=[billing_world, ledger])
fixed = Agent('anthropic:claude-sonnet-5-5', deps_type=Deps, capabilities=[billing_world, ledger.prefix_tools('ledger')])
# --8<-- [end:conflicts]

for label, agent in (('same tool name twice', clash), ('ledger.prefix_tools("ledger")', fixed)):
    seen.clear()
    try:
        with agent.override(model=stand_in(look)):
            agent.run_sync('Is INV-2041 open?', deps=Deps(FakeBilling(), WIRE_RECEIVED))
        print(f'{label}: tools offered {[t.name for t in seen[0].function_tools]}')
    except UserError as e:
        print(f'{label}: UserError: {str(e).split(".")[0]}')

try:
    Agent('anthropic:claude-sonnet-5-5', capabilities=[Capability(id='rules'), Capability(id='rules')])
    print('two capabilities, one chosen id: no error')
except UserError as e:
    print(f'two capabilities, one chosen id: UserError: {str(e).split(".")[0]}')

seen.clear()
merged = Agent(stand_in(look), deps_type=Deps, capabilities=[Temperature(temperature=0.0), Temperature(temperature=0.4)])
merged.run_sync('hi', deps=Deps(FakeBilling(), WIRE_RECEIVED))
print('Temperature(temperature=0.0) then Temperature(temperature=0.4), fixed id:', seen[-1].model_settings)
seen.clear()
merged.run_sync('hi', deps=Deps(FakeBilling(), WIRE_RECEIVED), capabilities=[Temperature(temperature=0.9)])
print('the same agent, run(capabilities=[Temperature(temperature=0.9)]):', seen[-1].model_settings)


section('Coder, taken apart')
# --8<-- [start:coder]
from pydantic_ai.capabilities import LocalWorkspace
from pydantic_ai_harness.coder import Coder

for i, part in enumerate(Coder().capabilities, 1):  # a CombinedCapability: a list you can read
    print(f'{i:>2}. {type(part).__name__}')
# --8<-- [end:coder]

tmp = tempfile.TemporaryDirectory()
project = Path(tmp.name)
(project / 'AGENTS.md').write_text('Run pytest before you finish.\n')
for label, coder_cap in (
    ('Coder()', Coder()),
    ('Coder(sub_agents=False, repo_context=False)', Coder(sub_agents=False, repo_context=False)),
):
    seen.clear()
    agent = Agent(stand_in(look), capabilities=[LocalWorkspace(str(project)), coder_cap])
    agent.run_sync('Add a --verbose flag.')
    instructions = seen[0].instructions or ''
    print(f'{label}:')
    print('  tools offered:', [t.name for t in seen[0].function_tools])
    print('  AGENTS.md in the instructions:', 'Run pytest before you finish.' in instructions)
    print('  sub-agent roster in the instructions:', 'Available sub-agents' in instructions)


tmp.cleanup()


section('delegation: a sub-agent in the same world')
# --8<-- [start:delegate]
from pydantic_ai_harness.subagents import SubAgent, SubAgents

disputes = Agent(
    'anthropic:claude-haiku-5-5',
    name='disputes',
    description='Decides whether a customer email disputes one of our invoices.',
    deps_type=Deps,
    instructions='Read the email and say whether it disputes an invoice, and which amount.',
    capabilities=[billing_world],  # the same world: read_email, lookup_invoice, the close rule
)
lead = Agent(
    'anthropic:claude-sonnet-5-5',
    deps_type=Deps,
    instructions="You handle customers' emails about their invoices with us.",
    capabilities=[CollectionsHarness(), SubAgents(agents=[SubAgent(disputes)])],  # adds delegate_task
)
# --8<-- [end:delegate]

lead_tools: list[str] = []


def lead_script(messages: list[ModelMessage], info: AgentInfo) -> ModelResponse:
    lead_tools[:] = [t.name for t in info.function_tools]
    returned = [p for m in messages for p in m.parts if isinstance(p, ToolReturnPart)]
    if not returned:
        task = 'Email 889 from Dana: does it dispute INV-2041? Read it with read_email.'
        return ModelResponse(parts=[ToolCallPart('delegate_task', {'agent_name': 'disputes', 'task': task})])
    return ModelResponse(parts=[TextPart(f'Handed to a person: {returned[-1].content}')])


def disputes_script(messages: list[ModelMessage], info: AgentInfo) -> ModelResponse:
    returned = [p for m in messages for p in m.parts if isinstance(p, ToolReturnPart)]
    if not returned:
        return ModelResponse(parts=[ToolCallPart('read_email', {'email_id': DISPUTE_ID})])
    if '3,900' in str(returned[-1].content):  # it read the email through the lead's deps
        return ModelResponse(parts=[TextPart('INV-2041 is disputed: the customer says they were quoted 3,900.')])
    return ModelResponse(parts=[TextPart('No dispute.')])


with lead.override(model=stand_in(lead_script)), disputes.override(model=stand_in(disputes_script)):
    result = lead.run_sync(new_email(DISPUTE_ID), deps=Deps(FakeBilling(), WIRE_RECEIVED))
print('lead tools offered:', lead_tools)
print('lead output:', result.output)
print('requests counted on the lead run (lead and delegate):', result.usage.requests)
