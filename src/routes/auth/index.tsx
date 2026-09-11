import { lazy } from "react";
import { Navigate, type RouteObject } from "react-router";
import { routesPath } from "../routesPath";
import Guest from "@/middleware/guest";

const AuthLayout = lazy(() => import("@/components/layout/auth-layout"));
const Login = lazy(() => import("@/pages/auth/login"));
const ResetPassword = lazy(() => import("@/pages/auth/reset-password"));
const ForgotPassword = lazy(() => import("@/pages/auth/forgot-password"));
const ActivateAccount = lazy(() => import("@/pages/auth/activate"));

export const authRoutes = [
  {
    path: routesPath.AUTH.ACCOUNTS,
    Component: AuthLayout,
    children: [
      // Sign-in page: an already-authenticated user is bounced to the app, so
      // /accounts can't be reopened (e.g. via Back) once signed in.
      {
        Component: Guest,
        children: [{ index: true, Component: Login }],
      },
      // Email-link / out-of-band flows stay reachable even with a live session.
      { path: "forgot-password", Component: ForgotPassword },
      { path: "reset-password/:activation_key", Component: ResetPassword },
      { path: "activate/:activation_key", Component: ActivateAccount },
    ],
  },
  // Legacy /login → /accounts, and bare "/" → /accounts.
  { path: "/login", element: <Navigate to={routesPath.AUTH.ACCOUNTS} replace /> },
  { path: "/", element: <Navigate to={routesPath.AUTH.ACCOUNTS} replace /> },
] as RouteObject[];
