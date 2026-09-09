import { appendTenantQuery } from "./tenant-context";
import { apiErrorMessage } from "./api-errors";
import { getAccessToken } from "./access-token";

/**
 * Two things make an attachment URL not directly openable in an <a href>:
 *
 * 1. `core.views.MediaView` authenticates the caller, so a plain navigation arrives
 *    with no Authorization header and gets a 401. We have to fetch it ourselves and
 *    hand the browser a blob.
 * 2. The API base ends in /v1, but MEDIA_URL is mounted at the host root, so the
 *    stored `/media/<name>` path must be resolved against the origin rather than
 *    appended to the API prefix.
 *
 * The stored name is a capability URL: unguessable, and only ever handed to a caller
 * already allowed to read the owning document. That is what authorises the read; the
 * media endpoint itself can only tell that you are logged in.
 */

const apiBase = import.meta.env.VITE_BACKEND_URL || "";

/** Strip a trailing /v1 (or /v2, …) so a root-mounted path resolves correctly. */
export function mediaOrigin(base: string = apiBase): string {
  return base.replace(/\/$/, "").replace(/\/v\d+$/, "");
}

export function buildAttachmentUrl(storedUrl: string, base: string = apiBase): string {
  if (/^https?:\/\//i.test(storedUrl)) return storedUrl;  // already absolute
  const path = storedUrl.startsWith("/") ? storedUrl : `/${storedUrl}`;
  return `${mediaOrigin(base)}${path}`;
}

/**
 * Fetch an attachment with the caller's token and open it in a new tab.
 *
 * The tab is opened synchronously inside the click gesture; opening it after the
 * await would look non-user-initiated to a popup blocker and be swallowed.
 */
export async function openAttachment(storedUrl: string, filename: string) {
  const win = window.open("", "_blank");
  if (!win) throw new Error("Allow pop-ups for this site to open the file.");
  try {
    const token = getAccessToken();
    const response = await fetch(buildAttachmentUrl(storedUrl), {
      headers: token && token !== "undefined" ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) {
      throw new Error(
        response.status === 404
          ? "That file is no longer available."
          : "Could not open the file.",
      );
    }
    const url = URL.createObjectURL(await response.blob());
    win.location.href = url;
    // Long enough for the tab to load it; the browser holds its own reference after.
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (error) {
    win.close();  // don't leave a blank tab behind on failure
    throw error;
  }
  return filename;
}

/**
 * Fetch a file the backend will only hand to an authorised caller, and save it.
 *
 * Distinct from openAttachment above, which resolves a capability URL under
 * `/media/` and shows the file in a tab. This one takes a route the API itself
 * published (`download_url`), which re-asks the permission question on every
 * call and therefore needs both the bearer token and the tenant assertion every
 * other authenticated route takes. A CSV is also something you keep rather than
 * read in a tab, so it is saved rather than opened.
 *
 * Rejects with the backend's own words when it refuses: not-ready, expired and
 * not-yours all come back as an error envelope this can read.
 */
export async function downloadAuthorisedFile(path: string, filename: string): Promise<void> {
  const token = getAccessToken();
  const response = await fetch(appendTenantQuery(buildAttachmentUrl(path)), {
    headers: token && token !== "undefined" ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(apiErrorMessage(body, "That file could not be downloaded."));
  }

  const url = URL.createObjectURL(await response.blob());
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
