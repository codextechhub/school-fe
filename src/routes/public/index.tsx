import { lazy } from "react";
import type { RouteObject } from "react-router";
import { routesPath } from "../routesPath";
import StudentAppRedirect from "./student-app-redirect";

/**
 * Pages reachable by somebody who has no account and never will: a parent
 * paying a fee invoice from the link in their email. They sit outside both
 * middleware gates on purpose. `Guest` would be wrong (it bounces anyone who
 * happens to have a live session, and a bursar checking a parent's link is a
 * perfectly ordinary thing to do), and `Authenticated` would be worse - it
 * would send the parent to a sign-in page for an account that does not exist.
 */
const PayInvoice = lazy(() => import("@/pages/pay"));
// Where the provider drops the payer afterwards. Public for the same reason:
// they are returning from a card form, not from a session.
const PaymentReturn = lazy(() => import("@/pages/pay/return"));

export const publicRoutes = [
  { path: "/student", Component: StudentAppRedirect },
  { path: routesPath.PUBLIC.PAY_INVOICE, Component: PayInvoice },
  { path: routesPath.PUBLIC.PAYMENT_RETURN, Component: PaymentReturn },
] as RouteObject[];
