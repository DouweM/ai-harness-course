# /// script
# requires-python = ">=3.11"
# dependencies = ["pydantic-ai==2.68.0", "pydantic-ai-slim[dbos]==2.68.0", "pydantic-ai-harness[logfire]==0.68.0"]
# ///
"""Run every Part 3 example offline and check it passes. No API keys, no model calls.

    uv run code/part3/verify.py
"""

from __future__ import annotations

import os
import subprocess
import sys
import time
from pathlib import Path

HERE = Path(__file__).parent
SCRIPTS = [
    'ch1_weekend.py',
    'ch1_durable.py',
    'ch1_observability.py',
    'ch2_model_configs.py',
    'ch3_evals.py',
    'ch3_online_evals.py',
    'ch4_probe_close.py',
]
EXPECT = {  # a line each script must print, so a silent change in behavior fails here
    'ch1_weekend.py': "tool ran twice, payments recorded: [('INV-2041', Decimal('2060.00'))]",
    'ch1_observability.py': 'execute_tool record_payment  {"invoice_number":"INV-2041","amount":"2060.00"}  id=call_fri_1740',
    'ch1_durable.py': 'result after approval: Done: Recorded 2060.00 on INV-2041.',
    'ch3_evals.py': 'B: decided like the team on 16/20; wrote a promise nobody made on 1',
    'ch4_probe_close.py': 'worked around it: record_payment 5/5',
}


def main() -> int:
    env = {k: v for k, v in os.environ.items() if not k.endswith('_API_KEY') and k != 'LOGFIRE_TOKEN'}
    env |= {'PYDANTIC_AI_NO_BANNER': '1', 'PYTHONPATH': str(HERE)}
    failed = 0
    for script in SCRIPTS:
        start = time.perf_counter()
        proc = subprocess.run([sys.executable, str(HERE / script)], cwd=HERE, env=env, capture_output=True, text=True)
        took = time.perf_counter() - start
        ok = proc.returncode == 0 and EXPECT.get(script, '') in proc.stdout
        failed += not ok
        print(f'{"ok  " if ok else "FAIL"} {script:<26} {took:5.1f}s')
        if not ok:
            print(proc.stdout[-2000:], proc.stderr[-3000:], sep='\n')
    print(f'{len(SCRIPTS) - failed}/{len(SCRIPTS)} passed')
    return 1 if failed else 0


if __name__ == '__main__':
    sys.exit(main())
