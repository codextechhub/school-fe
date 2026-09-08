import { useState } from "react";
import { useNavigate } from "react-router";
import { startOfDay } from "date-fns";
import { toast } from "sonner";
import {
  ArrowRight,
  CircleAlert,
  CircleCheckBig,
  Copy,
  Headset,
  RefreshCw,
  SearchX,
  ShieldOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import CustomTable from "@/components/custom/custom-table";
import { CustomDateInput } from "@/components/custom/custom-date-input";
import { CustomTextArea } from "@/components/custom/custom-textarea";
import { cn } from "@/lib/utils";
import { routesPath } from "@/routes/routesPath";
import { requestSupportOpen } from "@/components/layout/support-open";
import {
  useGetGoLiveRequestsQuery,
  useRevalidateOnboardingMutation,
  useSubmitGoLiveRequestMutation,
} from "@/redux/services/onboarding/onboarding-api";
import type {
  GoLiveRequest,
  OnboardingState,
} from "@/redux/services/onboarding/onboarding-types";
import { apiErrorMessage } from "@/utils/api-error";
import { SUPPORT_MAIL } from "@/utils/static";
import { useOnboardingState } from "./use-onboarding-state";
import {
  dateInputToIso,
  humanDate,
  humanDateTime,
} from "./onboarding-format";
import {
  GoLiveStatusChip,
  ReadinessChip,
} from "./components/onboarding-chips";
import { OutlinedNotice } from "./components/outlined-notice";
import { PageShell } from "@/components/layout/page-shell";

/** Anchor for the request form, so the rejected card can point back at it. */
const GO_LIVE_FORM_ID = "go-live-request-form";

/** Scroll the request form into view and put the cursor in its first field. */
function focusGoLiveForm() {
  const form = document.getElementById(GO_LIVE_FORM_ID);
  if (!form) return;
  form.scrollIntoView({ behavior: "smooth", block: "center" });
  form.querySelector<HTMLButtonElement>("button")?.focus({ preventScroll: true });
}

const HISTORY_COLUMNS = [
  "Requested on",
  "Preferred date",
  "Status",
  "Reviewed by",
  "Action",
];

/**
 * Going live: a gate, then a request, then a wait.
 *
 * The three things this screen refuses to do, all because the backend cannot
 * back them up: it does not offer a self-serve "go live now" (approval is the
 * only implemented path), it does not offer to withdraw a pending request
 * (there is no such endpoint), and it never quotes a response time (no SLA
 * field exists anywhere in the product).
 */
export default function GoLivePage() {
  const {
    state,
    isLoading,
    notProvisioned,
    closedToYou,
    unexpectedError,
    refetch,
  } = useOnboardingState();

  if (isLoading) {
    return (
      <PageShell className="space-y-5" aria-busy>
        <span className="sr-only">Loading your go-live status…</span>
        <Skeleton className="h-6 w-40" aria-hidden />
        <Skeleton className="h-52 w-full rounded-md" aria-hidden />
        <Skeleton className="h-64 w-full rounded-md" aria-hidden />
      </PageShell>
    );
  }

  if (notProvisioned) {
    return (
      <PageShell>
        <OutlinedNotice
          icon={SearchX}
          title="We could not find your onboarding checklist"
          body="Your school exists, but its onboarding control room was never set up. CodeX needs to provision it before you can ask to go live."
          actionLabel="Contact CodeX"
          onAction={() => requestSupportOpen()}
        />
      </PageShell>
    );
  }

  if (closedToYou) {
    return (
      <PageShell>
        <OutlinedNotice
          icon={ShieldOff}
          title="You cannot open the go-live request"
          body={`Your account does not carry access to this school's go-live requests. Ask whoever set up your account, or reach CodeX at ${SUPPORT_MAIL}.`}
        />
      </PageShell>
    );
  }

  if (unexpectedError || !state) {
    return (
      <PageShell>
        <OutlinedNotice
          icon={CircleAlert}
          title="We could not load your go-live status"
          body="Something went wrong on the way to the server. Nothing about your request has changed."
          actionLabel="Try again"
          onAction={() => refetch()}
        />
      </PageShell>
    );
  }

  return <GoLive state={state} />;
}

function GoLive({ state }: { state: OnboardingState }) {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [details, setDetails] = useState<GoLiveRequest | null>(null);

  const history = useGetGoLiveRequestsQuery({ page });
  // The newest request, asked for on its own so it stays correct while the
  // reader pages back through older ones.
  const latestQuery = useGetGoLiveRequestsQuery({ page: 1, page_size: 1 });
  const latest = latestQuery.data?.data?.[0] ?? null;

  const readiness = state.readiness_state;
  const isLive = readiness === "LIVE";

  const titleOf = (key: string) =>
    state.tasks.find((task) => task.key === key)?.title ?? key;

  const rows = (history.data?.data ?? []).map((request) => ({
    // `_slug` is dropped before render by CustomTable; it is how the row menu
    // finds its way back to the record behind the row.
    _slug: request.id,
    requested: humanDate(request.created_at),
    preferred: humanDate(request.preferred_go_live_at),
    status: <GoLiveStatusChip status={request.status} />,
    reviewer: request.reviewed_by_name || "-",
  }));

  return (
    <PageShell className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold font-mont text-black-01">
          Going live
        </h2>
        <p className="mt-1 text-sm text-gray-01 max-w-[70ch] text-pretty">
          When your required steps are done you can ask CodeX to take your school
          live. CodeX reviews every request by hand.
        </p>
      </div>

      <GateCard state={state} titleOf={titleOf} latest={latest} />

      {isLive && <ActivatedCard state={state} />}

      {/* A rejection and a failed activation are both red and are never the
          same card. One is a person's decision you can answer; the other is the
          platform breaking, with a reference and nothing for the school to fix. */}
      {!isLive && latest?.status === "REJECTED" && (
        <RejectedCard request={latest} />
      )}
      {!isLive && latest?.status === "FAILED" && <FailedCard request={latest} />}

      <section className="bg-white rounded-md border border-white-02 px-3 py-4 sm:px-5">
        <div className="mb-3">
          <p className="text-sm font-semibold font-mont text-black-01">
            Request history
          </p>
          <p className="mt-0.5 text-[13px] text-gray-06">
            Every go-live request you have sent, and what came of it.
          </p>
        </div>
        <div className="overflow-x-auto">
          <CustomTable
            tableHeaderList={HISTORY_COLUMNS}
            tableBodyList={rows}
            loading={history.isLoading}
            loadingText="Loading your go-live requests…"
            emptyText="No requests yet."
            dropDown
            dropDownList={[
              {
                label: "View details",
                onActionClick: (row: { _slug: number }) => {
                  const found = (history.data?.data ?? []).find(
                    (request) => request.id === row._slug,
                  );
                  if (found) setDetails(found);
                },
              },
            ]}
            currentPage={history.data?.pagination?.currentPage ?? page}
            totalPage={history.data?.pagination?.totalPages ?? 0}
            onPageChange={(next) => setPage(Number(next))}
          />
        </div>
      </section>

      <Button
        variant="outline"
        onClick={() => navigate(routesPath.PROTECTED.ONBOARDING.INDEX)}
      >
        Back to control room
      </Button>

      <RequestDetailsDialog
        request={details}
        onClose={() => setDetails(null)}
      />
    </PageShell>
  );
}

/**
 * The gate. Same numbers and the same "last checked" as the control room's
 * summary, read from the same call, so the two can never disagree about whether
 * a school may ask.
 */
function GateCard({
  state,
  titleOf,
  latest,
}: {
  state: OnboardingState;
  titleOf: (key: string) => string;
  latest: GoLiveRequest | null;
}) {
  const navigate = useNavigate();
  const [revalidate, { isLoading: isChecking }] =
    useRevalidateOnboardingMutation();
  const readiness = state.readiness_state;

  const onRecheck = async () => {
    try {
      const result = await revalidate().unwrap();
      toast.success(
        result.data.readiness_state === "READY"
          ? "Checked. You are ready to go live."
          : "Checked. Nothing has changed.",
      );
    } catch (error) {
      toast.error(
        apiErrorMessage(error, "We could not run the check. Try again."),
      );
    }
  };

  return (
    <section className="bg-white rounded-md border border-white-02 px-4 py-5 sm:px-6 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <ReadinessChip state={readiness} />
          <p className="mt-2 text-sm text-gray-01 max-w-[60ch] text-pretty">
            {readiness === "NOT_READY" &&
              "Your school is not ready yet. Finish the required steps and this form opens."}
            {readiness === "READY" &&
              "Everything required is done. You can ask CodeX to take your school live."}
            {readiness === "PENDING_APPROVAL" &&
              "Your request is with CodeX. They review every one by hand."}
            {readiness === "LIVE" && "Your school is live."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <p className="text-xs text-gray-05">
            {state.last_validation_at
              ? `Last checked ${humanDateTime(state.last_validation_at)}`
              : "Not checked yet"}
          </p>
          {readiness !== "LIVE" && (
            <Button
              variant="outline"
              size="xs"
              onClick={onRecheck}
              loading={isChecking}
              disabled={isChecking}
            >
              <RefreshCw />
              Re-check
            </Button>
          )}
        </div>
      </div>

      {readiness === "NOT_READY" && (
        <div className="rounded-md border border-border p-4">
          <p className="text-[13px] font-medium text-black-01">
            These required steps are not done yet.
          </p>
          <div className="mt-3 flex flex-col gap-2">
            {state.blocking_tasks.map((key) => (
              <p key={key} className="text-[13px] text-gray-06">
                {titleOf(key)}
              </p>
            ))}
          </div>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => navigate(routesPath.PROTECTED.ONBOARDING.INDEX)}
          >
            Back to control room
          </Button>
        </div>
      )}

      {readiness === "READY" && <RequestForm />}

      {readiness === "PENDING_APPROVAL" && <PendingBlock latest={latest} />}
    </section>
  );
}

/** The request itself. The acknowledgement is what makes it valid. */
function RequestForm() {
  const navigate = useNavigate();
  const [submit, { isLoading }] = useSubmitGoLiveRequestMutation();
  const [date, setDate] = useState("");
  // Today is a legitimate answer; yesterday is not. Computed once so the
  // calendar's floor cannot drift mid-session.
  const [earliest] = useState(() => startOfDay(new Date()));
  const [note, setNote] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async () => {
    setError("");
    const iso = dateInputToIso(date);
    if (!iso) {
      setError("Pick the date you would like to go live on.");
      return;
    }
    try {
      await submit({
        preferred_go_live_at: iso,
        note: note.trim(),
        acknowledged,
      }).unwrap();
      toast.success("Your go-live request is with CodeX.");
      navigate(routesPath.PROTECTED.ONBOARDING.INDEX);
    } catch (rejection) {
      setError(
        apiErrorMessage(
          rejection,
          "We could not send your request. Try again.",
        ),
      );
    }
  };

  return (
    <div
      id={GO_LIVE_FORM_ID}
      className="rounded-md border border-border p-4 space-y-4"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <CustomDateInput
            id="preferred-go-live"
            label="Preferred date"
            isRequired
            value={date}
            onValueChange={setDate}
            placeholder="Pick a date"
            minDate={earliest}
          />
          <p className="mt-1.5 text-xs text-gray-05 text-pretty">
            We will aim for this date. Your school goes live when CodeX approves
            the request.
          </p>
        </div>
        <CustomTextArea
          id="go-live-note"
          label="Anything CodeX should know (optional)"
          rows={3}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Anything about timing, staff availability or data"
        />
      </div>

      <label className="flex items-start gap-2.5 cursor-pointer">
        <Checkbox
          className="mt-0.5"
          checked={acknowledged}
          onCheckedChange={(checked) => setAcknowledged(checked === true)}
        />
        <span className="text-[13px] text-gray-01 text-pretty">
          I confirm the information we have entered is correct and that our staff
          are ready to use XVS.
        </span>
      </label>

      {error && (
        <p className="text-xs font-medium text-error-text text-pretty">
          {error}
        </p>
      )}

      {/* Disabled until the date is picked and the box is ticked - the
          acknowledgement is the thing the server validates the request on, not
          a formality bolted to the bottom of the form. */}
      <Button
        onClick={onSubmit}
        loading={isLoading}
        disabled={isLoading || !date || !acknowledged}
      >
        Request go-live
      </Button>
    </div>
  );
}

function PendingBlock({ latest }: { latest: GoLiveRequest | null }) {
  return (
    <div className="rounded-md border border-border p-4">
      {latest && (
        <>
          <p className="text-[13px] text-black-01">
            Requested on {humanDate(latest.created_at)}
            {latest.requested_by_name ? ` by ${latest.requested_by_name}` : ""}.
          </p>
          <p className="mt-1 text-[13px] text-gray-06">
            Preferred date {humanDate(latest.preferred_go_live_at)}. CodeX is
            reviewing it.
          </p>
        </>
      )}
      {/* There is no withdrawal endpoint, so the interface must not imply one. */}
      <p className="mt-3 text-[13px] text-gray-06 text-pretty">
        You cannot withdraw a request. If something is wrong,{" "}
        <button
          type="button"
          className="text-primary underline underline-offset-4 cursor-pointer"
          onClick={() => requestSupportOpen()}
        >
          tell us and we will reject it so you can resubmit
        </button>
        .
      </p>
    </div>
  );
}

function ActivatedCard({ state }: { state: OnboardingState }) {
  const navigate = useNavigate();
  return (
    <section className="bg-white rounded-md border border-white-02 px-4 py-8 sm:px-6 flex flex-col items-center text-center gap-3">
      <span className="size-16 rounded-full bg-green-01/10 text-green-01 grid place-content-center">
        <CircleCheckBig className="size-8" strokeWidth={1.5} />
      </span>
      <h3 className="text-lg font-semibold font-mont text-black-01">
        Your school is now live
      </h3>
      <p className="text-sm text-gray-06 max-w-[52ch] text-pretty">
        CodeX approved your request and switched your school on
        {state.go_live_at ? ` on ${humanDate(state.go_live_at)}` : ""}. Dashboard,
        People, Academics and Finance are all open, and your staff can sign in.
      </p>
      <p className="text-[13px] text-gray-05 max-w-[52ch] text-pretty">
        Onboarding is closed. Your checklist stays available, read-only, in the
        control room.
      </p>
      <Button
        className="mt-2"
        onClick={() => navigate(routesPath.PROTECTED.OVERVIEW.INDEX)}
      >
        Go to School Dashboard
        <ArrowRight />
      </Button>
    </section>
  );
}

/**
 * A person said no. This is a conversation, so it is a card that stays on the
 * screen with the reason verbatim - not a modal that is dismissed and lost.
 */
function RejectedCard({ request }: { request: GoLiveRequest }) {
  return (
    <section className="bg-white rounded-md border border-white-02 px-4 py-5 sm:px-6">
      <div className="flex flex-wrap items-center gap-2.5">
        <GoLiveStatusChip status="REJECTED" />
        <p className="text-sm font-semibold font-mont text-black-01">
          CodeX did not approve this request.
        </p>
      </div>
      <p className="mt-2 text-xs text-gray-05">
        {request.reviewed_by_name
          ? `Reviewed by ${request.reviewed_by_name}`
          : "Reviewed by CodeX"}
        {request.reviewed_at ? ` · ${humanDate(request.reviewed_at)}` : ""} ·
        requested {humanDate(request.created_at)}
      </p>
      {request.rejection_reason && (
        <blockquote className="mt-3 border-l-2 border-border pl-3.5 text-sm text-gray-01 text-pretty">
          {request.rejection_reason}
        </blockquote>
      )}
      <p className="mt-3 text-[13px] text-gray-06 text-pretty">
        Your steps are untouched and your school is ready again. Fix what is
        described above and send a new request.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {/* Readiness has gone back to READY and the school's steps were never
            touched, so resubmitting is a live action, not a journey back
            through the checklist. The form is already open above this card;
            this just takes the reader to it. */}
        <Button onClick={focusGoLiveForm}>Submit a new request</Button>
        <Button
          variant="outline"
          onClick={() => requestSupportOpen()}
        >
          <Headset />
          Get help
        </Button>
      </div>
    </section>
  );
}

/**
 * The activation itself broke. An incident, not a decision.
 *
 * There is no reviewer, no reason and no "rejected" anywhere on this card: no
 * human made a decision here, and showing a failed activation as a rejection
 * tells a school its application was turned down when in fact the platform
 * broke. What it has instead is a reference and the true sentence that nothing
 * at the school was changed.
 */
function FailedCard({ request }: { request: GoLiveRequest }) {
  const [copied, setCopied] = useState(false);

  const copyReference = async () => {
    try {
      await navigator.clipboard.writeText(request.failure_reference);
      setCopied(true);
      toast.success("Reference copied.");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("We could not copy it. Select the reference and copy it by hand.");
    }
  };

  return (
    <section className="bg-white rounded-md border border-red-01 px-4 py-5 sm:px-6">
      <GoLiveStatusChip status="FAILED" />
      <p className="mt-3 text-sm text-black-01">
        Something went wrong while we were switching your school on.
      </p>
      <p className="mt-1 text-sm font-semibold font-mont text-black-01">
        Nothing at your school was changed.
      </p>

      {request.failure_reference && (
        <div className="mt-4">
          <p className="text-xs text-gray-05">Failure reference</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <code className="rounded-md bg-gray-03 px-2.5 py-1.5 font-mono text-xs text-black-01 break-all">
              {request.failure_reference}
            </code>
            <Button variant="outline" size="xs" onClick={copyReference}>
              <Copy />
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        </div>
      )}

      <p className="mt-3 text-[13px] text-gray-06 text-pretty">
        Send this reference to CodeX and they will look into what broke. There is
        nothing for you to fix on your side.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          onClick={() =>
            requestSupportOpen({
              title: "Activation failed",
              description: request.failure_reference
                ? `Our go-live activation failed. Failure reference: ${request.failure_reference}`
                : "Our go-live activation failed.",
              category: "BUG",
              priority: "HIGH",
            })
          }
        >
          <Headset />
          Report this to CodeX
        </Button>
        {/* Activation rolled everything back and put readiness at READY, so the
            form above is live and trying again is a real option - secondary to
            telling CodeX, because the school did nothing wrong and a second
            attempt may hit whatever broke the first. */}
        <Button variant="outline" onClick={focusGoLiveForm}>
          Try again
        </Button>
      </div>
    </section>
  );
}

function RequestDetailsDialog({
  request,
  onClose,
}: {
  request: GoLiveRequest | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={!!request} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="rounded-xl sm:max-w-125">
        <DialogHeader>
          <DialogTitle className="font-mont text-black-01">
            Go-live request
          </DialogTitle>
          <DialogDescription className="sr-only">
            The details of one go-live request.
          </DialogDescription>
        </DialogHeader>
        {request && (
          <div className="space-y-3.5 text-sm">
            <DetailRow label="Status">
              <GoLiveStatusChip status={request.status} />
            </DetailRow>
            <DetailRow label="Requested on">
              {humanDateTime(request.created_at)}
            </DetailRow>
            <DetailRow label="Requested by">
              {request.requested_by_name || "-"}
            </DetailRow>
            <DetailRow label="Preferred date">
              {humanDate(request.preferred_go_live_at)}
            </DetailRow>
            <DetailRow label="Reviewed by">
              {request.reviewed_by_name || "-"}
            </DetailRow>
            {request.reviewed_at && (
              <DetailRow label="Reviewed on">
                {humanDateTime(request.reviewed_at)}
              </DetailRow>
            )}
            {request.note && (
              <DetailRow label="Your note">{request.note}</DetailRow>
            )}
            {request.rejection_reason && (
              <DetailRow label="Reason">{request.rejection_reason}</DetailRow>
            )}
            {request.failure_reference && (
              <DetailRow label="Failure reference">
                <code className="font-mono text-xs break-all">
                  {request.failure_reference}
                </code>
              </DetailRow>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function DetailRow({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-0.5 sm:grid-cols-[140px_minmax(0,1fr)]", className)}>
      <p className="text-xs text-gray-05">{label}</p>
      <div className="text-[13px] text-black-01 min-w-0 text-pretty">
        {children}
      </div>
    </div>
  );
}
