/** Both role directories open the same pages while keeping their own back path. */
export const roleBasePath = (pathname: string) =>
  pathname.startsWith("/onboarding/") ? "/onboarding/roles" : "/roles";

export const roleDetailPath = (base: string, key: string) =>
  `${base}/${encodeURIComponent(key)}`;
