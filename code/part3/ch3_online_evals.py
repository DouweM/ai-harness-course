# /// script
# requires-python = ">=3.11"
# dependencies = ["pydantic-ai==2.68.0"]
# ///
"""Chapter 3: the same kind of evaluator on production traffic.

OnlineEvaluation runs evaluators in the background after each agent run, sampled, and emits the results as
OpenTelemetry events (Logfire shows them under Live Evaluations). Here a sink prints them instead.
A check that needs no label (did a write have evidence from the email?) can run on every run;
an LLM judge would get a small sample_rate.

Runs offline (TestModel). Run: uv run ch3_online_evals.py
"""

from __future__ import annotations

import asyncio
from collections.abc import Sequence
from dataclasses import dataclass

from eval_world import PaymentCommitment
from pydantic_ai import Agent
from pydantic_ai.models.test import TestModel
from pydantic_evals.evaluators import EvaluationResult, Evaluator, EvaluatorContext, EvaluatorFailure
from pydantic_evals.online import OnlineEvalConfig, OnlineEvaluator, wait_for_evaluations
from pydantic_evals.online_capability import OnlineEvaluation

seen: list[str] = []


async def print_sink(
    results: Sequence[EvaluationResult], failures: Sequence[EvaluatorFailure], context: EvaluatorContext
) -> None:
    for r in results:
        seen.append(f'{r.name}={r.value}')
        print(f'  run {str(context.name)[:8]}...: {r.name} = {r.value}')


@dataclass
class EvidenceQuotesTheEmail(Evaluator):
    """A commitment must quote words that are actually in the email."""

    def evaluate(self, ctx: EvaluatorContext) -> bool:
        out: PaymentCommitment = ctx.output
        return not out.is_commitment or bool(out.evidence and out.evidence in str(ctx.inputs))


agent = Agent(
    TestModel(custom_output_args={'is_commitment': True, 'addressed_to_us': True, 'evidence': 'paid this Friday'}),
    name='promise_agent',
    output_type=PaymentCommitment,
    capabilities=[
        OnlineEvaluation(
            evaluators=[OnlineEvaluator(evaluator=EvidenceQuotesTheEmail(), sample_rate=1.0)],
            config=OnlineEvalConfig(default_sink=print_sink),
        )
    ],
)


async def main() -> None:
    await agent.run('Hi, INV-2041 will be paid this Friday. Thanks, Dana')  # quote is in the email
    await agent.run('Hi, INV-2041 will be settled on Friday.')  # the same output quotes words that aren't
    await wait_for_evaluations()  # on shutdown, so pending evaluations finish
    assert sorted(seen) == ['EvidenceQuotesTheEmail=False', 'EvidenceQuotesTheEmail=True'], seen


if __name__ == '__main__':
    asyncio.run(main())
