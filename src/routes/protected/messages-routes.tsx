import { lazy } from "react";
import { type RouteObject } from "react-router";
import { routesPath } from "../routesPath";
import type { DashboardHandle } from "@/components/layout/dashboard-layout";

const Messages = lazy(() => import("@/pages/protected/messages"));
const MessageOversight = lazy(() => import("@/pages/protected/messages/oversight"));

const M = routesPath.PROTECTED.MESSAGES;

/**
 * Staff conversations: the inbox with the open conversation beside it, and the
 * read-only oversight screens for leaders.
 *
 * `/messages/:id` is a child of `/messages` rather than a second route to the
 * same screen, so moving from the list to a conversation keeps the page, its
 * filters and its scroll instead of mounting it again. The same holds for
 * oversight. Closed to a school that has not gone live, because a school still
 * being set up has nobody to message.
 */
export const messagesRoutes = [
  {
    path: M.INDEX,
    Component: Messages,
    handle: { title: "Messages" } satisfies DashboardHandle,
    children: [{ path: ":id" }],
  },
  {
    path: M.OVERSIGHT,
    Component: MessageOversight,
    handle: { title: "Message oversight" } satisfies DashboardHandle,
    children: [{ path: ":id" }],
  },
] as RouteObject[];
