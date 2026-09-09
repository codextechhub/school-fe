export type AuthContextGateState =
  | "redirect"
  | "loading"
  | "retry"
  | "logout"
  | "forbidden"
  | "ready";

/**
 * Decide whether tenant-scoped routes are safe to mount.
 *
 * A browser-restored session begins with a valid in-memory access token while
 * `tenant` is empty. It must wait for `/me` before any protected query runs.
 *
 * When `/me` settles without a tenant we distinguish two cases:
 *   - the request errored → likely transient (network/server): offer a retry;
 *   - the request succeeded but carried no tenant → context is gone: log out.
 */
export function getAuthContextGateState({
  shouldRedirect,
  hasTenant,
  tenantKind,
  isLoading,
  isFetching,
  isError,
}: {
  shouldRedirect: boolean;
  hasTenant: boolean;
  tenantKind?: string | null;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
}): AuthContextGateState {
  if (shouldRedirect) return "redirect";
  if (hasTenant) {
    if (tenantKind && tenantKind !== "SCHOOL") return "forbidden";
    return "ready";
  }
  if (isLoading || isFetching) return "loading";
  return isError ? "retry" : "logout";
}
