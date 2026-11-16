"""Run every Part 2 snippet offline and check its output against what the pages show.

    python verify.py            # check
    python verify.py --record   # re-record expected/*.txt after an intended change (then rebuild the pages)

Each chapter module runs in its own process with ALLOW_MODEL_REQUESTS = False, so a snippet that forgot to swap
in FunctionModel or TestModel fails instead of calling a provider. Then the chapter 9 tests run under pytest, and
a few claims the pages make in prose get checked directly.
"""


import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).parent
MODULES = [
    'ch1_from_idea_to_code',
    'ch2_instructions',
    'ch3_tools',
    'ch4_history',
    'ch5_answer_form',
    'ch6_capabilities',
    'ch7_multi',
    'ch8_interfaces',
    'ch9_testing',
]
RUNNER = (
    'import sys, runpy; sys.path.insert(0, {here!r}); import _offline; '
    'from pydantic_ai import models; models.ALLOW_MODEL_REQUESTS = False; '
    'runpy.run_path({path!r}, run_name="__main__")'
)



def run_module(name: str) -> str:
    code = RUNNER.format(here=str(HERE), path=str(HERE / f'{name}.py'))
    proc = subprocess.run([sys.executable, '-c', code], cwd=HERE, capture_output=True, text=True, timeout=120)
    if proc.returncode:
        raise SystemExit(f'{name} failed:\n{proc.stderr}')
    return proc.stdout


def extra_checks() -> None:
    """Claims made in page prose that the module output doesn't show on its own."""
    import logging

    import _offline  # noqa: F401

    from pydantic_ai import Agent, models
    from pydantic_ai.messages import ModelResponse, TextPart, ToolCallPart
    from pydantic_ai.models.function import FunctionModel

    models.ALLOW_MODEL_REQUESTS = False
    sys.path.insert(0, str(HERE))
    from billing import CLOSE_STARTS, FakeBilling
    from billing_world import Deps, reminders
    from ch6_capabilities import Deps as CloseDeps, ReadOnlyDuringClose

    # ch6: the subclassed capability hides writing tools during close and says so.
    seen: dict[str, object] = {}

    def look(messages, info):
        seen['tools'] = [t.name for t in info.function_tools]
        seen['instructions'] = info.instructions or ''
        return ModelResponse(parts=[TextPart('ok')])

    agent = Agent(FunctionModel(look), deps_type=CloseDeps, capabilities=[ReadOnlyDuringClose()])

    @agent.tool_plain
    def mark_paid(invoice_number: str) -> str:
        return 'ok'

    @agent.tool_plain
    def lookup_invoice(invoice_number: str) -> str:
        return 'ok'

    agent.run_sync('x', deps=CloseDeps(billing=FakeBilling(), received=CLOSE_STARTS, closing=True))
    assert seen['tools'] == ['lookup_invoice'], seen
    assert 'you can read, not write' in str(seen['instructions']), seen

    # ch6: the audit hook on the reminders agent sees tool calls.
    records: list[str] = []
    handler = logging.Handler()
    handler.emit = lambda record: records.append(record.getMessage())  # type: ignore[method-assign]
    logging.getLogger('billing').addHandler(handler)
    logging.getLogger('billing').setLevel(logging.INFO)

    def lookup_then_answer(messages, info):
        if len(messages) == 1:
            return ModelResponse(parts=[ToolCallPart('lookup_invoice', {'invoice_number': 'INV-2041'})])
        return ModelResponse(parts=[TextPart('Reminder drafted.')])

    with reminders.override(model=FunctionModel(lookup_then_answer)):
        reminders.run_sync('INV-2041 is overdue.', deps=Deps(billing=FakeBilling(), received=CLOSE_STARTS))
    assert records and records[0].startswith('lookup_invoice('), records


def main() -> None:
    record = '--record' in sys.argv
    expected_dir = HERE / 'expected'
    expected_dir.mkdir(exist_ok=True)
    failures = 0
    for name in MODULES:
        out = run_module(name)
        path = expected_dir / f'{name}.txt'
        if record:
            path.write_text(out)
            print(f'recorded {name}')
        elif not path.exists() or path.read_text() != out:
            failures += 1
            print(f'MISMATCH {name}: output differs from {path.name}\n{out}')
        else:
            print(f'ok       {name}')
    proc = subprocess.run(
        [sys.executable, '-m', 'pytest', '-q', '-p', 'no:cacheprovider', 'test_billing_agent.py'], cwd=HERE
    )
    failures += proc.returncode != 0
    extra_checks()
    print('ok       extra checks')
    if failures:
        raise SystemExit(f'{failures} failure(s)')
    print('all Part 2 snippets verified')


if __name__ == '__main__':
    main()
