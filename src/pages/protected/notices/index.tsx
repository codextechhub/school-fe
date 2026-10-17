import { useRef, useState } from "react";
import {
  ArchiveX,
  ChevronLeft,
  ChevronRight,
  FilePenLine,
  Files,
  Megaphone,
  Plus,
  Search,
  Send,
} from "lucide-react";

import PageAccessDenied from "@/components/custom/page-access-denied";
import PermissionGate from "@/components/custom/permission-gate";
import { SegmentedToggle } from "@/components/custom/segmented-toggle";
import { Panel } from "@/components/custom/surface";
import { useFieldAccess } from "@/components/finance-ui";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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

type NoticeFilter = NoticeStatus | "all";

/**
 * The staff notice desk.
 *
 * The list and selected notice stay together on desktop, while the detail
 * stacks underneath on a phone and scrolls into view after a selection. The
 * four summary cards use the list endpoint's pagination totals, so they do not
 * estimate from the current page. Status-specific requests, filters, totals
 * and chips are all skipped when Field Access hides Status; the remaining
 * total does not reveal how notices are split between states.
 *
 * Every notice field follows the viewer's Field Access on `school.notices`.
 * Hidden fields leave list rows and the detail surface completely, and the
 * drafting drawer keeps read-only fields out of submitted bodies.
 */
export default function NoticesPage() {
  const { hasPermission, hasAnyPermission } = usePermissions();
  const access = useFieldAccess(FIELD_RESOURCE.NOTICES);
  const [status, setStatus] = useState<NoticeFilter>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [viewing, setViewing] = useState<number | null>(null);
  const [editing, setEditing] = useState<Notice | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const detailRef = useRef<HTMLElement>(null);

  const canRead = hasPermission(P.BROWSE_NOTICES);
  const canPost = hasAnyPermission(P.POST_NOTICES, P.POST_CLASS_NOTICES);
  const statusHidden = access.isHidden("status");
  const effectiveStatus = statusHidden ? "all" : status;
  const list = useGetNoticesQuery(
    { status: effectiveStatus, search, page },
    { skip: !canRead },
  );
  const allTotal = useGetNoticesQuery(
    { status: "all", page: 1 },
    { skip: !canRead },
  );
  const publishedTotal = useGetNoticesQuery(
    { status: "PUBLISHED", page: 1 },
    { skip: !canRead || statusHidden },
  );
  const draftTotal = useGetNoticesQuery(
    { status: "DRAFT", page: 1 },
    { skip: !canRead || statusHidden },
  );
  const withdrawnTotal = useGetNoticesQuery(
    { status: "WITHDRAWN", page: 1 },
    { skip: !canRead || statusHidden },
  );
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
  const selectedId = notices.some((notice) => notice.id === viewing)
    ? viewing
    : (notices[0]?.id ?? null);
  const filtered = effectiveStatus !== "all" || Boolean(search);
  const counts = {
    all: allTotal.data?.pagination.totalItems,
    published: publishedTotal.data?.pagination.totalItems,
    drafts: draftTotal.data?.pagination.totalItems,
    withdrawn: withdrawnTotal.data?.pagination.totalItems,
  };
  const statusOptions = [
    { value: "all", label: "All", count: counts.all },
    { value: "PUBLISHED", label: "Published", count: counts.published },
    { value: "DRAFT", label: "Drafts", count: counts.drafts },
    { value: "WITHDRAWN", label: "Withdrawn", count: counts.withdrawn },
  ] satisfies { value: NoticeFilter; label: string; count?: number }[];

  const selectNotice = (id: number) => {
    setViewing(id);
    if (window.matchMedia("(max-width: 1023px)").matches) {
      window.requestAnimationFrame(() => {
        detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  };

  return (
    <PageShell className="content-start gap-4" grid>
      <PageHeader
        title="Notices"
        description="Write, publish and review the messages students receive in their portal and by email."
        actions={
          <PermissionGate permission={[P.POST_NOTICES, P.POST_CLASS_NOTICES]}>
            <Button className="shrink-0 text-sm" onClick={() => openForm(null)}>
              <Plus /> New notice
            </Button>
          </PermissionGate>
        }
      />

      <section
        aria-label="Notice summary"
        className={cn(
          "grid min-w-0 grid-cols-1 gap-2.5",
          statusHidden ? "sm:max-w-xs" : "grid-cols-2 lg:grid-cols-4",
        )}
      >
        <Metric
          icon={Files}
          label="All notices"
          value={counts.all}
          note="Across every page"
          loading={allTotal.isLoading}
        />
        {!statusHidden ? (
          <>
            <Metric
              icon={Send}
              label="Published"
              value={counts.published}
              note="Visible to students"
              loading={publishedTotal.isLoading}
              tone="green"
            />
            <Metric
              icon={FilePenLine}
              label="Drafts"
              value={counts.drafts}
              note="Still being prepared"
              loading={draftTotal.isLoading}
              tone="amber"
            />
            <Metric
              icon={ArchiveX}
              label="Withdrawn"
              value={counts.withdrawn}
              note="Removed from portals"
              loading={withdrawnTotal.isLoading}
            />
          </>
        ) : null}
      </section>

      {list.isError ? (
        <OutlinedNotice
          icon={Megaphone}
          title="We could not load your notices"
          body="Something went wrong on our side. Try again in a moment."
          actionLabel="Try again"
          onAction={() => list.refetch()}
        />
      ) : (
        <section
          className="grid min-w-0 grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1.18fr)_minmax(19rem,0.82fr)]"
          aria-label="Notice desk"
        >
          <Panel as="section" className="overflow-hidden">
            <div className="grid min-w-0 gap-3 border-b border-border px-3.5 py-3 sm:px-4">
              <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-mont text-sm font-semibold text-black-01">Notice list</h2>
                  <p className="mt-0.5 text-xs text-gray-06">
                    Select a notice to read its delivery details and manage it.
                  </p>
                </div>
                {!statusHidden ? (
                  <div className="max-w-full overflow-x-auto pb-1">
                    <SegmentedToggle
                      ariaLabel="Notice status"
                      value={effectiveStatus}
                      options={statusOptions}
                      onChange={(next) => {
                        setStatus(next);
                        setPage(1);
                        setViewing(null);
                      }}
                    />
                  </div>
                ) : null}
              </div>

              {!access.isHidden("title") ? (
                <div className="relative min-w-0 sm:max-w-sm">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-05" />
                  <input
                    value={search}
                    onChange={(event) => {
                      setSearch(event.target.value);
                      setPage(1);
                      setViewing(null);
                    }}
                    placeholder="Search notices"
                    aria-label="Search notices by title"
                    className="h-9 w-full rounded-lg border border-white-02 bg-white pl-9 pr-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15"
                  />
                </div>
              ) : null}
            </div>

            {list.isLoading || list.isFetching ? (
              <div className="grid gap-2 p-3.5" aria-label="Loading notices">
                {[0, 1, 2, 3].map((item) => (
                  <Skeleton key={item} className="h-20 w-full rounded-md" />
                ))}
              </div>
            ) : notices.length === 0 ? (
              <div className="grid justify-items-center gap-2 px-4 py-10 text-center">
                <span className="grid size-10 place-items-center rounded-full bg-pry-01 text-primary">
                  <Megaphone className="size-5" aria-hidden="true" />
                </span>
                <p className="text-sm font-semibold text-black-01">
                  {filtered ? "No notices match" : "No notices yet"}
                </p>
                <p className="max-w-sm text-xs leading-5 text-gray-06">
                  {filtered
                    ? "Try another search or status."
                    : "Notices appear here as soon as somebody saves the first draft."}
                </p>
                {filtered ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setStatus("all");
                      setSearch("");
                    }}
                  >
                    Show all notices
                  </Button>
                ) : canPost ? (
                  <Button size="sm" onClick={() => openForm(null)}>
                    New notice
                  </Button>
                ) : null}
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {notices.map((notice) => (
                  <NoticeRow
                    key={notice.id}
                    notice={notice}
                    active={notice.id === selectedId}
                    titleHidden={access.isHidden("title")}
                    audienceHidden={access.isHidden("audience")}
                    statusHidden={statusHidden}
                    publicationHidden={access.isHidden("publication")}
                    onOpen={() => selectNotice(notice.id)}
                  />
                ))}
              </ul>
            )}

            {pagination && pagination.totalPages > 1 ? (
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-3.5 py-3 text-xs text-gray-06 sm:px-4">
                <span>
                  Page {pagination.currentPage} of {pagination.totalPages} · {pagination.totalItems}{" "}
                  {pagination.totalItems === 1 ? "notice" : "notices"}
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={pagination.currentPage <= 1}
                    onClick={() => {
                      setPage((current) => Math.max(1, current - 1));
                      setViewing(null);
                    }}
                  >
                    <ChevronLeft aria-hidden="true" /> Previous
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={pagination.currentPage >= pagination.totalPages}
                    onClick={() => {
                      setPage((current) => current + 1);
                      setViewing(null);
                    }}
                  >
                    Next <ChevronRight aria-hidden="true" />
                  </Button>
                </div>
              </div>
            ) : null}
          </Panel>

          <section ref={detailRef} className="scroll-mt-4 lg:sticky lg:top-4">
            {selectedId != null ? (
              <NoticeDetail
                mode="panel"
                noticeId={selectedId}
                onClose={() => setViewing(null)}
                onEdit={openForm}
              />
            ) : (
              <Panel as="section" className="p-4 text-sm text-gray-06">
                Select a notice to read it here.
              </Panel>
            )}
          </section>
        </section>
      )}

      <NoticeDrawer
        open={formOpen}
        notice={editing}
        options={options.data?.data}
        onClose={() => setFormOpen(false)}
      />
    </PageShell>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  note,
  loading,
  tone = "default",
}: {
  icon: React.ElementType;
  label: string;
  value?: number;
  note: string;
  loading: boolean;
  tone?: "default" | "green" | "amber";
}) {
  return (
    <Panel as="section" className="flex min-w-0 items-center gap-3 px-3.5 py-3">
      <span
        className={cn(
          "grid size-9 shrink-0 place-items-center rounded-md",
          tone === "green"
            ? "bg-green-01/10 text-green-01-text"
            : tone === "amber"
              ? "bg-amber-50 text-amber-700"
              : "bg-pry-01 text-primary",
        )}
      >
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block text-xs text-gray-06">{label}</span>
        {loading || value === undefined ? (
          <Skeleton className="mt-1 h-5 w-10" />
        ) : (
          <span className="block text-lg font-semibold tabular-nums text-black-01">{value}</span>
        )}
        <span className="block truncate text-[11px] text-gray-05">{note}</span>
      </span>
    </Panel>
  );
}

function NoticeRow({
  notice,
  active,
  titleHidden,
  audienceHidden,
  statusHidden,
  publicationHidden,
  onOpen,
}: {
  notice: Notice;
  active: boolean;
  titleHidden: boolean;
  audienceHidden: boolean;
  statusHidden: boolean;
  publicationHidden: boolean;
  onOpen: () => void;
}) {
  const chip = notice.status ? STATUS_CHIP[notice.status] : undefined;
  const date = notice.published_at ?? notice.created_at;

  return (
    <li>
      <button
        type="button"
        aria-pressed={active}
        aria-label={titleHidden ? "Open notice" : `Open ${notice.title || "notice"}`}
        onClick={onOpen}
        className={cn(
          "group grid w-full min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-2 px-3.5 py-3 text-left transition-all ease-linear sm:px-4",
          "hover:bg-pry-01/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary active:scale-[0.995]",
          active && "bg-[#EEF3FF] shadow-[inset_3px_0_0_var(--color-primary)]",
        )}
      >
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-black-01">
            {titleHidden ? "Notice" : notice.title || "Untitled notice"}
          </span>
          <span className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-06">
            {!audienceHidden ? <span>{notice.audience_label || "No audience yet"}</span> : null}
            {!publicationHidden && notice.created_by ? <span>By {notice.created_by}</span> : null}
          </span>
        </span>
        {!statusHidden && chip ? (
          <span className={cn("shrink-0 self-start rounded-full px-2.5 py-0.5 text-xs font-medium", chip.className)}>
            {chip.label}
          </span>
        ) : null}
        {!publicationHidden && date ? (
          <span className="col-span-full text-[11px] text-gray-05">
            {notice.published_at ? "Published" : "Created"} {formatDate(date)}
          </span>
        ) : null}
      </button>
    </li>
  );
}
