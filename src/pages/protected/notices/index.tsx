import { useState } from "react";
import { Megaphone, Plus, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import CustomTable from "@/components/custom/custom-table";
import PermissionGate from "@/components/custom/permission-gate";
import { Panel } from "@/components/custom/surface";
import Tabs from "@/components/custom/tab";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/layout/page-shell";
import PageAccessDenied from "@/components/custom/page-access-denied";
import { useFieldAccess } from "@/components/finance-ui";
import { useActionParam } from "@/hooks/use-action-param";
import { usePermissions } from "@/hooks/use-permissions";
import { FIELD_RESOURCE } from "@/lib/field-resources";
import { cn } from "@/lib/utils";
import { OutlinedNotice } from "@/pages/protected/onboarding/components/outlined-notice";
import { formatDate } from "@/pages/protected/students/format";
import { P } from "@/permissions";
import {
  useGetNoticeAudienceOptionsQuery,
  useGetNoticesQuery,
} from "@/redux/services/notices/notices-api";
import type { Notice, NoticeStatus } from "@/redux/services/notices/notices-types";

import { NoticeDetail } from "./notice-detail";
import { NoticeDrawer } from "./notice-drawer";
import { STATUS_CHIP } from "./notice-copy";

const STATUS_TABS = [
  { value: "all", label: "All" },
  { value: "PUBLISHED", label: "Published" },
  { value: "DRAFT", label: "Drafts" },
  { value: "WITHDRAWN", label: "Withdrawn" },
];

/**
 * Notices the school posts to its pupils.
 *
 * Staff see the notices inside their branch reach and their own drafts, newest
 * first. An administrator posts to the whole school, a branch, a level or any
 * class in reach; a teacher posts only to the classes they teach or lead, and
 * the audience picker offers nothing else. Publishing sends a notice to every
 * pupil in its audience, in their portal and by email; withdrawing takes it out
 * of their portal.
 *
 * Every notice field follows the viewer's Field Access on `school.notices`: a
 * hidden field leaves the table with its column and the drawers with its label.
 */
export default function NoticesPage() {
  const { hasPermission, hasAnyPermission } = usePermissions();
  const access = useFieldAccess(FIELD_RESOURCE.NOTICES);
  const [status, setStatus] = useState<NoticeStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [viewing, setViewing] = useState<number | null>(null);
  const [editing, setEditing] = useState<Notice | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const canRead = hasPermission(P.BROWSE_NOTICES);
  const canPost = hasAnyPermission(P.POST_NOTICES, P.POST_CLASS_NOTICES);
  const list = useGetNoticesQuery({ status, search, page }, { skip: !canRead });
  const options = useGetNoticeAudienceOptionsQuery(undefined, { skip: !canPost });

  const openForm = (notice: Notice | null) => {
    setViewing(null);
    setEditing(notice);
    setFormOpen(true);
  };

  useActionParam("new", canPost, () => openForm(null));

  if (!canRead) return <PageAccessDenied />;

  const notices = list.data?.data ?? [];
  const pagination = list.data?.pagination;
  const filtered = status !== "all" || Boolean(search);

  const columns = [
    "Notice",
    ...(access.isHidden("audience") ? [] : ["For"]),
    ...(access.isHidden("status") ? [] : ["Status"]),
    ...(access.isHidden("publication") ? [] : ["Published"]),
  ];

  return (
    <PageShell className="content-start gap-5" grid>
      <PageHeader
        title="Notices"
        description="Post notices to students. They read them in their portal and get an email when one is published."
        actions={
          <PermissionGate permission={[P.POST_NOTICES, P.POST_CLASS_NOTICES]}>
            <Button className="shrink-0 text-sm" onClick={() => openForm(null)}>
              <Plus /> New notice
            </Button>
          </PermissionGate>
        }
      />

      <Panel as="section" className="grid gap-3 p-4 sm:p-5">
        <div className="max-w-full overflow-x-auto">
          <Tabs
            tabs={STATUS_TABS}
            activeTab={status}
            setActiveTab={(value) => {
              setStatus(value as NoticeStatus | "all");
              setPage(1);
            }}
          />
        </div>
        {!access.isHidden("title") ? (
          <div className="relative min-w-0 max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-05" />
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search by title"
              aria-label="Search notices by title"
              className="h-10 w-full rounded-lg border border-white-02 bg-white pl-9 pr-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
          </div>
        ) : null}
      </Panel>

      {list.isError ? (
        <OutlinedNotice
          icon={Megaphone}
          title="We could not load your notices"
          body="Something went wrong on our side. Try again in a moment."
          actionLabel="Try again"
          onAction={() => list.refetch()}
        />
      ) : !list.isLoading && notices.length === 0 ? (
        <OutlinedNotice
          icon={Megaphone}
          title={filtered ? "No notices match" : "No notices yet"}
          body={
            filtered
              ? "Try another search or another tab."
              : "Notices you post to students appear here, drafts included."
          }
          actionLabel={filtered ? "Show all notices" : canPost ? "New notice" : undefined}
          onAction={
            filtered
              ? () => {
                  setStatus("all");
                  setSearch("");
                }
              : () => openForm(null)
          }
        />
      ) : (
        <CustomTable
          tableHeaderList={columns}
          loading={list.isLoading || list.isFetching}
          defaultBodyList={notices}
          tableBodyList={notices.map((notice) => row(notice, access.isHidden("title")))}
          onRowClick={(display: { _id: number }) => setViewing(display._id)}
          currentPage={pagination?.currentPage ?? 1}
          totalPage={pagination?.totalPages ?? 1}
          onPageChange={(next) => setPage(Number(next) || 1)}
          cardBreakpoint="md"
          emptyText="No notices"
        />
      )}

      <NoticeDetail noticeId={viewing} onClose={() => setViewing(null)} onEdit={openForm} />
      <NoticeDrawer
        open={formOpen}
        notice={editing}
        options={options.data?.data}
        onClose={() => setFormOpen(false)}
      />
    </PageShell>
  );
}

/** One table row; keys are the column headers, and `_id` rides along for the click. */
function row(notice: Notice, titleHidden: boolean) {
  const chip = notice.status ? STATUS_CHIP[notice.status] : undefined;
  return {
    _id: notice.id,
    Notice: (
      <span className="block min-w-0">
        <span className="block break-words text-sm font-medium text-black-01">
          {titleHidden ? "Notice" : notice.title}
        </span>
        {notice.created_by ? (
          <span className="mt-0.5 block text-xs text-gray-05">By {notice.created_by}</span>
        ) : null}
      </span>
    ),
    For: <span className="text-sm text-black-01">{notice.audience_label || "Nobody yet"}</span>,
    Status: chip ? (
      <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", chip.className)}>
        {chip.label}
      </span>
    ) : null,
    Published: (
      <span className="text-sm text-black-01">
        {notice.published_at ? formatDate(notice.published_at) : "Not yet"}
      </span>
    ),
  };
}
