import { useGetStudentQuery } from "@/redux/services/students/students-api";

import { EditDrawer, type EditSectionKey } from "./edit-drawer";
import { LinkGuardianDrawer } from "./link-guardian-drawer";
import { StatusDrawer } from "./status-drawer";
import { TransferDrawer } from "./transfer-drawer";

export type DrawerKind = "edit" | "status" | "transfer" | "guardian";

export type DrawerRequest =
  | { kind: "edit"; studentId: number; section?: EditSectionKey }
  | { kind: Exclude<DrawerKind, "edit">; studentId: number };

/**
 * One host for every student drawer, mounted once per screen.
 *
 * **It takes a student ID and fetches the record itself**, rather than being
 * handed a row. The directory's row carries a dozen fields; three of these
 * drawers need the full record - `allowed_transitions` most of all, which is
 * what stops the status drawer from offering a move the server refuses. Passing
 * the row and topping it up inside each drawer would mean four components each
 * deciding what "enough" means.
 *
 * Nothing renders until the record has arrived, so a drawer never opens with
 * half a form and then reflows under the reader.
 */
export function StudentDrawers({
  request,
  onClose,
}: {
  request: DrawerRequest | null;
  onClose: () => void;
}) {
  const { data } = useGetStudentQuery(request?.studentId ?? 0, {
    skip: !request,
  });
  const student = data?.data;
  if (!request || !student) return null;

  const open = true;
  switch (request.kind) {
    case "edit":
      return (
        <EditDrawer
          student={student}
          open={open}
          onClose={onClose}
          initialSection={request.section}
        />
      );
    case "status":
      return <StatusDrawer student={student} open={open} onClose={onClose} />;
    case "transfer":
      return <TransferDrawer student={student} open={open} onClose={onClose} />;
    case "guardian":
      return (
        <LinkGuardianDrawer student={student} open={open} onClose={onClose} />
      );
  }
}
