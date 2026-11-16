"""The world the collections agent works in: your billing system, and Dana's emails over one week.

None of this is Pydantic AI. It stands in for your own client and data, so every chapter's code runs offline.
Part 3 imports it too: one invoice, one customer, one week, from Part 1 to the end of the course.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date
from decimal import Decimal

from pydantic import BaseModel


class Invoice(BaseModel):
    """One of our invoices, as the billing system returns it."""

    number: str
    amount: Decimal
    currency: str
    status: str


class LedgerUnavailable(Exception):
    """The ledger timed out: an outage, not a mistake the model made."""


@dataclass
class FakeBilling:
    """An in-memory billing client: look up an invoice, mark it paid, record a payment, read a customer's email."""

    invoices: dict[str, Invoice] = field(
        default_factory=lambda: {
            'INV-2041': Invoice(number='INV-2041', amount=Decimal('4120.00'), currency='USD', status='open'),
            'INV-2038': Invoice(number='INV-2038', amount=Decimal('1250.00'), currency='USD', status='open'),
            'INV-2045': Invoice(number='INV-2045', amount=Decimal('640.00'), currency='USD', status='open'),
            'INV-2057': Invoice(number='INV-2057', amount=Decimal('980.00'), currency='USD', status='overdue'),
        }
    )
    down: bool = False  # Part 3: the ledger has an outage
    writes: list[tuple[str, str]] = field(default_factory=list)  # (invoice, idempotency key)
    payments: list[tuple[str, Decimal]] = field(default_factory=list)  # (invoice, amount)

    async def read_email(self, email_id: str) -> str | None:
        return f'From: dana@example.com\n\n{EMAILS[email_id]}' if email_id in EMAILS else None

    async def get_invoice(self, number: str) -> Invoice | None:
        return self.invoices.get(number)

    async def mark_paid(self, number: str, *, idempotency_key: str) -> None:
        if (number, idempotency_key) in self.writes:
            return  # the same tool call, retried: already done
        if self.down:
            raise LedgerUnavailable('ledger timed out')
        self.writes.append((number, idempotency_key))
        self.invoices[number] = self.invoices[number].model_copy(update={'status': 'paid'})

    async def record_payment(self, number: str, amount: Decimal, *, idempotency_key: str) -> str:
        if (number, idempotency_key) in self.writes:
            return f'Recorded {amount} on {number}.'  # the same tool call, retried: recorded once
        if self.down:
            raise LedgerUnavailable('ledger timed out')
        self.writes.append((number, idempotency_key))
        self.payments.append((number, amount))
        return f'Recorded {amount} on {number}.'


# Dana's week: the thread the whole course follows (the table in DIRECTION.md).
DANA = 'Hi, INV-2041 will be paid this Friday. Thanks, Dana'
RECEIVED = date(2026, 11, 17)  # Tuesday: the email arrives at 09:02
CORRECTION = "Correction on INV-2041: we'll pay half this Friday and the rest by the 30th. Dana"
CORRECTION_RECEIVED = date(2026, 11, 18)  # Wednesday
CLOSE_STARTS = date(2026, 11, 19)  # Thursday: month-end close begins
WIRE = 'We wired the first half for INV-2041 today: 2,060.00. Dana'
WIRE_RECEIVED = date(2026, 11, 20)  # Friday
DISPUTE = 'Also, the amount on INV-2041 looks wrong to us: we were quoted 3,900. Dana'

# Dana's emails reach the agent as data: a tool reads them. The user's message is your app's request about an email.
EMAILS = {'881': DANA, '884': CORRECTION, '887': WIRE, '889': DISPUTE}
DANA_ID, CORRECTION_ID, WIRE_ID, DISPUTE_ID = EMAILS


def new_email(email_id: str) -> str:
    """What your app sends as the user's message when an email arrives: a request about it, never the email itself."""
    return f'New email {email_id} from dana@example.com. Read it and handle it.'
