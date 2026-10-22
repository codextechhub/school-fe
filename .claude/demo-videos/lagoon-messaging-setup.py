"""Readies Lagoon View Academy's messages for the "Messaging at school" film, in the local database only.

The film's people are Tolu Fashola (a teacher of JSS2 A), Mr E. Bello (the
primary guardian of Femi, Zainab and Ebere Bello), Femi Bello in the student
portal, Chukwuemeka Eze (the branch admin, who sends broadcasts and makes
groups) and the principal, Emeka Obi, who holds the oversight keys. Run from
backend/apps:

    python manage.py shell < ../../school-fe/.claude/demo-videos/lagoon-messaging-setup.py

It does five things, each in its own transaction:

1. Removes the test and probe messages left by earlier checks, the
   conversations that held nothing else, and the bell and email records those
   messages raised. Messages have no delete route, so this is the one place
   rows are deleted, and only Lagoon View's. The seeded scenarios
   (``seed_messaging_scenarios``) keep their scripted lines.
2. Removes the two conversations the film creates on camera, Tolu with Mr Bello
   about Femi and Femi with Tolu, so a re-run resets them for another take.
3. Labels Mr Bello as Father on every link to his children. Two of the
   seeded links say Mother, and the teacher's picker prints that label.
4. Writes a background inbox through the module's own services, so read marks,
   unread counts and receipts come out exactly as the app makes them. Alerts
   are held back (``alerts_suppressed``), so nothing is emailed or pushed. A
   conversation's lines are written only when it has none yet, and then dated
   back, in Lagos time, so the film's own messages sit on top.
5. Prints what the film depends on: that Tolu's picker offers Femi with Mr
   Bello, that Femi can reach Tolu, and each person's unread count.

Safe to re-run: conversations are found by their pair or by the token of their
first message before anything is written.
"""
import datetime
import re
import uuid
from zoneinfo import ZoneInfo

from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone

from schools.vs_messages.constants import (
    SURFACE_PARENT, SURFACE_STAFF, SURFACE_STUDENT, ConversationKind,
)
from schools.vs_messages.models import Conversation, Message, Participant
from schools.vs_messages.services import config, conversations, groups, messages, people, visibility
from schools.vs_messages.tasks import alerts_suppressed
from schools.vs_schools.models import School
from schools.vs_students.models import Guardian, Student, StudentGuardian
from vs_notifications.models import Notification

U = get_user_model()
school = School.objects.get(slug="lagoon-view")
tenant = school.tenant
settings = config.load_settings(tenant)

tolu = U.objects.get(email="tolu.fashola@lagoon-view.example.com")
bakare = U.objects.get(email="oluwaseun.bakare@lagoon-view.example.com")
principal = U.objects.get(email="admin@lagoon-view.example.com")
chukwuemeka = U.objects.get(email="branch.admin@lagoon-view.example.com")
ngozi = U.objects.get(email="ngozi.ibekwe@lagoon-view.example.com")
bisi = U.objects.get(email="bisi.olanrewaju@lagoon-view.example.com")
kunle = U.objects.get(email="kunle.adebayo@lagoon-view.example.com")
amaka = U.objects.get(email="amaka.nwosu@lagoon-view.example.com")
chinedu = U.objects.get(email="chinedu.okeke@lagoon-view.example.com")
bello = Guardian.objects.get(tenant=tenant, user__email="bello.household@example.ng")
patricia = Guardian.objects.get(tenant=tenant, user__email="patricia.okafor@example.ng")
femi = Student.objects.get(tenant=tenant, student_number="LV/2026/0030")
zainab = Student.objects.get(tenant=tenant, guardian_links__guardian=bello, first_name="Zainab", last_name="Bello")
tunde = Student.objects.get(tenant=tenant, guardian_links__guardian=patricia, first_name="Tunde", last_name="Adeleke")

#: The background group. The film makes its own group for the JSS2 teachers on camera, so this one is about something else.
GROUP_NAME = "Mid-term exams"
LAGOS = ZoneInfo("Africa/Lagos")
_NAMESPACE = uuid.UUID("0b6f3c2e-6a51-4f0e-9d0e-2f1f2a7d4c33")

#: What a test or probe message looks like. Seeded lines never match.
TEST_PATTERNS = [re.compile(p, re.IGNORECASE) for p in (
    r"double click test", r"^unbroken", r"parent app check", r"new message check",
    r"\bprobe\b", r"\bticks? check\b", r"^checks?$", r"^okay$", r"^seen$", r"^hello femi$",
    r"\S{40,}", r"\d{8,}",
)]


def say(text):
    print(f"  {text}")


def is_test(body):
    text = (body or "").strip()
    return any(p.search(text) for p in TEST_PATTERNS)


def alerts_about(conversation_ids):
    """Lagoon View's message notifications pointing at *conversation_ids*."""
    wanted = set(conversation_ids)
    rows = Notification.all_objects.filter(tenant=tenant, event_type__key__startswith="messages.")
    return [n for n in rows if (n.metadata or {}).get("conversation_id") in wanted]


def remove_conversations(rows, why):
    """Delete *rows* with their messages, members and alerts, and say so."""
    rows = list(rows)
    if not rows:
        return
    ids = [c.pk for c in rows]
    alerts = alerts_about(ids)
    for c in rows:
        say(f"removed conversation #{c.pk} ({c.kind}, {why}) with "
            f"{Message.all_objects.filter(conversation=c).count()} messages")
    Notification.all_objects.filter(pk__in=[n.pk for n in alerts]).delete()
    Conversation.all_objects.filter(pk__in=ids).delete()
    if alerts:
        say(f"removed {len(alerts)} notifications about them")


def local(days_ago, hhmm):
    """A time in the school's day in Lagos, *days_ago* days back."""
    hour, minute = (int(x) for x in hhmm.split(":"))
    day = timezone.localdate(timezone=LAGOS) - datetime.timedelta(days=days_ago)
    return datetime.datetime.combine(day, datetime.time(hour, minute), tzinfo=LAGOS)


def write(conversation, lines, surfaces, readers):
    """Write *lines* in order and date them; then move each of *readers* to the end.

    *lines* is ``[(user, text, when)]``; lines already stored (a group's first
    message, written as it is made) are dated but not sent again. *surfaces*
    names the surface each portal account writes and reads on; staff use the
    staff surface.
    """
    already = Message.all_objects.filter(conversation=conversation).count()
    for user, text, _ in lines[already:]:
        access = visibility.resolve(tenant, user, conversation.pk, surface=surfaces.get(user.pk, SURFACE_STAFF))
        messages.send_message(access, sender=user, body=text)
    for reader in readers:
        access = visibility.resolve(tenant, reader, conversation.pk, surface=surfaces.get(reader.pk, SURFACE_STAFF))
        messages.mark_read(access, reader)
    # Date the lines back, oldest first.
    stored = list(Message.all_objects.filter(conversation=conversation).order_by("id"))
    for message, (_, _, when) in zip(stored, lines):
        Message.all_objects.filter(pk=message.pk).update(created_at=when)
    first, last = lines[0][2], lines[-1][2]
    Conversation.all_objects.filter(pk=conversation.pk).update(created_at=first, last_message_at=last)
    Participant.all_objects.filter(conversation=conversation).update(joined_at=first)
    Participant.all_objects.filter(conversation=conversation, last_read_at__isnull=False).update(last_read_at=last)


def fresh(conversation):
    return not Message.all_objects.filter(conversation=conversation).exists()


# 1. Test and probe messages, and the conversations that held nothing else.
with transaction.atomic():
    pair_kinds = (ConversationKind.STAFF_DIRECT, ConversationKind.FAMILY,
                  ConversationKind.PUPIL, ConversationKind.BROADCAST_REPLY)
    doomed = [m for m in Message.all_objects.filter(tenant=tenant).select_related("sender") if is_test(m.body)]
    touched = {m.conversation_id for m in doomed}
    for m in doomed:
        say(f"removed message {m.pk} in #{m.conversation_id} by {m.sender.full_name if m.sender else '?'}: {m.body[:50]!r}")
    # A bell or email entry raised by a removed message lands within seconds of it.
    alerts = []
    for n in Notification.all_objects.filter(tenant=tenant, event_type__key__startswith="messages."):
        cid = (n.metadata or {}).get("conversation_id")
        if any(m.conversation_id == cid
               and m.created_at - datetime.timedelta(seconds=5) <= n.created_at <= m.created_at + datetime.timedelta(minutes=2)
               for m in doomed):
            alerts.append(n.pk)
    Notification.all_objects.filter(pk__in=alerts).delete()
    Message.all_objects.filter(pk__in=[m.pk for m in doomed]).delete()
    if alerts:
        say(f"removed {len(alerts)} notifications raised by those messages")

    # A pair left with nothing said in it is a probe's leftover.
    remove_conversations(
        Conversation.all_objects.filter(tenant=tenant, kind__in=pair_kinds, messages__isnull=True),
        "nothing left in it",
    )
    # What survives points at its newest remaining message, and no read mark runs past it.
    for c in Conversation.all_objects.filter(pk__in=touched):
        newest = Message.all_objects.filter(conversation=c).order_by("-id").first()
        Conversation.all_objects.filter(pk=c.pk).update(
            last_message=newest, last_message_at=newest.created_at if newest else None,
        )
        top = newest.pk if newest else 0
        Participant.all_objects.filter(conversation=c, last_read_message_id__gt=top).update(last_read_message_id=top)

# 2. The two conversations the film starts on camera.
with transaction.atomic():
    remove_conversations(
        Conversation.all_objects.filter(tenant=tenant, pair_key__in=[
            f"family:{bello.pk}:{tolu.pk}:{femi.pk}", f"pupil:{femi.pk}:{tolu.pk}",
        ]),
        "made again on camera",
    )

# 3. Mr Bello as Father on every link to his children.
with transaction.atomic():
    fixed = StudentGuardian.objects.filter(tenant=tenant, guardian=bello).exclude(relationship="FATHER").update(relationship="FATHER")
    say(f"Mr Bello's links corrected to Father: {fixed}")

# 4. The background inbox.
with alerts_suppressed():
    with transaction.atomic():
        # Tolu and Mr Bakare: the lab microscopes.
        c, _, _ = conversations.start_staff_direct(tenant, bakare, recipient_id=tolu.pk)
        if fresh(c):
            write(c, [
                (bakare, "Good afternoon. The new microscopes for the lab arrive on Thursday morning.", local(1, "15:40")),
                (bakare, "Can you help me unpack and check them after the last period?", local(1, "15:41")),
                (tolu, "Yes, I am free from 2pm. I will bring the JSS2 practical list so we can test a few slides.", local(1, "15:52")),
                (bakare, "Perfect. I will ask the storekeeper to keep the lab open for us.", local(1, "16:03")),
            ], {}, [tolu, bakare])
        say(f"Tolu and Mr Bakare (#{c.pk})")

    with transaction.atomic():
        # Mrs Okafor asks Tolu about Tunde's homework.
        c, _, _ = conversations.start_from_guardian(tenant, patricia.user, student_id=tunde.pk, staff_user_id=tolu.pk)
        if fresh(c):
            write(c, [
                (patricia.user, "Good evening Ma. Tunde says the Basic Science homework is on page 42, but the exercise in his textbook is on page 44. Which should he do?", local(1, "19:12")),
                (tolu, "Good evening Mrs Okafor. It is the exercise on page 44, questions 1 to 5. Thank you for checking.", local(1, "19:30")),
                (patricia.user, "Thank you Ma. He will finish it tonight.", local(1, "19:34")),
            ], {patricia.user.pk: SURFACE_PARENT}, [tolu, patricia.user])
        say(f"Tolu and Mrs Okafor about Tunde (#{c.pk})")

    with transaction.atomic():
        # Invigilation swaps, made by the branch admin; its first message carries the token a re-run finds.
        opening = "The mid-term exam timetable is up on the staff notice board. Please check your invigilation slots."
        c, made = groups.create_group(
            tenant, chukwuemeka, name=GROUP_NAME, branch_id=chukwuemeka.staff_profile.branch_id,
            member_ids=[kunle.pk, amaka.pk, tolu.pk, chinedu.pk], body=opening,
            client_token=uuid.uuid5(_NAMESPACE, "lagoon-view:mid-term-group"),
        )
        if made:
            write(c, [
                (chukwuemeka, opening, local(2, "13:05")),
                (kunle, "Thanks. Can someone swap my Tuesday slot? I have the inter-house sports meeting.", local(2, "13:20")),
                (tolu, "I can take Tuesday, Kunle. You can have my Thursday morning.", local(2, "14:02")),
                (kunle, "Done, thank you Tolu.", local(2, "14:15")),
            ], {}, [chukwuemeka, kunle, amaka, tolu, chinedu])
        say(f"group {GROUP_NAME!r} (#{c.pk}): Chukwuemeka (owner), Kunle, Amaka, Tolu, Chinedu")

    with transaction.atomic():
        # The principal and the bursar: fee collection.
        c, _, _ = conversations.start_staff_direct(tenant, ngozi, recipient_id=principal.pk)
        if fresh(c):
            write(c, [
                (ngozi, "Good morning sir. The first term fee collection summary is ready for you.", local(0, "08:15")),
                (principal, "Thank you, Ngozi. Please send me the list of families who have not paid anything yet.", local(0, "08:32")),
                (ngozi, "I will have it on your desk before noon.", local(0, "08:36")),
            ], {}, [principal, ngozi])
        say(f"the principal and Ngozi Ibekwe (#{c.pk})")

    with transaction.atomic():
        # The principal and the branch admin: the PTA meeting.
        c, _, _ = conversations.start_staff_direct(tenant, chukwuemeka, recipient_id=principal.pk)
        if fresh(c):
            write(c, [
                (chukwuemeka, "Sir, the PTA meeting is confirmed for Saturday at 10am in the main hall.", local(1, "17:02")),
                (principal, "Good. Please make sure every JSS2 parent has the reminder by Thursday.", local(1, "17:20")),
            ], {}, [principal, chukwuemeka])
        say(f"the principal and Chukwuemeka Eze (#{c.pk})")

    with transaction.atomic():
        # Mr Bello and the class teacher: Zainab's reading book.
        c, _, _ = conversations.start_family_from_staff(
            tenant, bisi, kind=ConversationKind.FAMILY, student_id=zainab.pk, guardian_id=bello.pk,
        )
        if fresh(c):
            write(c, [
                (bisi, "Good afternoon Mr Bello. Zainab left her reading book in class today. I have kept it safe for her.", local(1, "14:20")),
                (bello.user, "Thank you Ma. She will collect it tomorrow morning.", local(1, "14:48")),
            ], {bello.user.pk: SURFACE_PARENT}, [bisi, bello.user])
        say(f"Mr Bello and Bisi Olanrewaju about Zainab (#{c.pk})")

    with transaction.atomic():
        # Femi and the class teacher: the Yoruba test.
        c, _, _ = conversations.start_family_from_staff(tenant, bisi, kind=ConversationKind.PUPIL, student_id=femi.pk)
        if fresh(c):
            write(c, [
                (bisi, "Femi, please remind your class that the Yoruba test is on Friday.", local(1, "13:30")),
                (femi.user, "Yes Ma, I will tell them.", local(1, "13:41")),
            ], {femi.user.pk: SURFACE_STUDENT}, [bisi, femi.user])
        say(f"Femi and Bisi Olanrewaju (#{c.pk})")

# 5. What the film depends on.
picker = people.family_children(tenant, tolu, settings).filter(pk=femi.pk).first()
guardians = [l.guardian.user.email for l in picker.guardian_links.all() if l.guardian.user_id] if picker else []
say(f"Tolu's picker offers Femi: {bool(picker)}, with guardians {guardians}")
reach = people.staff_reachable_for_child(tenant, femi, settings)
say(f"Femi can write to Tolu: {tolu.pk in reach} ({reach.get(tolu.pk, '-')})")
say(f"Mr Bello can write to Tolu about Femi: {tolu.pk in reach}")
for user, surface in (
    (tolu, SURFACE_STAFF), (principal, SURFACE_STAFF), (chukwuemeka, SURFACE_STAFF), (bakare, SURFACE_STAFF),
    (bello.user, SURFACE_PARENT), (femi.user, SURFACE_STUDENT),
):
    say(f"unread for {user.full_name}: {visibility.unread_counts(tenant, user, surface=surface)}")
say(f"{Conversation.all_objects.filter(tenant=tenant).count()} conversations at Lagoon View")
