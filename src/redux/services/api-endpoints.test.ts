import { describe, expect, it } from "vitest";
import {
  AUTH_ENDPOINTS,
  IMPERSONATION_ENDPOINTS,
  TENANT_EXEMPT_ENDPOINTS,
  blockedDuringIdentitySwap,
  sendsImpersonationHeader,
} from "./api-endpoints";

describe("sendsImpersonationHeader", () => {
  it("sends the proxy header on ordinary data endpoints", () => {
    expect(sendsImpersonationHeader("getStudents")).toBe(true);
    expect(sendsImpersonationHeader("getClasses")).toBe(true);
  });

  // The whole point of proxying: /me must resolve as the TARGET so the client
  // can learn who it is now acting as.
  it("sends the proxy header on /me", () => {
    expect(sendsImpersonationHeader("getMe")).toBe(true);
  });

  it("never sends it on the unauthenticated auth endpoints", () => {
    for (const endpoint of AUTH_ENDPOINTS) {
      expect(sendsImpersonationHeader(endpoint)).toBe(false);
    }
  });

  // Logout revokes the ACTOR's token pair, so it must run as the actor.
  it("never sends it on logout", () => {
    expect(sendsImpersonationHeader("logout")).toBe(false);
  });

  // Riding the header into these would let a proxy start another proxy.
  it("never sends it on the impersonation management endpoints", () => {
    for (const endpoint of IMPERSONATION_ENDPOINTS) {
      expect(sendsImpersonationHeader(endpoint)).toBe(false);
    }
  });
});

describe("blockedDuringIdentitySwap", () => {
  it("blocks ordinary data endpoints fired by the outgoing identity", () => {
    expect(blockedDuringIdentitySwap("getStudents")).toBe(true);
    expect(blockedDuringIdentitySwap("getBranches")).toBe(true);
  });

  it("lets the swap's own /me hydration through", () => {
    expect(blockedDuringIdentitySwap("getMe")).toBe(false);
  });

  it("lets the endpoints that drive the swap through", () => {
    for (const endpoint of IMPERSONATION_ENDPOINTS) {
      expect(blockedDuringIdentitySwap(endpoint)).toBe(false);
    }
  });

  it("never blocks auth endpoints or logout", () => {
    expect(blockedDuringIdentitySwap("login")).toBe(false);
    expect(blockedDuringIdentitySwap("logout")).toBe(false);
  });
});

describe("endpoint set invariants", () => {
  it("keeps every auth endpoint tenant-exempt", () => {
    for (const endpoint of AUTH_ENDPOINTS) {
      expect(TENANT_EXEMPT_ENDPOINTS.has(endpoint)).toBe(true);
    }
  });

  // A management endpoint that was also header-exempt would be double-counted
  // and the two rules could silently drift apart.
  it("keeps the impersonation management set disjoint from the header-exempt set", () => {
    for (const endpoint of IMPERSONATION_ENDPOINTS) {
      expect(AUTH_ENDPOINTS.has(endpoint)).toBe(false);
    }
  });
});

// The public invoice pay routes. A parent opening the link in their email has
// no account, but they may well open it on a device where somebody IS signed
// in - a bursar checking a link a parent says is broken, or a shared family
// laptop. Either would send that person's Bearer token and tenant to a route
// that takes neither, so the page would behave differently depending on who
// last used the browser.
describe("public invoice pay endpoints", () => {
  const PAY_ENDPOINTS = ["invoicePaySummary", "startInvoiceCheckout", "collectionStatus"];

  it("never carries a Bearer token", () => {
    for (const endpoint of PAY_ENDPOINTS) {
      expect(AUTH_ENDPOINTS.has(endpoint)).toBe(true);
    }
  });

  it("never carries a ?tenant= assertion", () => {
    for (const endpoint of PAY_ENDPOINTS) {
      expect(TENANT_EXEMPT_ENDPOINTS.has(endpoint)).toBe(true);
    }
  });

  it("never rides an impersonation session", () => {
    for (const endpoint of PAY_ENDPOINTS) {
      expect(sendsImpersonationHeader(endpoint)).toBe(false);
    }
  });
});
