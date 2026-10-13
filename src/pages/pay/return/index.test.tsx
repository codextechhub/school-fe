import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The page reads its reference from the address and its answer from the public
// status query. Both are stubbed so each outcome can be shown without a store,
// a router or a network: what is under test is what the payer is shown, and
// when the page stops asking.
const params = vi.fn();
const status = vi.fn();
const queryOptions = vi.fn();

vi.mock("react-router", () => ({ useSearchParams: () => [params()] }));
vi.mock("@/redux/services/pay/pay-api", () => ({
  useCollectionStatusQuery: (reference: string, options: Record<string, unknown>) => {
    queryOptions(reference, options);
    return status();
  },
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { default: PaymentReturn } = await import("./index");

const POLL_MS = 3000;
const THREE_MINUTES = 180_000;

const answer = (overrides: Record<string, unknown> = {}) => ({
  data: {
    data: {
      status: "CONFIRMED",
      amount: 1_250_000,
      amount_naira: "₦12,500.00",
      currency: "NGN",
      payee_name: "Corona Secondary School",
      paid_at: "2026-10-12T09:30:00Z",
      ...overrides,
    },
  },
});

describe("the payment return page", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.useFakeTimers();
    queryOptions.mockClear();
    status.mockReturnValue({ data: undefined, error: undefined });
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.useRealTimers();
  });

  async function show(query: string) {
    params.mockReturnValue(new URLSearchParams(query));
    await act(async () => root.render(<PaymentReturn />));
    return container.textContent ?? "";
  }

  const lastOptions = () => queryOptions.mock.calls.at(-1)?.[1] as Record<string, unknown>;

  // Landing here means the provider finished with the browser, not that money
  // moved. Claiming success on a redirect is how a declined card ends up
  // believed, so until the server says so the page claims nothing.
  it("never claims the payment succeeded while the server has not said so", async () => {
    status.mockReturnValue({ data: answer({ status: "PENDING", paid_at: null }).data, error: undefined });

    const text = await show("reference=CXP-1");

    expect(text).not.toMatch(/payment (was )?successful/i);
    expect(text).not.toMatch(/payment confirmed/i);
    expect(text).toContain("confirming your payment");
  });

  it("shows the reference the payer can quote", async () => {
    expect(await show("reference=CXP-12609011")).toContain("CXP-12609011");
  });

  it("accepts the provider's other reference parameter", async () => {
    expect(await show("trxref=CXP-99")).toContain("CXP-99");
    expect(queryOptions.mock.calls.at(-1)?.[0]).toBe("CXP-99");
  });

  it("asks the server about the reference it was given", async () => {
    await show("reference=CXP-5");

    expect(queryOptions.mock.calls.at(-1)?.[0]).toBe("CXP-5");
    expect(lastOptions().skip).toBe(false);
  });

  it("says who was paid, how much and when once the payment is confirmed", async () => {
    status.mockReturnValue(answer());

    const text = await show("reference=CXP-1");

    expect(text).toContain("Payment confirmed");
    expect(text).toContain("₦12,500.00");
    expect(text).toContain("Corona Secondary School");
    expect(text).toContain("2026");
    expect(text).not.toContain("confirming your payment");
  });

  it("tells a payer whose payment failed that they were not charged", async () => {
    status.mockReturnValue(answer({ status: "FAILED", paid_at: null }));

    const text = await show("reference=CXP-1");

    expect(text).toContain("This payment did not go through. You have not been charged.");
    expect(text).not.toContain("Payment confirmed");
  });

  it("says an abandoned payment was not completed", async () => {
    status.mockReturnValue(answer({ status: "ABANDONED", paid_at: null }));

    const text = await show("reference=CXP-1");

    expect(text).toContain("This payment was not completed.");
    expect(text).not.toContain("Payment confirmed");
    expect(text).not.toContain("have not been charged");
  });

  it("keeps the neutral thank-you for a reference the server does not know", async () => {
    status.mockReturnValue({ data: undefined, error: { status: 404 } });

    const text = await show("reference=CXP-old-1");

    expect(text).toContain("Thank you");
    expect(text).toContain("confirming your payment");
    expect(text).not.toContain("Payment confirmed");
  });

  it("still renders, and asks nothing, when the provider sends no reference at all", async () => {
    const text = await show("");

    expect(text).toContain("Thank you");
    expect(text).not.toContain("Payment reference");
    expect(lastOptions().skip).toBe(true);
  });

  describe("polling", () => {
    it("asks every three seconds while the payment is pending", async () => {
      status.mockReturnValue({ data: answer({ status: "PENDING", paid_at: null }).data, error: undefined });

      await show("reference=CXP-1");

      expect(lastOptions().pollingInterval).toBe(POLL_MS);
    });

    it("stops asking once the payment is confirmed", async () => {
      status.mockReturnValue(answer());

      await show("reference=CXP-1");

      expect(lastOptions().pollingInterval).toBe(0);
    });

    it.each(["FAILED", "ABANDONED"])("stops asking once the payment is %s", async (final) => {
      status.mockReturnValue(answer({ status: final, paid_at: null }));

      await show("reference=CXP-1");

      expect(lastOptions().pollingInterval).toBe(0);
    });

    it("stops asking about a reference the server does not know", async () => {
      status.mockReturnValue({ data: undefined, error: { status: 404 } });

      await show("reference=CXP-old-1");

      expect(lastOptions().pollingInterval).toBe(0);
    });

    it("keeps asking through a transient failure", async () => {
      status.mockReturnValue({ data: undefined, error: { status: 503 } });

      await show("reference=CXP-1");

      expect(lastOptions().pollingInterval).toBe(POLL_MS);
    });

    it("stops after three minutes and promises the receipt by email", async () => {
      status.mockReturnValue({ data: answer({ status: "PENDING", paid_at: null }).data, error: undefined });
      await show("reference=CXP-1");

      await act(async () => {
        vi.advanceTimersByTime(THREE_MINUTES - 1);
      });
      expect(lastOptions().pollingInterval).toBe(POLL_MS);
      expect(container.textContent).not.toContain("Still confirming");

      await act(async () => {
        vi.advanceTimersByTime(1);
      });

      expect(lastOptions().pollingInterval).toBe(0);
      expect(container.textContent).toContain(
        "Still confirming: your receipt will be emailed when it clears",
      );
    });

    it("lets a late answer win over the three-minute promise", async () => {
      status.mockReturnValue({ data: answer({ status: "PENDING", paid_at: null }).data, error: undefined });
      await show("reference=CXP-1");
      await act(async () => {
        vi.advanceTimersByTime(THREE_MINUTES);
      });

      status.mockReturnValue(answer());
      await act(async () => root.render(<PaymentReturn />));

      expect(container.textContent).toContain("Payment confirmed");
      expect(container.textContent).not.toContain("Still confirming");
    });
  });
});
