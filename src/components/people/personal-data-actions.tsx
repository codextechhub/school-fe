import { useState } from "react";
import { toast } from "sonner";

import PermissionGate from "@/components/custom/permission-gate";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { DrawerShell, Field } from "@/pages/protected/students/drawers/drawer-shell";
import { P } from "@/permissions";
import {
  type PersonKind,
  useDownloadPersonalDataMutation,
  useErasePersonalDataMutation,
} from "@/redux/services/personal-data-api";
import { downloadObjectUrl } from "@/utils/attachment-download";
import { apiErrorMessage } from "@/utils/api-errors";

const MAX_REASON = 500;

/** The statuses a pupil has left the school in; only a leaver can be erased on request. */
export const PUPIL_LEFT_STATUSES: ReadonlySet<string> = new Set([
  "WITHDRAWN", "GRADUATED", "TRANSFERRED", "REJECTED",
]);

/** The employment statuses that take someone off the roll; only they can be erased. */
export const STAFF_LEFT_STATUSES: ReadonlySet<string> = new Set(["RESIGNED", "TERMINATED"]);

/** What erasing removes and keeps, per kind, in the words of the sheet. */
const ERASE_COPY: Record<PersonKind, { goes: string; stays: string }> = {
  student: {
    goes: "address, phone, email, photo, health notes, emergency contact, documents and their sign-in",
    stays: "their name, results, attendance and fee records",
  },
  guardian: {
    goes: "their name, phone, email, address, occupation, photo and sign-in",
    stays: "the children's own records",
  },
  staff: {
    goes: "date of birth, photo, qualifications, documents, pay bank account and their sign-in",
    stays: "their name, service, teaching records and payslips",
  },
};

/**
 * A school's two answers to a person's data request, for a pupil, guardian or
 * staff profile: download everything held about them, or erase them once they
 * have left.
 *
 * Each button needs its own key (`P.EXPORT_PERSONAL_DATA`,
 * `P.ERASE_PERSONAL_DATA`), held by school administrators unless the school
 * grants them further. The copy includes fields the reader's own role cannot
 * open, which is why the key and not Field Access is the gate.
 *
 * Erasing cannot be undone, so it opens a sheet that says what goes and what
 * stays, and asks for the reason: whose request it is and when it came in. The
 * reason is kept in the audit trail, which outlives the details erased. The
 * server decides whether the person has left; `canErase` only keeps the button
 * off a record that obviously has not (a pupil still on the roll), and the
 * server's refusal is shown in the sheet when it says no.
 */
export function PersonalDataActions({
  kind,
  id,
  name,
  canErase,
  onErased,
}: {
  kind: PersonKind;
  id: number;
  name: string;
  canErase: boolean;
  onErased?: () => void;
}) {
  const [download, { isLoading: downloading }] = useDownloadPersonalDataMutation();
  const [erase, { isLoading: erasing }] = useErasePersonalDataMutation();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [refusal, setRefusal] = useState("");

  const takeCopy = async () => {
    try {
      const url = await download({ kind, id }).unwrap();
      downloadObjectUrl(url, `personal-data-${kind}-${id}.json`);
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(apiErrorMessage(error, "We could not prepare the copy."));
    }
  };

  const close = () => {
    setOpen(false);
    setReason("");
    setRefusal("");
  };

  const confirmErase = async () => {
    setRefusal("");
    try {
      const response = await erase({ kind, id, reason: reason.trim() }).unwrap();
      toast.success(response.message || `${name}'s personal details are erased.`);
      close();
      onErased?.();
    } catch (error) {
      setRefusal(apiErrorMessage(error, "We could not erase these details."));
    }
  };

  const copy = ERASE_COPY[kind];
  const trimmed = reason.trim();

  return (
    <>
      <PermissionGate permission={P.EXPORT_PERSONAL_DATA}>
        <Button size="sm" variant="outline" onClick={takeCopy} disabled={downloading}>
          {downloading ? "Preparing…" : "Download their data"}
        </Button>
      </PermissionGate>
      <PermissionGate permission={P.ERASE_PERSONAL_DATA} disabled={!canErase}>
        <Button
          size="sm"
          variant="outline"
          className="text-red-700 hover:text-red-800"
          onClick={() => setOpen(true)}
        >
          Erase their details
        </Button>
      </PermissionGate>

      <DrawerShell
        open={open}
        onClose={close}
        title={`Erase ${name}'s details`}
        subtitle="For a request from the person, or their parent, to have their data deleted."
        saveLabel="Erase for good"
        onSave={confirmErase}
        canSave={trimmed.length > 0 && trimmed.length <= MAX_REASON}
        saving={erasing}
        destructive
      >
        <div className="grid gap-4 text-[13px] text-gray-01">
          <p>
            <span className="font-medium">Goes now:</span> {copy.goes}.
          </p>
          <p>
            <span className="font-medium">Stays:</span> {copy.stays}, which the
            school must keep.
          </p>
          <p>This cannot be undone. Download their data first if they asked for a copy too.</p>
          <Field label="Whose request is this, and when did it come in?" required>
            <Textarea
              value={reason}
              maxLength={MAX_REASON}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Mrs Nwosu's email of 2 November"
              rows={3}
            />
          </Field>
          {refusal && (
            <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-red-700">
              {refusal}
            </p>
          )}
        </div>
      </DrawerShell>
    </>
  );
}
