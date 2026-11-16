# /// script
# requires-python = ">=3.11"
# dependencies = ["playwright==1.65.2"]
# ///
"""Browser checks for the shared shell: talk mode and ask-your-agent on every chapter.

    uv run tools/test_shell.py [--shots DIR]

Serves the repo with serve.py, then for every chapter: no script errors; the ask dialog opens with a prompt that
names the chapter, its path and AGENTS.md, plus at least two follow-ups; talk mode turns on with P, has stops,
reveals with R, shows notes with N, has no horizontal overflow at 1920x1080 and 1366x768; and moving past the last
stop opens the next chapter still in talk mode. With --shots, saves a talk-mode screenshot of each chapter.
If chromium is missing: uv run --with playwright==1.65.2 python -m playwright install chromium
"""

from __future__ import annotations

import argparse
import re
import subprocess
import sys
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
PORT = 8833


def chapters() -> list[str]:
    src = (ROOT / 'assets' / 'course.js').read_text()
    return re.findall(r"path: '(part\d/[^']+\.html)'", src)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('--shots', type=Path)
    args = ap.parse_args()
    if args.shots:
        args.shots.mkdir(parents=True, exist_ok=True)
    srv = subprocess.Popen([sys.executable, str(ROOT / 'serve.py'), '--no-open', '--port', str(PORT)], )
    import urllib.request
    for _ in range(50):
        try:
            urllib.request.urlopen(f'http://127.0.0.1:{PORT}/__course/root', timeout=1)
            break
        except OSError:
            time.sleep(0.2)
    base = f'http://127.0.0.1:{PORT}/'
    failures: list[str] = []
    paths = chapters()
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch()
            for i, path in enumerate(paths):
                errs: list[str] = []
                ctx = browser.new_context(viewport={'width': 1920, 'height': 1080})
                ctx.route('**/fonts.g*/**', lambda r, *a: r.abort())
                ctx.add_init_script("try { localStorage.clear() } catch (e) {}")
                pg = ctx.new_page()
                pg.set_default_timeout(8000)
                pg.on('pageerror', lambda e: errs.append(f'pageerror: {e}'))
                pg.on('console', lambda m: errs.append(f'console: {m.text}') if m.type == 'error' and 'ERR_FAILED' not in m.text else None)  # fonts are blocked on purpose
                pg.goto(base + path, wait_until='domcontentloaded')
                pg.wait_for_timeout(500)
                out = [path]

                # ask your agent
                pg.click('#askBtn')
                pg.wait_for_timeout(200)
                prompt = pg.input_value('#askText')
                title = pg.evaluate("() => (Course.chapters.find(c => location.pathname.endsWith(c.path)) || {}).title")
                chips = pg.locator('#askDialog .chip').count()
                for need, label in [(path, 'path'), ('AGENTS.md', 'AGENTS.md'), (title or '???', 'title'), (str(ROOT), 'repo root')]:
                    if need not in prompt:
                        failures.append(f'{path}: ask prompt is missing the {label}')
                if chips < 3:
                    failures.append(f'{path}: only {chips - 1} follow-ups')
                pg.click('#askDialog [data-close]')

                # talk mode
                pg.keyboard.press('p')
                pg.wait_for_timeout(400)
                if not pg.evaluate("document.body.classList.contains('talk')"):
                    failures.append(f'{path}: P did not start talk mode')
                pos = pg.inner_text('#talkPos')
                n_stops = int(pos.split('/')[1]) if '/' in pos else 0
                out.append(f'stops={n_stops}')
                if n_stops < 2:
                    failures.append(f'{path}: only {n_stops} talk stops')
                for w, h in [(1920, 1080), (1366, 768)]:
                    pg.set_viewport_size({'width': w, 'height': h})
                    pg.wait_for_timeout(150)
                    sw = pg.evaluate('document.documentElement.scrollWidth')
                    if sw > w:
                        failures.append(f'{path}: horizontal overflow in talk mode at {w}x{h} ({sw}px)')
                pg.set_viewport_size({'width': 1920, 'height': 1080})
                puzzles = pg.locator('.puzzle').count()
                out.append(f'predictions={puzzles}')
                if puzzles:
                    # move like a presenter: R while there is something to reveal, otherwise the next stop
                    for _ in range(n_stops * 3):
                        if pg.evaluate("[...document.querySelectorAll('.puzzle .stage')].some(s => !s.hidden)"):
                            break
                        pg.keyboard.press('r' if pg.is_enabled('#stepBtn') else 'ArrowRight')
                        pg.wait_for_timeout(300)
                    shown = pg.evaluate("[...document.querySelectorAll('.puzzle .stage')].filter(s => !s.hidden).length")
                    if shown < 1:
                        failures.append(f'{path}: R did not reveal a prediction')
                pg.keyboard.press('n')
                pg.wait_for_timeout(150)
                if not pg.is_visible('#notesPanel'):
                    failures.append(f'{path}: N did not show the notes panel')
                notes = pg.locator('aside.notes').count()
                out.append(f'notes={notes}')
                pg.keyboard.press('n')
                if args.shots:
                    pg.keyboard.press('Home')
                    pg.wait_for_timeout(500)
                    pg.screenshot(path=str(args.shots / (path.replace('/', '_').replace('.html', '') + '-talk.png')))

                # past the last stop: the next chapter, still in talk mode
                if i + 1 < len(paths):
                    pg.keyboard.press('End')
                    pg.wait_for_timeout(700)
                    pg.keyboard.press('ArrowRight')
                    try:
                        pg.wait_for_url('**/' + paths[i + 1] + '*', timeout=4000)
                        pg.wait_for_timeout(500)
                        if not pg.evaluate("document.body.classList.contains('talk')"):
                            failures.append(f'{path}: next chapter did not open in talk mode')
                    except Exception:
                        failures.append(f'{path}: moving past the last stop did not open {paths[i + 1]}')
                failures.extend(f'{path}: {e}' for e in errs)
                print('  '.join(out))
                ctx.close()
            browser.close()
    finally:
        srv.terminate()
    print(f'\n{len(paths)} chapters, {len(failures)} problems')
    for f in failures:
        print('  ' + f)
    return 1 if failures else 0


if __name__ == '__main__':
    sys.exit(main())
