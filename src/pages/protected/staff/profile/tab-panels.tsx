import { useRef, useState } from "react";
import { useParams } from "react-router";
import {
  AlertTriangle,
  CalendarPlus,
  FileText,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { ViewDocument } from "@/components/custom/view-document";
import PermissionGate from "@/components/custom/permission-gate";
import { LiveOnly } from "@/components/custom/as-at-control";
import FieldAccessOverrides, { personBranchIds } from "@/components/custom/field-access-overrides";
import { useReaderReach } from "@/hooks/use-reader-reach";
import { P } from "@/permissions";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useAsAt } from "@/lib/as-at";
import { usePermissions } from "@/hooks/use-permissions";
import { useSchoolDisplay } from "@/hooks/use-school-display";
import { fieldErrors, writeErrorMessage } from "@/utils/api-error";
import {
  useDeleteStaffDocumentMutation,
  useGetStaffMemberQuery,
  useUploadStaffDocumentMutation,
} from "@/redux/services/staff/staff-api";
import type {
  DocumentType,
  StaffDocument,
  StaffGrant,
  StaffHistoryEntry,
  StaffLeave,
  StaffLeaveBalance,
  StaffLeaveRequest,
  StaffMissingDocument,
  StaffQualification,
  StaffRevokedGrant,
  StaffRoles,
  StaffTeaching,
} from "@/redux/services/staff/staff-types";
// Not student-specific, and a second copy is the thing to avoid: a date parsed
// two ways is a birthday that reads a day early on one screen and not the
// other. If a third module needs them they move somewhere shared.
import { formatDate, formatDateTime } from "../../students/format";
import { ConfirmDialog } from "../../students/drawers/confirm-dialog";
import { Field, inputClass } from "../../students/drawers/drawer-shell";
import { canManage } from "../can-manage";
import { QualificationActions, QualificationEditor, QualificationRemove } from "./qualification-editor";

/**
 * The profile's tab bodies, each with the empty state it is most often in.
 *
 * Every one of these is empty for most people at most schools - nobody has
 * uploaded a certificate, nobody has filed leave - so the empty state is the
 * common case rather than the edge, and each says what would put something
 * there rather than only that there is nothing.
 *
 * **Nothing here claims a check the platform cannot make.** No verified badge
 * on a qualification, no expiry on a document, and no coloured workload.
 * Nothing anywhere verifies a degree and no register exists to verify one
 * against, so a badge would be a claim a school would believe. Leave balances
 * and missing documents are shown because the school sets both itself
 * (Settings, Staff): the allowances per leave type and the document types it
 * expects.
 */

export function TabSkeleton() {
  return (
    <div className="grid gap-2.5">
      <Skeleton className="h-4 w-2/5" />
      <Skeleton className="h-4 w-3/5" />
      <Skeleton className="h-4 w-1/3" />
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="py-6 text-center text-[13px] text-gray-05">{children}</p>
  );
}

function SectionNote({ children }: { children: React.ReactNode }) {
  return <p className="mb-4 text-xs text-gray-05">{children}</p>;
}

// ── Roles and reach ────────────────────────────────────────────────────────

/**
 * What this person may do, and where it reaches.
 *
 * **Reach is derived from grants and is not the posting.** Somebody based at
 * Lekki whose Teacher grant is pinned to Ikeja as well reaches both, and an
 * empty branch list where they hold only withdrawn branch grants is a real
 * answer meaning they reach the school-wide rows and nothing else. The server
 * says which in `reach.note`, and it is rendered rather than reworded.
 *
 * **A grant waiting for approval is listed apart from the roles held.** A role
 * carrying restricted permissions its granter does not hold is requested, not
 * written, and confers nothing until approved, so it must not read as held.
 *
 * **Revoked grants are history and are never hidden.** "What could this person
 * do before" is the question asked after something has gone wrong.
 *
 * `overrides` is absent entirely, not empty, for a reader without
 * `school.user_overrides.view` - an empty block would answer the question the
 * restriction exists to withhold - so this renders the section only when the
 * server sent one.
 *
 * **Changing a grant happens here, not only from the directory.** This tab is
 * where somebody comes to ask what a person may do, and it is the same visit
 * they answer it in: reading that Mrs. Okafor holds nothing and having to go
 * back to the list to give her something is the long way round a question she
 * is already open on. The button opens the same drawer the directory's row menu
 * opens, so a grant made from either place is one act with one confirmation,
 * and it carries the same key the server checks rather than a looser one.
 *
 * `postingBranchIds` are the branches the person is posted to, empty for a
 * school-wide posting. With their roles' reach they decide whether a
 * branch-bound reader may change this person's field exceptions.
 */
export function AccessTab({
  roles,
  staffId,
  userId,
  userName,
  postingBranchIds,
  onOpenDrawer,
  historyAction,
}: {
  roles: StaffRoles;
  staffId: number;
  userId: number;
  userName: string;
  postingBranchIds: number[];
  onOpenDrawer: (request: { kind: "role"; staffId: number }) => void;
  historyAction?: React.ReactNode;
}) {
  const openRoles = () => onOpenDrawer({ kind: "role", staffId });
  const { covers } = useReaderReach();
  const outsideReach = !covers(personBranchIds(postingBranchIds, roles.reach));

  return (
    <div className="grid gap-6">
      <section>
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-black-01">Roles held</h3>
          <div className="flex flex-wrap items-center gap-2">
            <LiveOnly>
              <PermissionGate permission={P.ASSIGN_ROLE}>
                <Button size="sm" variant="outline" onClick={openRoles}>
                  Grant or withdraw
                </Button>
              </PermissionGate>
            </LiveOnly>
            {historyAction}
          </div>
        </div>
        <SectionNote>
          What a role can do is defined in access control, not here.
        </SectionNote>
        {roles.roles.length ? (
          <ul className="grid gap-2.5">
            {roles.roles.map((grant) => (
              <GrantRow key={grant.id} grant={grant} />
            ))}
          </ul>
        ) : (
          <Empty>
            No role granted yet, so they can sign in and reach nothing.
          </Empty>
        )}
      </section>

      {(roles.pending ?? []).length > 0 && (
        <section>
          <h3 className="mb-1 text-sm font-semibold text-black-01">
            Waiting for approval
          </h3>
          <SectionNote>
            Nothing changes until these are approved in Approvals.
          </SectionNote>
          <ul className="grid gap-2.5">
            {(roles.pending ?? []).map((request) => (
              <li
                key={request.id}
                className="rounded-lg border border-dashed border-white-02 px-3.5 py-2.5"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-black-01">
                    {request.role_name}
                  </span>
                  <span className="rounded-full bg-gray-04 px-2 py-0.5 text-[11px] text-gray-01">
                    {request.branch_name}
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-05">
                  Asked for {formatDate(request.submitted_at)} by{" "}
                  {request.requested_by_name}
                  {request.replaces_role_name
                    ? `, to replace ${request.replaces_role_name}`
                    : ""}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h3 className="mb-1 text-sm font-semibold text-black-01">
          Branches they reach
        </h3>
        <SectionNote>{roles.reach.note}</SectionNote>
        {roles.reach.school_wide ? (
          <p className="text-sm text-black-01">Every branch.</p>
        ) : roles.reach.branches.length ? (
          <ul className="grid gap-2">
            {roles.reach.branches.map((b) => (
              <li key={b.id} className="flex flex-wrap items-baseline gap-2">
                <span className="text-sm text-black-01">{b.name}</span>
                <span className="text-xs text-gray-05">through {b.via}</span>
              </li>
            ))}
          </ul>
        ) : (
          <Empty>
            No branch narrowing, so they reach the school-wide records and
            nothing pinned to a branch.
          </Empty>
        )}
      </section>

      {roles.revoked.length > 0 && (
        <section>
          <h3 className="mb-1 text-sm font-semibold text-black-01">
            Withdrawn grants
          </h3>
          <SectionNote>
            Kept rather than deleted, with who withdrew it and why.
          </SectionNote>
          <ul className="grid gap-2.5">
            {roles.revoked.map((grant) => (
              <RevokedRow key={grant.id} grant={grant} />
            ))}
          </ul>
        </section>
      )}

      {roles.overrides && roles.overrides.length > 0 && (
        <section>
          <h3 className="mb-1 text-sm font-semibold text-black-01">
            Exceptions on this account
          </h3>
          <SectionNote>
            Permissions allowed or denied for this person alone, on top of what
            their roles give them.
          </SectionNote>
          <ul className="grid gap-2.5">
            {roles.overrides.map((row) => (
              <li
                key={`${row.permission}-${row.mode}`}
                className="rounded-lg border border-white-02 px-3.5 py-2.5"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[11px] font-medium",
                      row.mode === "ALLOW"
                        ? "bg-green-01/10 text-green-01-text"
                        : "bg-destructive/10 text-error-text",
                    )}
                  >
                    {row.mode === "ALLOW" ? "Allowed" : "Denied"}
                  </span>
                  <span className="font-mono text-xs text-gray-01">
                    {row.permission}
                  </span>
                </div>
                {row.reason && (
                  <p className="mt-1.5 text-xs text-gray-05">{row.reason}</p>
                )}
                {row.expires_at && (
                  <p className="mt-1 text-xs text-gray-05">
                    Expires {formatDate(row.expires_at)}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <FieldAccessOverrides userId={userId} userName={userName} outsideReach={outsideReach} />
    </div>
  );
}

function GrantRow({ grant }: { grant: StaffGrant }) {
  return (
    <li className="flex flex-wrap items-center gap-2.5 rounded-lg border border-white-02 px-3.5 py-2.5">
      <ShieldCheck className="size-4 shrink-0 text-primary" aria-hidden />
      <span className="text-sm font-medium text-black-01">{grant.role}</span>
      <span
        className={cn(
          "rounded-full px-2 py-0.5 text-[11px]",
          grant.school_wide
            ? "bg-white-03 text-primary"
            : "bg-gray-04 text-gray-01",
        )}
      >
        {grant.branch_name}
      </span>
      <span className="ml-auto text-xs text-gray-05">
        Granted {formatDate(grant.granted_at)}
        {grant.granted_by ? ` by ${grant.granted_by.name}` : ""}
      </span>
    </li>
  );
}

function RevokedRow({ grant }: { grant: StaffRevokedGrant }) {
  return (
    <li className="rounded-lg border border-white-02 bg-gray-04/40 px-3.5 py-2.5">
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="text-sm text-gray-01 line-through">{grant.role}</span>
        <span className="rounded-full bg-gray-04 px-2 py-0.5 text-[11px] text-gray-05">
          {grant.branch_name}
        </span>
      </div>
      <p className="mt-1 text-xs text-gray-05">
        Withdrawn {formatDate(grant.revoked_at)}
        {grant.revoked_by ? ` by ${grant.revoked_by.name}` : ""}
        {grant.reason ? ` - ${grant.reason}` : ""}
      </p>
    </li>
  );
}

// ── Teaching duties ────────────────────────────────────────────────────────

/**
 * What this person teaches this session, and nothing about when or where.
 *
 * An assignment says WHAT; the timetable says when and in which room. The load
 * is a count of assignments and is deliberately uncoloured: no contract records
 * a maximum and no subject records a weekly frequency, so a threshold here
 * would be a judgement nothing in the platform can make.
 */
export function TeachingTab({ teaching, onAssign, historyAction }: { teaching: StaffTeaching; onAssign?: () => void; historyAction?: React.ReactNode }) {
  return (
    <section>
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-black-01">{teaching.session.name}</h3>
        <div className="flex flex-wrap items-center gap-2">
          {onAssign && <Button size="sm" onClick={onAssign}>Assign teaching</Button>}
          {historyAction}
        </div>
      </div>
      <SectionNote>{teaching.load_note}</SectionNote>
      {teaching.assignments.length ? (
        <ul className="grid gap-2.5">
          {teaching.assignments.map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap items-center gap-2.5 rounded-lg border border-white-02 px-3.5 py-2.5"
            >
              <span className="text-sm font-medium text-black-01">
                {row.subject_name}
              </span>
              <span className="text-sm text-gray-01">{row.class_name}</span>
              <span
                className={cn(
                  "ml-auto rounded-full px-2 py-0.5 text-[11px] font-medium",
                  row.part === "LEAD"
                    ? "bg-[#DBE0EB] text-[#4A659D]"
                    : "bg-gray-04 text-gray-05",
                )}
              >
                {row.part_label}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <Empty>Nothing assigned this session.</Empty>
      )}
    </section>
  );
}

// ── Qualifications and documents ───────────────────────────────────────────

/** The school's recorded qualifications and the controls for a record editor. */
export function QualificationsTab({
  rows, staffId, canEdit = false, historyAction,
}: {
  rows: StaffQualification[];
  staffId?: number;
  canEdit?: boolean;
  historyAction?: React.ReactNode;
}) {
  const [editing, setEditing] = useState<StaffQualification | "new" | null>(null);
  const [removing, setRemoving] = useState<StaffQualification | null>(null);

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
        {canEdit && staffId != null && <Button size="sm" onClick={() => setEditing("new")}>Add qualification</Button>}
        {historyAction}
      </div>
      <SectionNote>
        Typed rows, as the school recorded them. Nothing in the platform checks
        a qualification, so nothing here says one was checked.
      </SectionNote>
      {rows.length ? (
        <ul className="grid gap-2.5">
          {rows.map((row) => (
            <li
              key={row.id}
              className="rounded-lg border border-white-02 px-3.5 py-2.5"
            >
              <p className="text-sm font-medium text-black-01">
                {row.qualification}
              </p>
              <p className="mt-0.5 text-xs text-gray-05">
                {[row.institution, row.year_obtained]
                  .filter(Boolean)
                  .join(" · ") || "No institution recorded"}
              </p>
              {row.note && (
                <p className="mt-1 text-xs text-gray-01">{row.note}</p>
              )}
              {canEdit && (
                <QualificationActions onEdit={() => setEditing(row)} onRemove={() => setRemoving(row)} />
              )}
            </li>
          ))}
        </ul>
      ) : (
        <Empty>{canEdit ? "None recorded. Add the first qualification above." : "None recorded."}</Empty>
      )}
      {staffId != null && editing && (
        <QualificationEditor
          key={editing === "new" ? "new" : editing.id}
          staffId={staffId}
          row={editing === "new" ? undefined : editing}
          onClose={() => setEditing(null)}
        />
      )}
      {removing && <QualificationRemove row={removing} onClose={() => setRemoving(null)} />}
    </section>
  );
}

const DOCUMENT_TYPES: { value: DocumentType; label: string }[] = [
  { value: "CV", label: "CV" },
  { value: "DEGREE_CERTIFICATE", label: "Degree certificate" },
  { value: "PROFESSIONAL_CERTIFICATE", label: "Professional certificate" },
  { value: "IDENTIFICATION", label: "National ID" },
  { value: "OTHER", label: "Other" },
];

/** The extensions the server's storage accepts, offered by the picker. */
const ACCEPTED_DOCUMENTS = ".pdf,.png,.jpg,.jpeg,.gif,.webp,.csv,.xls,.xlsx";

/**
 * The files held against a person, and the controls that add and remove them.
 *
 * Built to behave like the student Documents tab: View opens the file through
 * the authenticated media route, a new file uploads the moment it is picked,
 * and Remove asks first because the stored bytes do not come back. Staff files
 * are an open list rather than a checklist, so the type and the title are
 * chosen before the file instead of being fixed per row.
 *
 * Adding and removing need `school.staff_records.update`, the key the upload
 * and delete endpoints enforce, and a person the viewer manages: a branch
 * administrator reading somebody school-wide is refused by the server, so the
 * controls are absent rather than offered and refused. The record is read from
 * the profile's own query (same arguments, so no second request), because the
 * tab is handed only its rows. Both are hidden when reading an earlier day.
 *
 * The record's `missing_documents` names the types the school expects that
 * this person has none of. They are listed above the files as a flag, never a
 * block, and a reader who may upload gets a button per type that opens the
 * picker with that type already chosen.
 */
export function DocumentsTab({ rows, historyAction }: { rows: StaffDocument[]; historyAction?: React.ReactNode }) {
  const { id } = useParams();
  const staffId = Number(id);
  const asAt = useAsAt();
  const { hasPermission } = usePermissions();
  const { currentData: record } = useGetStaffMemberQuery(
    { id: staffId, asAt },
    { skip: !Number.isFinite(staffId) },
  );
  const person = record?.data;
  const canChange =
    !asAt &&
    (person ? canManage(person) : false) &&
    hasPermission(P.UPDATE_STAFF_RECORD);
  const missing = asAt ? [] : (person?.missing_documents ?? []);
  const input = useRef<HTMLInputElement>(null);
  const [type, setType] = useState<DocumentType>("CV");

  return (
    <section>
      {!canChange && <div className="mb-3 flex justify-end">{historyAction}</div>}
      <SectionNote>
        Files held against this person. There is no expiry and no approval
        state: nothing checks either, and a field somebody sets by hand reads as
        a check that was made.
      </SectionNote>
      {missing.length > 0 && (
        <MissingDocuments
          missing={missing}
          onUpload={
            canChange
              ? (next) => {
                  setType(next);
                  input.current?.click();
                }
              : undefined
          }
        />
      )}
      {canChange && (
        <DocumentUpload
          staffId={staffId}
          type={type}
          onTypeChange={setType}
          input={input}
          historyAction={historyAction}
        />
      )}
      {rows.length ? (
        <ul className="grid gap-2.5">
          {rows.map((row) => (
            <DocumentRow key={row.id} row={row} canChange={canChange} />
          ))}
        </ul>
      ) : (
        <Empty>
          {canChange
            ? "Nothing uploaded. Choose a type above and upload the first file."
            : "Nothing uploaded."}
        </Empty>
      )}
    </section>
  );
}

/**
 * The document types the school expects and this person has none of.
 *
 * Worded as missing rather than overdue: nothing refuses a record for it, and
 * the school decides what to chase.
 */
function MissingDocuments({
  missing,
  onUpload,
}: {
  missing: StaffMissingDocument[];
  /** Absent for a reader who may not upload to this record. */
  onUpload?: (type: DocumentType) => void;
}) {
  return (
    <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-3">
      <p className="flex items-start gap-2 text-[13px] font-medium text-amber-800">
        <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        <span className="min-w-0">
          Missing: {missing.map((row) => row.label).join(", ")}
        </span>
      </p>
      <p className="mt-1 text-xs text-amber-800/80">
        Your school expects these on every staff record.
      </p>
      {onUpload && (
        <div className="mt-2.5 flex flex-wrap gap-2">
          {missing.map((row) => (
            <Button
              key={row.type}
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onUpload(row.type)}
            >
              <Upload className="size-3.5" aria-hidden />
              Upload {row.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Pick a type, optionally name the file, then choose it.
 *
 * The server checks the extension and the size and answers 422 naming which
 * failed, so that refusal is shown under the control rather than in a toast.
 * A blank title takes the file's own name, since the server requires one.
 * The type and the file input belong to the tab, so a missing document's
 * button can choose the type and open the picker.
 */
function DocumentUpload({
  staffId,
  type,
  onTypeChange,
  input,
  historyAction,
}: {
  staffId: number;
  type: DocumentType;
  onTypeChange: (type: DocumentType) => void;
  input: React.RefObject<HTMLInputElement | null>;
  historyAction?: React.ReactNode;
}) {
  const [upload, { isLoading }] = useUploadStaffDocumentMutation();
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");

  async function send(file: File | undefined) {
    if (!file) return;
    setError("");
    const body = new FormData();
    body.append("document_type", type);
    body.append(
      "title",
      (title.trim() || file.name.replace(/\.[^.]+$/, "")).slice(0, 200),
    );
    body.append("file", file);
    try {
      await upload({ id: staffId, body }).unwrap();
      toast.success("Document uploaded.");
      setTitle("");
    } catch (failure) {
      const perField = fieldErrors(failure);
      setError(
        perField.file ??
          perField.title ??
          perField.document_type ??
          writeErrorMessage(failure, "We could not upload that file."),
      );
    }
  }

  return (
    <div className="mb-4 rounded-lg border border-white-02 p-3.5">
      <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)_auto]">
        <Field label="Type">
          <NativeSelect
            value={type}
            onChange={(e) => onTypeChange(e.target.value as DocumentType)}
            className="h-9"
          >
            {DOCUMENT_TYPES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Title">
          <input
            value={title}
            maxLength={200}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Optional, the file name if left blank"
            className={inputClass}
          />
        </Field>
        <div className="flex items-center gap-2">
          <input
            ref={input}
            type="file"
            accept={ACCEPTED_DOCUMENTS}
            className="hidden"
            onChange={(e) => {
              void send(e.target.files?.[0]);
              // Cleared so picking the same file again still fires a change.
              e.target.value = "";
            }}
          />
          <Button
            type="button"
            variant="outline"
            className="min-w-0 flex-1 sm:flex-none"
            disabled={isLoading}
            onClick={() => input.current?.click()}
          >
            <Upload className="size-4" aria-hidden />
            {isLoading ? "Uploading…" : "Upload document"}
          </Button>
          {historyAction}
        </div>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

function DocumentRow({
  row,
  canChange,
}: {
  row: StaffDocument;
  canChange: boolean;
}) {
  const [remove, { isLoading: removing }] = useDeleteStaffDocumentMutation();
  const [confirming, setConfirming] = useState(false);
  const label = row.title || row.document_type_label;

  async function drop() {
    try {
      await remove(row.id).unwrap();
      toast.success(`${label} removed.`);
      setConfirming(false);
    } catch (failure) {
      toast.error(writeErrorMessage(failure, "We could not remove that file."));
    }
  }

  return (
    <li className="flex flex-wrap items-center gap-2.5 rounded-lg border border-white-02 px-3.5 py-2.5">
      <FileText className="size-4 shrink-0 text-gray-05" aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm text-black-01">{label}</span>
        <span className="block text-xs text-gray-05">
          {row.document_type_label} · added {formatDate(row.created_at)}
          {row.uploaded_by ? ` by ${row.uploaded_by.name}` : ""}
          {row.file_retired ? " · replaced or removed since" : ""}
        </span>
      </span>
      <span className="flex shrink-0 flex-wrap items-center gap-3">
        {row.file_url && <ViewDocument url={row.file_url} label={label} />}
        {canChange && (
          <>
            <Button
              size="sm"
              variant="ghost"
              disabled={removing}
              onClick={() => setConfirming(true)}
              className="text-error-text hover:text-error-text"
            >
              {removing ? "Removing…" : "Remove"}
            </Button>
            <ConfirmDialog
              open={confirming}
              onCancel={() => setConfirming(false)}
              onConfirm={drop}
              title={`Remove ${label}?`}
              body="The file is deleted and cannot be recovered. A new one can be uploaded at any time."
              confirmLabel="Remove"
              busy={removing}
            />
          </>
        )}
      </span>
    </li>
  );
}

// ── Leave ──────────────────────────────────────────────────────────────────

/**
 * How a request reads, and what it looks like.
 *
 * Keyed on the CODE the server sends. `display_status` is derived rather than
 * looked up, so nothing behind it produces a label and the wording is this
 * screen's - which also means a value added later falls through to the neutral
 * default and prints its own code rather than nothing.
 *
 * Completed is grey and not green: an approved absence that has finished is
 * history, and colouring it like a live approval puts weight on the one row
 * nobody needs to act on.
 */
const LEAVE_STATUS: Record<
  StaffLeaveRequest["display_status"],
  { label: string; tone: string }
> = {
  APPROVED: { label: "Approved", tone: "bg-green-01/10 text-green-01-text" },
  PENDING: { label: "Pending", tone: "bg-yellow-01/10 text-yellow-01-text" },
  REJECTED: { label: "Rejected", tone: "bg-destructive/10 text-error-text" },
  CANCELLED: { label: "Cancelled", tone: "bg-gray-05/10 text-gray-06-text" },
  COMPLETED: { label: "Completed", tone: "bg-gray-05/10 text-gray-06-text" },
};

/**
 * The days-taken chips carry a type CODE, not a label.
 *
 * The request rows get `leave_type_label` from the server, but the days-taken
 * summary is an aggregate and carries only the code - so the wording lives here
 * for that one place rather than being derived by lowercasing, which turns
 * COMPASSIONATE into "Compassionate" correctly and would turn a two-word value
 * added later into nonsense.
 */
const LEAVE_TYPE_LABEL: Record<string, string> = {
  ANNUAL: "Annual",
  SICK: "Sick",
  MATERNITY: "Maternity",
  PATERNITY: "Paternity",
  STUDY: "Study",
  COMPASSIONATE: "Compassionate",
  OTHER: "Other",
};

/**
 * Absences filed for this person, and where they stand against the allowances.
 *
 * **Balances are the school's own allowances, per academic session** (Settings,
 * Staff), counted by the server for `balance_session`. A type shows when it
 * has an allowance or when something was taken or is pending against it this
 * session, so a school that sets two allowances does not read seven cards. A
 * type with no allowance says "No limit" and counts only what was taken.
 * `remaining` goes negative once an approver lets a request past the
 * allowance, and reads as days over rather than as a minus sign.
 *
 * Where the school has no session to count against, the balances are empty
 * and the tab falls back to the days taken across every session. With
 * balances shown, the all-session totals stay as one quiet line underneath.
 * Each request opens in place to show the current approval holder, its note,
 * and permitted actions without sending a reader to a second screen.
 */
export function LeaveTab({
  leave,
  onFile,
  fileLabel,
  onEdit,
  onCancel,
  cancelling,
  historyAction,
}: {
  leave: StaffLeave;
  /** Absent for a reader who may neither apply nor file on somebody's behalf. */
  onFile?: () => void;
  fileLabel?: string;
  onEdit?: (request: StaffLeaveRequest) => void;
  onCancel?: (request: StaffLeaveRequest) => void;
  cancelling?: boolean;
  historyAction?: React.ReactNode;
}) {
  const session = leave.balance_session ?? null;
  const shown = (leave.balances ?? []).filter(
    (row) => row.allowance != null || row.taken > 0 || row.pending > 0,
  );
  const allSessions = leave.days_taken
    .map((row) => `${(LEAVE_TYPE_LABEL[row.leave_type] ?? row.leave_type).toLowerCase()} ${dayCount(row.days)}`)
    .join(", ");

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-end gap-2">
        {onFile && (
          <Button variant="outline" onClick={onFile}>
            <CalendarPlus className="size-4" />
            {fileLabel}
          </Button>
        )}
        {historyAction}
      </div>
      {session ? (
        <section>
          <h3 className="mb-1 text-sm font-semibold text-black-01">
            Leave balance, {session.name}
          </h3>
          <SectionNote>{leave.balance_note}</SectionNote>
          {shown.length ? (
            <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {shown.map((row) => (
                <BalanceCard key={row.leave_type} row={row} />
              ))}
            </ul>
          ) : (
            <p className="text-[13px] text-gray-05">
              No leave taken or pending this session, and the school sets no
              allowances.
            </p>
          )}
          {allSessions && (
            <p className="mt-3 text-xs text-gray-05">
              Approved across all sessions: {allSessions}.
            </p>
          )}
        </section>
      ) : (
        <section>
          <h3 className="mb-1 text-sm font-semibold text-black-01">Days taken</h3>
          <SectionNote>{leave.balance_note}</SectionNote>
          {leave.days_taken.length ? (
            <div className="flex flex-wrap gap-2">
              {leave.days_taken.map((row) => (
                <span
                  key={row.leave_type}
                  className="inline-flex items-center gap-1.5 rounded-full bg-gray-04 px-2.5 py-1 text-[13px] text-gray-01"
                >
                  <span className="font-semibold text-black-01">{row.days}</span>
                  {LEAVE_TYPE_LABEL[row.leave_type] ?? row.leave_type}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-[13px] text-gray-05">None taken.</p>
          )}
        </section>
      )}

      <section>
        <h3 className="mb-3 text-sm font-semibold text-black-01">Requests</h3>
        {leave.leave.length ? (
          <ul className="grid gap-2.5">
            {leave.leave.map((row) => (
              <li
                key={row.id}
                className="min-w-0 rounded-lg border border-white-02 px-3.5 py-2.5"
              >
                <details className="group">
                  <summary className="flex min-w-0 cursor-pointer list-none flex-wrap items-center gap-2.5 [&::-webkit-details-marker]:hidden">
                  <span className="text-sm font-medium text-black-01">
                    {row.leave_type_label}
                  </span>
                  <span className="text-xs text-gray-05">
                    {formatDate(row.start_date)} to {formatDate(row.end_date)} ·{" "}
                    {row.days} {row.days === 1 ? "day" : "days"}
                  </span>
                  {(row.over_allowance_by ?? 0) > 0 && (
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                      {dayCount(row.over_allowance_by ?? 0)} over allowance
                    </span>
                  )}
                  <span
                    className={cn(
                      "ml-auto rounded-full px-2 py-0.5 text-[11px] font-medium",
                      LEAVE_STATUS[row.display_status]?.tone ??
                        "bg-gray-05/10 text-gray-06-text",
                    )}
                  >
                    {LEAVE_STATUS[row.display_status]?.label ??
                      row.display_status}
                  </span>
                  <span className="text-xs text-primary group-open:hidden">Details</span>
                  <span className="hidden text-xs text-primary group-open:inline">Hide details</span>
                  </summary>
                  <div className="mt-3 grid gap-3 border-t border-white-02 pt-3 text-[13px] sm:grid-cols-2">
                    <div>
                      <span className="block text-xs text-gray-05">Days</span>
                      {dayCount(row.days)}
                    </div>
                    <div>
                      <span className="block text-xs text-gray-05">Requested by</span>
                      {row.requested_by?.name ?? "Not recorded"}
                    </div>
                  {row.status === "PENDING" && (
                    <div className="sm:col-span-2">
                      <span className="block text-xs text-gray-05">Pending with</span>
                      {row.approval?.pending_with.length
                        ? row.approval.pending_with.join(", ")
                        : row.approval
                          ? "No approver assigned yet"
                          : "Approval details unavailable"}
                    </div>
                  )}
                  {row.note && (
                    <div className="min-w-0 whitespace-pre-wrap break-words sm:col-span-2">
                      <span className="block text-xs text-gray-05">Note</span>
                      {row.note}
                    </div>
                  )}
                  {row.last_changed_by && (
                    <div className="sm:col-span-2">
                      <span className="block text-xs text-gray-05">Last changed by</span>
                      {row.last_changed_by.name}
                      {row.last_changed_at ? ` on ${formatDateTime(row.last_changed_at)}` : ""}
                    </div>
                  )}
                  {((row.status === "PENDING" && onEdit) || ((row.status === "PENDING" || row.status === "APPROVED") && onCancel)) && (
                    <div className="flex flex-wrap gap-2 sm:col-span-2">
                      {row.status === "PENDING" && onEdit && (
                        <Button variant="outline" size="sm" onClick={() => onEdit(row)}>
                          Edit request
                        </Button>
                      )}
                      {(row.status === "PENDING" || row.status === "APPROVED") && onCancel && (
                        <Button variant="outline" size="sm" disabled={cancelling} onClick={() => onCancel(row)}>
                          Cancel request
                        </Button>
                      )}
                    </div>
                  )}
                  </div>
                </details>
              </li>
            ))}
          </ul>
        ) : (
          <Empty>No leave recorded.</Empty>
        )}
      </section>
    </div>
  );
}

function dayCount(days: number): string {
  return `${days} ${days === 1 ? "day" : "days"}`;
}

/** One leave type's standing this session: what is left, then how it was reached. */
function BalanceCard({ row }: { row: StaffLeaveBalance }) {
  const limited = row.allowance != null && row.remaining != null;
  const over = limited && (row.remaining ?? 0) < 0;

  return (
    <li className="min-w-0 rounded-lg border border-white-02 px-3.5 py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="text-sm font-medium text-black-01">{row.label}</span>
        <span
          className={cn(
            "text-[13px] font-semibold",
            over ? "text-amber-800" : "text-black-01",
          )}
        >
          {!limited
            ? "No limit"
            : over
              ? `${dayCount(-(row.remaining ?? 0))} over`
              : `${dayCount(row.remaining ?? 0)} left`}
        </span>
      </div>
      <p className="mt-1 text-xs text-gray-05">
        {limited ? `${dayCount(row.allowance ?? 0)} allowed · ` : ""}
        {row.taken} taken
        {row.pending > 0 ? ` · ${row.pending} pending` : ""}
      </p>
    </li>
  );
}

// ── History ────────────────────────────────────────────────────────────────

/**
 * One timeline, two halves, told apart on sight.
 *
 * An employment event and an account event are drawn differently on purpose. A
 * lockout is the identity layer noticing three bad passwords; a suspension is a
 * school taking a decision about somebody's job. A school that reads one as the
 * other believes its teacher was disciplined for mistyping her password, so the
 * kind is a coloured rail down the left rather than a word somebody has to
 * notice.
 */
export function HistoryTab({
  entries,
  branch,
}: {
  entries: StaffHistoryEntry[];
  /** The person's home branch, whose zone the times are read in. */
  branch?: number | null;
}) {
  const { prefs } = useSchoolDisplay(branch);
  if (!entries.length) return <Empty>Nothing recorded yet.</Empty>;

  return (
    <ol className="grid gap-3">
      {entries.map((entry, index) => (
        <li
          key={`${entry.kind}-${entry.at}-${index}`}
          className={cn(
            "border-l-2 pl-3.5",
            entry.kind === "employment" ? "border-primary" : "border-gray-02",
          )}
        >
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="text-sm text-black-01">
              {entry.kind === "employment"
                ? entry.from_status_label
                  ? `${entry.from_status_label} to ${entry.to_status_label}`
                  : entry.to_status_label
                : entry.label}
            </span>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                entry.kind === "employment"
                  ? "bg-white-03 text-primary"
                  : "bg-gray-04 text-gray-05",
              )}
            >
              {entry.kind === "employment" ? "Employment" : "Account"}
            </span>
          </div>
          {entry.kind === "employment" && entry.reason && (
            <p className="mt-0.5 text-xs text-gray-01">{entry.reason}</p>
          )}
          {entry.kind === "account" && entry.note && (
            <p className="mt-0.5 text-xs text-gray-01">{entry.note}</p>
          )}
          <p className="mt-0.5 text-xs text-gray-05">
            {formatDateTime(entry.at, prefs)}
            {entry.kind === "employment"
              ? entry.changed_by
                ? ` · ${entry.changed_by.name}`
                : ""
              : entry.actor
                ? ` · ${entry.actor.name}`
                : ""}
          </p>
        </li>
      ))}
    </ol>
  );
}
