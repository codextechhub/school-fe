import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Building2, Check, Info } from "lucide-react";

import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { PageShell } from "@/components/layout/page-shell";
import { Panel as Surface } from "@/components/custom/surface";
import { Skeleton } from "@/components/ui/skeleton";
import { OutlinedNotice } from "@/pages/protected/onboarding/components/outlined-notice";
import PermissionGate from "@/components/custom/permission-gate";
import { P } from "@/permissions";
import { cn } from "@/lib/utils";
import { routesPath } from "@/routes/routesPath";
import { useGetMyBranchesQuery } from "@/redux/services/branches/branches-api";
import { useGetStaffRosterQuery } from "@/redux/services/staff/staff-api";
import type { StaffListRow } from "@/redux/services/staff/staff-types";

import { EmploymentBadge } from "../badges";
import { leaveNote } from "../leave-note";
import { StaffDrawers, type StaffDrawerRequest } from "../drawers";
import { PersonAvatar } from "../../students/person-avatar";

/**
 * Who works at a branch, and why they appear there.
 *
 * **Three groups, never one flat list.** Posted here, reaching here through a
 * role, and school-wide are three different facts about three different kinds
 * of person, and a single list would tell an Ikeja administrator that the
 * registrar is theirs. She is not at Ikeja; she belongs to the school, and she
 * appears on every branch's roster.
 *
 * **A group nobody is in is not drawn at all.** An empty box still costs a
 * heading, a count of nought and a paragraph saying what would go in it, so a
 * branch whose staff are all posted there read as two thirds absence and a
 * reader had to check three boxes to find the one list with anybody on it.
 *
 * **Only the first group can be selected**, because a posting is the only one
 * of the three this screen can change. Somebody reaching Ikeja through a
 * branch-pinned Teacher grant is moved by changing that grant, not by moving
 * where they are based - and a checkbox on their row would promise otherwise.
 * Each unmovable group says where it IS changed instead, because a group
 * labelled only as not this screen's leaves a reader knowing they cannot do
 * the thing and not who can.
 *
 * **The roster is who works here.** Somebody resigned or terminated is left
 * out by the server: listing them says they still work at the branch, and the
 * posted group is selectable, so it also offered to move a posting that no
 * longer means anything. Suspended and on-leave staff stay, because both are
 * still employed.
 *
 * **The screen does not exist at a one-branch school.** The server answers 404
 * there rather than a roster with one group and everybody in it, and the nav
 * hides the door for the same reason: a posting control at a school with one
 * place to be posted is a control with no question behind it.
 */
export default function StaffPosting() {
  const navigate = useNavigate();
  const { data: branchData, isLoading: loadingBranches } =
    useGetMyBranchesQuery();
  const branches = useMemo(() => branchData?.data ?? [], [branchData]);

  // Null until somebody chooses, which is not the same as "no branch": the
  // effective branch below falls back to the first one the moment the list
  // arrives. Derived rather than seeded by an effect, so there is no frame
  // where the screen has a branch list and no roster to show for it.
  const [chosen, setChosen] = useState<string | null>(null);
  const [picked, setPicked] = useState<number[]>([]);
  const [drawer, setDrawer] = useState<StaffDrawerRequest | null>(null);

  const branch = chosen ?? (branches.length ? String(branches[0].id) : "");

  const { data, isLoading, isFetching, isError } = useGetStaffRosterQuery(
    branch,
    { skip: !branch },
  );
  const roster = data?.data;

  function toggle(id: number) {
    setPicked((current) =>
      current.includes(id)
        ? current.filter((entry) => entry !== id)
        : [...current, id],
    );
  }

  if (!loadingBranches && branches.length < 2) {
    return (
      <PageShell>
        <OutlinedNotice
          icon={Building2}
          title="This school has one branch"
          body="Postings answer which site somebody is based at, so there is nothing to decide here until a second branch opens."
          actionLabel="Back to the directory"
          onAction={() => navigate(routesPath.PROTECTED.STAFF.INDEX)}
        />
      </PageShell>
    );
  }

  return (
    <PageShell className="content-start gap-5" grid>
      <div className="min-w-0">
        <h2 className="text-lg font-semibold text-black-01">Posting & reach</h2>
        <p className="mt-1 max-w-2xl text-sm text-gray-01">
          A person has one posting, which is where they are based. Their reach
          is which branches their roles extend to, and it can be wider.
        </p>
      </div>

      <Surface as="section" className="px-6 py-5">
        <div className="flex flex-wrap items-end gap-4">
          <label className="grid min-w-55 gap-1.5">
            <span className="text-xs font-medium text-gray-05">
              Show the roster for
            </span>
            <NativeSelect
              value={branch}
              onChange={(e) => {
                setChosen(e.target.value);
                // A selection made at Lekki must not survive into Ikeja's
                // roster, where those ids are not on screen and the move would
                // be invisible.
                setPicked([]);
              }}
              className="h-10.5"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </NativeSelect>
          </label>

          {roster && (
            <p className="pb-2.5 text-[13px] text-gray-05">
              {roster.total} {roster.total === 1 ? "person" : "people"} appear
              on this roster.
            </p>
          )}

          {picked.length > 0 && (
            <PermissionGate permission={P.MODIFY_TEACHER}>
              <div className="ml-auto flex flex-wrap items-center gap-2.5">
                <span className="text-[13px] text-black-01">
                  {picked.length} selected
                </span>
                <Button variant="outline" onClick={() => setPicked([])}>
                  Clear
                </Button>
                <Button
                  onClick={() =>
                    setDrawer({ kind: "posting", staffIds: picked })
                  }
                >
                  Move posting
                </Button>
              </div>
            </PermissionGate>
          )}
        </div>
      </Surface>

      {isError ? (
        <OutlinedNotice
          icon={Building2}
          title="We could not load this roster"
          body="Something went wrong on our side. Try another branch, or try again in a moment."
        />
      ) : isLoading || isFetching || !roster ? (
        <Surface className="grid gap-3 px-6 py-5">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </Surface>
      ) : !roster.total ? (
        <OutlinedNotice
          icon={Building2}
          title="Nobody on this roster"
          body="No one is based here, reaches here through a role, or belongs to the school as a whole. Post somebody here from their own record, or from another branch's roster."
        />
      ) : (
        // Only the groups with somebody in them. An empty box still costs a
        // heading, a count of nought and a paragraph explaining what would go
        // in it, so a branch with one kind of person on it read as two thirds
        // absence - and the reader had to check three boxes to find the one
        // list that had anybody.
        roster.groups
          .filter((group) => group.rows.length > 0)
          .map((group) => (
            <Surface as="section" key={group.key} className="px-6 py-5">
              <div className="flex flex-wrap items-baseline gap-2.5">
                <h3 className="text-sm font-semibold text-black-01">
                  {group.title}
                </h3>
                <span className="rounded-full bg-gray-04 px-2 py-0.5 text-[11px] font-medium text-gray-01">
                  {group.rows.length}
                </span>
                {/* Where it IS changed, from the server, rather than only that
                  it is not here. A group labelled as somebody else's to move
                  leaves a reader knowing they cannot do the thing and not who
                  can. */}
                {!group.movable && group.change_it && (
                  <span className="rounded-full bg-gray-04 px-2 py-0.5 text-[11px] text-gray-01">
                    {group.change_it}
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-gray-05">{group.note}</p>

              <ul className="mt-4 grid gap-2.5">
                {group.rows.map((person) => (
                  <RosterRow
                    key={person.id}
                    person={person}
                    // The group says whether a posting is this screen's to
                    // change; the row says whether this person still has one
                    // to change. Somebody who has left keeps their place on
                    // the roster and loses the tick, and the server refuses
                    // the move as well - a greyed row is a courtesy, and the
                    // refusal is what makes it true.
                    selectable={group.movable && person.on_roll}
                    picked={picked.includes(person.id)}
                    onToggle={() => toggle(person.id)}
                    viaRoles={person.via_roles}
                    // Straight to the tab that changes the thing this group is
                    // about. A row saying a role brings somebody here and then
                    // opening on their overview leaves the reader to go and
                    // find the roles themselves.
                    onOpen={() =>
                      navigate(
                        group.key === "reaching_here"
                          ? `${routesPath.PROTECTED.STAFF.PROFILE_ID(person.id)}?tab=access`
                          : routesPath.PROTECTED.STAFF.PROFILE_ID(person.id),
                      )
                    }
                  />
                ))}
              </ul>
            </Surface>
          ))
      )}

      <p className="flex items-start gap-1.5 text-xs text-gray-05">
        <Info className="mt-px size-3.5 shrink-0" />
        Moving somebody changes where they are based. It does not change which
        branches their roles reach, and it does not cancel a class they teach at
        the branch they are leaving.
      </p>

      <StaffDrawers
        request={drawer}
        onClose={() => setDrawer(null)}
        onSaved={() => setPicked([])}
      />
    </PageShell>
  );
}

/**
 * One person on a branch's roster.
 *
 * **Somebody who has left keeps their place and loses the tick.** Hiding them
 * would take with them the only record on this screen that they were ever at
 * the branch, which is the question a school asks in September about last
 * year. Drawn faded, with their status chip carrying the reason, so the row
 * reads as finished rather than as one more person at work.
 *
 * `viaRoles` is present only in the reaching group, where the row has to name
 * what carries the person here: "reaching through a role" without the role is
 * a fact nobody can go and change. It also says which of two kinds the role
 * is, because they need different acts - unpinning a role pinned to this
 * branch stops them reaching it, while narrowing a school-wide one takes them
 * off every other branch's roster at the same time.
 */
function RosterRow({
  person,
  selectable,
  picked,
  viaRoles,
  onToggle,
  onOpen,
}: {
  person: StaffListRow;
  selectable: boolean;
  picked: boolean;
  viaRoles?: { name: string; school_wide: boolean }[];
  onToggle: () => void;
  onOpen: () => void;
}) {
  const left = !person.on_roll;

  return (
    <li
      className={cn(
        "flex flex-wrap items-center gap-3 rounded-lg border px-3.5 py-2.5",
        picked ? "border-primary bg-white-03" : "border-white-02",
        // Faded rather than hidden or struck through. A strikethrough reads as
        // deleted, and the record is intact.
        left && "bg-gray-03/40 opacity-70",
      )}
    >
      {selectable ? (
        <button
          type="button"
          role="checkbox"
          aria-checked={picked}
          aria-label={`Select ${person.full_name}`}
          onClick={onToggle}
          className={cn(
            "grid size-4.75 shrink-0 place-content-center rounded-[5px] border-[1.5px] text-white",
            picked ? "border-primary bg-primary" : "border-gray-02 bg-white",
          )}
        >
          {picked && <Check className="size-3" />}
        </button>
      ) : (
        // A spacer rather than nothing, so the names in all three groups line
        // up and the ones that cannot be moved read as a deliberate absence.
        <span aria-hidden className="size-4.75 shrink-0" />
      )}

      <PersonAvatar
        name={person.full_name}
        className="size-8.5 shrink-0"
        textClassName="text-xs"
      />
      <button
        type="button"
        onClick={onOpen}
        className="min-w-0 flex-1 text-left"
      >
        <span className="block truncate text-sm text-black-01">
          {person.full_name}
        </span>
        <span className="block truncate text-xs text-gray-05">
          {person.staff_number || "No staff ID"}
          {person.roles.length ? ` · ${person.roles.join(", ")}` : ""}
        </span>
        {/* Wraps rather than truncating. The half that gets cut on a phone is
            the half that decides what to do about it: "Teacher, which
            reache..." is the same sentence for a role pinned to this branch
            and one that reaches every branch, and those need opposite acts. */}
        {viaRoles && viaRoles.length > 0 && (
          <span className="mt-0.5 block text-xs text-primary">
            {viaRoles
              .map((role) =>
                role.school_wide
                  ? `${role.name}, which reaches every branch`
                  : `${role.name}, pinned to this branch`,
              )
              .join(" · ")}
          </span>
        )}
      </button>

      {person.teaching_load > 0 && (
        <span className="text-xs text-gray-05">
          {person.teaching_load}{" "}
          {person.teaching_load === 1 ? "class" : "classes"}
        </span>
      )}
      <EmploymentBadge
        status={person.display_employment_status}
        label={person.display_employment_status_label}
        note={leaveNote(person)}
      />
    </li>
  );
}
