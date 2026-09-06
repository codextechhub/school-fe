import { useGetStaffMemberQuery } from "@/redux/services/staff/staff-api";

import { EditDrawer } from "./edit-drawer";
import { LeaveDrawer } from "./leave-drawer";
import { StatusDrawer } from "./status-drawer";

/**
 * Which drawer a screen is asking for, and about whom.
 *
 * One request object rather than three booleans, so a screen cannot have two
 * drawers open at once and cannot open one without saying who it is about.
 */
export type StaffDrawerRequest =
  | { kind: "status"; staffId: number }
  | { kind: "edit"; staffId: number }
  | { kind: "leave"; staffId: number; personName: string; isSelf: boolean };

/**
 * One host for every staff drawer, mounted once per screen.
 *
 * **It takes a staff id and fetches the record itself**, rather than being
 * handed a row. The directory's row carries a dozen fields and the edit form
 * needs the rest of them - the middle name, the date of birth, the phone. A row
 * topped up inside each drawer would mean three components each deciding what
 * "enough" means, and the one that decided wrong would silently blank a field
 * on save.
 *
 * The status drawer is the exception and takes only the id: what it needs is
 * not the record but the allowed moves, which are their own endpoint, so
 * fetching the record for it would be a request nothing reads.
 *
 * **Keyed per person.** Without it, opening a drawer on one person and then
 * another leaves the first one's typed reason in the form, attached now to the
 * wrong person's termination.
 *
 * Nothing renders until the record has arrived, so a drawer never opens with
 * half a form and reflows under the reader.
 */
export function StaffDrawers({
  request,
  onClose,
}: {
  request: StaffDrawerRequest | null;
  onClose: () => void;
}) {
  const { data } = useGetStaffMemberQuery(request?.staffId ?? 0, {
    // The status drawer reads its own endpoint, so the record is fetched only
    // for the two drawers that render fields from it.
    skip: !request || request.kind === "status",
  });
  const person = data?.data;

  if (!request) return null;

  if (request.kind === "status") {
    return (
      <StatusDrawer
        key={`status-${request.staffId}`}
        staffId={request.staffId}
        onClose={onClose}
      />
    );
  }
  if (request.kind === "leave") {
    return (
      <LeaveDrawer
        key={`leave-${request.staffId}`}
        staffId={request.staffId}
        personName={request.personName}
        isSelf={request.isSelf}
        onClose={onClose}
      />
    );
  }
  if (!person) return null;
  return (
    <EditDrawer key={`edit-${person.id}`} person={person} onClose={onClose} />
  );
}
