import { toast } from "sonner";

import { getAccessToken } from "@/utils/access-token";
import { getTenantSlug } from "@/utils/tenant-context";

const baseUrl = import.meta.env.VITE_BACKEND_URL;

/** Download a finance report without moving its access token into browser storage. */
export async function downloadReportExport(
  path: string,
  params: Record<string, string | number | undefined>,
  format: "csv" | "xlsx" | "pdf",
): Promise<void> {
  const search = new URLSearchParams({ export: format });
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  if (!search.has("tenant")) {
    const slug = getTenantSlug();
    if (slug) search.set("tenant", slug);
  }

  try {
    const token = getAccessToken();
    const response = await fetch(`${baseUrl}${path}?${search.toString()}`, {
      headers: { Authorization: token ? `Bearer ${token}` : "", accept: "*/*" },
    });
    if (!response.ok) {
      toast.error(
        response.status === 403
          ? "You don't have permission to export this."
          : "Export failed. Please try again.",
      );
      return;
    }
    const blob = await response.blob();
    const disposition = response.headers.get("Content-Disposition") || "";
    const match = /filename="?([^"]+)"?/.exec(disposition);
    const filename = match?.[1] || `export.${format}`;

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  } catch {
    toast.error("Could not reach the server. Please try again.");
  }
}
