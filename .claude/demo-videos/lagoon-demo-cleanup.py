"""Makes Lagoon View Academy's pupils read like a real school's, in the local database only.

Two seeders filled Lagoon View on the same day from one small pool of names,
so 42 names belong to two pupils each: a Zainab Bello in JSS2 A and another
in SSS2 A, each with a guardian of her own. They are different pupils, so
neither is withdrawn. The copy without an admission number or a portal
account takes a first name nobody else at the school has, and its finance
customer takes the same name, so every class list and bill stays as it is
and no name appears twice.

A promotion run in August moved this year's pupils into 2027/2028's draft
classes, leaving this year's classes nearly empty. The run is put back:
each pupil's 2026/2027 placement is current again, and the draft session's
placements close. Placement rows are never deleted, so the history keeps
both.

Run from backend/apps, after backing the database up:

    python manage.py shell < ../../school-fe/.claude/demo-videos/lagoon-demo-cleanup.py

Safe to re-run: a second run finds no shared names and nothing to put back.
"""
from collections import defaultdict

from django.db import transaction
from django.utils import timezone

from schools.vs_academics.models import AcademicSession
from schools.vs_staff.models import StaffProfile
from schools.vs_students.models import ClassEnrolment, Student
from vs_finance.models import Customer
from vs_tenants.models import Tenant

tenant = Tenant.objects.get(slug="lagoon-view")

GIRLS = [
    "Chiamaka", "Funmilayo", "Ifeoma", "Adaora", "Folake", "Yetunde", "Bukola", "Nneka",
    "Amina", "Aisha", "Hauwa", "Rukayat", "Temilade", "Ebunoluwa", "Ireti", "Morenike",
    "Chisom", "Ozioma", "Uju", "Damilola", "Titilayo", "Omotola", "Halima", "Sade",
    "Ronke", "Precious", "Blessing", "Favour", "Esther", "Kamsiyochukwu", "Ijeoma",
    "Oluchi", "Simisola", "Fatima", "Jumoke", "Tobiloba",
]
BOYS = [
    "Chinedu", "Tobi", "Segun", "Obinna", "Kelechi", "Babatunde", "Damilare", "Ayomide",
    "Olumide", "Uche", "Nnamdi", "Ikenna", "Gbenga", "Sola", "Yusuf", "Ibrahim",
    "Abdullahi", "Dapo", "Jide", "Ebuka", "Somto", "Tochukwu", "Ademola", "Kehinde",
    "Taiwo", "Emmanuel", "Daniel", "Samuel", "Victor", "Chukwudi", "Olamide", "Ifeanyichukwu",
    "Akin", "Mustapha", "Hassan", "Bolaji",
]


def taken_first_names() -> set[str]:
    staff = StaffProfile.objects.filter(tenant=tenant).select_related("user")
    names = {s.first_name.strip().lower() for s in Student.objects.filter(tenant=tenant)}
    names |= {(p.user.first_name or "").strip().lower() for p in staff if p.user_id}
    return names


def keeps_name(pupil: Student) -> tuple:
    """Who keeps a shared name.

    A pupil still on the roll, then one with an admission number or a portal
    account, then one with bills, because a pupil the films have shown by
    name must keep it; the elder record last.
    """
    on_roll = pupil.status not in ("WITHDRAWN", "TRANSFERRED", "GRADUATED")
    billed = Customer.objects.filter(source_type="vs_students.Student", source_id=str(pupil.pk)).exists()
    return (not on_roll, not pupil.student_number, not pupil.user_id, not billed, pupil.pk)


with transaction.atomic():
    taken = taken_first_names()
    pools = {"FEMALE": [n for n in GIRLS if n.lower() not in taken],
             "MALE": [n for n in BOYS if n.lower() not in taken]}
    groups = defaultdict(list)
    for pupil in Student.objects.filter(tenant=tenant).exclude(status__in=["APPLICANT", "REJECTED"]):
        groups[(pupil.first_name.strip().lower(), pupil.last_name.strip().lower())].append(pupil)
    renamed = 0
    for pupils in groups.values():
        for pupil in sorted(pupils, key=keeps_name)[1:]:
            pool = pools.get(pupil.gender) or pools["FEMALE"]
            old = f"{pupil.first_name} {pupil.last_name}"
            pupil.first_name = pool.pop(0)
            pupil.save(update_fields=["first_name", "updated_at"])
            Customer.objects.filter(
                entity__tenant=tenant, source_type="vs_students.Student", source_id=str(pupil.pk),
            ).update(name=f"{pupil.first_name} {pupil.last_name}")
            renamed += 1
            print(f"  {old} -> {pupil.first_name} {pupil.last_name} ({pupil.pk})")
    print(f"renamed {renamed} pupils")

    this_year = AcademicSession.objects.get(tenant=tenant, name="2026/2027")
    next_year = AcademicSession.objects.get(tenant=tenant, name="2027/2028")
    now = timezone.now()
    restored = 0
    for moved in ClassEnrolment.objects.filter(
        tenant=tenant, session=this_year, is_active=False, outcome__in=["PROMOTED", "REPEATED"],
    ):
        if ClassEnrolment.objects.filter(student=moved.student, session=this_year, is_active=True).exists():
            continue
        ClassEnrolment.objects.filter(student=moved.student, session=next_year, is_active=True).update(
            is_active=False, outcome="ENDED", ended_at=now,
        )
        moved.is_active = True
        moved.outcome = "CURRENT"
        moved.ended_at = None
        moved.save(update_fields=["is_active", "outcome", "ended_at", "updated_at"])
        restored += 1
    print(f"put {restored} pupils back in this year's classes")
