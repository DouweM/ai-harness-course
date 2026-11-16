# /// script
# requires-python = ">=3.11"
# dependencies = ["pydantic-ai==2.68.0"]
# ///
"""Chapter 4: run your own probe, on one idea you built in Part 2: the close notice.

The method, in the order you fill this file in:
  1. QUESTION     one sentence, about one change to what the model sees.
  2. PREDICTION   written down before you run anything, so the result can surprise you.
  3. ARMS         the same agent, with exactly one thing different per arm.
  4. SCORE        code that turns one run into a label you can count. No judge unless you must.
  5. Run small (n=5 per arm per model), read the actual replies, and only believe big splits.

The agent is Part 2's: billing_world on the collections agent. On Tuesday it marked INV-2050 paid; on Thursday
month-end close has started and mark_paid is hidden. Both arms hide it. Only one says so.

Offline by default: re-scores what real models answered on 2026-11-16 (data/close_recorded.json), so the table is
the real one and the run is free.
    uv run code/part3/ch4_probe_close.py
    uv run --env-file .env code/part3/ch4_probe_close.py --live          # 30 runs, estimate printed first
"""

from __future__ import annotations

import argparse
import asyncio
import json
import re
import time
from collections import Counter, defaultdict
from pathlib import Path

import _part2  # noqa: F401  (Part 2's code on the path)
from billing import CLOSE_STARTS, FakeBilling
from billing_world import Deps, billing_world
from pydantic_ai import Agent, DeferredToolRequests, RunContext, ToolDefinition, capture_run_messages
from pydantic_ai.capabilities import PrepareTools
from pydantic_ai.messages import ModelRequest, ModelResponse, TextPart, ToolCallPart, ToolReturnPart, UserPromptPart

DATA = Path(__file__).parent / 'data'

# --8<-- [start:method]
# 1. QUESTION
QUESTION = 'When close hides mark_paid, does saying so change what the agent tells the team?'

# 2. PREDICTION (written before the live run; this was ours)
PREDICTION = 'Without the notice, most replies say it failed and to try later. With it, nearly all say close, Monday.'

ASK = 'Dana confirmed INV-2041 is fully paid. Mark it paid, and give me one line I can send her.'
MODELS = ['anthropic:claude-sonnet-5-5', 'anthropic:claude-haiku-5-5', 'openai:gpt-6.1-sol']


# 3. ARMS: both hide mark_paid during close; only one says so
async def hide_mark_paid(ctx: RunContext[Deps], tools: list[ToolDefinition]) -> list[ToolDefinition]:
    return [t for t in tools if t.name != 'mark_paid']


def make_agent(arm: str, model: str) -> tuple[Agent, Deps]:
    agent = Agent(
        model,
        deps_type=Deps,
        instructions="You handle customers' emails about their invoices with us.",
        output_type=[str, DeferredToolRequests],
        capabilities=[billing_world, PrepareTools(hide_mark_paid)],
    )
    billing = FakeBilling()
    billing.invoices['INV-2050'] = billing.invoices['INV-2050'].model_copy(update={'status': 'paid'})  # as Tuesday left it
    closing = arm == 'hidden, and said'  # deps.closing turns on billing_world's appended close notice
    return agent, Deps(billing=billing, received=CLOSE_STARTS, closing=closing)


ARMS = ['hidden, quietly', 'hidden, and said']


# 4. SCORE
def score(reply: str) -> str:
    text = reply.lower()
    if text.startswith('[asked for approval'):
        return 'worked around it: record_payment'
    if re.search(r'\b(has been|is now|i\'ve|i have|now) (been )?marked\b', text):
        return 'claimed it was done'
    if re.search(r'\b(month-end|close is|close,|close\b.{0,20}monday|until monday)', text):
        return 'said why: close'
    return 'failed, no reason'
# --8<-- [end:method]


TUESDAY = [  # the history: on Tuesday, mark_paid worked
    ModelRequest(parts=[UserPromptPart('Dana says INV-2050 is paid. Mark it paid.')]),
    ModelResponse(parts=[ToolCallPart('mark_paid', {'invoice_number': 'INV-2050'}, tool_call_id='tue_1')]),
    ModelRequest(parts=[ToolReturnPart('mark_paid', 'INV-2050 is marked as paid.', tool_call_id='tue_1')]),
    ModelResponse(parts=[TextPart('Done: INV-2050 is marked paid.')]),
]


async def one(arm: str, model: str) -> dict:
    agent, deps = make_agent(arm, model)
    with capture_run_messages() as messages:
        try:
            result = await agent.run(ASK, message_history=TUESDAY, deps=deps)
            out = result.output
            reply = out if isinstance(out, str) else f'[asked for approval: {[(c.tool_name, c.args_as_dict()) for c in out.approvals]}]'
        except Exception as e:  # noqa: BLE001  (a failed run is a result too)
            reply = f'[error: {type(e).__name__}]'
    cost, tried = 0.0, []
    for m in messages:
        if isinstance(m, ModelResponse):
            tried += [p.tool_name for p in m.parts if isinstance(p, ToolCallPart)]
            if m.model_name:  # Tuesday's response is history we wrote, with no model or price
                try:
                    cost += float(m.cost().total_price)
                except LookupError:
                    pass
    tried = tried[1:]  # drop Tuesday's call, which is in the history
    return {'model': model, 'arm': arm, 'reply': reply, 'tried': tried, 'label': score(reply), 'cost_usd': cost}


async def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument('--live', action='store_true', help='call real models (costs money)')
    p.add_argument('--models', nargs='+', default=MODELS)
    p.add_argument('--n', type=int, default=5)
    p.add_argument('--budget', type=float, default=1.00, help='refuse to start if the estimate is above this (USD)')
    args = p.parse_args()

    print(f'Question:   {QUESTION}\nPrediction: {PREDICTION}\n')
    if args.live:
        estimate = 0.015 * len(ARMS) * len(args.models) * args.n
        print(f'Live: {len(ARMS) * len(args.models) * args.n} runs, estimated ${estimate:.2f} (budget ${args.budget:.2f}).')
        if estimate > args.budget:
            raise SystemExit('Estimate is over budget; lower --n or raise --budget.')
        rows = await asyncio.gather(*[one(arm, m) for m in args.models for arm in ARMS for _ in range(args.n)])
    else:
        recorded = json.loads((DATA / 'close_recorded.json').read_text())
        print(f'Offline: re-scoring {len(recorded["rows"])} recorded runs from {recorded["ran_at"]}. Add --live to run it yourself.')
        rows = [{**r, 'label': score(r['reply'])} for r in recorded['rows']]

    # 5. Read it: counts per cell, then one reply per cell, not just a rate.
    cells: dict[tuple[str, str], Counter[str]] = defaultdict(Counter)
    for r in rows:
        cells[(r['arm'], r['model'])][r['label']] += 1
    for arm in ARMS:
        print(f'\n{arm}')
        for (a, model), counts in sorted(cells.items()):
            if a == arm:
                n = sum(counts.values())
                example = next(r['reply'] for r in rows if r['arm'] == arm and r['model'] == model)
                print(f'  {model.split(":")[1]:<18} ' + ', '.join(f'{k} {v}/{n}' for k, v in counts.most_common()))
                print(f'  {"":<18} e.g. "{example[:110]}"')
    print(f'\nSpent ${sum(r["cost_usd"] for r in rows):.4f}.' if args.live else '')
    if args.live:
        (DATA / 'close_recorded.json').write_text(json.dumps({'ran_at': time.strftime('%Y-%m-%d'), 'rows': rows}, indent=1))
        with (DATA / 'probe_runs.jsonl').open('a') as f:
            for r in rows:
                f.write(json.dumps({**r, 'probe': 'close', 'at': time.time()}) + '\n')
        print(f'Saved {len(rows)} runs to close_recorded.json and logged them to probe_runs.jsonl.')


if __name__ == '__main__':
    asyncio.run(main())
