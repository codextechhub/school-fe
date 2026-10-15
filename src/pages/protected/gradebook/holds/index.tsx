import { useState } from "react";
import { Search, TriangleAlert, Wallet } from "lucide-react";

import CustomTable from "@/components/custom/custom-table";
import { Panel } from "@/components/custom/surface";
import { PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { useFieldAccess } from "@/components/finance-ui";
import { useBranchLens } from "@/hooks/use-branch-lens";
import { useDebounce } from "@/hooks/use-debounce";
import { usePermissions } from "@/hooks/use-permissions";
import { useSchoolDisplay } from "@/hooks/use-school-display";
import { FIELD_RESOURCE } from "@/lib/field-resources";
import { P } from "@/permissions";
import { useGetHoldsQuery } from "@/redux/services/gradebook/gradebook-api";
import type { HoldRow } from "@/redux/services/gradebook/gradebook-types";
import { routesPath } from "@/routes/routesPath";
import { OutlinedNotice } from "@/pages/protected/onboarding/components/outlined-notice";
import { parseApiError } from "@/utils/api-error";
import { formatKoboAsNaira } from "@/utils/user-facing-message";

import { HoldDrawer } from "./hold-drawer";

/**
 * Fee holds: the students of the term's classes, what Finance says each family
 * owes, and whose result is held from release.
 *
 * Balances are context for a person's decision, read from Finance at the time
 * shown; no result is ever held automatically. The list opens on the families
 * who owe (and anyone already held, so a hold can be lifted once they pay),
 * and can be widened to the whole roll, narrowed to a class, or searched by
 * name or admission number. When Finance cannot answer, every balance is
 * blank rather than zero and the whole roll is listed, because nothing can
 * then be said about who owes.
 *
 * A reader with the holds key reads; Hold result and Lift hold need the
 * manage key. A released result cannot be held. No mark appears anywhere on
 * this screen.
 *
 * Field Access: the balance switch removes the balance and oldest-unpaid
 * columns, the as-of line and the "who owe" filter (filtering on a balance
 * would tell the reader who owes). The hold reason follows its own switch; a
 * role that may not write it cannot place a hold.
 */
export default function FeeHoldsPage() {
  const { branch } = useBranchLens();
  const { hasPermission } = usePermissions();
  const access = useFieldAccess(FIELD_RESOURCE.GRADEBOOK_HOLD);
  const { formatDateTime } = useSchoolDisplay();
  const showsBalance = !access.isHidden("balance");
  const [owes, setOwes] = useState(true);
  const [classId, setClassId] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [acting, setActing] = useState<HoldRow | null>(null);
  const settled = useDebounce(search);

  const { data, isLoading, isFetching, isError, error, refetch } = useGetHoldsQuery({
    branch,
    owes: showsBalance && owes,
    classId: classId ? Number(classId) : undefined,
    search: settled,
    page,
  });
  const status = parseApiError(error).status;
  const rows = data?.data ?? [];
  const mayAct = hasPermission(P.MANAGE_RESULT_HOLDS);
  const mayHold = mayAct && !access.isReadOnly("reason");
  const financeDown = data?.finance_available === false;
  const filtering = !!(classId || settled.trim());

  const narrow = (apply: () => void) => {
    apply();
    setPage(1);
  };

  const headers = [
    "Student",
    "Class",
    ...(showsBalance ? ["Balance (Finance)", "Oldest unpaid"] : []),
    "Hold",
    ...(mayAct ? ["Action"] : []),
  ];

  return (
    <PageShell className="content-start gap-4" grid>
      <div className="min-w-0">
        <h1 className="font-mont text-lg font-semibold text-black-01">Fee holds</h1>
        <p className="text-sm text-gray-06">
          {showsBalance && data?.as_of && !financeDown
            ? `Students in ${data.term.name}'s classes. Balances are read from Finance as of ${formatDateTime(data.as_of)}, as context for your decision. `
            : "Students in this term's classes. "}
          No result is ever held automatically.
        </p>
      </div>

      {status === 403 ? (
        <OutlinedNotice
          icon={Wallet}
          title="Fee holds are not yours to open"
          body="Holding a result over fees belongs to the people the school gives it to, usually the bursar."
          actionLabel="Back to the gradebook"
          actionTo={routesPath.PROTECTED.GRADEBOOK.INDEX}
        />
      ) : isError ? (
        <OutlinedNotice
          icon={Wallet}
          title="We could not load the fee holds"
          body="Something went wrong on our side."
          actionLabel="Try again"
          onAction={() => refetch()}
        />
      ) : (
        <>
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <div className="relative w-full min-w-0 sm:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-05" aria-hidden="true" />
              <Input
                value={search}
                aria-label="Search by name or admission number"
                placeholder="Search by name or admission number"
                className="pl-9"
                onChange={(event) => narrow(() => setSearch(event.target.value))}
              />
            </div>
            <div className="w-full sm:w-52">
              <NativeSelect
                aria-label="Class"
                value={classId}
                onChange={(event) => narrow(() => setClassId(event.target.value))}
              >
                <option value="">All classes</option>
                {(data?.classes ?? []).map((item) => (
                  <option key={item.id} value={String(item.id)}>
                    {item.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
            {showsBalance && (
              <label className="flex items-center gap-2 text-sm text-black-01">
                <Switch checked={owes} onCheckedChange={(on) => narrow(() => setOwes(on))} />
                Only families who owe, and anyone held
              </label>
            )}
          </div>

          {showsBalance && financeDown && (
            <div role="status" className="flex gap-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-[#854F0B]">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span>
                Finance cannot answer right now, so no balance is shown and every student is listed. Holds can still be
                placed and lifted.
              </span>
            </div>
          )}

          <Panel as="section" className="min-w-0">
            <CustomTable
              tableHeaderList={headers}
              loading={isLoading || isFetching}
              emptyText={
                filtering
                  ? "No student matches these filters."
                  : showsBalance && owes && !financeDown
                    ? "No family owes anything and no result is held."
                    : "No student is on a class roll this term."
              }
              totalPage={data?.pagination.totalPages ?? 0}
              currentPage={page}
              onPageChange={(next) => setPage(Number(next))}
              hidePagination={(data?.pagination.totalPages ?? 0) <= 1}
              defaultBodyList={rows}
              tableBodyList={rows.map((row) => ({
                Student: (
                  <span className="min-w-0">
                    <span className="block font-medium text-black-01">{row.student.name}</span>
                    {row.student.admission_number && (
                      <span className="block text-xs text-gray-05">{row.student.admission_number}</span>
                    )}
                  </span>
                ),
                Class: (
                  <span className="min-w-0">
                    <span className="block text-black-01">{row.class.name}</span>
                    {row.branch && <span className="block text-xs text-gray-05">{row.branch.name}</span>}
                  </span>
                ),
                ...(showsBalance
                  ? {
                      "Balance (Finance)":
                        row.balance === null || row.balance === undefined ? "-" : formatKoboAsNaira(row.balance),
                      "Oldest unpaid": row.days_owed ? `${row.days_owed} days` : "-",
                    }
                  : {}),
                Hold: <HoldCell row={row} />,
                ...(mayAct ? { Action: <ActionCell row={row} mayHold={mayHold} onAct={() => setActing(row)} /> } : {}),
              }))}
            />
          </Panel>
        </>
      )}

      {acting && data && <HoldDrawer row={acting} term={data.term.id} onClose={() => setActing(null)} />}
    </PageShell>
  );
}

function HoldCell({ row }: { row: HoldRow }) {
  const { formatDate } = useSchoolDisplay(row.branch?.id ?? null);
  if (!row.hold) return <span className="text-gray-05">-</span>;
  const by = [row.hold.placed_by ? `by ${row.hold.placed_by}` : null, formatDate(row.hold.placed_at)]
    .filter(Boolean)
    .join(" · ");
  return (
    <span className="block min-w-0">
      <Badge variant="pending" className="rounded-full">
        Held
      </Badge>
      <span className="mt-1 block text-xs text-gray-06">{by}</span>
      {row.hold.reason && (
        <span className="block max-w-64 whitespace-normal text-xs text-gray-05">{row.hold.reason}</span>
      )}
    </span>
  );
}

function ActionCell({ row, mayHold, onAct }: { row: HoldRow; mayHold: boolean; onAct: () => void }) {
  const { formatDate } = useSchoolDisplay(row.branch?.id ?? null);
  if (row.hold) {
    return (
      <Button size="sm" variant="outline" onClick={onAct}>
        Lift hold
      </Button>
    );
  }
  if (row.released) {
    return (
      <span className="block max-w-56 whitespace-normal text-xs text-gray-05">
        Released{row.released_on ? ` on ${formatDate(row.released_on)}` : ""}; a released result cannot be held.
      </span>
    );
  }
  if (!mayHold) return <span className="text-gray-05">-</span>;
  return (
    <Button size="sm" variant="outline" className="text-[#854F0B]" onClick={onAct}>
      Hold result
    </Button>
  );
}
