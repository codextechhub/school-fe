import { useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { ArrowRight, Check, EyeOff, ListChecks, UsersRound } from "lucide-react";

import { SegmentedToggle } from "@/components/custom/segmented-toggle";
import { Panel } from "@/components/custom/surface";
import { useFieldAccess } from "@/components/finance-ui";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/layout/page-shell";
import { Checkbox } from "@/components/ui/checkbox";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { usePermissions } from "@/hooks/use-permissions";
import { FIELD_RESOURCE } from "@/lib/field-resources";
import { cn } from "@/lib/utils";
import { OutlinedNotice } from "@/pages/protected/onboarding/components/outlined-notice";
import { P } from "@/permissions";
import {
  useGetClassElectivesQuery,
  useSetClassElectivesMutation,
} from "@/redux/services/academics/academics-api";
import type {
  ClassElectives,
  ElectiveStudent,
  ElectiveSubject,
} from "@/redux/services/academics/academics-types";
import { useGetMySheetsQuery, useGetResultsHubQuery } from "@/redux/services/gradebook/gradebook-api";
import type { Ref } from "@/redux/services/gradebook/gradebook-types";

type ElectiveView = "students" | "subjects" | "unassigned";

/**
 * Student choices for subjects that are not core, class by class.
 *
 * The board can be read by student, by subject, or as the students with no
 * optional subject. Each focus panel edits the same student-subject relation,
 * and the server remains the authority on whether the reader may change the
 * class and whether marks prevent a student from being removed.
 *
 * Field Access treats the relation as one deliberate choice. Hiding `takes`
 * removes the whole board, making it read-only removes every control, and an
 * omitted `takers` count is never reconstructed from another response field.
 */
export default function WhoTakesWhat() {
  const [search, setSearch] = useSearchParams();
  const classes = useReaderClasses();
  const asked = Number(search.get("class")) || null;
  const current = classes.list.find((schoolClass) => schoolClass.id === asked) ?? classes.list[0] ?? null;

  return (
    <PageShell className="content-start gap-4" grid>
      <PageHeader
        title="Who takes what"
        description="Choose the non-core subjects each student takes. Core subjects already include the full class."
        actions={
          classes.list.length > 1 && current ? (
            <label className="flex min-w-0 items-center gap-2 text-sm text-gray-06">
              Class
              <NativeSelect
                value={String(current.id)}
                onChange={(event) => setSearch({ class: event.target.value }, { replace: true })}
              >
                {classes.list.map((schoolClass) => (
                  <NativeSelectOption key={schoolClass.id} value={String(schoolClass.id)}>
                    {schoolClass.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </label>
          ) : undefined
        }
      />

      {classes.isLoading ? (
        <Skeleton className="h-64 w-full rounded-md" />
      ) : !current ? (
        <OutlinedNotice
          icon={UsersRound}
          title="No class to set"
          body="You do not lead a class this term. The class teacher, or an administrator over the class's branch, records who takes what."
        />
      ) : (
        <ClassBoard key={current.id} schoolClass={current} />
      )}
    </PageShell>
  );
}

/** The classes this reader works with: every class in the hub, or the one they lead. */
function useReaderClasses(): { list: Ref[]; isLoading: boolean } {
  const { hasPermission } = usePermissions();
  const readsHub = hasPermission(P.VIEW_RESULTS_HUB);
  const hub = useGetResultsHubQuery(undefined, { skip: !readsHub });
  const mine = useGetMySheetsQuery(undefined, { skip: readsHub });
  if (readsHub) {
    return { list: (hub.data?.data.classes ?? []).map((schoolClass) => ({ id: schoolClass.id, name: schoolClass.name })), isLoading: hub.isLoading };
  }
  const led = (mine.data?.data.duties ?? [])
    .filter((duty) => duty.kind === "CLASS_TEACHER" && duty.class)
    .map((duty) => duty.class as Ref);
  return { list: led, isLoading: mine.isLoading };
}

function ClassBoard({ schoolClass }: { schoolClass: Ref }) {
  const { data, isLoading, isError, refetch } = useGetClassElectivesQuery({ classId: schoolClass.id });
  const board = data?.data;
  if (isError) {
    return (
      <OutlinedNotice
        icon={ListChecks}
        title={`We could not open ${schoolClass.name}`}
        body="The class may be in a branch you do not work in, or something went wrong on our side."
        actionLabel="Try again"
        onAction={() => refetch()}
      />
    );
  }
  if (isLoading || !board) return <Skeleton className="h-64 w-full rounded-md" />;
  return <BoardBody board={board} />;
}

function BoardBody({ board }: { board: ClassElectives }) {
  const access = useFieldAccess(FIELD_RESOURCE.ACADEMICS_ELECTIVES);
  const [view, setView] = useState<ElectiveView>("students");
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);
  const detailRef = useRef<HTMLDivElement>(null);
  const [save, saving] = useSetClassElectivesMutation();
  const editable = board.can_edit && !access.isReadOnly("takes");

  if (access.isHidden("takes")) {
    return (
      <OutlinedNotice
        icon={EyeOff}
        title="Your role cannot read who takes what"
        body="An administrator decides which fields each role reads, under Roles & Permissions, Field Access."
      />
    );
  }
  if (board.subjects.length === 0) {
    return (
      <OutlinedNotice
        icon={ListChecks}
        title={`${board.class.name} has nothing to choose`}
        body="Its level offers no subject that is not core, so every student takes every subject."
      />
    );
  }

  const studentsWithoutChoices = board.students.filter((student) => (student.takes?.length ?? 0) === 0);
  const selectedEntries = board.students.reduce((total, student) => total + (student.takes?.length ?? 0), 0);
  const shownStudents = view === "unassigned" ? studentsWithoutChoices : board.students;
  const selectedStudent = shownStudents.find((student) => student.id === selectedStudentId) ?? shownStudents[0] ?? null;
  const selectedSubject = board.subjects.find((subject) => subject.id === selectedSubjectId) ?? board.subjects[0] ?? null;

  const toggle = (student: number, subject: number, takes: boolean) =>
    void save({ classId: board.class.id, changes: [{ student, subject, takes }] });
  const busy = (student: number, subject: number) =>
    Boolean(
      saving.isLoading &&
      saving.originalArgs?.changes.some((change) => change.student === student && change.subject === subject),
    );
  const focus = (select: () => void) => {
    select();
    if (window.matchMedia?.("(max-width: 1023px)").matches) {
      window.requestAnimationFrame(() => detailRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" }));
    }
  };
  const changeView = (next: ElectiveView) => {
    setView(next);
    setSelectedStudentId(null);
    setSelectedSubjectId(null);
  };

  return (
    <>
      <section className="grid grid-cols-2 gap-2.5 lg:grid-cols-4" aria-label={`${board.class.name} choice summary`}>
        <Metric label="Students" value={board.students.length} foot={`${board.class.name} roll`} />
        <Metric label="Optional subjects" value={board.subjects.length} foot="Offered to this class" />
        <Metric label="Selected entries" value={selectedEntries} foot="Student and subject choices" />
        <Metric
          label="No choices yet"
          value={studentsWithoutChoices.length}
          foot="Students without an optional subject"
          tone={studentsWithoutChoices.length ? "warn" : "default"}
        />
      </section>

      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-black-01">{board.class.name} · {board.term.name}</p>
          <p className="mt-0.5 text-xs text-gray-06">
            {editable ? "Each change is saved immediately." : "Only the class teacher or an administrator changes this class."}
          </p>
        </div>
        <div className="max-w-full overflow-x-auto pb-1">
          <SegmentedToggle
            ariaLabel="Who takes what view"
            value={view}
            options={[
              { value: "students", label: "Students", count: board.students.length },
              { value: "subjects", label: "Subjects", count: board.subjects.length },
              { value: "unassigned", label: "No choices yet", count: studentsWithoutChoices.length },
            ]}
            onChange={changeView}
          />
        </div>
      </div>

      {view === "unassigned" && studentsWithoutChoices.length === 0 ? (
        <Panel as="section" className="grid min-h-56 place-items-center p-5 text-center">
          <div>
            <Check className="mx-auto size-5 text-[#0F6B32]" aria-hidden="true" />
            <p className="mt-2 text-sm font-medium text-black-01">Every student has a choice recorded</p>
            <p className="mt-1 text-xs text-gray-06">Use Students or Subjects to review the class.</p>
          </div>
        </Panel>
      ) : (
        <section className="grid min-w-0 grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1.12fr)_minmax(19rem,0.88fr)]" aria-label="Student subject choices">
          <DirectoryPanel
            view={view}
            students={shownStudents}
            subjects={board.subjects}
            selectedStudentId={selectedStudent?.id ?? null}
            selectedSubjectId={selectedSubject?.id ?? null}
            onStudent={(id) => focus(() => setSelectedStudentId(id))}
            onSubject={(id) => focus(() => setSelectedSubjectId(id))}
          />

          <div ref={detailRef} className="min-w-0 scroll-mt-20">
            {view === "subjects" && selectedSubject ? (
              <SubjectFocus
                subject={selectedSubject}
                students={board.students}
                editable={editable}
                busy={busy}
                onToggle={toggle}
              />
            ) : selectedStudent ? (
              <StudentFocus
                student={selectedStudent}
                subjects={board.subjects}
                editable={editable}
                busy={busy}
                onToggle={toggle}
              />
            ) : null}
          </div>
        </section>
      )}
    </>
  );
}

function Metric({ label, value, foot, tone = "default" }: { label: string; value: number; foot: string; tone?: "default" | "warn" }) {
  return (
    <Panel className={cn("space-y-1 px-3.5 py-3", tone === "warn" && "border-amber-200 bg-amber-50")}>
      <p className="text-xs font-medium text-gray-06">{label}</p>
      <p className={cn("font-mont text-xl font-semibold text-black-01", tone === "warn" && "text-amber-700")}>{value}</p>
      <p className="text-xs text-gray-06">{foot}</p>
    </Panel>
  );
}

function DirectoryPanel({
  view,
  students,
  subjects,
  selectedStudentId,
  selectedSubjectId,
  onStudent,
  onSubject,
}: {
  view: ElectiveView;
  students: ElectiveStudent[];
  subjects: ElectiveSubject[];
  selectedStudentId: number | null;
  selectedSubjectId: number | null;
  onStudent: (id: number) => void;
  onSubject: (id: number) => void;
}) {
  const studentRows = view !== "subjects";
  const title = view === "subjects" ? "Optional subjects" : view === "unassigned" ? "Students with no choices" : "Students";
  const note = view === "subjects" ? "Choose a subject to review its students." : "Choose a student to review their optional subjects.";

  return (
    <Panel as="section" className="overflow-hidden">
      <div className="flex min-w-0 items-start justify-between gap-3 border-b border-border px-3.5 py-3">
        <div className="min-w-0">
          <h2 className="font-mont text-sm font-semibold text-black-01">{title}</h2>
          <p className="mt-0.5 text-xs text-gray-06">{note}</p>
        </div>
        <span className="rounded-full bg-gray-50 px-2 py-1 text-xs font-semibold tabular-nums text-gray-06">
          {studentRows ? students.length : subjects.length}
        </span>
      </div>
      <ul className="max-h-[34rem] overflow-y-auto overscroll-contain">
        {studentRows
          ? students.map((student) => {
              const choices = subjects.filter((subject) => student.takes?.includes(subject.id));
              const active = selectedStudentId === student.id;
              return (
                <li key={student.id} className={cn("border-b border-border last:border-b-0", active && "bg-pry-01/40")}>
                  <button
                    type="button"
                    aria-current={active ? "true" : undefined}
                    onClick={() => onStudent(student.id)}
                    className="group grid w-full min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3.5 py-3 text-left transition-all ease-linear hover:bg-pry-01/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-black-01">{student.name}</span>
                      <span className="mt-0.5 block truncate text-xs text-gray-06">
                        {[student.admission_number, choices.map((subject) => subject.name).join(", ") || "No optional subject"].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="rounded-full bg-gray-50 px-2 py-1 text-xs font-semibold text-gray-06">{choices.length}</span>
                      <ArrowRight className="size-4 text-primary transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                    </span>
                  </button>
                </li>
              );
            })
          : subjects.map((subject) => {
              const active = selectedSubjectId === subject.id;
              return (
                <li key={subject.id} className={cn("border-b border-border last:border-b-0", active && "bg-pry-01/40")}>
                  <button
                    type="button"
                    aria-current={active ? "true" : undefined}
                    onClick={() => onSubject(subject.id)}
                    className="group grid w-full min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3.5 py-3 text-left transition-all ease-linear hover:bg-pry-01/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-black-01">{subject.name}</span>
                      <span className="mt-0.5 block truncate text-xs text-gray-06">{subject.code || "No subject code"}</span>
                    </span>
                    <span className="flex items-center gap-2">
                      {subject.takers !== undefined && <span className="text-xs text-gray-06">{subject.takers} of {subject.roll}</span>}
                      <ArrowRight className="size-4 text-primary transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                    </span>
                  </button>
                </li>
              );
            })}
      </ul>
    </Panel>
  );
}

function StudentFocus({
  student,
  subjects,
  editable,
  busy,
  onToggle,
}: {
  student: ElectiveStudent;
  subjects: ElectiveSubject[];
  editable: boolean;
  busy: (student: number, subject: number) => boolean;
  onToggle: (student: number, subject: number, takes: boolean) => void;
}) {
  const selected = student.takes?.length ?? 0;
  return (
    <Panel as="section" className="p-4 sm:p-5">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate font-mont text-base font-semibold text-black-01">{student.name}</h2>
          <p className="mt-0.5 text-xs text-gray-06">{student.admission_number || "Admission number not set"}</p>
        </div>
        <span className="shrink-0 rounded-full bg-[#EAF7EF] px-2.5 py-1 text-xs font-medium text-[#0F6B32]">{selected} selected</span>
      </div>
      <div className="mt-4 divide-y divide-border">
        {subjects.map((subject) => {
          const takes = !!student.takes?.includes(subject.id);
          return (
            <ChoiceRow
              key={subject.id}
              title={subject.name}
              note={[subject.code, subject.takers !== undefined ? `${subject.takers} of ${subject.roll} students` : null].filter(Boolean).join(" · ")}
              checked={takes}
              editable={editable}
              busy={busy(student.id, subject.id)}
              label={`${student.name} takes ${subject.name}`}
              onChange={(next) => onToggle(student.id, subject.id, next)}
            />
          );
        })}
      </div>
    </Panel>
  );
}

function SubjectFocus({
  subject,
  students,
  editable,
  busy,
  onToggle,
}: {
  subject: ElectiveSubject;
  students: ElectiveStudent[];
  editable: boolean;
  busy: (student: number, subject: number) => boolean;
  onToggle: (student: number, subject: number, takes: boolean) => void;
}) {
  return (
    <Panel as="section" className="p-4 sm:p-5">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate font-mont text-base font-semibold text-black-01">{subject.name}</h2>
          <p className="mt-0.5 text-xs text-gray-06">{subject.code || "Subject code not set"}</p>
        </div>
        {subject.takers !== undefined && <span className="shrink-0 rounded-full bg-[#EAF7EF] px-2.5 py-1 text-xs font-medium text-[#0F6B32]">{subject.takers} of {subject.roll}</span>}
      </div>
      <div className="mt-4 max-h-[34rem] divide-y divide-border overflow-y-auto overscroll-contain">
        {students.map((student) => {
          const takes = !!student.takes?.includes(subject.id);
          return (
            <ChoiceRow
              key={student.id}
              title={student.name}
              note={student.admission_number || "Admission number not set"}
              checked={takes}
              editable={editable}
              busy={busy(student.id, subject.id)}
              label={`${student.name} takes ${subject.name}`}
              onChange={(next) => onToggle(student.id, subject.id, next)}
            />
          );
        })}
      </div>
    </Panel>
  );
}

function ChoiceRow({
  title,
  note,
  checked,
  editable,
  busy,
  label,
  onChange,
}: {
  title: string;
  note: string;
  checked: boolean;
  editable: boolean;
  busy: boolean;
  label: string;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-black-01">{title}</p>
        <p className="mt-0.5 truncate text-xs text-gray-06">{note}</p>
      </div>
      {editable ? (
        <Checkbox
          className="size-5 shrink-0"
          checked={checked}
          disabled={busy}
          aria-label={label}
          onCheckedChange={(next) => onChange(next === true)}
        />
      ) : (
        <span className={cn("shrink-0 text-xs font-medium", checked ? "text-[#0F6B32]" : "text-gray-05")} aria-label={checked ? "Takes it" : "Does not take it"}>
          {checked ? "Taking" : "Not taking"}
        </span>
      )}
    </div>
  );
}
