import { useNavigate } from "react-router";
import { CheckCheck, Loader2, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { svgIcons } from "@/assets/svg";
import { useNotifications } from "@/hooks/use-notifications";
import { canOpenNotification } from "@/lib/notification-destination";
import { NotificationEventIcon } from "@/components/custom/notification-event-icon";
import {
  useMarkAllNotificationsReadMutation,
  useMarkNotificationsReadMutation,
} from "@/redux/services/notifications/notifications-api";
import { routesPath } from "@/routes/routesPath";
import { formatRelativeDate } from "@/utils/relative-date";

/**
 * The header bell and its tray, in console's shape.
 *
 * Every endpoint behind it is open to a school that has not gone live, so this
 * works during onboarding - which is when a school gets most of its post
 * (a step verified, a go-live decision, a reply on a ticket).
 *
 * One deliberate departure from console's version: an item whose `action_url`
 * names a screen this app does not serve is marked read where it stands rather
 * than navigated to. The notification IS the message, and a school should not
 * be dropped on a 404 for reading its own post. What this app serves is decided
 * by matching the router - see canOpenNotification.
 */
export function NotificationsBell() {
  const navigate = useNavigate();
  const { items, count } = useNotifications();
  const [markRead, { isLoading: markingOne }] =
    useMarkNotificationsReadMutation();
  const [markAll, { isLoading: markingAll }] =
    useMarkAllNotificationsReadMutation();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={count > 0 ? `Notifications, ${count} unread` : "Notifications"}
          className="relative size-8.5 rounded-full bg-gray-04 grid place-content-center text-gray-01 hover:bg-gray-03"
        >
          {svgIcons.notificationBell}
          {count > 0 && (
            <span className="absolute -top-0.5 -right-0.5 grid h-4.5 min-w-4.5 place-content-center rounded-full bg-error px-1 font-mont text-[10px] font-semibold text-white">
              {count > 99 ? "99+" : count}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-95 max-w-[calc(100vw-2rem)] p-0"
      >
        <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold font-mont text-black-01">
              Notifications
            </p>
            <p className="text-xs text-gray-06">Your latest updates</p>
          </div>
          {count > 0 && (
            <div className="flex items-center gap-2 shrink-0">
              <span className="rounded-full bg-pry-01 px-2 py-1 text-xs font-medium text-primary">
                {count} unread
              </span>
              <button
                type="button"
                disabled={markingAll}
                onClick={() => markAll()}
                className="inline-flex items-center gap-1 rounded px-1.5 py-1 text-xs font-medium text-gray-01 hover:bg-gray-04 hover:text-black-01 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {markingAll ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <CheckCheck className="size-3.5" />
                )}
                Clear all
              </button>
            </div>
          )}
        </div>

        {!items.length ? (
          <div className="py-10 text-center">
            <CheckCheck className="mx-auto size-6 text-green-01" />
            <p className="mt-2 text-sm font-medium text-black-01">
              You are all caught up
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border max-h-96 overflow-y-auto">
            {items.map((item) => (
              <li key={item.id} className="group relative">
                <button
                  type="button"
                  onClick={() => {
                    // Fire-and-forget: navigation should not wait on the
                    // mark-read round trip.
                    markRead({ ids: [item.id] });
                    if (canOpenNotification(item.action_url)) navigate(item.action_url);
                  }}
                  className="flex w-full gap-3 px-4 py-3 pr-12 text-left hover:bg-gray-03"
                >
                  <span className="mt-0.5 grid size-8 shrink-0 place-content-center rounded-full bg-pry-01 text-primary">
                    <NotificationEventIcon
                      eventKey={item.event_type_key}
                      className="size-4"
                    />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-black-01">
                      {item.subject}
                    </span>
                    <span className="mt-0.5 line-clamp-2 block text-xs text-gray-01">
                      {item.body}
                    </span>
                    <span className="mt-1 block text-[10px] text-gray-05">
                      {item.event_type_label} · {formatRelativeDate(item.created_at)}
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  aria-label={`Clear ${item.subject}`}
                  title="Clear notification"
                  disabled={markingOne}
                  onClick={() => markRead({ ids: [item.id] })}
                  className="absolute right-3 top-3 grid size-6 place-content-center rounded-full bg-gray-04 text-gray-05 transition hover:bg-gray-03 hover:text-black-01 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-40 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                >
                  <X className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <button
          type="button"
          onClick={() => navigate(routesPath.PROTECTED.NOTIFICATIONS)}
          className="w-full border-t border-border px-4 py-3 text-center text-xs font-semibold text-primary hover:bg-gray-03"
        >
          View all notifications
        </button>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
