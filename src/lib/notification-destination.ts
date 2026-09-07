import { matchRoutes } from "react-router";

import { onboardingWelcomeRoute } from "@/routes/protected/onboarding-routes";
import { protectedChildren } from "@/routes/protected/route-tables";

/**
 * Can this build actually open the address a notification points at?
 *
 * The server writes `action_url` for the whole platform, so a school receives
 * addresses shaped for the CodeX console as well as its own: `/team-management`
 * and `/me/security` are real screens there and nothing here. A reader must not
 * be dropped on a 404 for opening their own post, so an address this app does
 * not serve is marked read where it stands and the notification is left as the
 * message it already is.
 *
 * The question is answered by matching the router, not by a list of prefixes.
 * A prefix list is a second copy of the route table that nothing keeps in step:
 * the one this replaced admitted `/onboarding` and nothing else, so a finished
 * import announced itself and then refused to open, months after the batch
 * screen it wanted was mounted.
 *
 * A query string is dropped before matching, since `?action=new` narrows what a
 * screen does rather than which screen it is.
 */
export function canOpenNotification(actionUrl: string): boolean {
  if (!actionUrl || !actionUrl.startsWith("/")) return false;
  const path = actionUrl.split("?")[0].split("#")[0];
  return matchRoutes([onboardingWelcomeRoute, ...protectedChildren], path) !== null;
}
