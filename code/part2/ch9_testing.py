"""Chapter 9: testing. One test, shown running: TestModel against the approval gate.

The full suite is test_billing_agent.py; verify.py runs it. Run: uv run code/part2/ch9_testing.py
"""

import _offline  # noqa: F401  (placeholder API keys; nothing is sent)

# --8<-- [start:testmodel]
from pydantic_ai import DeferredToolRequests
from pydantic_ai.models.test import TestModel

from billing import CLOSE_STARTS, FakeBilling
from billing_world import Deps, reminders

deps = Deps(billing=FakeBilling(), received=CLOSE_STARTS)
with reminders.override(model=TestModel()):  # calls every tool it's offered, with generated arguments
    result = reminders.run_sync('INV-2041 is overdue.', deps=deps)

assert isinstance(result.output, DeferredToolRequests)
print('waiting for a person:', sorted(call.tool_name for call in result.output.approvals))
print('tool calls that ran: ', [p.tool_name for m in result.all_messages() for p in m.parts if p.part_kind == 'tool-return'])
print('ledger writes:       ', deps.billing.writes)
# --8<-- [end:testmodel]
