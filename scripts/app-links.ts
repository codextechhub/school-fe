/**
 * The two files that let a phone open XVS links in the store apps instead of the
 * browser: Android's `assetlinks.json` and iPhone's `apple-app-site-association`.
 *
 * Both are generated at build time from environment variables, because the
 * values they carry (the signing certificate fingerprints and CodeX's Apple Team
 * ID) belong to the stores and are not committed. A file is produced only when
 * its inputs are set, so a build with none of them publishes neither file.
 *
 * Input that would make a store reject the file (a malformed fingerprint, Team
 * ID or application id) throws, so a build fails loudly rather than publishing a
 * file that silently never verifies.
 *
 * This module is pure and has no dependency on Vite; `vite.config.ts` writes its
 * output into `dist/.well-known/`.
 */

export const DEFAULT_PARENT_APP_ID = "com.codexng.xvs.parent";
export const DEFAULT_STUDENT_APP_ID = "com.codexng.xvs.student";

/** Path the parent web app is served from on every school host. */
export const PARENT_PATH = "/parent/*";
/** Path the student web app is served from on every school host. */
export const STUDENT_PATH = "/student/*";

export interface AppLinksConfig {
  /** Android application id and iOS bundle id of XVS Parent. */
  parentAppId: string;
  /** Android application id and iOS bundle id of XVS Student. */
  studentAppId: string;
  /** SHA-256 signing certificate fingerprints of XVS Parent. Empty means no Android parent statement. */
  parentSha256: string[];
  /** SHA-256 signing certificate fingerprints of XVS Student. */
  studentSha256: string[];
  /** CodeX's Apple Team ID. Empty or absent means no iOS file. */
  appleTeamId?: string;
}

const FINGERPRINT = /^[0-9A-F]{2}(:[0-9A-F]{2}){31}$/;
const TEAM_ID = /^[0-9A-Z]{10}$/;
const APP_ID = /^[A-Za-z][A-Za-z0-9_]*(\.[A-Za-z][A-Za-z0-9_]*)+$/;

/** Returns the fingerprint in uppercase, or throws naming the variable it came from. */
export function normaliseFingerprint(value: string, label: string): string {
  const fingerprint = value.trim().toUpperCase();
  if (!FINGERPRINT.test(fingerprint)) {
    throw new Error(
      `${label}: "${value}" is not a SHA-256 fingerprint. Expected 32 colon-separated hex pairs, ` +
        "for example AB:CD:...:EF (64 hex digits).",
    );
  }
  return fingerprint;
}

export function validateTeamId(value: string, label = "APP_LINK_APPLE_TEAM_ID"): string {
  if (!TEAM_ID.test(value)) {
    throw new Error(
      `${label}: "${value}" is not an Apple Team ID. Expected 10 uppercase letters or digits.`,
    );
  }
  return value;
}

export function validateAppId(value: string, label: string): string {
  if (!APP_ID.test(value)) {
    throw new Error(`${label}: "${value}" is not a reverse-domain app id, for example com.example.app.`);
  }
  return value;
}

function checkedFingerprints(values: string[], label: string): string[] {
  const unique = new Set(values.map((value) => normaliseFingerprint(value, label)));
  return [...unique];
}

/** Validates a config and returns it with fingerprints normalised to uppercase. */
export function normaliseConfig(config: AppLinksConfig): Required<AppLinksConfig> {
  return {
    parentAppId: validateAppId(config.parentAppId, "APP_LINK_PARENT_APP_ID"),
    studentAppId: validateAppId(config.studentAppId, "APP_LINK_STUDENT_APP_ID"),
    parentSha256: checkedFingerprints(config.parentSha256, "APP_LINK_ANDROID_PARENT_SHA256"),
    studentSha256: checkedFingerprints(config.studentSha256, "APP_LINK_ANDROID_STUDENT_SHA256"),
    appleTeamId: config.appleTeamId ? validateTeamId(config.appleTeamId) : "",
  };
}

function splitList(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

/** Reads the build environment into a config. Blank variables count as unset. */
export function configFromEnv(env: Record<string, string | undefined>): AppLinksConfig {
  return {
    parentAppId: env.APP_LINK_PARENT_APP_ID?.trim() || DEFAULT_PARENT_APP_ID,
    studentAppId: env.APP_LINK_STUDENT_APP_ID?.trim() || DEFAULT_STUDENT_APP_ID,
    parentSha256: splitList(env.APP_LINK_ANDROID_PARENT_SHA256),
    studentSha256: splitList(env.APP_LINK_ANDROID_STUDENT_SHA256),
    appleTeamId: env.APP_LINK_APPLE_TEAM_ID?.trim() ?? "",
  };
}

const ANDROID_RELATION = [
  "delegate_permission/common.handle_all_urls",
  "delegate_permission/common.get_login_creds",
];

/** Body of `/.well-known/assetlinks.json`, or null when no Android app has fingerprints. */
export function assetLinksBody(config: AppLinksConfig): string | null {
  const valid = normaliseConfig(config);
  const apps = [
    { packageName: valid.parentAppId, fingerprints: valid.parentSha256 },
    { packageName: valid.studentAppId, fingerprints: valid.studentSha256 },
  ].filter((app) => app.fingerprints.length > 0);
  if (apps.length === 0) return null;

  const statements = apps.map((app) => ({
    relation: ANDROID_RELATION,
    target: {
      namespace: "android_app",
      package_name: app.packageName,
      sha256_cert_fingerprints: app.fingerprints,
    },
  }));
  return `${JSON.stringify(statements, null, 2)}\n`;
}

/** Body of `/.well-known/apple-app-site-association`, or null when no Team ID is set. */
export function appSiteAssociationBody(config: AppLinksConfig): string | null {
  const valid = normaliseConfig(config);
  if (!valid.appleTeamId) return null;

  const parent = `${valid.appleTeamId}.${valid.parentAppId}`;
  const student = `${valid.appleTeamId}.${valid.studentAppId}`;
  const body = {
    applinks: {
      details: [
        { appIDs: [parent], components: [{ "/": PARENT_PATH }] },
        { appIDs: [student], components: [{ "/": STUDENT_PATH }] },
      ],
    },
    webcredentials: { apps: [parent, student] },
  };
  return `${JSON.stringify(body, null, 2)}\n`;
}

/** The files to publish, keyed by their path under the build output. Empty when nothing is configured. */
export function appLinkFiles(config: AppLinksConfig): Record<string, string> {
  const files: Record<string, string> = {};
  const assetlinks = assetLinksBody(config);
  if (assetlinks) files[".well-known/assetlinks.json"] = assetlinks;
  const aasa = appSiteAssociationBody(config);
  if (aasa) files[".well-known/apple-app-site-association"] = aasa;
  return files;
}
