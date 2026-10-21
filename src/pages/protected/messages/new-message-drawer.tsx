import { useState } from "react";

import { SegmentedToggle } from "@/components/custom/segmented-toggle";
import { useStartConversationMutation } from "@/redux/services/messages/messages-api";
import type {
  StaffContact,
  StartConversationBody,
} from "@/redux/services/messages/messages-types";
import {
  DrawerShell,
  Field,
  errorInputClass,
  inputClass,
} from "@/pages/protected/students/drawers/drawer-shell";
import { cn } from "@/lib/utils";
import { writeErrorMessage } from "@/utils/api-error";

import { ContactPicker } from "./contact-picker";
import { FamilyPicker, type FamilyChoice } from "./family-picker";
import {
  BODY_MAX,
  CANNOT_SEND_COPY,
  SEND_REFUSED,
  openedId,
} from "./messages-copy";
import { useMessageAccess } from "./use-message-access";
import { useSendToken } from "./use-send-token";

type Audience = "staff" | "family";

/**
 * Start a conversation with a colleague, or with a pupil or a pupil's parent.
 *
 * Starting is find-or-create on the pair, so a second message to somebody
 * already in the inbox lands in the same conversation. The family choice is
 * offered only to staff who may write to families, and only where Field Access
 * lets the role name the pupil the conversation is about; otherwise the tab
 * says why. Message is required, and a role that cannot write it is told so in
 * place of the box, because a conversation cannot start without a first message
 * in this screen.
 */
export function NewMessageDrawer({
  canStaff,
  canFamily,
  onClose,
  onOpened,
}: {
  canStaff: boolean;
  canFamily: boolean;
  onClose: () => void;
  onOpened: (id: number) => void;
}) {
  const { shows, writes } = useMessageAccess();
  const [audience, setAudience] = useState<Audience>(canStaff ? "staff" : "family");
  const [colleague, setColleague] = useState<StaffContact[]>([]);
  const [family, setFamily] = useState<FamilyChoice | null>(null);
  const [body, setBody] = useState("");
  const [touched, setTouched] = useState(false);
  const [problem, setProblem] = useState("");
  const [start, { isLoading }] = useStartConversationMutation();
  const token = useSendToken();

  const bodyOpen = shows("body") && writes("body");
  const childOpen = shows("child") && writes("child");
  const trimmed = body.trim();
  const bodyError = !trimmed
    ? "Write the first message."
    : trimmed.length > BODY_MAX
      ? `Keep it to ${BODY_MAX} characters.`
      : "";
  const chosen = audience === "staff" ? colleague.length > 0 : family !== null;
  const familyBlocked = audience === "family" && !childOpen;
  const canSave = bodyOpen && chosen && !familyBlocked && !isLoading;

  const onSave = async () => {
    setTouched(true);
    setProblem("");
    if (!canSave || bodyError) return;
    let payload: StartConversationBody;
    const client_token = token.tokenFor(trimmed);
    if (audience === "staff") {
      payload = { kind: "STAFF_DIRECT", recipient: colleague[0].user_id, body: trimmed, client_token };
    } else if (family?.pupil) {
      payload = { kind: "PUPIL", student: family.student.id, body: trimmed, client_token };
    } else if (family) {
      payload = {
        kind: "FAMILY",
        student: family.student.id,
        guardian: family.guardian.id,
        body: trimmed,
        client_token,
      };
    } else {
      return;
    }
    try {
      const result = await start(payload).unwrap();
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
      title="New message"
      subtitle="Pick who it is for and write the first message."
      saveLabel="Send message"
      onSave={onSave}
      canSave={canSave}
      saving={isLoading}
    >
      <div className="grid gap-5">
        {canStaff && canFamily ? (
          <SegmentedToggle
            ariaLabel="Who the message is for"
            value={audience}
            options={[
              { value: "staff", label: "Colleague" },
              { value: "family", label: "Parent or pupil" },
            ]}
            onChange={(next) => {
              setAudience(next);
              setProblem("");
            }}
          />
        ) : null}

        {audience === "staff" ? (
          <Field label="To" required error={touched && !chosen ? "Choose a colleague." : undefined}>
            <ContactPicker mode="single" value={colleague} onChange={setColleague} />
          </Field>
        ) : childOpen ? (
          <Field
            label="To"
            required
            error={touched && !chosen ? "Choose a pupil, then the pupil or a parent." : undefined}
          >
            <FamilyPicker value={family} onChange={setFamily} />
          </Field>
        ) : (
          <p className="rounded-lg border border-border bg-pry-01/20 px-3.5 py-3 text-sm text-gray-06">
            Your role cannot name the pupil a conversation is about, so it cannot start one with a
            parent or a pupil.
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
              placeholder="Write your message"
              className={cn(inputClass, "h-auto min-h-28 py-2.5", touched && bodyError && errorInputClass)}
            />
          </Field>
        ) : (
          <p className="rounded-lg border border-border bg-pry-01/20 px-3.5 py-3 text-sm text-gray-06">
            {CANNOT_SEND_COPY}
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
