# App links: opening XVS links in the store apps

XVS Parent (`com.codexng.xvs.parent`) and XVS Student (`com.codexng.xvs.student`)
are published for Android and iPhone. Links in emails and pushes point at a
school host, for example `https://meridian.xvs.codexng.com/parent/...` or
`/student/...`. A phone with the app installed opens such a link in the app
instead of the browser when the host proves it belongs to the app. The proof is
two files served under `/.well-known/`:

| File | Read by | Content type |
| --- | --- | --- |
| `assetlinks.json` | Android (App Links) | `application/json` |
| `apple-app-site-association` (no extension) | iPhone (Universal Links) | `application/json`, no redirects |

The apps claim the wildcard `*.xvs.codexng.com`, so each store also verifies
against the bare host `xvs.codexng.com`. The same static site serves every school
host and the bare host, so one build covers all of them.

The Android file also carries `get_login_creds`, and the iPhone file a
`webcredentials` entry, so each phone can offer saved passwords from the site in
the app.

## How the files are produced

`scripts/app-links.ts` builds both bodies from environment variables and
`vite.config.ts` writes them to `dist/.well-known/` during `vite build`. Nothing
lives in `public/` and no real value is committed. The variables are read at
build time only and are never part of the JavaScript bundle (hence no `VITE_`
prefix). The dev server does not serve the files.

A file is emitted only when its inputs are set:

- With no variables set, `dist/.well-known/` does not exist and the site is
  unchanged.
- `assetlinks.json` appears when at least one Android app has a fingerprint, and
  holds one statement for each app that has one.
- `apple-app-site-association` appears when the Team ID is set.
- A malformed value fails the build with a message naming the variable, so a
  broken file is never published.

| Variable | Meaning |
| --- | --- |
| `APP_LINK_ANDROID_PARENT_SHA256` | SHA-256 certificate fingerprints of XVS Parent, comma-separated |
| `APP_LINK_ANDROID_STUDENT_SHA256` | The same for XVS Student |
| `APP_LINK_APPLE_TEAM_ID` | CodeX's Apple Team ID |
| `APP_LINK_PARENT_APP_ID` | Optional. Defaults to `com.codexng.xvs.parent` |
| `APP_LINK_STUDENT_APP_ID` | Optional. Defaults to `com.codexng.xvs.student` |

A fingerprint is 32 colon-separated hex pairs (lowercase is accepted and written
in uppercase). A Team ID is 10 uppercase letters or digits. An app id is a
reverse-domain name.

### Where each value comes from

- **Fingerprints:** Play Console, the app, Setup, App signing, "SHA-256
  certificate fingerprint". List both the app signing key and the upload key,
  comma-separated, because Play can present either to the device depending on how
  the app was installed. Do this for each of the two apps.
- **Team ID:** Apple Developer, Membership details, "Team ID".

## Render static site settings

Set the variables above in the Render service's environment, then redeploy.

1. **Content type.** Add a response header rule for the path
   `/.well-known/apple-app-site-association` with `Content-Type:
   application/json`. The file has no extension, so without the rule it is served
   as a download type that iPhone rejects.
2. **Rewrites.** The site rewrites `/*` to `/index.html` for client-side routing.
   Render serves a file that exists before it applies a rewrite, so
   `/.well-known/*` is not shadowed. Confirm it after the first deploy with the
   commands below: a body that is HTML instead of JSON means the rewrite won.
3. **No redirects.** Both stores refuse a redirect. Check that neither request
   answers 301 or 302 (for example from a trailing-slash or host rule in
   Cloudflare).

## Verifying after a deploy

On a school host and on the bare host:

```sh
curl -sI https://meridian.xvs.codexng.com/.well-known/apple-app-site-association
curl -s  https://meridian.xvs.codexng.com/.well-known/assetlinks.json

curl -sI https://xvs.codexng.com/.well-known/apple-app-site-association
curl -s  https://xvs.codexng.com/.well-known/assetlinks.json
```

Each header response should be `200` with `content-type: application/json`, and
each body should be the JSON described above.

Google's checker reports whether Android accepts the file for a host:

```
https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://<host>&relation=delegate_permission/common.handle_all_urls
```

Replace `<host>` with a school host or `xvs.codexng.com`. The response lists one
statement per app with its package name and fingerprints.

Stores cache these files, so a change can take hours (Android) or days (iPhone)
to reach devices that already installed the app.
