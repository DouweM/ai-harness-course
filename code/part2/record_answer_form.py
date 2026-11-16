"""Record chapter 5's live runs: Wednesday's correction, with a single amount and date versus installments.

Spends a few cents. Needs real keys: uv run --env-file .env code/part2/record_answer_form.py
The chapter replays the saved outputs offline (data/answer_form_runs.json), so the page shows what models did.
"""

import json
import sys
from datetime import date
from decimal import Decimal
from pathlib import Path

from pydantic import BaseModel

from pydantic_ai import Agent, ToolOutput

sys.path.insert(0, str(Path(__file__).parent))
from billing import CORRECTION, CORRECTION_RECEIVED  # noqa: E402

MODELS = ['anthropic:claude-sonnet-5-5', 'openai:gpt-6.1-sol', 'anthropic:claude-haiku-5-5']
RUNS = 5
INSTRUCTIONS = (
    'Decide whether this customer email commits to paying us, and record the promise. '
    f'The email was received on {CORRECTION_RECEIVED:%A %Y-%m-%d}. INV-2041 is for 4120.00 USD.'
)


class OnePromise(BaseModel):
    is_commitment: bool
    invoice_number: str | None = None
    amount: Decimal | None = None
    due_date: date | None = None


class Installment(BaseModel):
    amount: Decimal
    due_date: date


class Promise(BaseModel):
    is_commitment: bool
    invoice_number: str | None = None
    installments: list[Installment] = []


def main() -> None:
    out = []
    for model in MODELS:
        for arm, typ in (('one', OnePromise), ('installments', Promise)):
            agent = Agent(model, instructions=INSTRUCTIONS, output_type=ToolOutput(typ))
            for i in range(RUNS):
                r = agent.run_sync(CORRECTION)
                row = {'model': model, 'arm': arm, 'run': i, 'output': r.output.model_dump(mode='json'),
                       'input_tokens': r.usage.input_tokens, 'output_tokens': r.usage.output_tokens}
                print(json.dumps(row))
                out.append(row)
    path = Path(__file__).parent / 'data' / 'answer_form_runs.json'
    path.write_text(json.dumps({'recorded': '2026-11-16', 'email': CORRECTION, 'instructions': INSTRUCTIONS, 'runs': out}, indent=1))


if __name__ == '__main__':
    main()
