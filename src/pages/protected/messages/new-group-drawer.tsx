import { useState } from "react";

import { useCreateGroupMutation } from "@/redux/services/messages/messages-api";
import type { StaffContact } from "@/redux/services/messages/messages-types";
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
import { BODY_MAX, GROUP_NAME_MAX, openedId } from "./messages-copy";
import { useComposeBranch } from "./use-compose-branch";
import { useMessageAccess } from "./use-message-access";
import { useSendToken } from "./use-send-token";

/**
 * Start a staff group: a name, the people in it, and optionally a first message.
 *
 * The person who creates it becomes its owner. The name and the first members
 * are open on create whatever Field Access says about renaming or changing
 * members later, so the form always offers both. The first message is offered
 * only to a role that may write messages. At a school with several branches the
 * group belongs to one branch, or to the whole school for a reader who covers
 * it; the members offered are that branch's staff.
 */
export function NewGroupDrawer({
  onClose,
  onOpened,
}: {
  onClose: () => void;
  onOpened: (id: number) => void;
}) {
  const { shows, writes } = useMessageAccess();
  const branch = useComposeBranch();
  const [name, setName] = useState("");
  const [members, setMembers] = useState<StaffContact[]>([]);
  const [body, setBody] = useState("");
  const [touched, setTouched] = useState(false);
  const [problem, setProblem] = useState("");
  const [create, { isLoading }] = useCreateGroupMutation();
  const token = useSendToken();

  const nameOpen = shows("title", true) && writes("title", true);
  const membersOpen = shows("participants", true) && writes("participants", true);
  const bodyOpen = shows("body") && writes("body");
  const trimmed = name.trim();
  const nameError = !trimmed ? "Give the group a name." : "";
  const membersError = members.length === 0 ? "Choose at least one person." : "";
  const bodyError = body.trim().length > BODY_MAX ? `Keep it to ${BODY_MAX} characters.` : "";
  const canSave = nameOpen && membersOpen && !isLoading;

  const onSave = async () => {
    setTouched(true);
    setProblem("");
    if (!canSave || nameError || membersError || bodyError) return;
    const first = bodyOpen ? body.trim() : "";
    try {
      const result = await create({
        name: trimmed,
        branch: branch.branchId,
        members: members.map((member) => member.user_id),
        ...(first ? { body: first, client_token: token.tokenFor(first) } : {}),
      }).unwrap();
      token.clear();
      const id = openedId(result.data);
      onClose();
      if (id != null) onOpened(id);
    } catch (failure) {
      setProblem(writeErrorMessage(failure, "We could not create the group. Try again."));
    }
  };

  return (
    <DrawerShell
      open
      onClose={onClose}
      wide
      title="New group"
      subtitle="A private space for the staff you choose. You become its owner."
      saveLabel="Create group"
      onSave={onSave}
      canSave={canSave}
      saving={isLoading}
    >
      <div className="grid gap-5">
        {nameOpen ? (
          <Field label="Group name" required error={touched ? nameError || undefined : undefined}>
            <input
              value={name}
              maxLength={GROUP_NAME_MAX}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. JSS1 form teachers"
              className={cn(inputClass, touched && nameError && errorInputClass)}
            />
          </Field>
        ) : (
          <p className="rounded-lg border border-border bg-pry-01/20 px-3.5 py-3 text-sm text-gray-06">
            Your role cannot name a group, so it cannot create one.
          </p>
        )}

        <BranchSelect
          branch={branch}
          hintForBranch="Only staff of this branch can be added."
          hintForAll="Staff of any branch can be added."
          onChange={() => setMembers([])}
        />

        {membersOpen ? (
          <Field label="People" required error={touched ? membersError || undefined : undefined}>
            <ContactPicker
              mode="multi"
              value={members}
              onChange={setMembers}
              branch={branch.branchId}
            />
          </Field>
        ) : (
          <p className="rounded-lg border border-border bg-pry-01/20 px-3.5 py-3 text-sm text-gray-06">
            Your role cannot choose who is in a conversation, so it cannot create a group.
          </p>
        )}

        {bodyOpen ? (
          <Field
            label="First message"
            error={touched ? bodyError || undefined : undefined}
            hint={`Optional. Up to ${BODY_MAX} characters.`}
          >
            <textarea
              value={body}
              rows={4}
              onChange={(event) => setBody(event.target.value)}
              placeholder="Say hello"
              className={cn(inputClass, "h-auto min-h-24 py-2.5", touched && bodyError && errorInputClass)}
            />
          </Field>
        ) : null}

        {problem ? (
          <p role="alert" className="break-words text-sm text-red-600">
            {problem}
          </p>
        ) : null}
      </div>
    </DrawerShell>
  );
}
