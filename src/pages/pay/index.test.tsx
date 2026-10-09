import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

// The page reads its token from the route and its data from RTK Query. Both are
// stubbed so the three states can be rendered without a store or a router: what
// is under test is what the payer is shown, not how the data arrived.
const summary = vi.fn();
const startCheckout = vi.fn(() => ({ unwrap: () => Promise.resolve({}) }));

vi.mock("react-router", () => ({ useParams: () => ({ token: "tok" }) }));
vi.mock("@/redux/services/pay/pay-api", () => ({
  useInvoicePaySummaryQuery: () => summary(),
  useStartInvoiceCheckoutMutation: () => [startCheckout, { isLoading: false }],
}));

const { default: PayInvoice } = await import("./index");

const PAYABLE = {
  issuer_name: "Corona Secondary School",
  logo_url: "",
  issuer_is_platform: false,
  customer_name: "Tunde Adeyemi",
  invoice_number: "CFX-INV-0001",
  invoice_date: "2026-09-05",
  due_date: "2026-09-30",
  currency: "NGN",
  total: "₦1,800.00",
  amount_due: "₦800.00",
  amount_due_kobo: 80000,
  payable: true,
  message: "",
};

function render(state: Record<string, unknown>) {
  summary.mockReturnValue(state);
  return renderToStaticMarkup(<PayInvoice />);
}

describe("the invoice pay page", () => {
  it("shows what is outstanding now, not the invoice total", () => {
    // The whole reason this page exists. The invoice was raised for ₦1,800 and
    // ₦1,000 has since been paid by transfer; the button must ask for ₦800.
    const html = render({ data: { data: PAYABLE }, isLoading: false, isError: false });

    expect(html).toContain("₦800.00");
    expect(html).toContain("Pay ₦800.00");
    expect(html).toContain("Corona Secondary School");
    expect(html).toContain("CFX-INV-0001");
  });

  it("heads a school's invoice with the school, not with XVS", () => {
    // The parent is paying Corona, and Corona's name is why they trust the
    // page. Stamping the product mark over it would be the wrong brand.
    const html = render({ data: { data: PAYABLE }, isLoading: false, isError: false });

    expect(html).toContain("Corona Secondary School");
    expect(html).not.toContain("/svg/logo-blue.svg");
  });

  it("heads a CodeX invoice with the XVS mark", () => {
    const html = render({
      data: { data: { ...PAYABLE, issuer_name: "CodeX", issuer_is_platform: true } },
      isLoading: false,
      isError: false,
    });

    expect(html).toContain("/svg/logo-blue.svg");
    expect(html).not.toContain("CodeX");
  });

  it("does not list payment methods the provider owns", () => {
    const html = render({ data: { data: PAYABLE }, isLoading: false, isError: false });

    expect(html).not.toContain("USSD");
    expect(html).not.toContain("bank transfer");
  });

  it("does not offer to charge an invoice that cannot be paid", () => {
    const html = render({
      data: {
        data: {
          ...PAYABLE,
          amount_due: "₦0.00",
          amount_due_kobo: 0,
          payable: false,
          message: "This invoice has been paid in full. Thank you.",
        },
      },
      isLoading: false,
      isError: false,
    });

    expect(html).toContain("paid in full");
    expect(html).not.toContain("Pay ₦");
    expect(html).not.toContain("<button");
  });

  it("heads with the school's own crest when it has one", () => {
    // The badge is why a parent believes the page enough to put a card in it.
    const html = render({
      data: { data: { ...PAYABLE, logo_url: "https://api.test/logo/" } },
      isLoading: false,
      isError: false,
    });

    expect(html).toContain('src="https://api.test/logo/"');
    expect(html).toContain('alt="Corona Secondary School"');
  });

  it("names the school in words when it has no crest", () => {
    // An unnamed page asking for money is one nobody should pay.
    const html = render({ data: { data: PAYABLE }, isLoading: false, isError: false });

    expect(html).toContain("Corona Secondary School");
    expect(html).not.toContain("<img");
  });

  it("heads with the XVS mark only when the platform is the one billing", () => {
    const html = render({
      data: { data: { ...PAYABLE, issuer_is_platform: true, issuer_name: "CodeX" } },
      isLoading: false,
      isError: false,
    });

    expect(html).toContain('alt="XVS"');
    expect(html).not.toContain("CodeX");
  });

  it("says nothing about the invoice when the link is not valid", () => {
    // A forged token must not be answerable: no issuer, no customer, no amount.
    const html = render({ data: undefined, isLoading: false, isError: true });

    expect(html).toContain("not valid");
    expect(html).not.toContain("Corona Secondary School");
    expect(html).not.toContain("Tunde Adeyemi");
    expect(html).not.toContain("₦");
  });

  it("shows a loader rather than an empty card while it is fetching", () => {
    const html = render({ data: undefined, isLoading: true, isError: false });

    expect(html).toContain("animate-spin");
    expect(html).not.toContain("not valid");
  });
});
