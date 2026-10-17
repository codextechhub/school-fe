import { useState } from "react";
import { toast } from "sonner";

import { Panel } from "@/components/custom/surface";
import { useFieldAccess } from "@/components/finance-ui";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FIELD_RESOURCE } from "@/lib/field-resources";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "@/pages/protected/students/drawers/confirm-dialog";
import { DrawerShell } from "@/pages/protected/students/drawers/drawer-shell";
import { formatDateTime } from "@/pages/protected/students/format";
import {
  useGetNoticeQuery,
  usePublishNoticeMutation,
  useWithdrawNoticeMutation,
} from "@/redux/services/notices/notices-api";
import type { Notice } from "@/redux/services/notices/notices-types";
import { writeErrorMessage } from "@/utils/api-error";

import { STATUS_CHIP } from "./notice-copy";

/**
 * One notice, shown either in the notice desk or in the legacy drawer surface.
 *
 * Edit, Publish and Withdraw appear only where the server says the viewer may
 * manage this notice (`can_manage`). Every field follows the viewer's Field
 * Access on `school.notices`; a hidden field leaves the title, metadata,
 * message, figures and audit details without a substitute that could reveal it.
 */
export function NoticeDetail({
  noticeId,
  onClose,
  onEdit,
  mode = "drawer",
}: {
  noticeId: number | null;
  onClose: () => void;
  onEdit: (notice: Notice) => void;
  mode?: "drawer" | "panel";
}) {
  const query = useGetNoticeQuery(noticeId ?? 0, { skip: noticeId == null });
  const notice = noticeId != null ? query.data?.data : undefined;
  const access = useFieldAccess(FIELD_RESOURCE.NOTICES, notice);
  const [publish, publishing] = usePublishNoticeMutation();
  const [withdraw, withdrawing] = useWithdrawNoticeMutation();
  const [confirm, setConfirm] = useState<"publish" | "withdraw" | null>(null);

  const run = async (action: () => Promise<{ message?: string }>, fallback: string) => {
    try {
      const result = await action();
      toast.success(result.message || "Done.");
    } catch (error) {
      toast.error(writeErrorMessage(error, fallback));
    } finally {
      setConfirm(null);
    }
  };

  const shows = (name: string) => !access.isHidden(name);
  const chip = notice?.status ? STATUS_CHIP[notice.status] : undefined;
  const title = notice && shows("title") ? notice.title || "Notice" : "Notice";

  const body = query.isError ? (
    <div className="grid justify-items-start gap-2 py-2">
      <p className="text-sm font-semibold text-black-01">We could not open this notice</p>
      <p className="text-xs leading-5 text-gray-06">Try loading it again.</p>
      <Button size="sm" variant="outline" onClick={() => query.refetch()}>
        Try again
      </Button>
    </div>
  ) : !notice ? (
    <div className="grid gap-3" aria-label="Loading notice">
      <Skeleton className="h-5 w-40" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-16 w-full" />
    </div>
  ) : (
    <div className="grid gap-4">
      {mode === "drawer" ? (
        <div className="flex flex-wrap items-center gap-2">
          {chip && shows("status") ? (
            <StatusChip label={chip.label} className={chip.className} />
          ) : null}
          {shows("audience") && notice.audience_label ? (
            <span className="text-xs text-gray-05">For {notice.audience_label}</span>
          ) : null}
        </div>
      ) : null}

      {shows("body") ? (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-05">
            Message
          </p>
          <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-black-01">
            {notice.body}
          </p>
        </div>
      ) : null}

      {shows("reads") && notice.read_count != null && notice.audience_count != null ? (
        <div className="rounded-md border border-border bg-pry-01/20 px-3.5 py-3">
          <p className="text-sm font-semibold text-black-01">
            {notice.read_count} of {notice.audience_count} students have read it
          </p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white">
            <span
              className="block h-full rounded-full bg-primary"
              style={{
                width: `${Math.min(100, Math.round((notice.read_count / Math.max(1, notice.audience_count)) * 100))}%`,
              }}
            />
          </div>
          <p className="mt-1.5 text-xs leading-5 text-gray-06">
            The audience total includes students without a portal sign-in.
          </p>
        </div>
      ) : null}

      {shows("publication") ? <PublicationFacts notice={notice} /> : null}

      {notice.can_manage ? (
        <div className="flex flex-wrap gap-2 border-t border-border pt-3">
          {notice.status !== "WITHDRAWN" ? (
            <Button variant="outline" size="sm" onClick={() => onEdit(notice)}>
              Edit notice
            </Button>
          ) : null}
          {notice.status === "DRAFT" ? (
            <Button size="sm" onClick={() => setConfirm("publish")}>
              Publish
            </Button>
          ) : null}
          {notice.status === "PUBLISHED" ? (
            <Button variant="outline" size="sm" onClick={() => setConfirm("withdraw")}>
              Withdraw
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );

  const dialogs = (
    <>
      <ConfirmDialog
        open={confirm === "publish"}
        tone="primary"
        onCancel={() => setConfirm(null)}
        onConfirm={() =>
          notice &&
          run(() => publish(notice.id).unwrap(), "This notice could not be published. Try again.")
        }
        busy={publishing.isLoading}
        title="Publish this notice?"
        body={`It goes to ${notice?.audience_label || "its audience"} at once, in their portal and by email. Who it is for cannot change after this.`}
        confirmLabel="Publish"
      />
      <ConfirmDialog
        open={confirm === "withdraw"}
        onCancel={() => setConfirm(null)}
        onConfirm={() =>
          notice &&
          run(() => withdraw(notice.id).unwrap(), "This notice could not be withdrawn. Try again.")
        }
        busy={withdrawing.isLoading}
        title="Withdraw this notice?"
        body="It leaves every student's notices straight away. Staff still see it here, marked withdrawn. Emails already sent cannot be taken back."
        confirmLabel="Withdraw"
      />
    </>
  );

  if (mode === "panel") {
    return (
      <Panel as="section" className="overflow-hidden" aria-label="Selected notice">
        <div className="flex min-w-0 items-start justify-between gap-3 border-b border-border px-4 py-3.5">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-05">
              Selected notice
            </p>
            <h2 className="mt-1 break-words font-mont text-base font-semibold text-black-01">
              {title}
            </h2>
            {notice && shows("audience") && notice.audience_label ? (
              <p className="mt-1 text-xs text-gray-06">For {notice.audience_label}</p>
            ) : null}
          </div>
          {notice && chip && shows("status") ? (
            <StatusChip label={chip.label} className={chip.className} />
          ) : null}
        </div>
        <div className="p-4">{body}</div>
        {dialogs}
      </Panel>
    );
  }

  return (
    <DrawerShell
      open={noticeId != null}
      onClose={onClose}
      wide
      readOnly
      title={title}
      saveLabel="Close"
      onSave={onClose}
      canSave
    >
      {body}
      {dialogs}
    </DrawerShell>
  );
}

function StatusChip({ label, className }: { label: string; className: string }) {
  return (
    <span className={cn("shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium", className)}>
      {label}
    </span>
  );
}

function PublicationFacts({ notice }: { notice: Notice }) {
  const facts = [
    notice.published_at
      ? { label: "Published", value: formatDateTime(notice.published_at) }
      : null,
    notice.published_by ? { label: "Published by", value: notice.published_by } : null,
    notice.edited_at ? { label: "Last edited", value: formatDateTime(notice.edited_at) } : null,
    notice.withdrawn_at
      ? { label: "Withdrawn", value: formatDateTime(notice.withdrawn_at) }
      : null,
    notice.withdrawn_by ? { label: "Withdrawn by", value: notice.withdrawn_by } : null,
  ].filter((fact): fact is { label: string; value: string } => fact !== null);

  if (facts.length === 0) return null;

  return (
    <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {facts.map((fact) => (
        <div key={fact.label} className="min-w-0 rounded-md bg-gray-50 px-3 py-2.5">
          <dt className="text-xs text-gray-05">{fact.label}</dt>
          <dd className="mt-1 break-words text-sm font-medium text-black-01">{fact.value}</dd>
        </div>
      ))}
    </dl>
  );
}
