import { useState, type ReactNode } from "react";
import { Lock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { SetupCheck, SetupStatus } from "@/redux/services/gradebook/gradebook-types";
import { ConfirmDialog } from "@/pages/protected/students/drawers/confirm-dialog";

/** What a structure and a scale share, as the programme cards read them. */
export interface SetupRecordLike {
  id: number;
  name: string;
  program: number;
  program_name: string;
  branch: number | null;
  scope_label: string;
  status: SetupStatus;
  locked: boolean;
  lock_reason: string | null;
}

/** The programmes a school runs, with the records each has. */
export interface Programme {
  id: number;
  name: string;
}

/**
 * Every programme's records of one kind, structure or scale, in one card each.
 *
 * A card shows the record in use (more than one when a branch keeps its own)
 * and any drafts beneath it; retired records are history and are not shown. A
 * programme with nothing in use says so, because none of its sheets can open
 * until it has one.
 *
 * The actions follow the record's life. A record in use is edited in place
 * while nothing published rests on it; once something does it is locked, and
 * the way to change it is to copy it and put the copy in use, which leaves the
 * published results exactly as they were. A draft is edited, put in use (which
 * retires the one it replaces) or deleted.
 */
export function ProgrammeRecords<T extends SetupRecordLike>({
  noun,
  consequence,
  programmes,
  records,
  canSave,
  emptyHint,
  check,
  renderBody,
  onEdit,
  onCreate,
  onCopy,
  onActivate,
  onDelete,
}: {
  /** "structure" or "scale", as the sentences say it. */
  noun: string;
  /** What putting one in use does to results already under way. */
  consequence: string;
  programmes: Programme[];
  records: T[];
  canSave: boolean;
  emptyHint: string;
  check: (record: T) => SetupCheck | undefined;
  renderBody: (record: T) => ReactNode;
  onEdit: (record: T) => void;
  onCreate: (programme: Programme) => void;
  onCopy: (record: T) => Promise<boolean>;
  onActivate: (record: T) => Promise<boolean>;
  onDelete: (record: T) => Promise<boolean>;
}) {
  const [confirm, setConfirm] = useState<{ kind: "activate" | "delete"; record: T } | null>(null);
  const [busy, setBusy] = useState(false);

  const live = records.filter((record) => record.status !== "RETIRED");
  const known = new Map(programmes.map((programme) => [programme.id, programme]));
  for (const record of live) {
    if (!known.has(record.program)) known.set(record.program, { id: record.program, name: record.program_name });
  }

  const replaced = (draft: T) =>
    live.find(
      (other) => other.status === "IN_USE" && other.program === draft.program && other.branch === draft.branch,
    );

  const run = async (action: () => Promise<boolean>) => {
    setBusy(true);
    const done = await action();
    setBusy(false);
    if (done) setConfirm(null);
  };

  return (
    <div className="grid grid-cols-1 gap-4 px-4 py-4 sm:px-5">
      {[...known.values()].map((programme) => {
        const mine = live
          .filter((record) => record.program === programme.id)
          .sort((a, b) => (a.status === b.status ? (a.branch ?? 0) - (b.branch ?? 0) : a.status === "IN_USE" ? -1 : 1));
        return (
          <section key={programme.id} className="min-w-0 rounded-lg border border-white-02">
            <header className="flex flex-wrap items-center justify-between gap-2 border-b border-white-02 px-4 py-3">
              <h3 className="font-mont text-sm font-semibold text-gray-01">{programme.name}</h3>
              {canSave && (
                <Button variant="outline" size="sm" onClick={() => onCreate(programme)}>
                  New draft
                </Button>
              )}
            </header>
            {mine.length === 0 ? (
              <p className="px-4 py-4 font-mont text-xs leading-5 text-gray-05">{emptyHint}</p>
            ) : (
              <ul className="divide-y divide-white-02">
                {mine.map((record) => {
                  const verdict = check(record);
                  return (
                    <li key={record.id} className="min-w-0 space-y-3 px-4 py-4">
                      <div className="flex min-w-0 flex-wrap items-start gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-mont text-sm font-medium text-gray-01">{record.name}</p>
                          <p className="font-mont text-xs text-gray-05">{record.scope_label}</p>
                        </div>
                        <Badge variant={record.status === "IN_USE" ? "active" : "pending"} className="rounded-full">
                          {record.status === "IN_USE" ? "In use" : "Draft"}
                        </Badge>
                        {verdict && (
                          <Badge variant={verdict.ok ? "green" : "red"} className="rounded-full">
                            {verdict.ok ? "Checks pass" : "Needs attention"}
                          </Badge>
                        )}
                      </div>
                      {record.locked && record.lock_reason && (
                        <p className="flex items-start gap-1.5 font-mont text-xs leading-5 text-gray-05">
                          <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                          {record.lock_reason}
                        </p>
                      )}
                      {renderBody(record)}
                      {verdict && !verdict.ok && (
                        <p className="font-mont text-xs leading-5 text-error-text">{verdict.message}</p>
                      )}
                      {canSave && (
                        <div className="flex flex-wrap gap-2">
                          {record.locked ? (
                            <Button size="sm" variant="outline" disabled={busy} onClick={() => void run(() => onCopy(record))}>
                              Copy to edit
                            </Button>
                          ) : (
                            <Button size="sm" variant="outline" onClick={() => onEdit(record)}>
                              Edit
                            </Button>
                          )}
                          {record.status === "IN_USE" && !record.locked && (
                            <Button size="sm" variant="ghost" disabled={busy} onClick={() => void run(() => onCopy(record))}>
                              Copy
                            </Button>
                          )}
                          {record.status === "DRAFT" && (
                            <>
                              <Button size="sm" onClick={() => setConfirm({ kind: "activate", record })}>
                                Put in use
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setConfirm({ kind: "delete", record })}>
                                Delete draft
                              </Button>
                            </>
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        );
      })}

      <ConfirmDialog
        open={confirm?.kind === "activate"}
        onCancel={() => setConfirm(null)}
        onConfirm={() => confirm && void run(() => onActivate(confirm.record))}
        title={`Put ${confirm?.record.name ?? `this ${noun}`} in use?`}
        body={
          confirm
            ? `${
                replaced(confirm.record)
                  ? `It replaces ${replaced(confirm.record)!.name} for ${confirm.record.program_name} (${confirm.record.scope_label}), which is kept as history. `
                  : `It becomes the ${noun} for ${confirm.record.program_name} (${confirm.record.scope_label}). `
              }${consequence}`
            : ""
        }
        confirmLabel="Put in use"
        busy={busy}
      />
      <ConfirmDialog
        open={confirm?.kind === "delete"}
        onCancel={() => setConfirm(null)}
        onConfirm={() => confirm && void run(() => onDelete(confirm.record))}
        title={`Delete ${confirm?.record.name ?? "this draft"}?`}
        body="The draft is removed. Nothing in use changes."
        confirmLabel="Delete draft"
        busy={busy}
      />
    </div>
  );
}
