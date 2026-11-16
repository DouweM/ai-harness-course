"""Run every reference-page snippet offline and check its output against what the page shows.

    uv run code/reference/verify.py            # check
    uv run code/reference/verify.py --record   # re-record expected/*.txt after an intended change

Each module runs in its own process with ALLOW_MODEL_REQUESTS = False and no API keys, so a snippet that forgot to
swap in FunctionModel or TestModel fails instead of calling a provider.
"""

import os
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).parent
MODULES = ['composing_harnesses']
RUNNER = (
    'import sys, runpy; sys.path.insert(0, {here!r}); import _part2; '
    'from pydantic_ai import models; models.ALLOW_MODEL_REQUESTS = False; '
    'runpy.run_path({path!r}, run_name="__main__")'
)


def main() -> None:
    record = '--record' in sys.argv
    env = {k: v for k, v in os.environ.items() if not k.endswith('_API_KEY')} | {'PYDANTIC_AI_NO_BANNER': '1'}
    (HERE / 'expected').mkdir(exist_ok=True)
    failures = 0
    for name in MODULES:
        code = RUNNER.format(here=str(HERE), path=str(HERE / f'{name}.py'))
        proc = subprocess.run([sys.executable, '-c', code], cwd=HERE, env=env, capture_output=True, text=True, timeout=120)
        if proc.returncode:
            raise SystemExit(f'{name} failed:\n{proc.stderr}')
        path = HERE / 'expected' / f'{name}.txt'
        if record:
            path.write_text(proc.stdout)
            print(f'recorded {name}')
        elif not path.exists() or path.read_text() != proc.stdout:
            failures += 1
            print(f'MISMATCH {name}: output differs from expected/{path.name}\n{proc.stdout}')
        else:
            print(f'ok       {name}')
    if failures:
        raise SystemExit(f'{failures} failure(s)')
    print('all reference snippets verified')


if __name__ == '__main__':
    main()
