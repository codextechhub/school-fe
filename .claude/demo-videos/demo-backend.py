"""A second local backend for filming a card payment, on port 8010.

The walkthrough pays a bill by card. On the local backend a card payment goes
to Paystack's test checkout, which refuses to be shown inside the filmed phone,
so this backend takes card payments through the stand-in provider instead
(``PAYMENTS_DEFAULT_PROVIDER=FAKE``). The stand-in answers "still pending" to
every check unless told otherwise, and a payment is booked only once the
provider confirms it, so here it confirms every card payment it is asked
about, as a gateway does once a test card has been paid with.

With ``DEMO_PAID_DIR`` set, the stand-in instead says "paid" only for a
payment whose reference has a file of that name in that folder. A bursar's
desk collection asks every few seconds whether the parent has paid, and it
must keep hearing "not yet" until the filmed parent presses Pay; the
walkthrough writes the file at that moment.

It shares the local database with the backend in use, and nothing else
changes: the backend on port 8000 keeps Paystack. Stop this one when filming is
done. Run from the backend's ``apps`` folder:

    python ../../school-fe/.claude/demo-videos/demo-backend.py
"""
import os
import sys

sys.path.insert(0, os.getcwd())
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "apps.settings.local")
os.environ["PAYMENTS_DEFAULT_PROVIDER"] = "FAKE"

import django  # noqa: E402

django.setup()

from vs_payments.providers.fake import FakeProvider  # noqa: E402

_verify = FakeProvider.verify_collection


PAID_DIR = os.environ.get("DEMO_PAID_DIR", "")


def _paid(self, *, reference, provider_reference=""):
    """A card payment the stand-in is asked about has been paid, or has once its marker exists."""
    if not PAID_DIR:
        self.forced_status.setdefault(reference, "SUCCEEDED")
    elif os.path.exists(os.path.join(PAID_DIR, reference)):
        self.forced_status[reference] = "SUCCEEDED"
    return _verify(self, reference=reference, provider_reference=provider_reference)


FakeProvider.verify_collection = _paid

from django.core.management import call_command  # noqa: E402

call_command("runserver", os.environ.get("DEMO_PORT", "8010"), "--noreload")
