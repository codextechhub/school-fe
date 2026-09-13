import { useEffect } from "react";
import { useLocation } from "react-router";

import { useAcknowledgeNotificationRouteMutation } from "@/redux/services/notifications/notifications-api";

/**
 * Tell the backend which route the reader opened, so the notification about
 * that record clears itself.
 *
 * A notification otherwise only goes when somebody clicks it in the tray or
 * clears the lot, which leaves a reader who opened the export run from a link
 * in their email still looking at a bell that says one unread.
 *
 * Keyed on the pathname alone. A search parameter moving (a filter, a tab, a
 * page number) is the same record seen differently and acknowledges nothing
 * new. What a path means is the backend's decision: one naming a single record
 * clears the rows pointing at it, a module list clears nothing, and most
 * navigations are the second kind.
 *
 * Mounted by the protected shell, which is what keeps it off the public
 * payment and auth screens: a visitor paying an invoice from an emailed link
 * has no inbox to acknowledge.
 */
export function useRouteAcknowledgement() {
  const { pathname } = useLocation();
  const [acknowledgeNotificationRoute] =
    useAcknowledgeNotificationRouteMutation();

  useEffect(() => {
    void acknowledgeNotificationRoute({ path: pathname });
  }, [acknowledgeNotificationRoute, pathname]);
}
