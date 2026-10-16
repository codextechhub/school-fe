import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useFieldAccess } from "@/components/finance-ui";
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
 * One notice, as staff read it: what it says, who it is for, who published
 * or withdrew it and when, and how many pupils in its audience have opened it.
 *
 * Edit, Publish and Withdraw appear only where the server says the viewer may
 * manage this notice (`can_manage`): a teacher sees them on the notices they
 * wrote for their own classes and on nothing else. Every field follows the
 * viewer's Field Access on `school.notices`, and a hidden one leaves the
 * drawer with its label.
 */
export function NoticeDetail({
  noticeId,
  onClose,
  onEdit,
}: {
  noticeId: number | null;
  onClose: () => void;
  onEdit: (notice: Notice) => void;
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

  return (
    <DrawerShell
      open={noticeId != null}
      onClose={onClose}
      wide
      readOnly
      title={notice && shows("title") ? notice.title || "Notice" : "Notice"}
      saveLabel="Close"
      onSave={onClose}
      canSave
    >
      {!notice ? (
        <div className="grid gap-3">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : (
        <div className="grid gap-5">
          <div className="flex flex-wrap items-center gap-2">
            {chip && shows("status") ? (
              <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", chip.className)}>
                {chip.label}
              </span>
            ) : null}
            {shows("audience") && notice.audience_label ? (
              <span className="text-xs text-gray-05">For {notice.audience_label}</span>
            ) : null}
          </div>

          {shows("body") ? (
            <p className="whitespace-pre-wrap break-words text-sm leading-6 text-black-01">
              {notice.body}
            </p>
          ) : null}

          {shows("reads") && notice.read_count != null && notice.audience_count != null ? (
            <div className="rounded-lg border border-white-02 px-4 py-3">
              <p className="text-sm font-semibold text-black-01">
                {notice.read_count} of {notice.audience_count} students have read it
              </p>
              <p className="mt-0.5 text-xs text-gray-05">
                Counted against every student on the roll in the audience, including those
                without a portal sign-in.
              </p>
            </div>
          ) : null}

          {shows("publication") ? (
            <dl className="grid gap-1 text-xs text-gray-05">
              {notice.published_at ? (
                <div>
                  <dt className="inline">Published </dt>
                  <dd className="inline text-black-01">
                    {formatDateTime(notice.published_at)}
                    {notice.published_by ? ` by ${notice.published_by}` : ""}
                  </dd>
                </div>
              ) : null}
              {notice.edited_at ? (
                <div>
                  <dt className="inline">Edited </dt>
                  <dd className="inline text-black-01">{formatDateTime(notice.edited_at)}</dd>
                </div>
              ) : null}
              {notice.withdrawn_at ? (
                <div>
                  <dt className="inline">Withdrawn </dt>
                  <dd className="inline text-black-01">
                    {formatDateTime(notice.withdrawn_at)}
                    {notice.withdrawn_by ? ` by ${notice.withdrawn_by}` : ""}
                  </dd>
                </div>
              ) : null}
            </dl>
          ) : null}

          {notice.can_manage ? (
            <div className="flex flex-wrap gap-2 border-t border-white-02 pt-4">
              {notice.status !== "WITHDRAWN" ? (
                <Button variant="outline" size="sm" onClick={() => onEdit(notice)}>
                  Edit
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
      )}

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
    </DrawerShell>
  );
}
