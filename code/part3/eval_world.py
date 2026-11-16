"""What chapter 3's recorded experiment needs beyond Part 2: more invoices, and the output type it measured.

The 20 corrected emails refer to invoices besides Dana's, so the eval looks them up here. The output type is the one
the recorded run (13 Nov 2026) was made with: one promise, plus who it was made to and the evidence. It predates
Part 2's installments form (chapter 2.5), and is kept so the recorded answers replay through the same validation.
"""

from __future__ import annotations

from datetime import date
from decimal import Decimal

from pydantic import BaseModel, Field

import _part2  # noqa: F401
from billing import FakeBilling, Invoice


def sample_invoices() -> dict[str, Invoice]:
    """Part 2's invoices plus the ones the eval cases name."""
    invoices = dict(FakeBilling().invoices)
    for number, amount, status in [
        ('INV-2050', '2200.00', 'open'),  # the eval cases were written when INV-2050 was for 2,200.00
        ('INV-2033', '1980.00', 'open'),
        ('INV-2044', '600.00', 'open'),
        ('INV-2072', '3200.00', 'open'),
        ('INV-2101', '2300.00', 'open'),
        ('INV-2019', '2750.00', 'disputed'),
        ('INV-2061', '870.00', 'open'),
    ]:
        invoices[number] = Invoice(number=number, amount=Decimal(amount), currency='USD', status=status)
    return invoices


class PaymentCommitment(BaseModel):
    """What the agent decided about one customer email (the shape chapter 3's recorded run used)."""

    is_commitment: bool = Field(description='Does the email commit to paying us?')
    addressed_to_us: bool = Field(description='Is the promise made to us, not to someone else?')
    invoice_number: str | None = Field(default=None, description='Only if the email names it.')
    amount: str | None = None
    due_date: date | None = Field(default=None, description='Leave empty if the email does not let you work it out.')
    evidence: str | None = Field(default=None, description='The words in the email this is based on.')
