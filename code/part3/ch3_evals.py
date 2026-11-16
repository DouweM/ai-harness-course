# /// script
# requires-python = ">=3.11"
# dependencies = ["pydantic-ai==2.68.0"]
# ///
"""Chapter 3: the old single-shot call against the agent, on emails your team already corrected.

- Dataset: one case per email a person reviewed (data/corrections.jsonl), expected output = what they decided.
- Arm A: what runs today. One call, JSON with is_commitment and a confidence, written when confidence >= 70.
- Arm B: the agent. Typed output, a lookup_invoice tool, and code that writes only a commitment to a known invoice.
- Evaluators: did it decide like the team, and the one that matters most here: did it write a promise nobody made.
- Report: B against A as baseline, case by case. With LOGFIRE_TOKEN set, both experiments and every case's trace
  land in Logfire, where you compare them side by side.

Offline by default: each arm replays what a real model answered on 2026-11-13 (data/recorded_two_arms.json), through
the same agents and tools, so the numbers are real and the run is free.
    uv run ch3_evals.py                          # replay Claude Sonnet 5.5's recorded answers
    uv run ch3_evals.py --replay openai:gpt-6.1-sol
    uv run --env-file .env ch3_evals.py --live anthropic:claude-sonnet-5-5    # about $0.15 for both arms
"""

from __future__ import annotations

import argparse
import asyncio
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import logfire
from pydantic import BaseModel

from eval_world import PaymentCommitment, sample_invoices
from pydantic_ai import Agent, ModelMessage, ModelResponse, TextPart, ToolCallPart
from pydantic_ai.messages import ToolReturnPart
from pydantic_ai.models import Model
from pydantic_ai.models.function import AgentInfo, FunctionModel
from pydantic_evals import Case, Dataset, increment_eval_metric
from pydantic_evals.evaluators import Evaluator, EvaluatorContext

DATA = Path(__file__).parent / 'data'
INVOICES = sample_invoices()


class Email(BaseModel):
    text: str


@dataclass
class Decision:
    writes: bool  # record a payment promise in the ledger
    why: str


# ------------------------------------------------------------------ dataset: your team's corrections


def corrections_dataset() -> Dataset[Email, bool, dict[str, Any]]:
    rows = [json.loads(line) for line in (DATA / 'corrections.jsonl').read_text().splitlines()]
    return Dataset[Email, bool, dict[str, Any]](
        name='promise-routing',
        cases=[
            Case(name=r['id'], inputs=Email(text=r['email']), expected_output=r['is_commitment'], metadata=r)
            for r in rows
        ],
        evaluators=[DecidedLikeTheTeam(), NoPromiseNobodyMade()],
    )


@dataclass
class DecidedLikeTheTeam(Evaluator[Email, Decision]):
    def evaluate(self, ctx: EvaluatorContext[Email, Decision]) -> bool:
        return ctx.output.writes == ctx.expected_output


@dataclass
class NoPromiseNobodyMade(Evaluator[Email, Decision]):
    """The expensive mistake: a promise in the ledger that the customer never made."""

    def evaluate(self, ctx: EvaluatorContext[Email, Decision]) -> bool:
        return not (ctx.output.writes and not ctx.expected_output)


# ------------------------------------------------------------------ arm A: the call that runs today

A_INSTRUCTIONS = """You are a billing assistant. Classify the customer email.
Reply with JSON: {"is_commitment": bool, "confidence": 0-100}."""

single_shot = Agent(instructions=A_INSTRUCTIONS, output_type=str, name='single_shot_call')


# ------------------------------------------------------------------ arm B: the agent

agent = Agent(
    instructions='Decide whether this customer email commits to paying us.',
    output_type=PaymentCommitment,
    name='promise_agent',
)


@agent.tool_plain
def lookup_invoice(invoice_number: str) -> str:
    """Look up one of our invoices by number."""
    invoice = INVOICES.get(invoice_number)
    return f'{invoice.number}: {invoice.amount} {invoice.status}' if invoice else f'No invoice {invoice_number}.'


# ------------------------------------------------------------------ the two tasks the experiment compares


def make_tasks(model_for: Any):
    async def single_shot_call(email: Email) -> Decision:
        result = await single_shot.run(email.text, model=model_for('a', email))
        record_cost(result)
        reply = json.loads(result.output.strip().removeprefix('```json').removesuffix('```'))
        writes = bool(reply['is_commitment']) and reply['confidence'] >= 70
        return Decision(writes, f'is_commitment={reply["is_commitment"]}, confidence={reply["confidence"]}')

    async def typed_agent(email: Email) -> Decision:
        result = await agent.run(email.text, model=model_for('b', email))
        record_cost(result)
        out = result.output
        if out.is_commitment and out.addressed_to_us and out.invoice_number in INVOICES:
            return Decision(True, f'commitment to us for {out.invoice_number}')
        if out.is_commitment and out.addressed_to_us:
            return Decision(False, 'commitment without a known invoice: sent to a person')
        return Decision(False, 'not a commitment to us')

    return single_shot_call, typed_agent


def record_cost(result: Any) -> None:
    try:
        increment_eval_metric('cost_usd', float(result.response.cost().total_price))
    except LookupError:  # replayed FunctionModel responses have no price
        pass


# ------------------------------------------------------------------ offline: replay recorded answers


def replay(model_name: str):
    recorded = json.loads((DATA / 'recorded_two_arms.json').read_text())[model_name]
    by_email = {r['email']: r for r in recorded['cases']}

    def model_for(arm: str, email: Email) -> Model:
        row = by_email[email.text]

        def respond(messages: list[ModelMessage], info: AgentInfo) -> ModelResponse:
            if arm == 'a':
                return ModelResponse(parts=[TextPart(row['a_raw'])])
            looked_up = {p.tool_call_id for m in messages for p in m.parts if isinstance(p, ToolReturnPart)}
            pending = [n for i, n in enumerate(row['b_lookups']) if f'lookup_{i}' not in looked_up]
            if pending:  # the recorded run looked these invoices up first: so does the replay, through the real tool
                i = row['b_lookups'].index(pending[0])
                return ModelResponse(
                    parts=[ToolCallPart('lookup_invoice', {'invoice_number': pending[0]}, f'lookup_{i}')]
                )
            return ModelResponse(parts=[ToolCallPart(info.output_tools[0].name, row['b_output'])])

        return FunctionModel(respond, model_name=f'replay:{model_name}')

    return model_for, recorded


def live(model_name: str):
    return lambda arm, email: model_name


async def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('--replay', default='anthropic:claude-sonnet-5-5')
    parser.add_argument('--live', metavar='MODEL', help='run a real model instead of replaying (costs money)')
    args = parser.parse_args()

    logfire.configure(send_to_logfire='if-token-present', console=False)  # experiments + traces, if you have a token
    logfire.instrument_pydantic_ai()

    dataset = corrections_dataset()
    if args.live:
        print(
            f'Live run on {args.live}: {len(dataset.cases)} cases x 2 arms. Roughly $0.15 on Claude Sonnet 5.5, less on smaller models.'
        )
        model_for, label = live(args.live), args.live
    else:
        model_for, recorded = replay(args.replay)
        label = f'{args.replay}, replayed from {recorded["ran_at"][:10]}'
    single_shot_call, typed_agent = make_tasks(model_for)

    baseline = await dataset.evaluate(single_shot_call, name=f'A: single-shot call ({label})', progress=False)
    report = await dataset.evaluate(typed_agent, name=f'B: typed agent ({label})', progress=False)
    report.print(baseline=baseline, include_input=True, include_durations=False, width=160)

    # Read cases, not averages: every email where the two arms decided differently.
    a_by_name = {c.name: c for c in baseline.cases}
    print('Cases where A and B decided differently:')
    for case in report.cases:
        a = a_by_name[case.name]
        if a.output.writes != case.output.writes:
            right = 'B' if case.output.writes == case.expected_output else 'A'
            print(
                f'  {case.name}  team: {"write" if case.expected_output else "no write"}  A: {a.output.why}  B: {case.output.why}  -> {right} matches the team'
            )
            print(f'      "{case.inputs.text}"')
    for name, r in (('A', baseline), ('B', report)):
        wrong_writes = sum(not c.assertions['NoPromiseNobodyMade'].value for c in r.cases)
        agree = sum(c.assertions['DecidedLikeTheTeam'].value for c in r.cases)
        print(f'{name}: decided like the team on {agree}/{len(r.cases)}; wrote a promise nobody made on {wrong_writes}')


if __name__ == '__main__':
    asyncio.run(main())
