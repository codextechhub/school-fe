import { useState } from "react";
import { toast } from "sonner";

import { Switch } from "@/components/ui/switch";
import { useFieldAccess } from "@/components/finance-ui";
import { CREATING, FIELD_RESOURCE } from "@/lib/field-resources";
import { DrawerShell, Field, errorInputClass, inputClass } from "@/pages/protected/students/drawers/drawer-shell";
import {
  useCreateNoticeMutation,
  useUpdateNoticeMutation,
} from "@/redux/services/notices/notices-api";
import type {
  Notice,
  NoticeAudience,
  NoticeAudienceOptions,
  NoticeWrite,
} from "@/redux/services/notices/notices-types";
import { fieldErrorsFor, writeErrorMessage } from "@/utils/api-error";
import { cn } from "@/lib/utils";

import { AudiencePicker } from "./audience-picker";
import { BODY_MAX, TITLE_MAX, describeAudience, problemsWith } from "./notice-copy";

const FIELDS = ["title", "body", "audience"] as const;

/**
 * Drafting a notice, or correcting one.
 *
 * A new notice is saved as a draft unless **Publish now** is on, in which case
 * it goes to its audience at once, in-app and by email. A draft can change
 * anything. A published notice can change its title and message, and the
 * pupils see it marked as edited; who it is for is fixed once it is published,
 * so the audience shows without controls.
 *
 * Every field follows the viewer's Field Access on `school.notices`: a hidden
 * field is not shown, a read-only one is shown without controls, and neither
 * is sent. On a new notice the three are open on create, as the server
 * declares them.
 */
export function NoticeDrawer({
  open,
  notice,
  options,
  onClose,
}: {
  open: boolean;
  /** The notice being corrected, or null for a new one. */
  notice: Notice | null;
  options?: NoticeAudienceOptions;
  onClose: () => void;
}) {
  return open ? (
    <NoticeForm key={notice?.id ?? "new"} notice={notice} options={options} onClose={onClose} />
  ) : null;
}

function NoticeForm({
  notice,
  options,
  onClose,
}: {
  notice: Notice | null;
  options?: NoticeAudienceOptions;
  onClose: () => void;
}) {
  const creating = notice === null;
  const access = useFieldAccess(FIELD_RESOURCE.NOTICES, notice);
  const opts = creating ? CREATING : undefined;
  const shows = (name: string) => !access.isHidden(name, opts);
  const writes = (name: string) => !access.isReadOnly(name, opts);
  const published = notice?.status === "PUBLISHED";

  const [title, setTitle] = useState(notice?.title ?? "");
  const [body, setBody] = useState(notice?.body ?? "");
  const [audience, setAudience] = useState<NoticeAudience[]>(notice?.audience ?? []);
  const [publishNow, setPublishNow] = useState(false);
  const [touched, setTouched] = useState(false);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [create, { isLoading: saving }] = useCreateNoticeMutation();
  const [update, { isLoading: updating }] = useUpdateNoticeMutation();

  const audienceEditable = writes("audience") && !published;
  const problems = problemsWith({ title, body, audience }, creating && publishNow, {
    title: writes("title"),
    body: writes("body"),
    audience: audienceEditable,
  });
  const errors = { ...(touched ? problems : {}), ...serverErrors };

  const onSave = async () => {
    setTouched(true);
    setServerErrors({});
    if (Object.keys(problems).length > 0) return;
    const draft: NoticeWrite = {};
    if (writes("title")) draft.title = title.trim();
    if (writes("body")) draft.body = body.trim();
    if (audienceEditable) draft.audience = audience.map(({ kind, id }) => ({ kind, id }));
    try {
      const result = creating
        ? await create({ ...draft, publish: publishNow }).unwrap()
        : await update({ id: notice.id, ...draft }).unwrap();
      toast.success(result.message || "Notice saved.");
      onClose();
    } catch (error) {
      const byField = fieldErrorsFor(error, FIELDS);
      setServerErrors(byField);
      if (Object.keys(byField).length === 0) {
        toast.error(writeErrorMessage(error, "We could not save this notice. Try again."));
      }
    }
  };

  const saveLabel = creating ? (publishNow ? "Publish notice" : "Save draft") : "Save changes";

  return (
    <DrawerShell
      open
      onClose={onClose}
      wide
      title={creating ? "New notice" : "Edit notice"}
      subtitle={
        creating
          ? "Students in the audience see it in their portal and get an email when it is published."
          : published
            ? "Students see the corrected notice marked as edited."
            : undefined
      }
      saveLabel={saveLabel}
      onSave={onSave}
      canSave={!saving && !updating}
      saving={saving || updating}
    >
      <div className="grid gap-5">
        {shows("title") ? (
          <Field label="Title" required error={errors.title}>
            <input
              value={title}
              maxLength={TITLE_MAX}
              disabled={!writes("title")}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. PTA meeting Saturday"
              className={cn(inputClass, errors.title && errorInputClass)}
            />
          </Field>
        ) : null}

        {shows("body") ? (
          <Field label="Message" required error={errors.body} hint={`Up to ${BODY_MAX} characters.`}>
            <textarea
              value={body}
              rows={8}
              maxLength={BODY_MAX}
              disabled={!writes("body")}
              onChange={(event) => setBody(event.target.value)}
              placeholder="What do students need to know?"
              className={cn(inputClass, "h-auto min-h-40 py-2.5", errors.body && errorInputClass)}
            />
          </Field>
        ) : null}

        {shows("audience") ? (
          <Field
            label="Who it is for"
            required
            error={errors.audience}
            hint={published ? "Who a published notice is for cannot change." : undefined}
          >
            {audienceEditable && options ? (
              <AudiencePicker options={options} value={audience} onChange={setAudience} />
            ) : (
              <p className="text-sm text-black-01">
                {notice?.audience_label || describeAudience(audience, options)}
              </p>
            )}
          </Field>
        ) : null}

        {creating ? (
          <label className="flex items-start gap-3 rounded-lg border border-white-02 p-3.5">
            <Switch checked={publishNow} onCheckedChange={setPublishNow} />
            <span className="min-w-0">
              <span className="block text-sm font-medium text-black-01">Publish now</span>
              <span className="mt-0.5 block text-xs text-gray-05">
                {publishNow
                  ? `It goes to ${describeAudience(audience, options)} as soon as you publish, in-app and by email.`
                  : "Off saves a draft you can check and publish later."}
              </span>
            </span>
          </label>
        ) : null}
      </div>
    </DrawerShell>
  );
}
