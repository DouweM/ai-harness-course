"""The reference examples run on Part 2's code. Importing this puts code/part2 on the path, so `billing` and
`billing_world` are Part 2's modules: the same billing world, the same week with Dana."""

import sys
from pathlib import Path

_PART2 = str(Path(__file__).resolve().parent.parent / 'part2')
if _PART2 not in sys.path:
    sys.path.insert(0, _PART2)

import _offline  # noqa: E402,F401  (Part 2's: placeholder keys only when none are set)
