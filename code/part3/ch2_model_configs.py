# /// script
# requires-python = ">=3.11"
# dependencies = ["pydantic-ai==2.68.0", "pydantic-ai-harness[logfire]==0.68.0"]
# ///
"""Chapter 2: freeze what works per model family, and roll out a change without a redeploy.

1. Each model family gets a frozen config: an agent spec file (model, instructions, settings) that passed
   your eval set. Switching models means picking another file, not editing a prompt in place.
2. A candidate (a new model, or new instructions) is just another spec. Run the eval set on it
   (ch3_evals.py) before it replaces a frozen one.
3. ManagedPrompt (Pydantic AI Harness) takes the instructions from a Logfire-managed prompt, so you can roll a
   change out to a share of traffic and back from the Logfire UI. Without Logfire it uses the default.

Runs offline: the model is swapped for a FunctionModel that prints what it was sent.
Run: uv run ch2_model_configs.py
"""

from __future__ import annotations

import asyncio
from pathlib import Path

import logfire

from eval_world import PaymentCommitment
from pydantic_ai import Agent, ModelMessage, ModelResponse, ToolCallPart
from pydantic_ai.agent import AgentSpec
from pydantic_ai.models.function import AgentInfo, FunctionModel
from pydantic_ai_harness import ManagedPrompt

CONFIGS = Path(__file__).parent / 'configs'
logfire.configure(send_to_logfire='if-token-present', console=False)  # ManagedPrompt reads prompts through Logfire


def echo_model(label: str) -> FunctionModel:
    """Stands in for the real model: shows the instructions it received, answers 'not a commitment'."""

    def respond(messages: list[ModelMessage], info: AgentInfo) -> ModelResponse:
        text = info.instructions or ''
        ours = [line.strip() for line in text.splitlines() if 'commit' in line]
        print(f'  [{label}] {ours[-1][:100]!r}')
        args = {'is_commitment': False, 'addressed_to_us': True}
        return ModelResponse(parts=[ToolCallPart(info.output_tools[0].name, args)])

    return FunctionModel(respond)


def frozen_agent(family: str) -> tuple[Agent[None, PaymentCommitment], str]:
    spec = AgentSpec.from_file(CONFIGS / f'{family}.yaml')
    # defer_model_check: build the model on first use, so this runs without API keys
    return Agent.from_spec(spec, output_type=PaymentCommitment, defer_model_check=True), str(spec.model)


async def main() -> None:
    print('Frozen configs, one per family:')
    for family in ('claude-5', 'gpt-6'):
        agent, model_name = frozen_agent(family)
        result = await agent.run('Thanks for the reminder!', model=echo_model(f'{family} -> {model_name}'))
        assert result.output.is_commitment is False

    print('Instructions from a managed prompt (default used until one is published in Logfire):')
    claude_spec = AgentSpec.from_file(CONFIGS / 'claude-5.yaml')
    managed = Agent(
        output_type=PaymentCommitment,
        capabilities=[ManagedPrompt('promise_router', default=str(claude_spec.instructions), label='production')],
    )
    result = await managed.run('Thanks for the reminder!', model=echo_model('managed prompt'))
    assert result.output.is_commitment is False


if __name__ == '__main__':
    asyncio.run(main())
