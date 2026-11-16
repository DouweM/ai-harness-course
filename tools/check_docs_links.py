"""Check every https://pydantic.dev/docs/ai/... link in the course against the docs navigation.

Usage: python3 tools/check_docs_links.py [path to pydantic-ai checkout, default ~/pydantic-ai]

Reads docs/navigation.yml (slugs and aliases) without needing PyYAML. Exits 1 on any unknown slug.
"""

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
checkout = Path(sys.argv[1] if len(sys.argv) > 1 else Path.home() / 'pydantic-ai')
nav = (checkout / 'docs' / 'navigation.yml').read_text()
known = set(re.findall(r'^\s*slug: "([^"]*)"', nav, re.M))
aliases = set(re.findall(r'^\s*- "([^"]*)"', nav, re.M))

bad = 0
seen = 0
for path in sorted(ROOT.rglob('*')):
    if path.suffix not in {'.md', '.html', '.js', '.py', '.json'} or '.git' in path.parts or '.venv' in path.parts or 'v3-' in path.name or path.parent.name == 'tools':
        continue
    for m in re.finditer(r'https://pydantic\.dev/docs/ai/([A-Za-z0-9_\-/.]*)', path.read_text(errors='ignore')):
        slug = m.group(1).split('#')[0].strip('/')
        seen += 1
        if slug in known:
            continue
        status = 'alias (redirects)' if slug in aliases else 'UNKNOWN'
        if status == 'UNKNOWN':
            bad += 1
        print(f'{path.relative_to(ROOT)}: {slug or "(root)"}: {status}')
print(f'{seen} docs links checked, {bad} unknown')
sys.exit(1 if bad else 0)
