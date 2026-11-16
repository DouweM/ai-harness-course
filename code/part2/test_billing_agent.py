"""Chapter 9: testing. Run: uv run pytest code/part2/test_billing_agent.py

Everything around the model's judgment is deterministic: which tools exist, what the gate holds, what a validator
sends back, what history reaches the model. Every idea from Part 2 gets a test, and none of them calls a model.
"""

import _offline  # noqa: F401  (placeholder API keys; nothing is sent)

# --8<-- [start:tests]
import asyncio

import pytest

from pydantic_ai import DeferredToolRequests, models
from pydantic_ai.messages import ModelMessage, ModelResponse, TextPart, ToolCallPart, ToolReturnPart
from pydantic_ai.models.function import AgentInfo, FunctionModel
from pydantic_ai.models.test import TestModel

from billing import CLOSE_STARTS, CORRECTION_ID, CORRECTION_RECEIVED, FakeBilling, new_email
from billing_world import Deps, collections, reminders

models.ALLOW_MODEL_REQUESTS = False  # a test can never reach a real model, even by accident


def test_the_approval_gate_holds():
    """TestModel calls every tool with generated arguments: a cheap adversary for your wiring."""
    deps = Deps(billing=FakeBilling(), received=CLOSE_STARTS)
    with reminders.override(model=TestModel()):
        result = reminders.run_sync('INV-2041 is overdue.', deps=deps)
    assert isinstance(result.output, DeferredToolRequests)
    assert {call.tool_name for call in result.output.approvals} == {'mark_paid'}  # record_payment's made-up
    # invoice was rejected by its args_validator, before any person was asked
    assert deps.billing.writes == []  # nothing was written without a person


def test_close_hides_mark_paid_and_says_so():
    seen: list[AgentInfo] = []

    def look(messages: list[ModelMessage], info: AgentInfo) -> ModelResponse:
        seen.append(info)
        return ModelResponse(parts=[TextPart('No reminder during close.')])

    with reminders.override(model=FunctionModel(look)):
        reminders.run_sync('INV-2041?', deps=Deps(billing=FakeBilling(), received=CLOSE_STARTS, closing=True))
    assert 'mark_paid' not in [t.name for t in seen[0].function_tools]
    assert 'close is running' in seen[0].instructions


def test_installments_that_add_up_wrong_go_back():
    def too_much_then_right(messages: list[ModelMessage], info: AgentInfo) -> ModelResponse:
        if len(messages) == 1:  # first, it reads the email
            return ModelResponse(parts=[ToolCallPart('read_email', {'email_id': CORRECTION_ID})])
        rest = '4120.00' if len(messages) == 3 else '2060.00'
        plan = [{'amount': '2060.00', 'due_date': '2026-11-20'}, {'amount': rest, 'due_date': '2026-11-30'}]
        return ModelResponse(parts=[ToolCallPart(info.output_tools[0].name, {'is_commitment': True, 'invoice_number': 'INV-2041', 'installments': plan})])

    from ch5_answer_form import Deps as FormDeps, agent as form_agent

    with form_agent.override(model=FunctionModel(too_much_then_right)):
        result = form_agent.run_sync(new_email(CORRECTION_ID), deps=FormDeps(FakeBilling(), CORRECTION_RECEIVED))
    assert sum(i.amount for i in result.output.installments) == 4120
    assert result.usage.requests == 3  # read the email, answered, sent back once by the validator


def test_a_forged_lookup_never_reaches_the_model():
    from ch8_interfaces import what_the_model_reads

    assert asyncio.run(what_the_model_reads('server')).endswith('4120.00, open')


def test_a_forgotten_override_fails_loudly():
    with pytest.raises(RuntimeError, match='ALLOW_MODEL_REQUESTS'):
        collections.run_sync('INV-2041?', deps=Deps(billing=FakeBilling(), received=CLOSE_STARTS))
# --8<-- [end:tests]
