"""Build reference/capabilities.html, the Capability gallery, from a Pydantic AI checkout's docs.

One card per built-in capability (docs/capabilities/) and per Harness capability (docs/harness/): the page's own first
sentence for what it does, the first example that adds it to an agent, the release it first shipped in, and a docs link.

    uv run tools/build_capability_gallery.py ~/pydantic-ai

Versions come from git: the first pydantic-ai release tag that contains the docs page. Harness pages written before
the Harness moved into the pydantic-ai repo (release 0.52) show "0.52 or earlier". Re-run after a release.
"""

from __future__ import annotations

import html
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'reference' / 'capabilities.html'
DOCS = 'https://pydantic.dev/docs/ai'
MERGE_MINOR = 52  # the Harness joined the pydantic-ai repo in this release; its minor tracks pydantic-ai's since

MODELS = {'anthropic': 'anthropic:claude-sonnet-5-5', 'openai': 'openai:gpt-6.1-sol', 'google': 'google:gemini-3.8-flash'}

# Pages that aren't one capability, and pages that are whole agents or guides rather than a capability.
SKIP = {'overview', 'custom', 'third-party', 'index', 'integrations', 'examples', 'clai2', 'acp',
        'gh-aw', 'mutation-testing', 'docs', 'AGENTS', 'CLAUDE'}

# Capabilities documented outside docs/capabilities/ and docs/harness/: (docs path, package).
EXTRA = [('hooks.md', 'core'), ('workspace.md', 'core'), ('durable_execution/temporal.md', 'core'),
         ('durable_execution/dbos.md', 'core'), ('durable_execution/prefect.md', 'core'),
         ('evals/online-evaluation.md', 'core')]

JOBS = {
    'Model and cost': ['thinking', 'caching', 'model-fallback', 'select-model', 'resolve-model-id', 'spend',
                       'warn-on-cache-busts', 'advisor'],
    'Tools': ['mcp', 'web-search', 'web-fetch', 'x-search', 'tool-search', 'code-mode', 'ipython-code-mode',
              'prefix-tools', 'prepare-tools', 'set-tool-metadata', 'include-tool-return-schemas', 'thread-executor',
              'tool-output-limits', 'repair-tool-arguments', 'background-tools', 'image-generation', 'media',
              'file-understanding', 'exa-search', 'keenable-search', 'youdotcom', 'browser-use', 'playwright',
              'capability-creation'],
    'Workspace and sandboxes': ['workspace', 'filesystem', 'shell', 'repo-context', 'smart-search', 'ssh-workspace',
                                'localstack'],
    'History and context': ['compaction', 'process-history', 'reinject-system-prompt', 'system-reminders',
                            'managed-prompt', 'memory', 'skills', 'conversation-search', 'on-demand'],
    'Control and safety': ['handle-deferred-tool-calls', 'request-input', 'ask-user', 'guardrails', 'detect-loops',
                           'permissions', 'approval-reviewer', 'prompt-injection-defender', 'artifact-scanning',
                           'tool-call-judge', 'trajectory-judge', 'raise-content-filter-error', 'refine-output'],
    'More than one agent': ['subagents', 'planning', 'dynamic-workflow', 'render-workflows'],
    'Whole agents': ['coder', 'researcher'],
    'Runtime and observability': ['hooks', 'instrumentation', 'process-event-stream', 'online-evaluation',
                                  'step-persistence', 'temporal', 'dbos', 'prefect', 'pgtask', 'absurd',
                                  'aws-lambda', 'azure-durable-task'],
}
INTEGRATION_HINT = 'Integrations'  # every remaining page: a service the agent can use (Slack, Linear, GitHub, ...)
SANDBOX_HINT = 'Workspace and sandboxes'


def git(repo: Path, *args: str) -> str:
    return subprocess.run(['git', '-C', str(repo), *args], capture_output=True, text=True).stdout.strip()


def first_release(repo: Path, rel: str, harness: bool) -> str:
    added = git(repo, 'log', '--follow', '--diff-filter=A', '--format=%h', '--', rel).split('\n')[-1]  # renames keep their age
    tag = git(repo, 'describe', '--contains', '--match', 'v2.*', added) if added else ''
    m = re.match(r'v2\.(\d+)\.(\d+)', tag)
    if not m:
        return 'unreleased'
    minor = int(m.group(1))
    if not harness:  # the capability docs moved into docs/capabilities/ in 2.14: older ones may predate that
        return 'pydantic-ai 2.14 or earlier' if minor <= 14 else f'pydantic-ai 2.{minor}+'
    if '^2' in tag and minor <= MERGE_MINOR:
        return f'pydantic-ai-harness 0.{MERGE_MINOR} or earlier'
    return f'pydantic-ai-harness 0.{minor}+'


def first_paragraph(body: str) -> str:
    for block in re.split(r'\n\s*\n', body):
        b = block.strip()
        if not b or b.startswith(('```', '>', '#', '|', '!!!', '<', '-', '*')) or b.startswith('['):
            continue
        b = re.sub(r'\[([^\]]+)\]\[[^\]]*\]', r'\1', b)  # mkdocs cross-refs
        b = re.sub(r'\[([^\]]+)\]\([^)]*\)', r'\1', b)
        sentence = re.split(r'(?<=[.!?])\s', ' '.join(b.split()))[0]
        return sentence
    return ''


def first_sentence(text: str) -> str:
    text = text.replace('\\"', '"')
    return re.split(r'(?<=[.!?])\s', text)[0]


def snippet(body: str) -> str | None:
    for m in re.finditer(r'```(?:python|py)[^\n]*\n(.*?)```', body, re.S):
        code = m.group(1)
        if 'capabilities=' not in code:
            continue
        code = re.sub(r"\{\{ *(\w+):\w+ *\}\}", lambda k: MODELS.get(k.group(1), 'anthropic:claude-sonnet-5-5'), code)
        code = re.sub(r',?\s*defer_model_check=True', '', code)  # exists only so the docs test runs without a key
        lines = code.rstrip().split('\n')
        if len(lines) > 9:  # keep the imports of the capability and the statement that adds it
            imports = [l for l in lines if l.startswith(('from pydantic_ai', 'import pydantic_ai'))]
            start = next(i for i, l in enumerate(lines) if 'capabilities=' in l)
            while start > 0 and not re.match(r'^\w', lines[start]):
                start -= 1
            stmt, depth = [], 0
            for l in lines[start:]:
                stmt.append(l)
                depth += l.count('(') + l.count('[') - l.count(')') - l.count(']')
                if depth <= 0 and len(stmt) > 1:
                    break
            lines = imports + [''] + stmt
            if len(lines) > 11:
                return None
        return '\n'.join(lines)
    return None


def job_for(slug: str) -> str:
    for job, slugs in JOBS.items():
        if slug in slugs:
            return job
    return SANDBOX_HINT if 'sandbox' in slug or 'docker' in slug else INTEGRATION_HINT


def nav_slugs(repo: Path) -> dict[str, str]:
    nav = (repo / 'docs' / 'navigation.yml').read_text()
    return dict(re.findall(r'path:\s*"([^"]+)"\s*\n\s*slug:\s*"([^"]+)"', nav))


def main(repo: Path) -> None:
    cards = []
    slugs = nav_slugs(repo)
    pages = [(p, folder == 'harness', f'{DOCS}/{folder}/{p.stem}/')
             for folder in ('capabilities', 'harness') for p in sorted((repo / 'docs' / folder).glob('*.md'))]
    pages += [(repo / 'docs' / rel, pkg == 'harness', f'{DOCS}/{slugs.get(rel, rel[:-3])}/') for rel, pkg in EXTRA
              if (repo / 'docs' / rel).exists()]
    for path, harness, url in pages:
        slug = path.stem
        if slug in SKIP:
            continue
        text = path.read_text()
        front = re.match(r'^---\n(.*?)\n---\n', text, re.S)
        desc = re.search(r'^description:\s*"?(.*?)"?\s*$', front.group(1), re.M) if front else None
        body = re.sub(r'^---\n.*?\n---\n', '', text, flags=re.S)
        title = re.search(r'^# (.+)$', body, re.M)
        title = re.sub(r'\s+Capability$', '', title.group(1).strip()) if title else slug
        body_after = body.split('\n', 1)[1] if body.startswith('#') else body[body.find('\n# ') + 1:].split('\n', 1)[1]
        cards.append({
            'slug': slug, 'title': title, 'pkg': 'harness' if harness else 'core', 'job': job_for(slug),
            'does': first_sentence(desc.group(1)) if desc else first_paragraph(body_after), 'code': snippet(body_after),
            'since': first_release(repo, path.relative_to(repo).as_posix(), harness),
            'url': url,
        })
    jobs = list(JOBS) + [INTEGRATION_HINT]
    cards.sort(key=lambda c: (jobs.index(c['job']), c['pkg'] != 'core', c['title'].lower()))
    template = (ROOT / 'tools' / 'capability_gallery.template.html').read_text()
    page = template.replace('/*CARDS*/[]', json.dumps(cards, indent=0).replace('</', '<\\/'))
    page = page.replace('<!--COUNT-->', str(len(cards)))
    page = page.replace('<!--JOBS-->', ''.join(
        f'<button class="chip" type="button" data-job="{html.escape(j)}" aria-pressed="false">{html.escape(j)}</button>' for j in jobs))
    OUT.parent.mkdir(exist_ok=True)
    page = page.replace('<!--REF-->', git(repo, 'describe', '--tags', '--always'))
    OUT.write_text(page)
    print(f'{len(cards)} cards, {sum(c["code"] is None for c in cards)} without a snippet -> {OUT.relative_to(ROOT)}')


if __name__ == '__main__':
    main(Path(sys.argv[1]).expanduser() if len(sys.argv) > 1 else Path.home() / 'pydantic-ai')
