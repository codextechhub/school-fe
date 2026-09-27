import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

// The two seams under test are pure: one component over props, one function.
// The module's store and API imports are stubbed so neither needs a running
// store to be asked what a school is told.
vi.mock("@/redux/store", () => ({ useAppSelector: () => undefined }));
vi.mock("@/redux/services/support/support-api", () => ({
  useCreateTicketMutation: () => [vi.fn(), { isLoading: false }],
  useAddTicketAttachmentMutation: () => [vi.fn(), {}],
}));
vi.mock("@/pages/protected/onboarding/use-onboarding-state", () => ({
  useOnboardingState: () => ({ state: null }),
}));

const { TicketFiledConfirmation, ticketContext } = await import(
  "./support-ticket-form"
);

const GO_LIVE_PROMISE = "opens when your school goes live";

function confirmation(failedFiles: string[] = []) {
  return renderToStaticMarkup(
    <TicketFiledConfirmation
      reference="TK-000123"
      email="bursar@coronaschool.ng"
      failedFiles={failedFiles}
      onFileAnother={() => {}}
    />,
  );
}

describe("the ticket confirmation", () => {
  it("says the school's own desk picks the ticket up, not XVS", () => {
    // Corona Secondary's bursar files a ticket about a fees report. Its first
    // reader is Ngozi, who looks after support at Corona; XVS sees it only if
    // Ngozi sends it on. Telling the bursar "XVS support will reply" has her
    // waiting on people who may never be shown the ticket.
    const html = confirmation();

    expect(html).toContain("TK-000123");
    expect(html).toContain("support team picks it up first");
    expect(html).not.toContain("XVS support will reply");
  });

  it("points at the Support screen for replies, not at an email thread", () => {
    // Nothing reads an emailed reply back onto the ticket, so an answer sent
    // from the inbox would reach nobody.
    const html = confirmation();

    expect(html).toContain("Replies appear on the ticket under Support");
    expect(html).toContain("bursar@coronaschool.ng");
    expect(html).not.toContain("straight from that email");
  });

  it("never promises a desk that opens at go-live", () => {
    // The desk is open before go-live, so the promise is wrong for every school.
    expect(confirmation()).not.toContain(GO_LIVE_PROMISE);
  });

  it("sends a failed upload to a reply on the ticket", () => {
    const html = confirmation(["error-screen.png"]);
    expect(html).toContain("error-screen.png did not upload");
    expect(html).toContain("attach it to a reply");
    expect(html).not.toContain("confirmation email");
  });
});

describe("the ticket context", () => {
  const FEES = { route_pattern: "/finance/receivables/invoices", product_area: "Finance" } as const;

  it("carries the screen whether or not the school is live", () => {
    // The screen is true in both states, and it is the routing the old blanket
    // "Onboarding" stamp was standing in for.
    for (const tenantIsPending of [true, false]) {
      expect(ticketContext({ screen: FEES, tenantIsPending })).toMatchObject({
        route_pattern: "/finance/receivables/invoices",
        product_area: "Finance",
      });
    }
  });

  it("says nothing about onboarding once the school is live", () => {
    // Otherwise a live school's fees bug arrives tagged to a setup step nobody
    // is working on, and the onboarding queue picks up a ticket that was never
    // theirs.
    expect(
      ticketContext({
        screen: FEES,
        tenantIsPending: false,
        taskKey: "ACADEMIC_STRUCTURE",
        readinessState: "LIVE",
      }),
    ).toEqual(FEES);
  });

  it("adds where they were stuck while the school is still being set up", () => {
    expect(
      ticketContext({
        screen: { route_pattern: "/onboarding", product_area: "Onboarding" },
        tenantIsPending: true,
        taskKey: "ACADEMIC_STRUCTURE",
        readinessState: "NOT_READY",
      }),
    ).toEqual({
      route_pattern: "/onboarding",
      product_area: "Onboarding",
      onboarding_task_key: "ACADEMIC_STRUCTURE",
      onboarding_readiness_state: "NOT_READY",
    });
  });

  it("lets the screen outrank the setup stamp", () => {
    // A school still onboarding, standing on Roles. Its question is about who
    // may do what, so it belongs with the people who own roles.
    expect(
      ticketContext({
        screen: { route_pattern: "/onboarding/roles", product_area: "Roles" },
        tenantIsPending: true,
        taskKey: "DEFAULT_ROLES",
      }),
    ).toMatchObject({ product_area: "Roles", onboarding_task_key: "DEFAULT_ROLES" });
  });

  it("sends no context at all rather than an empty one", () => {
    expect(ticketContext({ screen: {}, tenantIsPending: false })).toBeUndefined();
    expect(ticketContext({ screen: {}, tenantIsPending: true })).toBeUndefined();
  });

  it("omits what it does not know rather than sending empty keys", () => {
    expect(ticketContext({ screen: FEES, tenantIsPending: true })).toEqual(FEES);
  });
});
