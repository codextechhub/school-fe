import { useState } from "react";

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useSendBroadcastMutation } from "@/redux/services/messages/messages-api";
import type { ReplyMode, StaffContact } from "@/redux/services/messages/messages-types";
import {
  DrawerShell,
  Field,
  errorInputClass,
  inputClass,
} from "@/pages/protected/students/drawers/drawer-shell";
import { cn } from "@/lib/utils";
import { writeErrorMessage } from "@/utils/api-error";

import { BranchSelect } from "./compose-branch";
import { ContactPicker } from "./contact-picker";
import {
  BODY_MAX,
  BROADCAST_RECIPIENTS_MAX,
  BROADCAST_TITLE_MAX,
  CANNOT_SEND_COPY,
  SEND_REFUSED,
  openedId,
} from "./messages-copy";
import { useComposeBranch } from "./use-compose-branch";
import { useMessageAccess } from "./use-message-access";
import { useSendToken } from "./use-send-token";

const REPLY_CHOICES: { value: ReplyMode; label: string; note: string }[] = [
  {
    value: "ONE_WAY",
    label: "One-way: recipients read it and cannot reply",
    note: "Nobody can answer. Use it for notices.",
  },
  {
    value: "PRIVATE_REPLIES",
    label: "Replies allowed: each reply comes to you privately; other recipients never see it",
    note: "Every reply opens its own private conversation with you.",
  },
];

/**
 * Send a broadcast to staff: a title, a message, the reply setting and the people.
 *
 * The reply setting is fixed when the broadcast is sent. Where Field Access
 * does not let the role set it, the control is absent and the broadcast goes
 * out one-way, which the form says. Where it does not let the role address a
 * broadcast, there are no recipients to choose and nothing can be sent, which
 * the form also says. Recipients are staff the sender may message, one to a
 * thousand, never the sender.
 */
export function NewBroadcastDrawer({
  onClose,
  onOpened,
}: {
  onClose: () => void;
  onOpened: (id: number) => void;
}) {
  const { shows, writes } = useMessageAccess();
  const branch = useComposeBranch();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [replyMode, setReplyMode] = useState<ReplyMode>("ONE_WAY");
  const [recipients, setRecipients] = useState<StaffContact[]>([]);
  const [touched, setTouched] = useState(false);
  const [problem, setProblem] = useState("");
  const [send, { isLoading }] = useSendBroadcastMutation();
  const token = useSendToken();

  const titleOpen = shows("title", true) && writes("title", true);
  const bodyOpen = shows("body") && writes("body");
  const recipientsOpen = shows("recipients") && writes("recipients");
  const replyOpen = shows("reply_mode") && writes("reply_mode");
  const titleError = !title.trim() ? "Give the broadcast a title." : "";
  const bodyError = !body.trim()
    ? "Write the message."
    : body.trim().length > BODY_MAX
      ? `Keep it to ${BODY_MAX} characters.`
      : "";
  const recipientsError = recipients.length === 0 ? "Choose at least one person." : "";
  const canSave = titleOpen && bodyOpen && recipientsOpen && !isLoading;

  const onSave = async () => {
    setTouched(true);
    setProblem("");
    if (!canSave || titleError || bodyError || recipientsError) return;
    const text = body.trim();
    try {
      const result = await send({
        title: title.trim(),
        body: text,
        ...(replyOpen ? { reply_mode: replyMode } : {}),
        branch: branch.branchId,
        recipients: recipients.map((recipient) => recipient.user_id),
        client_token: token.tokenFor(`${title.trim()}\n${text}`),
      }).unwrap();
      token.clear();
      const id = openedId(result.data);
      onClose();
      if (id != null) onOpened(id);
    } catch (failure) {
      setProblem(writeErrorMessage(failure, SEND_REFUSED));
    }
  };

  return (
    <DrawerShell
      open
      onClose={onClose}
      wide
      title="New broadcast"
      subtitle="One message to many staff. They each get it in their own inbox."
      saveLabel="Send broadcast"
      onSave={onSave}
      canSave={canSave}
      saving={isLoading}
    >
      <div className="grid gap-5">
        {titleOpen ? (
          <Field label="Title" required error={touched ? titleError || undefined : undefined}>
            <input
              value={title}
              maxLength={BROADCAST_TITLE_MAX}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. Staff meeting moved to Friday"
              className={cn(inputClass, touched && titleError && errorInputClass)}
            />
          </Field>
        ) : (
          <p className="rounded-lg border border-border bg-pry-01/20 px-3.5 py-3 text-sm text-gray-06">
            Your role cannot name a broadcast, so it cannot send one.
          </p>
        )}

        {bodyOpen ? (
          <Field
            label="Message"
            required
            error={touched ? bodyError || undefined : undefined}
            hint={`Up to ${BODY_MAX} characters.`}
          >
            <textarea
              value={body}
              rows={5}
              onChange={(event) => setBody(event.target.value)}
              placeholder="What do your colleagues need to know?"
              className={cn(inputClass, "h-auto min-h-28 py-2.5", touched && bodyError && errorInputClass)}
            />
          </Field>
        ) : (
          <p className="rounded-lg border border-border bg-pry-01/20 px-3.5 py-3 text-sm text-gray-06">
            {CANNOT_SEND_COPY}
          </p>
        )}

        {replyOpen ? (
          <fieldset className="grid gap-2">
            <legend className="mb-1 text-xs font-medium text-gray-05">Replies</legend>
            <RadioGroup
              value={replyMode}
              onValueChange={(next) => setReplyMode(next as ReplyMode)}
              className="gap-2"
            >
              {REPLY_CHOICES.map((choice) => (
                <label
                  key={choice.value}
                  className={cn(
                    "flex min-w-0 cursor-pointer items-start gap-3 rounded-lg border p-3",
                    replyMode === choice.value ? "border-primary bg-[#EEF3FF]" : "border-border",
                  )}
                >
                  <RadioGroupItem value={choice.value} className="mt-0.5" />
                  <span className="min-w-0">
                    <span className="block break-words text-sm font-medium text-black-01">
                      {choice.label}
                    </span>
                    <span className="mt-0.5 block text-xs text-gray-06">{choice.note}</span>
                  </span>
                </label>
              ))}
            </RadioGroup>
          </fieldset>
        ) : (
          <p className="rounded-lg border border-border bg-pry-01/20 px-3.5 py-3 text-sm text-gray-06">
            Your role cannot change the reply setting. This broadcast goes out one-way, so nobody
            can reply to it.
          </p>
        )}

        <BranchSelect
          branch={branch}
          hintForBranch="Only staff of this branch can receive it."
          hintForAll="Staff of any branch can receive it."
          onChange={() => setRecipients([])}
        />

        {recipientsOpen ? (
          <Field label="Send to" required error={touched ? recipientsError || undefined : undefined}>
            <ContactPicker
              mode="multi"
              value={recipients}
              onChange={setRecipients}
              branch={branch.branchId}
              selectAll
              max={BROADCAST_RECIPIENTS_MAX}
            />
          </Field>
        ) : (
          <p className="rounded-lg border border-border bg-pry-01/20 px-3.5 py-3 text-sm text-gray-06">
            Your role cannot choose who a broadcast goes to, so it cannot send one.
          </p>
        )}

        {problem ? (
          <p role="alert" className="break-words text-sm text-red-600">
            {problem}
          </p>
        ) : null}
      </div>
    </DrawerShell>
  );
}
