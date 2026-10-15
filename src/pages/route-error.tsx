import { useEffect, useState } from "react";
import { Link, isRouteErrorResponse, useRouteError } from "react-router";
import { WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { routesPath } from "@/routes/routesPath";
import { isStaleChunkError, reloadForStaleChunk } from "@/utils/stale-chunk";
import { LoadingMark } from "@/components/custom/loading-mark";

// Router-level error boundary. Without one, any uncaught render error unmounts
// the entire app into react-router's default stack-trace screen - including in
// production. Registered as ErrorBoundary on the root route in routes/index.
export default function RouteError() {
  const error = useRouteError();
  const [online, setOnline] = useState(() => navigator.onLine);

  // A failed lazy-route chunk after a redeploy: recover with a guarded reload so
  // the user lands on the fresh build instead of an error screen. If we reloaded
  // too recently (asset genuinely gone), fall through to the screen below.
  const staleChunk = isStaleChunkError(error);
  useEffect(() => {
    const reconnect = () => {
      setOnline(true);
      if (staleChunk) window.location.reload();
    };
    const disconnect = () => setOnline(false);
    window.addEventListener("online", reconnect);
    window.addEventListener("offline", disconnect);
    if (staleChunk && navigator.onLine) reloadForStaleChunk();
    return () => {
      window.removeEventListener("online", reconnect);
      window.removeEventListener("offline", disconnect);
    };
  }, [staleChunk]);

  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : "An unexpected error occurred.";

  if (staleChunk && !online) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50 px-6 text-center">
        <div className="grid size-14 place-items-center rounded-2xl bg-white text-gray-01 shadow-sm">
          <WifiOff className="size-6" />
        </div>
        <h1 className="text-xl font-semibold text-black-01">You’re offline</h1>
        <p className="max-w-md text-sm text-gray-01">
          This page has not loaded on this device yet. We’ll retry automatically
          when your connection returns.
        </p>
      </div>
    );
  }

  if (staleChunk) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50 px-6 text-center">
        <LoadingMark />
        <p className="text-sm text-gray-01">
          A new version is available - reloading…
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50 px-6 text-center">
      <h1 className="text-xl font-semibold text-black-01">
        Something went wrong
      </h1>
      <p className="max-w-md text-sm text-gray-01">
        The page hit an unexpected error. Try reloading, or head back to the
        dashboard.
        {import.meta.env.DEV &&
          " If it keeps happening, report it with the message below."}
      </p>
      {import.meta.env.DEV && (
        <p className="max-w-md rounded-md border border-gray-200 bg-white px-3 py-2 font-mono text-xs break-all text-error-01">
          {message}
        </p>
      )}
      <div className="flex flex-wrap justify-center gap-2">
        <Button variant="white" onClick={() => window.location.reload()}>
          Reload page
        </Button>
        <Button asChild>
          <Link to={routesPath.PROTECTED.OVERVIEW.INDEX}>Go to dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
