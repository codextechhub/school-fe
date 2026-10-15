import { Suspense } from "react";
import { Outlet } from "react-router";

import { RouteProgress } from "@/components/layout/route-progress";
import { LoadingMark } from "@/components/custom/loading-mark";

// Single Suspense boundary for all lazily-loaded route chunks. Kept eager
// (like RouteError and the Authenticated gate) so the shell that handles
// loading can never itself fail to load.
export default function LazyRoot() {
  return (
    <>
      {/* Mounted at the root of the router, above every route, so a navigation
          never unmounts the bar that is reporting on it. */}
      <RouteProgress />
      <Suspense
        fallback={
          <div className="flex h-screen items-center justify-center px-4">
            <LoadingMark />
          </div>
        }
      >
        <Outlet />
      </Suspense>
    </>
  );
}
