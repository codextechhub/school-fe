import { useState } from "react";
import { LogOut, UserMinus, UserPlus, Crown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  useAddGroupMembersMutation,
  useMakeGroupOwnerMutation,
  useRemoveGroupMemberMutation,
  useRenameGroupMutation,
} from "@/redux/services/messages/messages-api";
import type {
  ConversationDetail,
  Participant,
  StaffContact,
} from "@/redux/services/messages/messages-types";
import { ConfirmDialog } from "@/pages/protected/students/drawers/confirm-dialog";
import { inputClass } from "@/pages/protected/students/drawers/drawer-shell";
import { writeErrorMessage } from "@/utils/api-error";
import { toast } from "sonner";

import { ContactPicker } from "./contact-picker";
import { GROUP_NAME_MAX, roleLabel } from "./messages-copy";
import { useMessageAccess } from "./use-message-access";

/**
 * Who is in a group, who a broadcast went to, and what the reader may do about it.
 *
 * A group's owner can rename it, add colleagues, remove members and make a
 * member an owner; every member can leave. The last owner cannot leave while
 * others remain, and the server's sentence for that is shown where it happens.
 * A broadcast's sender reads the full recipient list and the reply setting; a
 * recipient reads only how many people it went to.
 *
 * Each control follows Field Access: renaming needs Group or broadcast name to
 * be writable, and adding, removing and promoting need People in the
 * conversation to be writable. A hidden list leaves the sheet with nothing
 * naming anybody.
 */
export function PeopleSheet({
  conversation,
  myUserId,
  onClose,
  onLeft,
}: {
  conversation: ConversationDetail;
  myUserId: number | null;
  onClose: () => void;
  onLeft: () => void;
}) {
  const { shows, writes } = useMessageAccess(conversation);
  const isGroup = conversation.kind === "GROUP";
  const isOwner = isGroup && conversation.role === "OWNER";
  const canRename = isOwner && shows("title") && writes("title");
  const canChange = isOwner && shows("participants") && writes("participants");
  const people = isGroup ? (conversation.participants ?? []) : (conversation.recipients ?? []);
  const showPeople = isGroup ? shows("participants") : shows("recipients");
  const recipientCount = conversation.recipient_count;
  const isSender = conversation.kind === "BROADCAST" && conversation.role === "SENDER";

  const [name, setName] = useState(conversation.display_name ?? conversation.title ?? "");
  const [added, setAdded] = useState<StaffContact[]>([]);
  const [problem, setProblem] = useState("");
  const [confirm, setConfirm] = useState<
    { kind: "remove"; person: Participant } | { kind: "leave" } | null
  >(null);
  const [rename, renaming] = useRenameGroupMutation();
  const [addMembers, adding] = useAddGroupMembersMutation();
  const [removeMember, removing] = useRemoveGroupMemberMutation();
  const [makeOwner, promoting] = useMakeGroupOwnerMutation();
  const busy = renaming.isLoading || adding.isLoading || removing.isLoading || promoting.isLoading;

  const run = async (action: () => Promise<unknown>, done: string, fallback: string) => {
    setProblem("");
    try {
      await action();
      toast.success(done);
      return true;
    } catch (failure) {
      setProblem(writeErrorMessage(failure, fallback));
      return false;
    } finally {
      setConfirm(null);
    }
  };

  const title = isGroup ? "People in this group" : isSender ? "Who it was sent to" : "Broadcast";

  return (
    <Sheet open onOpenChange={(next) => !next && onClose()}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 bg-white p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border px-5 pb-4 pt-5 pr-12 text-left">
          <SheetTitle className="font-mont text-base">{title}</SheetTitle>
          <SheetDescription className="text-[13px] text-gray-01">
            {isGroup
              ? canChange
                ? "You own this group, so you decide who is in it."
                : isOwner
                  ? "Your role cannot change who is in this group."
                  : "Only a group's owner can change who is in it."
              : recipientCount != null
                ? `Sent to ${recipientCount} staff.`
                : "A message sent to staff."}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="min-h-0 flex-1" viewportClassName="px-5 py-4">
          <div className="grid gap-5">
            {canRename ? (
              <form
                className="grid gap-1.5"
                onSubmit={(event) => {
                  event.preventDefault();
                  const next = name.trim();
                  if (!next || next === conversation.display_name) return;
                  void run(
                    () => rename({ id: conversation.id, name: next }).unwrap(),
                    "Group renamed.",
                    "We could not rename the group. Try again.",
                  );
                }}
              >
                <label htmlFor="group-name" className="text-xs font-medium text-gray-05">
                  Group name
                </label>
                <div className="flex min-w-0 gap-2">
                  <input
                    id="group-name"
                    value={name}
                    maxLength={GROUP_NAME_MAX}
                    onChange={(event) => setName(event.target.value)}
                    className={inputClass}
                  />
                  <Button type="submit" variant="outline" disabled={busy || !name.trim()}>
                    Rename
                  </Button>
                </div>
              </form>
            ) : null}

            {showPeople && people.length > 0 ? (
              <ul className="divide-y divide-border rounded-lg border border-border" aria-label="People">
                {people.map((person) => {
                  const mine = person.user_id === myUserId;
                  const role = roleLabel(person);
                  return (
                    <li key={person.user_id} className="flex min-w-0 items-center gap-2 px-3 py-2.5">
                      <span className="min-w-0 flex-1">
                        <span className="block break-words text-sm text-black-01">
                          {person.name}
                          {mine ? <span className="text-gray-06"> (you)</span> : null}
                        </span>
                        {person.label || role ? (
                          <span className="block break-words text-xs text-gray-06">
                            {[person.label, role].filter(Boolean).join(" · ")}
                          </span>
                        ) : null}
                      </span>
                      {canChange && !mine ? (
                        <span className="flex shrink-0 gap-1">
                          {person.role !== "OWNER" ? (
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              aria-label={`Make ${person.name ?? "this person"} an owner`}
                              title="Make owner"
                              disabled={busy}
                              onClick={() =>
                                void run(
                                  () => makeOwner({ id: conversation.id, userId: person.user_id }).unwrap(),
                                  "Owner added.",
                                  "We could not make that person an owner. Try again.",
                                )
                              }
                            >
                              <Crown aria-hidden="true" />
                            </Button>
                          ) : null}
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            aria-label={`Remove ${person.name ?? "this person"}`}
                            title="Remove"
                            disabled={busy}
                            onClick={() => setConfirm({ kind: "remove", person })}
                          >
                            <UserMinus aria-hidden="true" />
                          </Button>
                        </span>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            ) : null}

            {canChange ? (
              <section className="grid gap-2" aria-label="Add people">
                <h3 className="text-xs font-semibold text-gray-05">Add people</h3>
                <ContactPicker
                  mode="multi"
                  value={added}
                  onChange={setAdded}
                  exclude={people.map((person) => person.user_id)}
                  branch={conversation.branch?.id ?? null}
                />
                <Button
                  type="button"
                  disabled={busy || added.length === 0}
                  onClick={async () => {
                    const ok = await run(
                      () =>
                        addMembers({
                          id: conversation.id,
                          members: added.map((contact) => contact.user_id),
                        }).unwrap(),
                      "People added.",
                      "We could not add those people. Try again.",
                    );
                    if (ok) setAdded([]);
                  }}
                >
                  <UserPlus aria-hidden="true" /> Add {added.length > 0 ? added.length : ""}{" "}
                  {added.length === 1 ? "person" : "people"}
                </Button>
              </section>
            ) : null}

            {problem ? (
              <p role="alert" className="break-words text-sm text-red-600">
                {problem}
              </p>
            ) : null}

            {isGroup ? (
              <Button
                type="button"
                variant="outline"
                className="justify-self-start"
                disabled={busy}
                onClick={() => setConfirm({ kind: "leave" })}
              >
                <LogOut aria-hidden="true" /> Leave group
              </Button>
            ) : null}
          </div>
        </ScrollArea>
      </SheetContent>

      <ConfirmDialog
        open={confirm !== null}
        onCancel={() => setConfirm(null)}
        title={confirm?.kind === "leave" ? "Leave this group?" : "Remove this person?"}
        body={
          confirm?.kind === "leave"
            ? "You will lose access to the group, including what was said while you were in it. An owner can add you back, and you would see only what is said after that."
            : "They lose access to the group, including what was said while they were in it."
        }
        confirmLabel={confirm?.kind === "leave" ? "Leave group" : "Remove"}
        busy={busy}
        onConfirm={async () => {
          if (confirm?.kind === "leave" && myUserId != null) {
            const ok = await run(
              () => removeMember({ id: conversation.id, userId: myUserId }).unwrap(),
              "You left the group.",
              "We could not remove you from the group. Try again.",
            );
            if (ok) onLeft();
          } else if (confirm?.kind === "remove") {
            await run(
              () => removeMember({ id: conversation.id, userId: confirm.person.user_id }).unwrap(),
              "Person removed.",
              "We could not remove that person. Try again.",
            );
          }
        }}
      />
    </Sheet>
  );
}
