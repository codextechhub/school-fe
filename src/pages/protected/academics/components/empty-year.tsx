import { useState } from "react";
import type { LucideIcon } from "lucide-react";

import { OutlinedNotice } from "@/pages/protected/onboarding/components/outlined-notice";
import { RollForwardDialog } from "@/pages/protected/academics/session/roll-forward-dialog";
import { useAcademicsLens } from "@/hooks/use-academics-lens";
import { usePermissions } from "@/hooks/use-permissions";
import { P } from "@/permissions";
import { useReaderReach } from "@/hooks/use-reader-reach";

/**
 * The empty list, and the one question it has to answer: empty because of the
 * filters, empty because the school has not started, or empty because THIS
 * YEAR has not been started.
 *
 * The third is new and is the one a plain "No classes yet" gets wrong. A school
 * running 2026/2027 with sixteen levels switches the pill to the 2027/2028 it
 * drafted last week and sees an empty screen; "No classes yet" reads as data
 * loss. It has to name the year and offer the way out, which is copying the
 * year before it rather than typing sixteen levels again.
 *
 * Offered only when there IS another year to copy from and the reader may write
 * structure - otherwise it is a button that answers 403, or one with nothing to
 * pick.
 */

export function EmptyYear({
  icon,
  /** Plural noun for the rows that are missing, e.g. "classes". */
  thing,
  /** The school-has-not-started copy, used when no year can be copied from. */
  body,
  filtered,
  filteredBody,
  onClearFilters,
}: {
  icon: LucideIcon;
  thing: string;
  body: string;
  filtered: boolean;
  filteredBody: string;
  onClearFilters: () => void;
}) {
  const { sessionName, sessionStatus, multiSession, currentSession } =
    useAcademicsLens();
  const { hasPermission } = usePermissions();
  const { wholeSchool } = useReaderReach();
  const [seedOpen, setSeedOpen] = useState(false);

  if (filtered) {
    return (
      <OutlinedNotice
        icon={icon}
        title={`No ${thing} match that`}
        body={filteredBody}
        actionLabel="Clear filters"
        onAction={onClearFilters}
      />
    );
  }

  // An archived year is read-only on the server, so copying INTO it would be
  // refused - the notice states the year and stops there.
  // Copying a year copies shared structure, which only a whole-school
  // administrator may create.
  const canSeed =
    multiSession &&
    sessionStatus !== "ARCHIVED" &&
    wholeSchool &&
    hasPermission(P.CREATE_STRUCTURE);

  if (!multiSession || !sessionName) {
    return <OutlinedNotice icon={icon} title={`No ${thing} yet`} body={body} />;
  }

  return (
    <>
      <OutlinedNotice
        icon={icon}
        title={`${sessionName} has no ${thing} yet`}
        body={
          canSeed
            ? `You are looking at ${sessionName}. Copy another year's structure across and edit the differences, or add ${thing} one at a time.`
            : `You are looking at ${sessionName}. Switch the session at the bottom of the menu to see another year.`
        }
        actionLabel={canSeed ? "Copy from another year" : undefined}
        onAction={canSeed ? () => setSeedOpen(true) : undefined}
      />
      <RollForwardDialog
        target={currentSession}
        open={seedOpen}
        onClose={() => setSeedOpen(false)}
      />
    </>
  );
}
