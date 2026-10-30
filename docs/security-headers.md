# Security headers on the four sites

The API already sends its own security headers. The four front ends are Render
static sites, and Render sends none of these unless the site is told to. Each
header below is added in the Render dashboard, on the site, under **Headers**,
with the path `/*`. This page is the one list; the student and parent READMEs
point here.

| Site | Render names (staging / production) |
| --- | --- |
| School app, serving every school's address and `/student/` and `/parent/` on it | school-fe's staging and production sites |
| Student app | `xvs-student-staging-fe` / `xvs-prod-student` |
| Parent app | parent-fe's staging and production sites |
| Console | console-fe's staging and production sites |

The student and parent apps reach phones through the school app's address (a
rewrite on school-fe's site), so their pages may carry the school app's
headers, their own, or both. Put the same set on all three and the answer is
the same whichever way Render sends them.

## The headers

Add each of these on every site. Only the policy's API address differs
between staging and production.

| Header | Value |
| --- | --- |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` |
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(self), microphone=(), geolocation=(), payment=(), usb=()` |
| `Content-Security-Policy` | below |

The console also gets `X-Robots-Tag: noindex, nofollow`, so search engines do
not list the CodeX staff sign-in.

Production policy (one line in Render):

```
default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' blob: https://api.codexng.com https://*.ingest.sentry.io https://*.ingest.de.sentry.io https://*.ingest.us.sentry.io; worker-src 'self'; manifest-src 'self'; frame-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests
```

Staging policy: the same, with `https://api-staging.codexng.com` in place of
`https://api.codexng.com`.

## Why each part is what it is

- **Scripts only from the site itself.** No build has an inline script: each
  `dist/index.html` loads one module file, and nothing calls `eval`. The
  console's Word preview library carries a `new Function` in a `setImmediate`
  polyfill that only runs when given a string, which nothing does, so the
  policy does not allow eval.
- **Styles allow inline.** Tailwind's output is a file, but the toast,
  chart and dialog libraries write `<style>` and `style=""` at run time.
- **Images from any HTTPS address.** A school's crest and photos come from the
  API, and an email template previewed in the console can name a logo on
  another host. An image cannot run anything, so this is the one place the
  policy is loose rather than leave a blank crest.
- **Connections** go to the API, to Sentry's ingest (when a DSN is set), and to
  `blob:` for files already downloaded.
- **Frames** are only the PDF preview, which shows a downloaded file (`blob:`).
  The console's email preview is a sandboxed `srcdoc` frame and needs nothing.
- **Paystack** is a full-page move to `checkout.paystack.com`
  (`window.location.assign`), which no part of the policy restricts.
- **No framing at all** (`DENY`, `frame-ancestors 'none'`): no app is meant to
  appear inside another site, which is what stops a site overlaying a fake page
  on a real one.
- **Camera for the site only.** Photo capture uses it; nothing else may ask.
- **HSTS** tells a browser to use HTTPS for a year, and for each school's
  address under the host it was sent from. It is not sent with `preload`, which
  is hard to undo.

## Rolling it out

1. Add the headers to the four **staging** sites and redeploy each.
2. On staging, sign in to each app and use it: the school app (fees, a
   staff photo, a finance PDF preview), the console (the email template
   preview, a Word document preview), the student and parent apps (home,
   fees, a payment as far as Paystack's page, notifications). Keep the
   browser's developer console open: a blocked request says
   "Content Security Policy" there. If one appears, the policy needs that
   address added; send the line.
3. Then add them to the production sites.

## Checking a site

```sh
curl -sI https://bright-star.xvs-staging.codexng.com/ | grep -iE "strict-transport|content-security|x-frame|x-content-type|referrer-policy|permissions-policy"
curl -sI https://bright-star.xvs-staging.codexng.com/student/ | grep -iE "content-security|x-frame"
curl -sI https://bright-star.xvs-staging.codexng.com/parent/ | grep -iE "content-security|x-frame"
```

Each line should come back once. A header that comes back twice with the same
value is harmless (the browser applies both, and they agree).
