import { useSearchParams } from "react-router";
import { EyeOff, ListChecks, UsersRound } from "lucide-react";

import { PageShell } from "@/components/layout/page-shell";
import { Panel } from "@/components/custom/surface";
import { Checkbox } from "@/components/ui/checkbox";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useFieldAccess } from "@/components/finance-ui";
import { usePermissions } from "@/hooks/use-permissions";
import { FIELD_RESOURCE } from "@/lib/field-resources";
import { P } from "@/permissions";
import {
  useGetClassElectivesQuery,
  useSetClassElectivesMutation,
} from "@/redux/services/academics/academics-api";
import type { ClassElectives } from "@/redux/services/academics/academics-types";
import { useGetMySheetsQuery, useGetResultsHubQuery } from "@/redux/services/gradebook/gradebook-api";
import type { Ref } from "@/redux/services/gradebook/gradebook-types";
import { OutlinedNotice } from "@/pages/protected/onboarding/components/outlined-notice";

/**
 * Who takes each subject that is not core, class by class.
 *
 * Core subjects are everyone's and are not on the grid. A student who does not
 * take a subject is on no sheet, no average and no position for it, so this is
 * what decides who a non-core subject's score sheet lists.
 *
 * The classes offered are the ones the reader works with this term: every
 * class in their branches for a reader of the results hub, otherwise the class
 * they lead. The class teacher and an administrator over the class's branch
 * change it; the server says which in `can_edit`. Each tick is saved at once.
 * Taking a student off a subject they already have marks in is refused, and
 * the refusal says so.
 */
export default function WhoTakesWhat() {
  const [search, setSearch] = useSearchParams();
  const classes = useReaderClasses();
  const asked = Number(search.get("class")) || null;
  const current = classes.list.find((c) => c.id === asked) ?? classes.list[0] ?? null;

  return (
    <PageShell className="content-start gap-4" grid>
      <div className="flex min-w-0 flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-mont text-lg font-semibold text-black-01">Who takes what</h1>
          <p className="text-sm text-gray-06">
            Core subjects are everyone&apos;s and are not on this grid. A student who does not take a subject is on
            no sheet, no average and no position for it.
          </p>
        </div>
        {classes.list.length > 1 && current && (
          <label className="flex min-w-0 items-center gap-2 text-sm text-gray-06">
            Class
            <NativeSelect
              value={String(current.id)}
              onChange={(event) => setSearch({ class: event.target.value }, { replace: true })}
            >
              {classes.list.map((c) => (
                <NativeSelectOption key={c.id} value={String(c.id)}>
                  {c.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </label>
        )}
      </div>

      {classes.isLoading ? (
        <Skeleton className="h-64 w-full rounded-md" />
      ) : !current ? (
        <OutlinedNotice
          icon={UsersRound}
          title="No class to set"
          body="You do not lead a class this term. The class teacher, or an administrator over the class's branch, records who takes what."
        />
      ) : (
        <ClassGrid key={current.id} schoolClass={current} />
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
    return { list: (hub.data?.data.classes ?? []).map((c) => ({ id: c.id, name: c.name })), isLoading: hub.isLoading };
  }
  const led = (mine.data?.data.duties ?? [])
    .filter((duty) => duty.kind === "CLASS_TEACHER" && duty.class)
    .map((duty) => duty.class as Ref);
  return { list: led, isLoading: mine.isLoading };
}

function ClassGrid({ schoolClass }: { schoolClass: Ref }) {
  const { data, isLoading, isError, refetch } = useGetClassElectivesQuery({ classId: schoolClass.id });
  const grid = data?.data;
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
  if (isLoading || !grid) return <Skeleton className="h-64 w-full rounded-md" />;
  return <GridBody grid={grid} />;
}

function GridBody({ grid }: { grid: ClassElectives }) {
  const access = useFieldAccess(FIELD_RESOURCE.ACADEMICS_ELECTIVES);
  const [save, saving] = useSetClassElectivesMutation();
  const editable = grid.can_edit && !access.isReadOnly("takes");

  if (access.isHidden("takes")) {
    return (
      <OutlinedNotice
        icon={EyeOff}
        title="Your role cannot read who takes what"
        body="An administrator decides which fields each role reads, under Roles & Permissions, Field Access."
      />
    );
  }
  if (grid.subjects.length === 0) {
    return (
      <OutlinedNotice
        icon={ListChecks}
        title={`${grid.class.name} has nothing to choose`}
        body="Its level offers no subject that is not core, so every student takes every subject."
      />
    );
  }

  const toggle = (student: number, subject: number, takes: boolean) =>
    void save({ classId: grid.class.id, changes: [{ student, subject, takes }] });
  const busy = (student: number, subject: number) =>
    saving.isLoading &&
    saving.originalArgs?.changes.some((change) => change.student === student && change.subject === subject);

  return (
    <>
      <p className="text-sm text-gray-06">
        {grid.class.name} · {grid.term.name}
        {editable ? " · each tick is saved as you make it" : " · only the class teacher or an administrator changes this"}
      </p>
      <Panel as="section" className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 z-10 min-w-44 bg-white">Student</TableHead>
              {grid.subjects.map((subject) => (
                <TableHead key={subject.id} className="text-center">
                  {subject.name}
                  {subject.takers !== undefined && (
                    <div className="text-xs font-normal text-gray-05">
                      {subject.takers} of {subject.roll}
                    </div>
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {grid.students.map((student) => (
              <TableRow key={student.id}>
                <TableCell className="sticky left-0 z-10 bg-white">
                  <p className="font-medium text-black-01">{student.name}</p>
                  {student.admission_number && <p className="text-xs text-gray-05">{student.admission_number}</p>}
                </TableCell>
                {grid.subjects.map((subject) => {
                  const takes = !!student.takes?.includes(subject.id);
                  return (
                    <TableCell key={subject.id} className="text-center">
                      {editable ? (
                        <Checkbox
                          className="size-5"
                          checked={takes}
                          disabled={busy(student.id, subject.id)}
                          aria-label={`${student.name} takes ${subject.name}`}
                          onCheckedChange={(next) => toggle(student.id, subject.id, next === true)}
                        />
                      ) : (
                        <span className="text-sm text-black-01" aria-label={takes ? "Takes it" : "Does not take it"}>
                          {takes ? "✓" : ""}
                        </span>
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Panel>
    </>
  );
}
