import { useFieldAccess } from "@/components/finance-ui";
import { FIELD_RESOURCE } from "@/lib/field-resources";
import {
  UNREAD_POLL_MS,
  useGetUnreadCountQuery,
} from "@/redux/services/messages/messages-api";

/**
 * How many messages are waiting for the signed-in person, for the sidebar badge.
 *
 * Polled every minute while the tab is in front and refreshed when it regains
 * focus, so the badge catches up with what arrived while the reader was
 * elsewhere. The count is Read status in Field Access: where a role may not
 * read it the request is not made at all, and the badge stays absent rather
 * than showing zero. `enabled` is false for a reader without the inbox key and
 * for a school that has not gone live.
 */
export function useMessageUnread(enabled: boolean): number {
  const access = useFieldAccess(FIELD_RESOURCE.MESSAGES);
  const skip = !enabled || access.isHidden("read_status");
  const query = useGetUnreadCountQuery(undefined, {
    skip,
    pollingInterval: UNREAD_POLL_MS,
    skipPollingIfUnfocused: true,
    refetchOnFocus: true,
  });
  if (skip) return 0;
  const total = query.data?.data?.total;
  return typeof total === "number" && total > 0 ? total : 0;
}
