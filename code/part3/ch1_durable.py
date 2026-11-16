# /// script
# requires-python = ">=3.11"
# dependencies = ["pydantic-ai-slim[dbos]==2.68.0"]
# ///
"""Chapter 1: a durable run that waits for an approval, following the production docs' end-to-end service.

The workflow runs the agent; when the run ends with DeferredToolRequests, the workflow itself waits (up to a week)
for a decision, then continues the conversation. DBOS journals each model request and each step in SQLite,
so a process that dies anywhere in here recovers the workflow on restart and replays what already finished.

The docs version adds FastAPI routes around exactly this (start, read state, send approvals):
https://pydantic.dev/docs/ai/production/#end-to-end

Runs offline (FunctionModel, SQLite in a temp dir). Run: uv run ch1_durable.py
"""

from __future__ import annotations

import asyncio
import tempfile
from pathlib import Path

from dbos import DBOS

from pydantic_ai import Agent, DeferredToolRequests, ModelMessage, ModelResponse, TextPart, ToolCallPart
from pydantic_ai.durable_exec.dbos import DBOSDurability
from pydantic_ai.messages import ToolReturnPart
from pydantic_ai.models.function import AgentInfo, FunctionModel

DB = Path(tempfile.mkdtemp()) / 'collections.sqlite'
DBOS(config={'name': 'collections', 'system_database_url': f'sqlite:///{DB}', 'log_level': 'WARNING'})

POSTINGS: list[str] = []


def respond(messages: list[ModelMessage], info: AgentInfo) -> ModelResponse:
    returns = [p for m in messages for p in m.parts if isinstance(p, ToolReturnPart)]
    if returns:
        return ModelResponse(parts=[TextPart(f'Done: {returns[-1].model_response_str()}')])
    call = ToolCallPart('record_payment', {'invoice_number': 'INV-2041', 'amount': 2060.0}, tool_call_id='call_fri_1740')
    return ModelResponse(parts=[call])


agent = Agent(
    FunctionModel(respond),  # offline stand-in: your model id goes here
    name='collections',
    output_type=[str, DeferredToolRequests],
    capabilities=[DBOSDurability()],
)


@agent.tool_plain(requires_approval=True)
@DBOS.step()  # DBOSDurability doesn't wrap function tools, so mark side effects as steps
def record_payment(invoice_number: str, amount: float) -> str:
    POSTINGS.append(invoice_number)
    return f'Recorded {amount:.2f} on {invoice_number}.'


@DBOS.workflow()
async def collections_run(prompt: str) -> str:
    result = await agent.run(prompt)
    while isinstance(output := result.output, DeferredToolRequests):
        pending = {call.tool_call_id: call.args_as_dict() for call in output.approvals}
        await DBOS.set_event_async('state', {'status': 'awaiting_approval', 'pending': pending})
        approvals: dict[str, bool] | None = await DBOS.recv_async('approvals', timeout_seconds=7 * 24 * 3600)
        if approvals is None:  # nobody answered within a week
            approvals = {call_id: False for call_id in pending}
        result = await agent.run(
            conversation=result.conversation,
            deferred_tool_results=output.build_results(approvals=approvals),
        )
    await DBOS.set_event_async('state', {'status': 'done', 'output': output})
    return output


async def main() -> None:
    DBOS.launch()
    try:
        handle = await DBOS.start_workflow_async(collections_run, 'We wired the first half for INV-2041 today: 2,060.00. Dana')
        run_id = handle.get_workflow_id()
        state = await DBOS.get_event_async(run_id, 'state', timeout_seconds=30)
        print(f'  workflow {run_id[:8]}... state: {state}')
        assert state and state['status'] == 'awaiting_approval'
        await DBOS.send_async(run_id, dict.fromkeys(state['pending'], True), topic='approvals')
        print(f'  result after approval: {await handle.get_result()}')
        assert POSTINGS == ['INV-2041']
    finally:
        DBOS.destroy()


if __name__ == '__main__':
    asyncio.run(main())
