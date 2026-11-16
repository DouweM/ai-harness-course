"""Lets every module in this folder import and run without API keys.

Agents are constructed with real model names, which need a key to build a provider. When no key is set, we set a
placeholder: every demo here swaps the model for a FunctionModel or TestModel, so nothing is sent anywhere.
verify.py also sets ALLOW_MODEL_REQUESTS = False, so a demo that forgot to swap the model fails loudly.
"""

import os

for _key in ('ANTHROPIC_API_KEY', 'OPENAI_API_KEY'):
    os.environ.setdefault(_key, 'offline-placeholder')
os.environ.setdefault('PYDANTIC_AI_NO_BANNER', '1')  # the startup banner suggests setting up observability
