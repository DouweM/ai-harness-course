"""Chapter 6, first half: the page you want, and when each piece of it goes in.

Friday 10:45 the billing app asks the collections agent for today's note to Dana. At 10:46, while the agent is
looking the invoice up, the bank feed shows her wire coming in (the bank confirms it at 17:40; Part 3 records it).
Whether the note thanks her or asks for money that is already on its way depends on one thing: whether the change reaches the page during the run. Two versions of the same agent, then
an x-ray of the page the good one ended with: every piece, its voice, and what put it there.
Run: uv run code/part2/ch6_page.py
"""

import _offline  # noqa: F401  (placeholder API keys; nothing is sent)

import asyncio

from pydantic_ai import ModelMessagesTypeAdapter
from pydantic_ai.messages import (
    InstructionBaselinePart,
    InstructionDeltaPart,
    ModelMessage,
    ModelRequest,
    ModelResponse,
    SystemPromptPart,
    TextPart,
    ToolCallPart,
    ToolReturnPart,
    UserPromptPart,
)
from pydantic_ai.models.function import AgentInfo, FunctionModel

from billing import WIRE_RECEIVED, FakeBilling
from billing_world import Deps, collections

ASK = 'INV-2041: the first half, 2,060.00, is due today. Draft today\'s note to Dana.'
WIRE_LINE = 'Fri 10:46: bank feed, INV-2041: incoming wire of 2,060.00, not yet confirmed.'


def reads_its_page(messages: list[ModelMessage], info: AgentInfo) -> ModelResponse:
    """A stand-in for the model: it looks the invoice up, then writes from what its page says."""
    if not any(isinstance(part, ToolReturnPart) for message in messages for part in message.parts):
        return ModelResponse(parts=[ToolCallPart('lookup_invoice', {'invoice_number': 'INV-2041'}, tool_call_id='c1')])
    page = ModelMessagesTypeAdapter.dump_json(messages).decode() + (info.instructions or '')
    if 'incoming wire of 2,060.00' in page:
        return ModelResponse(parts=[TextPart('Thank you, Dana: your 2,060.00 wire is on its way. The rest is due on the 30th.')])
    return ModelResponse(parts=[TextPart('Hi Dana, a reminder that the first half of INV-2041, 2,060.00, is due today.')])


class WireArrives(FakeBilling):
    """The demo's clock: while the agent looks the invoice up, it becomes 10:46 and the bank feed shows the wire."""

    def __init__(self, feed: list[str]):
        super().__init__()
        self.feed = feed

    async def get_invoice(self, number: str):
        if not self.feed:
            self.feed.append(WIRE_LINE)  # your sync job, appending what the bank just reported
        return await super().get_invoice(number)


# --8<-- [start:midrun]
async def draft_note(*, live: bool) -> tuple[str, list[ModelMessage]]:
    ledger_feed: list[str] = []  # your sync job appends here when the bank reports a payment
    changes = ledger_feed if live else list(ledger_feed)  # the live list, or a copy taken at the start
    deps = Deps(WireArrives(ledger_feed), WIRE_RECEIVED, closing=True, ledger_changes=changes)
    with collections.override(model=FunctionModel(reads_its_page)):
        result = await collections.run(ASK, deps=deps)
    return result.output, result.all_messages()
# --8<-- [end:midrun]


snapshot, _ = asyncio.run(draft_note(live=False))
live, page = asyncio.run(draft_note(live=True))
print('Deps took a copy of the ledger changes at 10:45:', snapshot)
print('Deps read the live list, appended on change:   ', live)


# --8<-- [start:xray]
def xray(messages: list[ModelMessage]) -> list[tuple[str, str, str]]:
    """Each piece of the page in the order the model reads it: (voice, what it is, what put it there)."""
    rows = []
    first = next(m for m in messages if isinstance(m, ModelRequest))
    for line in filter(None, (first.instructions or '').splitlines()):
        rows.append(('operator', line, 'instructions, every request'))
    for message in messages:
        for part in message.parts:
            if isinstance(part, InstructionBaselinePart):
                continue  # a record of what was sent, kept for the next run; never sent to the model
            elif isinstance(part, UserPromptPart):
                rows.append(('user', str(part.content), 'the run\'s prompt'))
            elif isinstance(part, ToolCallPart):
                rows.append(('model', f'{part.tool_name}({part.args_as_dict()})', 'the model\'s turn'))
            elif isinstance(part, ToolReturnPart):
                rows.append(('data', part.model_response_str()[:60] + '...', 'a tool result'))
            elif isinstance(part, InstructionDeltaPart):
                rows.append(('operator', str(part.content).splitlines()[-1], 'an instruction that changed, appended'))
            elif isinstance(part, SystemPromptPart):
                rows.append(('operator', part.content, 'a system message mid-conversation'))
            elif isinstance(part, TextPart):
                rows.append(('model', part.content, 'the answer'))
    return rows
# --8<-- [end:xray]


print()
for voice, text, _how in xray(page):
    print(f'{voice:9}{text[:80]}')
