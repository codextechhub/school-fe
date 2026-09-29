/**
 * Billing a fee structure to the pupils it is for.
 *
 * The finance package's own Generate raises one invoice for every active
 * customer in the books. In a school the customers are the pupils and a fee
 * structure has no class, so "JSS 1 First Term" billed that way bills every
 * child in the school. This drawer replaces it wherever the package offers
 * Generate, through the host contract's `FeeGenerationPanel`.
 *
 * A run takes three steps, in the order a bursar meets them:
 *
 *   1. The term. A structure bills one term (or a whole session) and cannot
 *      bill before it names one. The term also decides which year's classes are
 *      offered, and, where the school bills by term or session end, when the
 *      bills fall due. An unlinked structure can be linked here by a reader who
 *      may edit fee structures; anybody else is told who can.
 *   2. The classes. Every on-roll pupil in the chosen classes is named. A
 *      structure that is one branch's price list offers only that branch's
 *      classes and pupils; a school-wide one offers every class the reader can
 *      see.
 *   3. The preview, then the run. The preview is the server's real billing
 *      code inside a transaction that is rolled back, so the count, the total,
 *      the due date and the list of pupils already billed are what the run
 *      will produce. Changing the classes discards it, so nobody confirms a
 *      preview of a different set.
 *
 * The invoice date is the day of the run and the due date comes from the
 * school's fee due rule, both set by the server. Neither is asked for here.
 *
 * Choosing pupils reads class rosters, so a reader needs to see students and
 * classes as well as to generate. One who cannot is told so, rather than
 * shown an empty list.
 */

import { useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { AlertTriangle, CalendarClock, FileStack, Users } from "lucide-react";

import type { HostFeeGenerationProps } from "@xvs/finance/host";
import { DetailDrawer } from "@/components/finance-ui";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { usePermissions } from "@/hooks/use-permissions";
import { P } from "@/permissions";
import { useGetSessionsQuery } from "@/redux/services/academics/academics-api";
import { useGetMyBranchesQuery } from "@/redux/services/branches/branches-api";
import {
  useGenerateCohortInvoicesMutation,
  useGetFeeStructureTermQuery,
  useLazyGetCohortPupilsQuery,
  useLinkFeeStructureTermMutation,
  usePreviewCohortInvoicesMutation,
  type CohortPupil,
  type CohortRunResult,
  type FeeStructureTerm,
} from "@/redux/services/school-finance/fee-generation-api";
import { useGetClassSeatsQuery } from "@/redux/services/students/students-api";
import type { ClassSeats } from "@/redux/services/students/students-types";
import { apiErrorMessage } from "@/utils/api-errors";
import { formatMoney } from "@/utils/money";
import { useSchoolWords, type TermWords } from "@/hooks/use-school-words";

/** The server takes at most this many pupils in one run. */
const MAX_PUPILS = 2000;

const selectCls =
  "h-9 w-full rounded-md border border-white-02 bg-white px-2 font-mont text-sm text-gray-01 focus:border-primary focus:outline-none";
const labelCls = "mb-1 block font-mont text-xs font-medium text-gray-01";
const sectionTitleCls =
  "mb-2 font-mont text-xs font-semibold uppercase tracking-wide text-gray-05";

/** 15 December 2026, from an ISO date. */
function formatDay(iso: string) {
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function plural(n: number, one: string, many = `${one}s`) {
  return `${n.toLocaleString()} ${n === 1 ? one : many}`;
}

/** The machine code the FAL puts beside its message, if any. */
function refusalCode(error: unknown): string {
  const data = (error as { data?: { code?: unknown } } | undefined)?.data;
  return typeof data?.code === "string" ? data.code : "";
}

/**
 * A run refusal in the bursar's words.
 *
 * The server's message is kept where it already says what to do; the codes
 * below are the ones whose message names internals a bursar cannot act on.
 */
function refusalMessage(error: unknown, words: TermWords): string {
  const status = (error as { status?: unknown } | undefined)?.status;
  switch (refusalCode(error)) {
    case "TERM_NOT_LINKED":
      return `This fee structure is not linked to a ${words.term} yet, so it cannot bill anyone. Link it to a ${words.term} above first.`;
    case "ENTITY_NOT_PROVISIONED":
      return "This school's books are not set up yet, so nothing can be billed. Finish the finance setup first.";
    default:
      break;
  }
  if (status === 404) {
    return "One of these pupils is not at a branch you work in, so nothing was billed. Choose classes at your own branch.";
  }
  return apiErrorMessage(error, "The run could not be worked out. Try again, and if it keeps failing, check the fee structure's lines.");
}

function Refusal({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div role="alert" className="flex gap-2 rounded-md border border-error/30 bg-error/5 px-3 py-2.5">
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-error" aria-hidden="true" />
      <div className="min-w-0">
        <p className="font-mont text-xs font-semibold text-gray-01">{title}</p>
        <p className="mt-0.5 font-mont text-[11px] leading-4 text-gray-05">{children}</p>
      </div>
    </div>
  );
}

function Note({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-md border border-gray-03 bg-gray-03 px-3 py-2 font-mont text-[11px] leading-4 text-gray-05">
      {children}
    </p>
  );
}

/**
 * Link an unlinked structure to a session, and optionally one term in it.
 *
 * Archived years and terms are not offered: a structure is linked to bill a
 * term that is running or coming, and one that ended is billed already.
 */
function LinkTermForm({ structureId }: { structureId: number }) {
  const { data, isLoading } = useGetSessionsQuery();
  const [link, { isLoading: linking }] = useLinkFeeStructureTermMutation();
  const [session, setSession] = useState("");
  const [term, setTerm] = useState("");
  const [failure, setFailure] = useState("");
  const words = useSchoolWords();

  const sessions = (data?.data ?? []).filter((s) => s.status !== "ARCHIVED");
  const chosen = sessions.find((s) => String(s.id) === session);
  const terms = (chosen?.terms ?? []).filter((t) => !t.is_archived);

  const submit = async () => {
    setFailure("");
    try {
      await link({ id: structureId, session: Number(session), term: term ? Number(term) : null }).unwrap();
    } catch (error) {
      setFailure(apiErrorMessage(error, "The fee structure could not be linked. Try again."));
    }
  };

  if (!isLoading && sessions.length === 0) {
    return (
      <Note>
        This school has no academic year set up yet, so there is no {words.term} to link to. Set up the
        year under Academics, then come back.
      </Note>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="min-w-0">
          <span className={labelCls}>Academic year</span>
          <select
            value={session}
            onChange={(e) => { setSession(e.target.value); setTerm(""); setFailure(""); }}
            className={selectCls}
            disabled={isLoading}
          >
            <option value="">{isLoading ? "Loading…" : "Choose a year…"}</option>
            {sessions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
        <label className="min-w-0">
          <span className={labelCls}>{words.Term}</span>
          <select
            value={term}
            onChange={(e) => { setTerm(e.target.value); setFailure(""); }}
            className={selectCls}
            disabled={!chosen}
          >
            <option value="">The whole year</option>
            {terms.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" onClick={submit} disabled={!session || linking}>
          {linking ? "Linking…" : `Link to this ${words.term}`}
        </Button>
      </div>
      {failure ? <Refusal title="Not linked">{failure}</Refusal> : null}
    </div>
  );
}

/** Where the structure stands on its term, and the link form when it has none. */
function TermSection({ structureId, term, loading, failed }: {
  structureId: number; term: FeeStructureTerm | undefined; loading: boolean; failed: boolean;
}) {
  const { hasPermission } = usePermissions();
  const canLink = hasPermission(P.FIN_EDIT_FEE_STRUCTURE) && hasPermission(P.BROWSE_SESSIONS);
  const words = useSchoolWords();

  let body: ReactNode;
  if (loading) {
    body = <p className="font-mont text-xs text-gray-05">Loading…</p>;
  } else if (failed || !term) {
    body = <Refusal title={`The ${words.term} could not be read`}>Close this and try again.</Refusal>;
  } else if (term.linked) {
    body = (
      <p className="flex items-center gap-2 font-mont text-sm text-gray-01">
        <CalendarClock className="size-4 shrink-0 text-primary" aria-hidden="true" />
        <span className="min-w-0">
          Bills <span className="font-semibold">{term.term_label || "the whole year"}</span>, {term.session_label}.
        </span>
      </p>
    );
  } else {
    body = (
      <div className="space-y-3">
        <Note>
          This fee structure is not linked to a {words.term} yet, so it cannot bill anyone. Every bill it
          raises is filed against the {words.term} it names, and the pupils offered are that year's.
        </Note>
        {canLink ? (
          <LinkTermForm structureId={structureId} />
        ) : (
          <p className="font-mont text-xs text-gray-05">
            Ask someone who can edit fee structures to link it to a {words.term}.
          </p>
        )}
      </div>
    );
  }

  return (
    <section>
      <p className={sectionTitleCls}>{words.Term}</p>
      {body}
    </section>
  );
}

/** Classes in ladder order: Primary 4 before JSS 1 before SSS 1, then by name. */
function byLadder(a: ClassSeats, b: ClassSeats) {
  const [ap, al] = a.level_order ?? [Number.MAX_SAFE_INTEGER, 0];
  const [bp, bl] = b.level_order ?? [Number.MAX_SAFE_INTEGER, 0];
  return ap - bp || al - bl || a.name.localeCompare(b.name);
}

/** The classes a run can name, as a checklist. */
function ClassPicker({ classes, selected, onToggle, onToggleAll, showBranch }: {
  classes: ClassSeats[];
  selected: ReadonlySet<number>;
  onToggle: (id: number) => void;
  onToggleAll: () => void;
  showBranch: boolean;
}) {
  const allChosen = classes.length > 0 && classes.every((c) => selected.has(c.id));
  return (
    <div className="rounded-md border border-white-02 bg-white">
      <label className="flex items-center gap-2 border-b border-white-02 px-3 py-2 font-mont text-xs font-medium text-gray-01">
        <Checkbox checked={allChosen} onCheckedChange={onToggleAll} aria-label="Every class" />
        Every class
      </label>
      <ScrollArea className="max-h-64">
        <ul>
          {classes.map((c) => (
            <li key={c.id}>
              <label className="flex items-center gap-2 px-3 py-2 font-mont text-xs text-gray-01 hover:bg-gray-03/50">
                <Checkbox checked={selected.has(c.id)} onCheckedChange={() => onToggle(c.id)} aria-label={c.name} />
                <span className="min-w-0 flex-1 truncate">
                  {c.name}
                  {showBranch ? (
                    <span className="text-gray-05"> · {c.branch_name ?? "School-wide"}</span>
                  ) : null}
                </span>
                <span className="shrink-0 tabular-nums text-gray-05">{plural(c.used, "pupil")}</span>
              </label>
            </li>
          ))}
        </ul>
      </ScrollArea>
    </div>
  );
}

/** Names of the pupils behind a list of ids, in the order the server gave. */
function namesOf(ids: string[], pupils: Map<string, CohortPupil>) {
  return ids.map((id) => pupils.get(id)).filter((p): p is CohortPupil => !!p);
}

function PupilList({ pupils }: { pupils: CohortPupil[] }) {
  return (
    <ScrollArea className="max-h-48 rounded-md border border-white-02 bg-white">
      <ul>
        {pupils.map((p) => (
          <li key={p.id} className="flex items-center justify-between gap-3 border-b border-white-02 px-3 py-1.5 last:border-b-0">
            <span className="min-w-0 truncate font-mont text-xs text-gray-01">{p.full_name}</span>
            <span className="shrink-0 font-mont text-[11px] text-gray-05">{p.class_name}</span>
          </li>
        ))}
      </ul>
    </ScrollArea>
  );
}

/** What the run will do, as the server priced it. */
function PreviewSummary({ result, pupils, currency }: {
  result: CohortRunResult; pupils: Map<string, CohortPupil>; currency?: string | null;
}) {
  const [showSkipped, setShowSkipped] = useState(false);
  const toBill = namesOf(result.students_to_bill, pupils);
  const skipped = namesOf(result.students_skipped, pupils);

  if (result.counts.to_bill === 0) {
    return (
      <Note>
        Every pupil in these classes has already been billed from this fee structure, so there is
        nothing to bill. Running it again never bills anyone twice.
      </Note>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div className="rounded-md border border-white-02 bg-white px-3 py-2">
          <p className="font-mont text-[11px] text-gray-05">Pupils to bill</p>
          <p className="font-mont text-base font-semibold tabular-nums text-black-01">{result.counts.to_bill.toLocaleString()}</p>
        </div>
        <div className="rounded-md border border-white-02 bg-white px-3 py-2">
          <p className="font-mont text-[11px] text-gray-05">Total, tax included</p>
          <p className="font-mont text-base font-semibold tabular-nums text-black-01">{formatMoney(result.total_billed, currency)}</p>
        </div>
        <div className="rounded-md border border-white-02 bg-white px-3 py-2">
          <p className="font-mont text-[11px] text-gray-05">Due</p>
          <p className="font-mont text-base font-semibold text-black-01">{result.due_date ? formatDay(result.due_date) : "By the school's rule"}</p>
        </div>
      </div>
      <p className="font-mont text-[11px] leading-4 text-gray-05">
        The due date comes from the school's fee due rule, under Finance settings.
      </p>
      <PupilList pupils={toBill} />
      {result.counts.skipped > 0 ? (
        <div className="space-y-2">
          <p className="font-mont text-xs text-gray-01">
            {plural(result.counts.skipped, "pupil")} already billed from this fee structure, so{" "}
            {result.counts.skipped === 1 ? "is" : "are"} left alone.{" "}
            <button type="button" onClick={() => setShowSkipped((v) => !v)} className="font-medium text-primary underline-offset-2 hover:underline">
              {showSkipped ? "Hide" : "Show"}
            </button>
          </p>
          {showSkipped ? <PupilList pupils={skipped} /> : null}
        </div>
      ) : null}
    </div>
  );
}

export default function SchoolFeeGeneration({ structure, currency, onClose }: HostFeeGenerationProps) {
  const { hasPermission } = usePermissions();
  const canGenerate = hasPermission(P.FIN_GENERATE_FEE_STRUCTURE);
  const canReadRoll = hasPermission(P.BROWSE_STUDENTS) && hasPermission(P.BROWSE_CLASSES);
  const words = useSchoolWords();

  const termQuery = useGetFeeStructureTermQuery(structure.id);
  const term = termQuery.data?.data;
  const linked = term?.linked ? term : null;

  const branchId = structure.branch_id ?? undefined;
  const { data: branchData } = useGetMyBranchesQuery();
  const branches = branchData?.data ?? [];
  const multiBranch = branches.length > 1;
  const branchName = branchId ? branches.find((b) => b.id === branchId)?.name : undefined;

  const seats = useGetClassSeatsQuery(
    { session: linked?.session, branch: branchId },
    { skip: !linked || !canReadRoll || !canGenerate },
  );
  const classes = useMemo(() => [...(seats.data?.data ?? [])].sort(byLadder), [seats.data]);

  const [selected, setSelected] = useState<ReadonlySet<number>>(new Set());
  const [preview, setPreview] = useState<{ result: CohortRunResult; pupils: CohortPupil[] } | null>(null);
  const [failure, setFailure] = useState("");

  const [loadPupils, pupilsState] = useLazyGetCohortPupilsQuery();
  const [runPreview, previewState] = usePreviewCohortInvoicesMutation();
  const [runBilling, billingState] = useGenerateCohortInvoicesMutation();
  const working = pupilsState.isFetching || previewState.isLoading || billingState.isLoading;

  const pupilIndex = useMemo(
    () => new Map((preview?.pupils ?? []).map((p) => [String(p.id), p])),
    [preview],
  );

  const choose = (next: ReadonlySet<number>) => {
    setSelected(next);
    setPreview(null);
    setFailure("");
  };
  const toggle = (id: number) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    choose(next);
  };
  const toggleAll = () => {
    const every = classes.length > 0 && classes.every((c) => selected.has(c.id));
    choose(every ? new Set() : new Set(classes.map((c) => c.id)));
  };

  const doPreview = async () => {
    setFailure("");
    setPreview(null);
    try {
      const pupils = await loadPupils({ classIds: [...selected], branch: branchId }).unwrap();
      if (pupils.length === 0) {
        setFailure("There is nobody on the roll in these classes, so there is nobody to bill.");
        return;
      }
      if (pupils.length > MAX_PUPILS) {
        setFailure(`These classes hold ${pupils.length.toLocaleString()} pupils, and one run bills at most ${MAX_PUPILS.toLocaleString()}. Choose fewer classes and run it in parts.`);
        return;
      }
      const res = await runPreview({ id: structure.id, students: pupils.map((p) => String(p.id)) }).unwrap();
      setPreview({ result: res.data, pupils });
    } catch (error) {
      setFailure(refusalMessage(error, words));
    }
  };

  const doBill = async () => {
    if (!preview) return;
    setFailure("");
    try {
      const res = await runBilling({
        id: structure.id,
        students: preview.pupils.map((p) => String(p.id)),
      }).unwrap();
      const { created } = res.data.counts;
      toast.success(
        created === 0
          ? "Nobody was billed: every pupil chosen had been billed already."
          : `Billed ${plural(created, "pupil")}, ${formatMoney(res.data.total_billed, currency)} in all.`,
      );
      onClose();
    } catch (error) {
      setFailure(refusalMessage(error, words));
    }
  };

  let cohort: ReactNode = null;
  if (!canGenerate) {
    cohort = <Note>Your role cannot generate invoices from fee structures.</Note>;
  } else if (!linked) {
    cohort = null;
  } else if (!canReadRoll) {
    cohort = (
      <Note>
        Choosing who to bill reads the class lists, which your role cannot see. Ask an
        administrator for access to students and classes.
      </Note>
    );
  } else if (seats.isLoading) {
    cohort = <p className="font-mont text-xs text-gray-05">Loading classes…</p>;
  } else if (seats.isError) {
    cohort = <Refusal title="The classes could not be loaded">Close this and try again.</Refusal>;
  } else if (classes.length === 0) {
    cohort = (
      <Note>
        {linked.session_label} has no classes{branchName ? ` at ${branchName}` : ""} yet, so there is
        nobody to bill. Set up that year's classes under Academics first.
      </Note>
    );
  } else {
    cohort = (
      <div className="space-y-2">
        {branchName && multiBranch ? (
          <p className="font-mont text-[11px] leading-4 text-gray-05">
            This is {branchName}'s price list, so only {branchName}'s classes and pupils are offered.
          </p>
        ) : null}
        <ClassPicker
          classes={classes}
          selected={selected}
          onToggle={toggle}
          onToggleAll={toggleAll}
          showBranch={multiBranch && !branchId}
        />
      </div>
    );
  }

  const toBill = preview?.result.counts.to_bill ?? 0;

  return (
    <DetailDrawer
      open
      onOpenChange={(o) => (o ? undefined : onClose())}
      title="Generate invoices"
      description={`${structure.code} · ${structure.name}`}
      widthClass="sm:max-w-xl"
      footer={
        <>
          <Button variant="outline" disabled={billingState.isLoading} onClick={onClose}>Cancel</Button>
          {preview && toBill > 0 ? (
            <Button onClick={doBill} disabled={working} className="gap-1.5">
              <FileStack className="size-4" />
              {billingState.isLoading ? "Billing…" : `Bill ${plural(toBill, "pupil")}`}
            </Button>
          ) : (
            <Button onClick={doPreview} disabled={working || selected.size === 0 || !linked} className="gap-1.5">
              <Users className="size-4" />
              {pupilsState.isFetching ? "Reading the classes…" : previewState.isLoading ? "Working it out…" : "Preview"}
            </Button>
          )}
        </>
      }
    >
      <div className="space-y-5">
        <Note>
          Bills the pupils in the classes you choose, one posted invoice each at{" "}
          {formatMoney(structure.total_with_tax, currency)} (tax included). Pupils already billed
          from this structure are left alone.
        </Note>

        <TermSection
          structureId={structure.id}
          term={term}
          loading={termQuery.isLoading}
          failed={termQuery.isError}
        />

        {cohort ? (
          <section>
            <p className={sectionTitleCls}>Who to bill</p>
            {cohort}
          </section>
        ) : null}

        {preview ? (
          <section>
            <p className={sectionTitleCls}>Preview</p>
            <PreviewSummary result={preview.result} pupils={pupilIndex} currency={currency} />
          </section>
        ) : null}

        {failure ? (
          <Refusal title={preview ? "Nothing was billed" : "Cannot bill these classes"}>{failure}</Refusal>
        ) : null}
      </div>
    </DetailDrawer>
  );
}
