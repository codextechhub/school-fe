import { getAccessToken } from "@/utils/access-token";
import { getTenantSlug } from "@/utils/tenant-context";

const baseUrl = import.meta.env.VITE_BACKEND_URL || "";

function buildUrl(path: string, params: Record<string, string | number | undefined>) {
  const withTenant = { ...params };
  if (withTenant.tenant == null || withTenant.tenant === "") {
    const slug = getTenantSlug();
    if (slug) withTenant.tenant = slug;
  }
  const query = Object.entries(withTenant)
    .filter(([, value]) => value !== undefined && value !== "")
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join("&");
  const cleanBase = baseUrl.replace(/\/$/, "");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${cleanBase}${cleanPath}${query ? `?${query}` : ""}`;
}

/** Fetch and open a print document with the tab's in-memory access token. */
async function openPrintableDocument(
  path: string,
  params: Record<string, string | number | undefined>,
) {
  const win = window.open("", "_blank");
  if (!win) throw new Error("Allow pop-ups for this site to open the document.");
  try {
    const token = getAccessToken();
    const response = await fetch(buildUrl(path, params), {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) {
      let message = "Could not open the document.";
      try {
        const data = await response.json();
        message = data?.detail || data?.message || message;
      } catch {
        // Keep the generic message for a non-JSON response.
      }
      throw new Error(message);
    }

    const url = URL.createObjectURL(await response.blob());
    win.addEventListener("load", () => { win.focus(); win.print(); }, { once: true });
    win.location.href = url;
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (error) {
    win.close();
    throw error;
  }
}

export const openInvoiceDocument = (id: number, entity: string) =>
  openPrintableDocument(`/finance/invoices/${id}/document/`, { entity });

export const openPaymentReceipt = (id: number, entity: string) =>
  openPrintableDocument(`/finance/payments/${id}/receipt/`, { entity });
