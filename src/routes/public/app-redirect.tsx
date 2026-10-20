import { useEffect } from "react";

/**
 * Loads one of the school's separate apps after a bare `/student` or `/parent`.
 *
 * Each app is served at its own path with a trailing slash (`/student/`,
 * `/parent/`) by the host's rule for `<path>/*`. A request without the slash
 * is not caught by that rule and lands here, in this app's own catch-all, so
 * this page sends it on, keeping the query and hash. The host must not hold a
 * redirect from `/<path>` to `/<path>/` of its own: it treats the two as the
 * same path, so such a rule redirects to itself without end.
 */
export default function AppRedirect({ path }: { path: "/student/" | "/parent/" }) {
  useEffect(() => {
    window.location.replace(`${path}${window.location.search}${window.location.hash}`);
  }, [path]);

  return null;
}
