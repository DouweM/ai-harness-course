# /// script
# requires-python = ">=3.11"
# dependencies = ["pydantic-ai==2.68.0", "logfire"]
# ///
"""Chapter 1: Dana's weekend, as a trace.

The same Friday and Monday runs as ch1_weekend.py, instrumented. Two lines of setup and every run is a trace: the
run span with your metadata and conversation_id, each model request, each tool call with its arguments and result.
Here the spans go to an in-memory exporter and print as a tree, so you can see them without an account.
In production: logfire.configure() plus logfire.instrument_pydantic_ai(), and the same tree is in Logfire.

Runs offline. Run: uv run code/part3/ch1_observability.py
"""

from __future__ import annotations

import asyncio
import json

import logfire
from opentelemetry.sdk.trace.export import SimpleSpanProcessor
from opentelemetry.sdk.trace.export.in_memory_span_exporter import InMemorySpanExporter

# --8<-- [start:setup]
exporter = InMemorySpanExporter()  # in production: just logfire.configure()
logfire.configure(send_to_logfire=False, console=False, additional_span_processors=[SimpleSpanProcessor(exporter)])
logfire.instrument_pydantic_ai()
# --8<-- [end:setup]

import _part2  # noqa: E402,F401
from billing import FakeBilling  # noqa: E402
from billing_world import collections  # noqa: E402
from ch1_weekend import friday, model_that_records, monday  # noqa: E402


def tree() -> None:
    spans = sorted(exporter.get_finished_spans(), key=lambda s: s.start_time)
    by_id = {s.context.span_id: s for s in spans}

    def depth(s) -> int:
        d = 0
        while s.parent and s.parent.span_id in by_id:
            s, d = by_id[s.parent.span_id], d + 1
        return d

    for s in spans:
        a = dict(s.attributes or {})
        detail = ''
        if s.name.startswith('invoke_agent'):
            meta = json.loads(a['metadata']) if isinstance(a.get('metadata'), str) else a.get('metadata')
            detail = f'metadata={meta}' if meta else 'continues the stored conversation'
        elif s.name.startswith('execute_tool'):
            args = a.get('gen_ai.tool.call.arguments') or a.get('tool_arguments') or ''
            detail = f'{args}  id={a.get("gen_ai.tool.call.id", "")}'
        print('  ' * depth(s) + f'{s.name}  {detail}'.rstrip())


async def main() -> None:
    billing = FakeBilling()
    with collections.override(model=model_that_records('INV-2041', '2060.00')):
        with logfire.span('Friday 17:40: Dana wires the first half'):
            conversation_id = await friday(billing)
        with logfire.span('Monday 09:15: approved'):
            await monday(billing, conversation_id)
    tree()


if __name__ == '__main__':
    asyncio.run(main())
