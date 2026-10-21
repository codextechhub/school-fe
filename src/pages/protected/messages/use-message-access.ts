import { useFieldAccess } from "@/components/finance-ui";
import { CREATING, FIELD_RESOURCE } from "@/lib/field-resources";

/** The message fields whose switches the screens consult, as the backend names them. */
export type MessageField =
  | "body"
  | "title"
  | "participants"
  | "recipients"
  | "child"
  | "reply_mode"
  | "sent_at"
  | "read_status";

/**
 * Field Access for the Messages screens, in the two questions they ask.
 *
 * `shows` is whether a field may be read at all; a hidden one leaves the
 * screen with no stand-in. `writes` is whether it may be changed: with
 * `creating` it answers for a new conversation, where the server declares
 * Group or broadcast name and People in the conversation open whatever the
 * switches say; without it, for a conversation that exists, where the record's
 * own read-only list decides when it carries one.
 *
 * Pass the open conversation as `record` so a field its payload carries is
 * never treated as hidden.
 */
export function useMessageAccess(record?: object | null) {
  const access = useFieldAccess(FIELD_RESOURCE.MESSAGES, record);
  return {
    access,
    shows: (field: MessageField, creating = false) =>
      !access.isHidden(field, creating ? CREATING : undefined),
    writes: (field: MessageField, creating = false) =>
      !access.isReadOnly(field, { creating }),
  };
}
