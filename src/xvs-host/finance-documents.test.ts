import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { clearAccessToken, setAccessToken } from "@/utils/access-token";
import { openInvoiceDocument, openPaymentReceipt } from "./finance-documents";

const makeWin = () => {
  const handlers: Record<string, () => void> = {};
  return {
    location: { href: "" },
    focus: vi.fn(),
    print: vi.fn(),
    close: vi.fn(),
    addEventListener: vi.fn((event: string, callback: () => void) => {
      handlers[event] = callback;
    }),
    fire: (event: string) => handlers[event]?.(),
  };
};

const htmlResponse = () =>
  new Response("<html>doc</html>", {
    status: 200,
    headers: { "Content-Type": "text/html" },
  });

beforeEach(() => {
  setAccessToken("test-token");
  URL.createObjectURL = vi.fn(() => "blob:mock-url");
  URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  clearAccessToken();
  vi.restoreAllMocks();
});

describe("school finance documents", () => {
  it("uses the in-memory token for an invoice document", async () => {
    const win = makeWin();
    vi.spyOn(window, "open").mockReturnValue(win as unknown as Window);
    const fetchMock = vi.fn().mockResolvedValue(htmlResponse());
    vi.stubGlobal("fetch", fetchMock);

    await openInvoiceDocument(13, "CODEX");

    const [calledUrl, init] = fetchMock.mock.calls[0];
    expect(calledUrl).toBe("http://test.local/v1/finance/invoices/13/document/?entity=CODEX");
    expect(calledUrl).not.toContain(".pdf");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer test-token");
  });

  it("uses the receipt HTML endpoint", async () => {
    const win = makeWin();
    vi.spyOn(window, "open").mockReturnValue(win as unknown as Window);
    const fetchMock = vi.fn().mockResolvedValue(htmlResponse());
    vi.stubGlobal("fetch", fetchMock);

    await openPaymentReceipt(9, "CODEX");

    expect(fetchMock.mock.calls[0][0]).toBe(
      "http://test.local/v1/finance/payments/9/receipt/?entity=CODEX",
    );
    expect(fetchMock.mock.calls[0][0]).not.toContain(".pdf");
  });

  it("opens the tab before fetching", async () => {
    const win = makeWin();
    const openSpy = vi.spyOn(window, "open").mockReturnValue(win as unknown as Window);
    let opened = false;
    vi.stubGlobal("fetch", vi.fn(() => {
      opened = openSpy.mock.calls.length > 0;
      return Promise.resolve(htmlResponse());
    }));

    await openInvoiceDocument(13, "CODEX");

    expect(openSpy).toHaveBeenCalledWith("", "_blank");
    expect(opened).toBe(true);
  });

  it("prints after the document tab loads", async () => {
    const win = makeWin();
    vi.spyOn(window, "open").mockReturnValue(win as unknown as Window);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(htmlResponse()));

    await openInvoiceDocument(13, "CODEX");
    expect(win.location.href).toBe("blob:mock-url");

    win.fire("load");
    expect(win.focus).toHaveBeenCalled();
    expect(win.print).toHaveBeenCalled();
  });

  it("closes the tab and reports a backend error", async () => {
    const win = makeWin();
    vi.spyOn(window, "open").mockReturnValue(win as unknown as Window);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ detail: "Invoice not found for this entity." }), {
        status: 404,
      }),
    ));

    await expect(openInvoiceDocument(999, "CODEX")).rejects.toThrow(
      "Invoice not found for this entity.",
    );
    expect(win.close).toHaveBeenCalled();
  });

  it("does not fetch when the popup is blocked", async () => {
    vi.spyOn(window, "open").mockReturnValue(null);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(openPaymentReceipt(9, "CODEX")).rejects.toThrow(/pop-ups/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
