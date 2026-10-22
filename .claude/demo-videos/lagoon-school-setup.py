"""Sets Lagoon View Academy up for the "Running the school" film, in the local database only.

The film shows a school's ordinary term at Lagoon View: admissions, enrolling
a pupil, teaching duties, the calendar, the timetable, a morning register, a
score sheet through to published results, and the promotion screens. Every
write the film performs on camera is left undone here and made possible:

- Admissions holds three fresh JSS1 applicants beside Ifeanyi Chukwu and
  Zainab Yusuf, who are already waiting.
- Mrs Ada Nwosu is a guardian at the school already, as the mother of Ugochi
  Nwosu in SSS2 A, so the enrolment wizard finds her when Kelechi joins JSS1 A.
- Tolu Fashola is the class teacher of JSS2 A and teaches its Basic Science;
  Bisi Olanrewaju, who held JSS2 A, takes SSS2 A. SSS2 A and SSS2 B keep their
  subjects uncovered, so the gaps view has rows to fill.
- The calendar holds the mid-term break and the end of term examinations.
- The bell schedule is eight lessons with a break and lunch, 8:00 to 2:30;
  every class with pupils has a clash-free week in its own rooms, and each is
  published. JSS2 A keeps three free cells (Monday Period 8, Wednesday
  Period 7, Friday Period 8), and Tolu teaches it on Thursdays.
- JSS2 A's register for today is untaken, JSS2 classes mark their lessons as
  JSS1 classes do, and a correction for Musa Adeleke waits for the principal.
- JSS2 A's Basic Science sheet is open and empty for Tolu, the principal
  having sent it back for re-marking; every other JSS2 A sheet is in, every
  pupil has a class teacher's comment, and Junior Secondary sheets now go to
  the head of their department before they count.

Run from backend/apps, after backing the database up:

    python manage.py shell < ../../school-fe/.claude/demo-videos/lagoon-school-setup.py

Writes go through the modules' own services, or through the same endpoints
the screens call (an in-process API client signed in as the person the screen
would have), so every audit row, notice and rule holds. Email stays in the
in-memory outbox and no parent is invited automatically.

Order matters in two places. The old 10:00 Period 3 becomes Period 4 before
any other period moves, so no edit overlaps a period still in its old place.
Every grid is saved before any is published, because publishing refuses a
clash with another class's grid that has not been replaced yet.

Safe to re-run: every row is fetched before it is created, a grid is saved
only when it differs from the one wanted, and a step whose end state already
holds prints nothing. Once the film has published JSS2 A the gradebook
section stops and says so; restore the backup to film it again.
"""
import datetime
import json

from django.contrib.auth import get_user_model
from django.db import transaction
from rest_framework.test import APIClient

from schools.vs_academics.models import AcademicSession, AcademicTerm, Level, SchoolClass, Subject
from schools.vs_attendance.models import CorrectionRequest, ReasonCode, StudentMark
from schools.vs_calendar.models import CalendarEvent, ClassTimetable, Period, Room, TimetableSlot
from schools.vs_gradebook.constants import SheetStatus, StoredStage
from schools.vs_gradebook.models import ClassTerm, Score, ScoreSheet, StudentTermResult
from schools.vs_gradebook.services import approvals, classbook, compiling, resolve, sheets
from schools.vs_gradebook.services.configuration import write_settings
from schools.vs_gradebook.services.rules import read_gradebook_rules
from schools.vs_schools.dev.targets import quiet
from schools.vs_staff.models import StaffProfile
from schools.vs_staff.services import teaching
from schools.vs_students.models import Guardian, Student
from schools.vs_students.services.enrolment import enrol
from vs_tenants.models import Branch, Tenant
from vs_user.tokens import CodeXRefreshToken

U = get_user_model()
SLUG = "lagoon-view"
tenant = Tenant.objects.get(slug=SLUG)
year = AcademicSession.objects.get(tenant=tenant, name="2026/2027")
next_year = AcademicSession.objects.get(tenant=tenant, name="2027/2028")
term = AcademicTerm.objects.get(session=year, name="First Term")
main = Branch.objects.get(tenant=tenant, is_main=True)
annex = Branch.objects.get(tenant=tenant, is_main=False)
jss1 = Level.objects.get(tenant=tenant, session=year, code="JSS1")


def person(local):
    return U.objects.get(email=f"{local}@lagoon-view.example.com")


principal = person("admin")
tolu, amina, chinedu, bisi = person("tolu.fashola"), person("amina.garba"), person("chinedu.okeke"), person("bisi.olanrewaju")
bukky, hauwa, kayode = person("bukky.alabi"), person("hauwa.sanni"), person("kayode.adeniyi")
classes = {c.name: c for c in SchoolClass.objects.filter(tenant=tenant, session=year)}
subjects = {s.code: s for s in Subject.objects.filter(tenant=tenant)}


def say(text):
    print(f"  {text}")


def api(user, method, path, body=None, params=None):
    """Call the endpoint the screen calls, as *user*, and answer its ``data``.

    A refusal raises, so the section it sits in rolls back whole.
    """
    client = APIClient(HTTP_HOST="localhost")
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {CodeXRefreshToken.for_user(user).access_token}")
    query = "&".join(f"{k}={v}" for k, v in {"tenant": SLUG, **(params or {})}.items())
    url = f"{path}{'&' if '?' in path else '?'}{query}"
    response = (
        getattr(client, method)(url, body, format="json") if body is not None
        else getattr(client, method)(url)
    )
    payload = response.json() if response.content else {}
    if response.status_code >= 400:
        raise RuntimeError(f"{method.upper()} {path} answered {response.status_code}: {json.dumps(payload)[:600]}")
    return payload.get("data", payload)


with quiet():
    # 1. Three fresh JSS1 applicants, each with a parent.
    with transaction.atomic():
        for first, last, gender, born, branch, school, parent in (
            ("Tobenna", "Ugwu", "MALE", datetime.date(2014, 2, 11), main, "Bright Future Primary School, Yaba",
             ("Chioma", "Ugwu", "08034127781", "chioma.ugwu@example.ng", "MOTHER", "Fashion designer")),
            ("Maryam", "Abubakar", "FEMALE", datetime.date(2014, 6, 3), main, "Crescent Model Primary School, Surulere",
             ("Umar", "Abubakar", "08062339014", "umar.abubakar@example.ng", "FATHER", "Civil engineer")),
            ("Toluwani", "Adebisi", "FEMALE", datetime.date(2014, 1, 22), annex, "Rainbow Kiddies School, Lekki",
             ("Funke", "Adebisi", "08127743305", "funke.adebisi@example.ng", "MOTHER", "Nurse")),
        ):
            if Student.objects.filter(tenant=tenant, first_name=first, last_name=last, date_of_birth=born).exists():
                continue
            p_first, p_last, phone, email, relationship, job = parent
            enrol(
                tenant=tenant, actor=principal, branch=branch, as_applicant=True,
                data={"first_name": first, "last_name": last, "date_of_birth": born, "gender": gender,
                      "nationality": "Nigerian", "state_of_origin": "Lagos", "previous_school": school,
                      "applied_for": jss1},
                guardian_rows=[{"first_name": p_first, "last_name": p_last, "phone": phone, "email": email,
                                "relationship": relationship, "occupation": job, "is_primary": True}],
            )
            say(f"applicant: {first} {last} for JSS1 at {branch.name}, parent {p_first} {p_last}")

    # 2. Mrs Ada Nwosu, already a parent here through Ugochi in SSS2 A.
    with transaction.atomic():
        if not Guardian.objects.filter(tenant=tenant, email__iexact="ada.nwosu@example.ng").exists():
            used = Student.objects.filter(tenant=tenant, student_number__startswith="LV/2026/")
            number = f"LV/2026/{max(int(n.rsplit('/', 1)[1]) for n in used.values_list('student_number', flat=True)) + 1:04d}"
            ugochi = enrol(
                tenant=tenant, actor=principal, branch=main, school_class=classes["SSS2 A"],
                data={"first_name": "Ugochi", "last_name": "Nwosu", "date_of_birth": datetime.date(2010, 5, 19),
                      "gender": "FEMALE", "nationality": "Nigerian", "state_of_origin": "Enugu",
                      "address": "12 Bode Thomas Street, Surulere, Lagos", "student_number": number,
                      "enrolment_date": year.start_date},
                guardian_rows=[{"first_name": "Ada", "last_name": "Nwosu", "phone": "08035512240",
                                "email": "ada.nwosu@example.ng", "relationship": "MOTHER",
                                "occupation": "Pharmacist", "address": "12 Bode Thomas Street, Surulere, Lagos",
                                "is_primary": True}],
            )
            say(f"Ugochi Nwosu ({ugochi.student_number}) in SSS2 A, mother Ada Nwosu (ada.nwosu@example.ng)")

    # 3. Class teachers: Bisi moves to SSS2 A, Tolu takes JSS2 A.
    with transaction.atomic():
        for name, user in (("SSS2 A", bisi), ("JSS2 A", tolu)):
            staff = StaffProfile.objects.get(tenant=tenant, user=user)
            if classes[name].class_teacher_id != staff.pk:
                teaching.set_class_teacher(classes[name], staff, actor=principal, tenant=tenant)
                say(f"class teacher of {name}: {user.full_name}")
        rows, coverage_gaps, _ = teaching.coverage(tenant, principal, year)
        say(f"uncovered class-subjects: {coverage_gaps}")

    # 4. The mid-term break and the end of term examinations.
    with transaction.atomic():
        held = set(CalendarEvent.objects.filter(tenant=tenant, session=year).values_list("name", flat=True))
        for event in (
            {"name": "Mid-term break", "event_type": "MIDTERM_BREAK", "start_date": "2026-10-29",
             "end_date": "2026-11-02", "closes_school": True, "branch": None,
             "description": "School closes on Thursday and reopens on Tuesday 3 November."},
            {"name": "End of term exams", "event_type": "EXAM_PERIOD", "start_date": "2026-11-30",
             "end_date": "2026-12-04", "closes_school": False, "branch": None,
             "description": "First Term examinations for every class."},
        ):
            if event["name"] not in held:
                made = api(principal, "post", "/v1/academics/calendar/events/", event)
                warnings = made.get("warnings") if isinstance(made, dict) else None
                say(f"calendar: {event['name']}, {event['start_date']} to {event['end_date']}"
                    + (f" (warning: {warnings})" if warnings else ""))

    # 5. Rooms, the bell schedule, every class's week, and publication.
    with transaction.atomic():
        rooms = {r.code: r for r in Room.objects.filter(tenant=tenant)}
        if "LR-1" in rooms and "RM-1" not in rooms:
            api(principal, "patch", f"/v1/academics/timetable/rooms/{rooms['LR-1'].pk}/", {"name": "Room 1", "code": "RM-1"})
            say("room: Lesson Room 1 renamed Room 1")
        for code, name, kind, branch, seats in (
            ("RM-1", "Room 1", "CLASSROOM", main, 35), ("RM-2", "Room 2", "CLASSROOM", main, 35),
            ("RM-3", "Room 3", "CLASSROOM", main, 35), ("RM-4", "Room 4", "CLASSROOM", main, 35),
            ("SCI-LAB", "Science Lab", "LABORATORY", main, 30), ("ICT", "ICT Room", "OTHER", main, 25),
            ("AX-1", "Annex Room 1", "CLASSROOM", annex, 35), ("AX-2", "Annex Room 2", "CLASSROOM", annex, 35),
            ("AX-3", "Annex Room 3", "CLASSROOM", annex, 35), ("AX-LAB", "Annex Lab", "LABORATORY", annex, 30),
        ):
            if not Room.objects.filter(tenant=tenant, code__iexact=code).exists():
                api(principal, "post", "/v1/academics/timetable/rooms/",
                    {"name": name, "code": code, "room_type": kind, "branch": branch.pk, "capacity": seats})
                say(f"room: {name} ({branch.name})")
        rooms = {r.code: r for r in Room.objects.filter(tenant=tenant)}

        # The old 10:00 Period 3 becomes Period 4.
        periods = {p.label: p for p in Period.objects.filter(tenant=tenant, session=year, branch=None, day_of_week=None)}
        if "Period 4" not in periods and "Period 3" in periods and periods["Period 3"].start_time == datetime.time(10, 0):
            api(principal, "patch", f"/v1/academics/timetable/periods/{periods['Period 3'].pk}/",
                {"label": "Period 4", "start_time": "10:30", "end_time": "11:10"})
        for label, kind, start, end in (
            ("Period 4", "LESSON", "10:30", "11:10"), ("Break", "BREAK", "10:00", "10:30"),
            ("Period 1", "LESSON", "08:00", "08:40"), ("Period 2", "LESSON", "08:40", "09:20"),
            ("Period 3", "LESSON", "09:20", "10:00"), ("Period 5", "LESSON", "11:10", "11:50"),
            ("Period 6", "LESSON", "11:50", "12:30"), ("Lunch", "LUNCH", "12:30", "13:10"),
            ("Period 7", "LESSON", "13:10", "13:50"), ("Period 8", "LESSON", "13:50", "14:30"),
        ):
            row = Period.objects.filter(tenant=tenant, session=year, branch=None, day_of_week=None, label=label).first()
            if row is None:
                api(principal, "post", "/v1/academics/timetable/periods/",
                    {"label": label, "period_type": kind, "start_time": start, "end_time": end})
            elif (row.start_time.strftime("%H:%M"), row.end_time.strftime("%H:%M"), row.period_type) != (start, end, kind):
                api(principal, "patch", f"/v1/academics/timetable/periods/{row.pk}/",
                    {"start_time": start, "end_time": end, "period_type": kind})
            else:
                continue
            say(f"bell: {label} {start} to {end}")
        lessons = list(Period.objects.filter(tenant=tenant, session=year, period_type="LESSON", is_active=True)
                       .order_by("start_time"))

        def week(trio, teachers, subjects_of, home, lab, extra=None, free=()):
            """A clash-free week for three classes of one branch that share three teachers.

            In each cell the three teachers rotate across the three classes, so
            no teacher is in two places at once. A teacher with two subjects in
            a class alternates them. *extra* gives a class's cells to another
            teacher (Yoruba), and *free* leaves cells empty.
            """
            grids = {name: [] for name in trio}
            turns = {}
            for day in range(1, 6):
                for place, period in enumerate(lessons):
                    for seat, name in enumerate(trio):
                        if (name, day, place + 1) in free:
                            continue
                        teacher = teachers[(day + place + seat) % 3]
                        subject_code = (extra or {}).get((name, day, place + 1))
                        if subject_code:
                            teacher = bisi
                        else:
                            options = subjects_of[name][teacher.pk]
                            turn = turns.get((name, teacher.pk), 0)
                            subject_code = options[turn % len(options)]
                            turns[(name, teacher.pk)] = turn + 1
                        room = lab if subject_code == "BSC" else home[name]
                        grids[name].append({"school_class": classes[name].pk, "day_of_week": day, "period": period.pk,
                                            "subject": subjects[subject_code].pk,
                                            "teacher": teacher.pk, "room": room.pk})
            return grids

        def junior(lead, english, maths, science):
            """Who teaches what in a Junior Secondary class: the lead's own subjects, English and Mathematics."""
            return {lead.pk: science, english.pk: ["ENG"], maths.pk: ["MTH"]}

        grids = week(
            ("JSS1 A", "JSS2 A", "SSS1 A"), (tolu, amina, chinedu),
            {"JSS1 A": junior(tolu, amina, chinedu, ["BSC", "CVE"]),
             "JSS2 A": junior(tolu, amina, chinedu, ["BSC", "CVE"]),
             "SSS1 A": {tolu.pk: ["ECO", "CVE"], amina.pk: ["ENG"], chinedu.pk: ["MTH", "FMT"]}},
            {"JSS1 A": rooms["RM-1"], "JSS2 A": rooms["RM-2"], "SSS1 A": rooms["RM-3"]}, rooms["SCI-LAB"],
            extra={("JSS1 A", 1, 5): "YOR", ("JSS1 A", 3, 5): "YOR", ("JSS2 A", 2, 5): "YOR", ("JSS2 A", 5, 3): "YOR"},
            free={("JSS2 A", 1, 8), ("JSS2 A", 3, 7), ("JSS2 A", 5, 8)},
        )
        grids.update(week(
            ("JSS1 B", "JSS2 B", "SSS1 B"), (bukky, hauwa, kayode),
            {"JSS1 B": junior(bukky, hauwa, kayode, ["BSC", "CVE", "YOR"]),
             "JSS2 B": junior(bukky, hauwa, kayode, ["BSC", "CVE"]),
             "SSS1 B": {bukky.pk: ["ECO", "CVE"], hauwa.pk: ["ENG"], kayode.pk: ["MTH", "FMT"]}},
            {"JSS1 B": rooms["AX-1"], "JSS2 B": rooms["AX-2"], "SSS1 B": rooms["AX-3"]}, rooms["AX-LAB"],
        ))
        # Save every grid, then publish them.
        for name, cells in grids.items():
            school_class = classes[name]
            held = {(s.day_of_week, s.period_id, s.subject_id, s.teacher_id, s.room_id)
                    for s in TimetableSlot.objects.filter(session=year, school_class=school_class)}
            wanted = {(c["day_of_week"], c["period"], c["subject"], c["teacher"], c["room"]) for c in cells}
            if held != wanted:
                api(principal, "put", f"/v1/academics/timetable/classes/{school_class.pk}/", {"slots": cells})
                say(f"timetable: {name} saved with {len(cells)} lessons")
        for name in grids:
            school_class = classes[name]
            record = ClassTimetable.objects.filter(session=year, school_class=school_class).first()
            if record is None or record.status != "PUBLISHED":
                api(principal, "post", f"/v1/academics/timetable/classes/{school_class.pk}/publish/", {})
                say(f"timetable: {name} published")

    # 6. Gradebook: JSS2 A complete but for an empty Basic Science sheet, then Junior Secondary moderated.
    jss2a = classes["JSS2 A"]
    class_term = ClassTerm.objects.filter(tenant=tenant, school_class=jss2a, term=term).first()
    if class_term is not None and class_term.stage == StoredStage.PUBLISHED:
        say("gradebook: JSS2 A is already published for First Term; restore the backup to film it again")
    else:
        science = subjects["BSC"]

        def sheet_of(subject):
            return ScoreSheet.objects.filter(tenant=tenant, class_term__school_class=jss2a,
                                             class_term__term=term, subject=subject).first()

        def mark_for(student, component, subject):
            """A believable whole mark, the same on every run: 45 to 90 percent of the column."""
            seed = sum(ord(ch) for ch in f"{student.first_name}{student.last_name}{subject.code}{component.short_name}")
            return round(component.max_score * (0.45 + (seed % 46) / 100))

        with transaction.atomic():
            # Every other sheet in, by its main teacher.
            for subject in resolve.due_subjects(tenant, jss2a, term):
                found = sheet_of(subject)
                if subject.pk == science.pk or (found and found.status in (SheetStatus.SUBMITTED, SheetStatus.APPROVED)):
                    continue
                lead = resolve.main_teacher(jss2a, subject, year.pk).user
                ctx = sheets.load(tenant, lead, jss2a.pk, subject.pk, term, rule=sheets.ENTER)
                sheets.save_scores(ctx, [
                    {"student": s.pk, "component": c.pk, "mark": mark_for(s, c, subject), "marker": None}
                    for s in ctx.students for c in ctx.components
                ])
                sheets.submit(sheets.load(tenant, lead, jss2a.pk, subject.pk, term, rule=sheets.ENTER))
                say(f"gradebook: {subject.name}, JSS2 A submitted by {lead.full_name}")

        with transaction.atomic():
            # A comment of its own for every pupil, written by the class teacher.
            comments = {
                "Daniel Nwankwo": "Daniel works steadily and has grown in confidence in class discussions.",
                "Zainab Bello": "Zainab is careful and neat; she should ask questions as soon as she is unsure.",
                "Femi Bello": "Femi is curious and quick in practical work; more care with homework will lift his marks.",
                "Ebere Bello": "Ebere is a kind classmate and a dependable group leader.",
                "Musa Adeleke": "Musa has made good progress this term, especially in Mathematics.",
                "Amaka Adeleke": "Amaka reads widely and writes well; she should keep up her fine effort.",
                "Tunde Adeleke": "Tunde is cheerful and willing; better punctuality will help him settle each morning.",
            }
            rules = read_gradebook_rules(tenant)
            stage = ClassTerm.objects.get(pk=class_term.pk).stage if class_term else None
            if stage is None:
                written = {r.student_id: r.teacher_comment for r in
                           StudentTermResult.objects.filter(tenant=tenant, class_term__school_class=jss2a, class_term__term=term)}
                book = classbook.load_book(tenant, jss2a, jss2a.branch, term)
                for student in (entry.student for entry in book.roll):
                    comment = comments.get(student.full_name) or f"{student.first_name} has had a good term."
                    if written.get(student.pk) == comment:
                        continue
                    ratings = ({trait: 3 + sum(map(ord, student.first_name + trait)) % 3 for trait in rules.rating_traits}
                               if rules.conduct_ratings else None)
                    ctx = classbook.open_class(tenant, tolu, jss2a.pk, term, rule=classbook.COMPILE)
                    compiling.save_compile(ctx, student.pk, comment, ratings)
                    say(f"gradebook: class teacher's comment for {student.full_name}")

        with transaction.atomic():
            # Basic Science goes back to Tolu through the principal, and is emptied for re-entry.
            found = sheet_of(science)
            if found and found.status in (SheetStatus.SUBMITTED, SheetStatus.APPROVED):
                if ClassTerm.objects.get(pk=found.class_term_id).stage is None:
                    compiling.submit_class(classbook.open_class(tenant, tolu, jss2a.pk, term, rule=classbook.COMPILE))
                    say("gradebook: JSS2 A submitted to the principal by Tolu Fashola")
                approvals.return_class(
                    classbook.open_class(tenant, principal, jss2a.pk, term, rule=classbook.APPROVER),
                    "The Basic Science examination scripts were re-marked. Please enter the new marks and submit again.",
                    subject_id=science.pk,
                )
                say("gradebook: Basic Science, JSS2 A returned to Tolu Fashola by the principal")
            found = sheet_of(science)
            if found and Score.objects.filter(sheet=found).exists():
                ctx = sheets.load(tenant, tolu, jss2a.pk, science.pk, term, rule=sheets.ENTER)
                sheets.save_scores(ctx, [{"student": s.pk, "component": c.pk, "mark": None, "marker": None}
                                         for s in ctx.students for c in ctx.components])
                say("gradebook: Basic Science, JSS2 A emptied for Tolu to enter")

        with transaction.atomic():
            # Junior Secondary sheets go to their department's head before they count, as Senior Secondary's do.
            moderated = list(read_gradebook_rules(tenant).moderated_programs)
            if "JSS" not in moderated:
                write_settings(tenant, principal, {"moderated_programs": moderated + ["JSS"]})
                say("gradebook: Junior Secondary sheets are moderated (Basic Science goes to Oluwaseun Bakare)")

    # 7. JSS2 marks its lessons, and a correction for a JSS2 A pupil waits for the principal.
    with transaction.atomic():
        marking = api(principal, "get", "/v1/attendance/settings/")["lesson_marking_levels"]
        if "JSS2" not in marking:
            api(principal, "patch", "/v1/attendance/settings/", {"lesson_marking_levels": marking + ["JSS2"]})
            say("attendance: JSS2 classes mark their lessons, so Tolu's JSS2 A lessons are on her Today screen")
        waiting = CorrectionRequest.objects.filter(
            tenant=tenant, status="PENDING", mark__register__school_class=jss2a,
        ).exists()
        musa = StudentMark.objects.filter(
            register__school_class=jss2a, register__date=datetime.date(2026, 10, 15),
            student__first_name="Musa", student__last_name="Adeleke", mark="A",
        ).first()
        if not waiting and musa is not None:
            api(tolu, "post", "/v1/attendance/corrections/", {
                "register_class_id": jss2a.pk, "date": "2026-10-15", "student_id": musa.student_id,
                "to_mark": "E",
                "reason_code": ReasonCode.objects.get(tenant=tenant, name="Medical appointment").pk,
                "note": "His mother brought a hospital appointment letter for the 15th.",
            })
            say("attendance: correction for Musa Adeleke, 15 Oct, Absent to Excused, waiting for the principal")

# 8. What the film's screens will find, read only.
print("Checks:")
today = api(tolu, "get", "/v1/attendance/today/mine/")
say(f"Tolu today: {json.dumps(today, default=str)[:900]}")
preview = api(principal, "post", "/v1/students/promotions/preview/",
              {"from_session": year.pk, "to_session": next_year.pk})
say(f"promotion preview {year.name} -> {next_year.name}: opens {preview.get('run_opens_on')}, "
    f"can_run {preview.get('can_run')}: {json.dumps(preview, default=str)[:700]}")
print("Done.")
