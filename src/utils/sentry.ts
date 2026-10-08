import * as Sentry from "@sentry/react";

/**
 * Error reporting, with personal data kept out of what Sentry receives.
 *
 * Reports carry the exception, its stack, the page route and the release, and
 * nothing that names a person: no request bodies, cookies, credentials, signed-in
 * user or query strings, and no breadcrumbs (they hold clicked text and fetched
 * URLs, which can quote a student or a parent).
 *
 * Off unless the build names a DSN. A DSN without an environment name is
 * refused, so a staging error is never filed under production.
 */
export function initSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return;

  const environment = import.meta.env.VITE_SENTRY_ENVIRONMENT;
  if (!environment) {
    throw new Error(
      "VITE_SENTRY_ENVIRONMENT must name this deployment whenever VITE_SENTRY_DSN is set.",
    );
  }

  Sentry.init({
    dsn,
    environment,
    release: import.meta.env.VITE_SENTRY_RELEASE || undefined,
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
    },
    tracesSampleRate: 0,
    beforeBreadcrumb: () => null,
    beforeSend(event) {
      delete event.user;
      if (event.request) {
        delete event.request.data;
        delete event.request.cookies;
        delete event.request.headers;
        delete event.request.query_string;
        if (event.request.url) event.request.url = event.request.url.split(/[?#]/)[0];
      }
      return event;
    },
  });
}
