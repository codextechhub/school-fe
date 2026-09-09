/**
 * Endpoint classification for the base query.
 *
 * `prepareHeaders` and the base-query wrapper only ever see the RTK Query
 * endpoint *name* - never the final URL - so every "does this request get X?"
 * rule has to be expressed as a name set. They live here (rather than inline in
 * base-api.ts) so the rules are a single source of truth and can be unit tested
 * without pulling the whole store/api graph into the test.
 *
 * Adding an endpoint to an api slice? If it is unauthenticated, self-scoped, or
 * must always act as the *original* signed-in user, register it below.
 */

// Endpoints that must never carry a (possibly stale) Bearer token. Sending one
// to the login/activation/reset routes makes the backend treat the request as
// already-authenticated, which can surface as a 500.
export const AUTH_ENDPOINTS = new Set([
  "login",
  "forgotPassword",
  "passwordResetPreview",
  "passwordResetConfirm",
  "activationPreview",
  "activateAccount",
  "logout",
  // Paying an invoice from its email link. The payer holds no account, and the
  // signed token in the path is their whole authority. A Bearer token left over
  // from a staff session on the same browser must not ride along: the backend
  // route takes no authentication at all, and sending one would only mean the
  // page behaves differently on a colleague's laptop than on a parent's phone.
  "invoicePaySummary",
  "startInvoiceCheckout",
]);

// Endpoints that operate purely on the caller and therefore must NOT carry the
// mandatory ?tenant= assertion (the backend 400s if one is sent). Union of the
// unauthenticated auth routes plus the self-service /me family and logout.
export const TENANT_EXEMPT_ENDPOINTS = new Set([
  ...AUTH_ENDPOINTS,
  "getMe",
  "getMySecurityStats",
  "getMyPasswordResets",
  "changeMyPassword",
]);

/**
 * The impersonation management endpoints themselves. They are authorised as the
 * ORIGINAL actor (starting/ending/listing proxy sessions), never as the proxied
 * target - riding them with the session header would either 403 (the target
 * rarely holds school.impersonation.*) or, worse, allow proxy chaining.
 */
export const IMPERSONATION_ENDPOINTS = new Set([
  "getProxyTargets",
  "startProxySession",
  "endProxySession",
  "getProxySessions",
]);

/**
 * Requests that must always run as the token owner regardless of an active
 * proxy session: the unauthenticated auth routes and logout (which revokes the
 * ACTOR's token pair). `/me` is intentionally absent - while proxying it must
 * return the *target's* identity, which is exactly how the client learns who it
 * is now acting as.
 */
export const IMPERSONATION_HEADER_EXEMPT_ENDPOINTS = new Set([
  ...AUTH_ENDPOINTS,
  "logout",
]);

/** True when `X-Impersonation-Session` belongs on this endpoint's request. */
export const sendsImpersonationHeader = (endpoint: string): boolean =>
  !IMPERSONATION_HEADER_EXEMPT_ENDPOINTS.has(endpoint) &&
  !IMPERSONATION_ENDPOINTS.has(endpoint);

/**
 * True when a request fired mid identity-swap must be short-circuited.
 *
 * `getMe` is the swap's own hydration call and the impersonation/auth endpoints
 * drive the swap itself - they must always reach the network. Everything else
 * belongs to the identity that is being torn down.
 */
export const blockedDuringIdentitySwap = (endpoint: string): boolean =>
  endpoint !== "getMe" &&
  !IMPERSONATION_ENDPOINTS.has(endpoint) &&
  !IMPERSONATION_HEADER_EXEMPT_ENDPOINTS.has(endpoint);
