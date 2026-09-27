import { useRef, useState } from "react";
import { useLocation, useParams } from "react-router";
import { useFormik } from "formik";
import { CircleCheckBig, Paperclip, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CustomInput } from "@/components/custom/custom-input";
import { CustomNativeSelect } from "@/components/custom/custom-native-select";
import { CustomTextArea } from "@/components/custom/custom-textarea";
import { cn } from "@/lib/utils";
import { useAppSelector } from "@/redux/store";
import {
  selectTenantIsPending,
  selectUser,
} from "@/redux/features/auth/auth-slice";
import {
  useAddTicketAttachmentMutation,
  useCreateTicketMutation,
} from "@/redux/services/support/support-api";
import type {
  TicketCategory,
  TicketContext,
  TicketPriority,
} from "@/redux/services/support/support-types";
import { screenTicketContext } from "@/lib/support/ticket-context";
import { contextualGuideContext, GUIDE_REGISTRY, ticketGuideId, useGuideReader } from "@/features/guides";
import { escalationSchema } from "@/schema/onboarding";
import { apiErrorMessage } from "@/utils/api-error";
import { useOnboardingState } from "@/pages/protected/onboarding/use-onboarding-state";

/**
 * The support ticket form, and the confirmation that follows it.
 *
 * Extracted from the Get Help page so the header's headset button can open the
 * same form in a sheet without navigating, the way console-fe's does. There is
 * one implementation and two frames around it: filing a ticket from the header
 * and filing one from the page must not drift into two different forms with two
 * different validation rules.
 *
 * Filing is all it does. The ticket list and the conversation on each ticket
 * are the Support screen (`pages/protected/support`), so the confirmation says
 * who picks the ticket up and where the answer appears rather than repeating
 * any of that here. A ticket goes to the school's own support desk first, and
 * reaches XVS only if the school sends it on.
 *
 * Everything onboarding-shaped in here is gated on the school still being
 * pre-live, and nothing new may assume it: the header's headset puts this form
 * on every page of a live school as well, and a live school's fees bug must not
 * arrive stamped with a setup step. `selectTenantIsPending` is the answer to
 * ask - it comes with the session, costs no request, is not gated on an
 * onboarding permission, and reads an unknown status as live.
 */

const CATEGORY_OPTIONS: { value: TicketCategory; label: string }[] = [
  { value: "SUPPORT", label: "Support request" },
  { value: "BUG", label: "Bug report" },
  { value: "HELP", label: "Help" },
  { value: "ACCOUNT", label: "Account" },
  { value: "BILLING", label: "Billing" },
  { value: "OTHER", label: "Other" },
];

/**
 * What the server will take, mirrored here so the picker offers the same set.
 *
 * The server is the rule: it checks the extension, the size, AND that the
 * bytes match the extension, which is the check a file picker cannot make.
 * This attribute just saves somebody choosing a file that was always going to
 * be refused.
 */
const ACCEPTED_FILES = ".pdf,.png,.jpg,.jpeg,.webp,.gif,.csv,.xls,.xlsx";
const MAX_ATTACHMENT_MB = 10;
const MAX_ATTACHMENTS = 5;

const PRIORITY_OPTIONS: { value: TicketPriority; label: string }[] = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "URGENT", label: "Urgent" },
];

/**
 * The whole context a ticket carries: where they were, and - while the school
 * is still being set up - how far through setup it had got.
 *
 * A function rather than an inline spread so both rules can be asserted without
 * driving the form.
 *
 * The screen is sent whatever the school's state, because it is true whatever
 * the state: a ticket raised on the fees screen is about fees. The onboarding
 * pair is sent only while pre-live, because that is the only time it means
 * anything. Between them they keep every ticket from being stamped
 * "Onboarding", which says the same thing about all of them.
 *
 * `screen` wins over the onboarding stamp where they disagree: a school still
 * onboarding but standing on Roles gets `product_area: "Roles"`, which is where
 * its question actually needs to go.
 */
export function ticketContext({
  screen,
  tenantIsPending,
  taskKey,
  readinessState,
}: {
  screen: TicketContext;
  tenantIsPending: boolean;
  taskKey?: string;
  readinessState?: string;
}): TicketContext | undefined {
  const context: TicketContext = {
    ...screen,
    ...(tenantIsPending && taskKey ? { onboarding_task_key: taskKey } : {}),
    ...(tenantIsPending && readinessState
      ? { onboarding_readiness_state: readinessState }
      : {}),
  };
  // An empty object is not worth a key on the request, and the server treats a
  // missing context and an empty one the same way.
  return Object.keys(context).length ? context : undefined;
}

/** What another screen can hand the form to prefill it. */
export interface EscalationPrefill {
  title?: string;
  description?: string;
  category?: TicketCategory;
  priority?: TicketPriority;
  taskKey?: string;
}

export function SupportTicketForm({
  prefill = {},
  onCancel,
  cancelLabel = "Cancel",
  onDone,
  doneLabel = "Done",
  submitLabel = "Create ticket",
  compact = false,
  className,
}: {
  prefill?: EscalationPrefill;
  /** Called by the Cancel button. Omit it and no Cancel is offered. */
  onCancel?: () => void;
  cancelLabel?: string;
  /** Called by the confirmation's primary button. */
  onDone?: () => void;
  doneLabel?: string;
  submitLabel?: string;
  /**
   * Tighter, for the header panel: less air between fields, and the actions
   * right-aligned under them rather than left-aligned like a page form.
   */
  compact?: boolean;
  className?: string;
}) {
  const user = useAppSelector(selectUser);
  const tenantIsPending = useAppSelector(selectTenantIsPending);
  // Skipped once the school is live. The only thing read off this state is
  // onboarding routing, and a live school's bursar need not hold
  // `onboarding.progress.view` - asking would be a 403 every time the header
  // panel opens, for an answer nothing goes on to use.
  const { state } = useOnboardingState({ skip: !tenantIsPending });
  const [createTicket, { isLoading }] = useCreateTicketMutation();
  const [addAttachment] = useAddTicketAttachmentMutation();
  const [reference, setReference] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState("");
  // Files that did not upload after the ticket itself was created. The ticket
  // is real and the person must not be told it failed, so this is reported on
  // the confirmation rather than as an error.
  const [failedFiles, setFailedFiles] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const filePicker = useRef<HTMLInputElement>(null);

  const addFiles = (chosen: FileList | null) => {
    if (!chosen?.length) return;
    setFileError("");
    const next = [...files];
    for (const file of Array.from(chosen)) {
      if (next.length >= MAX_ATTACHMENTS) {
        setFileError(`You can attach up to ${MAX_ATTACHMENTS} files.`);
        break;
      }
      if (file.size > MAX_ATTACHMENT_MB * 1024 * 1024) {
        setFileError(`${file.name} is over ${MAX_ATTACHMENT_MB} MB.`);
        continue;
      }
      // Same file chosen twice is a slip, not an intent.
      const already = next.some(
        (item) =>
          item.name === file.name &&
          item.size === file.size &&
          item.lastModified === file.lastModified,
      );
      if (!already) next.push(file);
    }
    setFiles(next);
    if (filePicker.current) filePicker.current.value = "";
  };

  // Which step the person was on. Taken from whoever opened the form, or the
  // first required step still outstanding - the one they are most likely stuck
  // on. It is a catalog key on a closed allowlist, never free text.
  //
  // Sent with the ticket but NOT shown. It is routing information for the
  // people who pick the ticket up, and printing it back at a school made them
  // read a paragraph about plumbing they had not asked about.
  const outstanding =
    state?.tasks.filter(
      (task) => task.status !== "DONE" && task.status !== "SKIPPED",
    ) ?? [];
  const contextTaskKey =
    prefill.taskKey ??
    outstanding.find((task) => task.is_required)?.key ??
    outstanding[0]?.key;

  // Where the person is standing. The panel opens over the page rather than
  // navigating to one, so this is still the screen they were reading when
  // something went wrong - which is the routing a ticket most needs and the
  // thing the old blanket "Onboarding" stamp was standing in for.
  // The guide written for that screen goes with it, so whoever picks the
  // ticket up can see what the person had to read before asking.
  const location = useLocation();
  const params = useParams();
  const guideReader = useGuideReader();
  const guideId = ticketGuideId(
    contextualGuideContext(GUIDE_REGISTRY, location.pathname, guideReader),
  );
  const context = ticketContext({
    screen: {
      ...screenTicketContext(location.pathname, params),
      ...(guideId ? { guide_id: guideId } : {}),
    },
    tenantIsPending,
    taskKey: contextTaskKey,
    readinessState: state?.readiness_state,
  });

  const formik = useFormik({
    initialValues: {
      title: prefill.title ?? "",
      description: prefill.description ?? "",
      category: (prefill.category ?? "SUPPORT") as TicketCategory,
      priority: (prefill.priority ?? "MEDIUM") as TicketPriority,
    },
    validationSchema: escalationSchema,
    onSubmit: async (values) => {
      setSubmitError("");
      try {
        const result = await createTicket({
          title: values.title.trim(),
          description: values.description.trim(),
          category: values.category,
          priority: values.priority,
          ...(context ? { context } : {}),
        }).unwrap();

        // Uploaded one at a time, after the ticket exists, because that is what
        // the endpoint takes. A file that fails here does NOT fail the ticket:
        // it is already filed, and telling somebody otherwise would have them
        // raise it a second time.
        if (files.length) {
          setUploading(true);
          const failed: string[] = [];
          for (const file of files) {
            try {
              await addAttachment({
                ticketId: String(result.data.id),
                file,
              }).unwrap();
            } catch {
              failed.push(file.name);
            }
          }
          setFailedFiles(failed);
          setUploading(false);
        }

        setReference(result.data.ticket_number);
      } catch (error) {
        setSubmitError(
          apiErrorMessage(error, "We could not file your ticket. Try again."),
        );
      }
    },
  });

  if (reference) {
    return (
      <TicketFiledConfirmation
        reference={reference}
        email={user?.email}
        failedFiles={failedFiles}
        onDone={onDone}
        doneLabel={doneLabel}
        onFileAnother={() => {
          setReference("");
          setFiles([]);
          setFailedFiles([]);
          formik.resetForm({
            values: {
              title: "",
              description: "",
              category: "SUPPORT",
              priority: "MEDIUM",
            },
          });
        }}
        className={className}
      />
    );
  }

  return (
    <form
      onSubmit={formik.handleSubmit}
      className={cn(compact ? "space-y-3 min-w-0" : "space-y-4 min-w-0", className)}
    >
      <div data-guide="support-ticket.title">
        <CustomInput
          id="title"
          label="Title"
          isRequired
          placeholder="Briefly describe the issue"
          maxLength={220}
          {...formik.getFieldProps("title")}
          error={formik.touched.title ? formik.errors.title : ""}
        />
        <p className="mt-1 text-right text-xs text-gray-05">
          {formik.values.title.length}/220
        </p>
      </div>

      <CustomTextArea
        data-guide="support-ticket.description"
        id="description"
        label="Description"
        isRequired
        rows={5}
        placeholder="What happened, what did you expect, and what have you tried?"
        {...formik.getFieldProps("description")}
        error={formik.touched.description ? formik.errors.description : ""}
      />

      <div data-guide="support-ticket.category" className="grid gap-4 sm:grid-cols-2">
        <CustomNativeSelect
          id="category"
          label="Category"
          options={CATEGORY_OPTIONS}
          placeholder="Pick a category"
          {...formik.getFieldProps("category")}
          error={formik.touched.category ? formik.errors.category : ""}
        />

        <CustomNativeSelect
          id="priority"
          label="Priority"
          options={PRIORITY_OPTIONS}
          placeholder="Pick a priority"
          {...formik.getFieldProps("priority")}
          error={formik.touched.priority ? formik.errors.priority : ""}
        />
      </div>

      <div data-guide="support-ticket.attachments">
        <input
          ref={filePicker}
          type="file"
          multiple
          accept={ACCEPTED_FILES}
          className="sr-only"
          onChange={(event) => addFiles(event.target.files)}
        />
        <button
          type="button"
          onClick={() => filePicker.current?.click()}
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-white px-3 py-3 text-xs font-medium text-gray-05 transition hover:border-primary/35 hover:text-primary"
        >
          <Paperclip className="size-4" />
          Add screenshots or files
        </button>
        <p className="mt-1.5 text-[11px] text-gray-05">
          Optional. Up to {MAX_ATTACHMENTS} files, {MAX_ATTACHMENT_MB} MB each.
          Images, PDFs and spreadsheets.
        </p>

        {files.length > 0 && (
          <ul className="mt-2 grid gap-1.5">
            {files.map((file, index) => (
              <li
                key={`${file.name}-${file.lastModified}-${index}`}
                className="flex items-center gap-2 rounded-md bg-gray-03 px-2.5 py-1.5"
              >
                <Paperclip className="size-3.5 shrink-0 text-gray-05" />
                <span className="min-w-0 flex-1 truncate text-xs text-black-01">
                  {file.name}
                </span>
                <span className="shrink-0 text-[10px] text-gray-05 tabular-nums">
                  {Math.max(1, Math.round(file.size / 1024))} KB
                </span>
                <button
                  type="button"
                  aria-label={`Remove ${file.name}`}
                  onClick={() =>
                    setFiles(files.filter((_, i) => i !== index))
                  }
                  className="shrink-0 rounded p-0.5 text-gray-05 hover:bg-gray-04 hover:text-black-01"
                >
                  <X className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}

        {fileError && (
          <p className="mt-1.5 text-xs font-medium text-error-text">
            {fileError}
          </p>
        )}
      </div>

      {submitError && (
        <p className="text-xs font-medium text-error-text text-pretty">
          {submitError}
        </p>
      )}

      <div
        data-guide="support-ticket.actions"
        className={cn(
          "flex flex-wrap items-center gap-2",
          compact && "justify-end pt-1",
        )}
      >
        {compact && onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            {cancelLabel}
          </Button>
        )}
        <Button
          type="submit"
          loading={isLoading || uploading}
          disabled={!formik.isValid || !formik.dirty || isLoading || uploading}
        >
          {submitLabel}
        </Button>
        {!compact && onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            {cancelLabel}
          </Button>
        )}
      </div>
    </form>
  );
}


/**
 * What a school sees once the ticket is filed.
 *
 * Its own component, rendered from props, so what a school is promised can be
 * tested without filing a ticket.
 *
 * The promise is the routing as it is: the school's own support desk reads the
 * ticket first and sends on to XVS only what it cannot solve, so the person
 * filing is not told XVS will answer. Replies arrive on the ticket's
 * conversation under Support, with a notification in the app and by email, and
 * an email reply does not reach the ticket - so a file that failed to upload is
 * sent as a reply on the ticket, not by email. The desk is open before go-live
 * as well, so nothing here depends on whether the school is live.
 */
export function TicketFiledConfirmation({
  reference,
  email,
  failedFiles,
  onDone,
  doneLabel = "Done",
  onFileAnother,
  className,
}: {
  reference: string;
  email?: string;
  failedFiles: string[];
  onDone?: () => void;
  doneLabel?: string;
  onFileAnother: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center text-center gap-3 min-w-0",
        className,
      )}
    >
      <span className="size-16 rounded-full bg-green-01/10 text-green-01 grid place-content-center">
        <CircleCheckBig className="size-8" strokeWidth={1.5} />
      </span>
      <h2 className="text-lg font-semibold font-mont text-black-01">
        Ticket filed
      </h2>
      <div className="mt-1">
        <p className="text-xs text-gray-05">Reference</p>
        <code className="mt-1 inline-block rounded-md bg-gray-03 px-3 py-1.5 font-mono text-sm text-black-01">
          {reference}
        </code>
      </div>
      <p className="text-[13px] text-gray-06 max-w-[52ch] text-pretty">
        Keep this reference. Your school&apos;s support team picks it up first,
        and sends it on to XVS if they cannot solve it. Replies appear on the
        ticket under Support, and you are notified in the app
        {email ? ` and at ${email}` : " and by email"}.
      </p>
      {failedFiles.length > 0 && (
        // Said plainly and separately from the reference. The ticket IS filed;
        // only the files did not make it, and somebody who reads "something
        // went wrong" here will raise the whole thing again.
        <p className="text-[13px] text-error-text max-w-[52ch] text-pretty">
          Your ticket is filed, but {failedFiles.join(", ")} did not upload.
          Open the ticket under Support and attach{" "}
          {failedFiles.length === 1 ? "it" : "them"} to a reply.
        </p>
      )}
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        {onDone && <Button onClick={onDone}>{doneLabel}</Button>}
        <Button variant="outline" onClick={onFileAnother}>
          File another ticket
        </Button>
      </div>
    </div>
  );
}
