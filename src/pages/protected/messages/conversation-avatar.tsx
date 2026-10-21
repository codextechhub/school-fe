import { GraduationCap, Megaphone, MessageSquare, Users, UsersRound } from "lucide-react";

import { cn } from "@/lib/utils";
import type { ConversationKind } from "@/redux/services/messages/messages-types";

import { initialsOf } from "./messages-copy";

const ICON: Record<ConversationKind, React.ElementType | null> = {
  STAFF_DIRECT: null,
  FAMILY: UsersRound,
  PUPIL: GraduationCap,
  GROUP: Users,
  BROADCAST: Megaphone,
  BROADCAST_REPLY: MessageSquare,
};

/**
 * The round mark beside a conversation: initials for a person, an icon for a
 * group, a broadcast, a pupil or a reply.
 *
 * With the name hidden by Field Access `name` is empty and the icon (or a
 * neutral initial) stands in, so the mark never spells out what was withheld.
 */
export function ConversationAvatar({
  kind,
  name,
  className,
}: {
  kind: ConversationKind;
  name?: string;
  className?: string;
}) {
  const Icon = ICON[kind] ?? (name ? null : MessageSquare);
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid size-10 shrink-0 place-items-center rounded-full bg-pry-01 text-xs font-semibold text-primary",
        className,
      )}
    >
      {Icon ? <Icon className="size-4" /> : initialsOf(name ?? "")}
    </span>
  );
}
