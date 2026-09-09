const baseUrl = import.meta.env.VITE_BACKEND_URL;
let cachedCsrfToken = "";

function readCookie(name: string): string {
  const prefix = `${encodeURIComponent(name)}=`;
  const pair = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix));
  return pair ? decodeURIComponent(pair.slice(prefix.length)) : "";
}

export function readCsrfToken(): string {
  return readCookie("csrftoken") || cachedCsrfToken;
}

/** Ensure browser-auth mutations can send Django's double-submit CSRF token. */
export async function getCsrfToken(): Promise<string> {
  const existing = readCsrfToken();
  if (existing) return existing;

  try {
    const response = await fetch(`${baseUrl}/user/auth/csrf/`, {
      method: "GET",
      credentials: "include",
      headers: { accept: "application/json" },
    });
    if (!response.ok) return "";
    const data = await response.json() as { data?: { csrf_token?: string } };
    cachedCsrfToken = readCookie("csrftoken") || data?.data?.csrf_token || "";
  } catch {
    return "";
  }
  return readCsrfToken();
}
