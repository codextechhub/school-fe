/**
 * Single writer for the tab favicon. The auth layout resets to the XVS mark
 * (pre-login branding); the Authenticated middleware swaps in the signed-in
 * user's school logo, falling back to the default when the school has no
 * branding upload.
 */

/** The bundled XVS logo, served from /public. */
export const DEFAULT_FAVICON = "/svg/logo-blue.svg";

const MIME_BY_EXT: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  svg: "image/svg+xml",
  ico: "image/x-icon",
  webp: "image/webp",
};

const inferType = (href: string): string | null => {
  const ext = href.split(/[?#]/)[0].split(".").pop()?.toLowerCase();
  return (ext && MIME_BY_EXT[ext]) || null;
};

/** Point the tab icon at `href`, creating the <link rel="icon"> if the
 * document doesn't have one yet. */
export function setFavicon(href: string): void {
  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }
  const type = inferType(href);
  if (type) link.type = type;
  else link.removeAttribute("type");
  link.href = href;
}

/** Restore the default XVS favicon (pre-login / no school branding). */
export function resetFavicon(): void {
  setFavicon(DEFAULT_FAVICON);
}
