/**
 * Whether an address falls under a route pattern: same number of segments,
 * each literal segment equal, each `:param` segment matching anything. The
 * query string and fragment are ignored, and so is a trailing slash.
 *
 * Kept on its own, with no imports, so the walkthrough engine can use it
 * without pulling the guide registry into every dialog and drawer.
 */
const cleanPath = (value: string) => {
  const pathname = value.split(/[?#]/, 1)[0] || "/";
  return pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
};

export const routeSegments = (value: string) => cleanPath(value).split("/").filter(Boolean);

export function routePatternMatches(pattern: string, pathname: string): boolean {
  const patternSegments = routeSegments(pattern);
  const pathSegments = routeSegments(pathname);
  return patternSegments.length === pathSegments.length && patternSegments.every(
    (segment, index) => segment.startsWith(":") || segment === pathSegments[index],
  );
}
