#!/usr/bin/env bash
# Promote what is live on staging to production, and step back if it goes wrong.
#
#   ./release.sh status             where main, staging and production stand
#   ./release.sh promote [bump]     staging's tip becomes production, tagged
#   ./release.sh rollback <tag>     production's files return to <tag>'s
#
# `bump` is patch by default, or may be minor or major. Production releases use
# semantic tags such as v1.4.2. The first semantic release is v1.0.0; older
# date-based tags remain available as rollback targets.
#
# `production` only ever moves forward, so it is never reset or force-pushed:
# promote fast-forwards it, and rollback adds a commit whose files are exactly
# the tagged release's. Every release stays reachable by its tag, and the
# history shows what was live and when.
#
# Render deploys production by hand: this script moves the branch and tag, and
# the deploy is a separate click in the dashboard, at a time of your choosing.
#
# Code rolls back; the database does not. A migration that has run stays run,
# so rollback lists the migrations that arrived after the tag, and the old code
# has to tolerate them. Keep each migration backward-compatible for one release.
set -euo pipefail

REMOTE=origin
PROD=production
STAGING=staging

die() { echo "✗ $*" >&2; exit 1; }
confirm() {
  local answer
  read -r -p "$1 Type '$2' to continue: " answer
  [ "$answer" = "$2" ] || die "Cancelled."
}

require_clean_tree() {
  git diff --quiet && git diff --cached --quiet \
    || die "Uncommitted changes. Commit or stash them first."
}

fetch_all() { git fetch --quiet --tags "$REMOTE"; }

prod_exists() { git rev-parse --verify --quiet "$REMOTE/$PROD" >/dev/null; }

migrations_between() {
  git diff --name-only --diff-filter=A "$1" "$2" -- '*/migrations/0*.py' || true
}

latest_semver() {
  local tag major minor patch
  local latest_major=-1 latest_minor=-1 latest_patch=-1

  while IFS= read -r tag; do
    if [[ "$tag" =~ ^v([0-9]+)\.([0-9]+)\.([0-9]+)$ ]]; then
      major=$((10#${BASH_REMATCH[1]}))
      minor=$((10#${BASH_REMATCH[2]}))
      patch=$((10#${BASH_REMATCH[3]}))
      if (( major > latest_major ||
            (major == latest_major && minor > latest_minor) ||
            (major == latest_major && minor == latest_minor && patch > latest_patch) )); then
        latest_major=$major
        latest_minor=$minor
        latest_patch=$patch
      fi
    fi
  done < <(git tag --list 'v*')

  if (( latest_major >= 0 )); then
    echo "$latest_major.$latest_minor.$latest_patch"
  fi
}

next_tag() {
  local bump=${1:-patch}
  local current major minor patch

  case "$bump" in
    major|minor|patch) ;;
    *) die "Release bump must be major, minor or patch." ;;
  esac

  current=$(latest_semver)
  if [ -z "$current" ]; then
    echo "v1.0.0"
    return
  fi

  IFS=. read -r major minor patch <<< "$current"
  case "$bump" in
    major) major=$((major + 1)); minor=0; patch=0 ;;
    minor) minor=$((minor + 1)); patch=0 ;;
    patch) patch=$((patch + 1)) ;;
  esac
  echo "v$major.$minor.$patch"
}

cmd_status() {
  local tag shown=0
  fetch_all
  echo "main:       $(git rev-parse --short "$REMOTE/main")"
  echo "staging:    $(git rev-parse --short "$REMOTE/$STAGING")"
  if prod_exists; then
    echo "production: $(git rev-parse --short "$REMOTE/$PROD")  ($(git describe --tags --abbrev=0 "$REMOTE/$PROD" 2>/dev/null || echo untagged))"
    echo "Staging is $(git rev-list --count "$REMOTE/$PROD..$REMOTE/$STAGING") commit(s) ahead of production."
  else
    echo "production: not created yet (the first promote creates it)"
  fi
  echo "Recent semantic releases:"
  while IFS= read -r tag; do
    if [[ "$tag" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
      echo "  $tag"
      shown=$((shown + 1))
      (( shown == 5 )) && break
    fi
  done < <(git tag --list 'v*' --sort=-creatordate)
  (( shown > 0 )) || echo "  none (the next release will be v1.0.0)"
}

cmd_promote() {
  local bump=${1:-patch}
  case "$bump" in
    major|minor|patch) ;;
    *) die "Usage: ./release.sh promote [major|minor|patch]" ;;
  esac
  require_clean_tree
  fetch_all
  local target base tag
  target=$(git rev-parse "$REMOTE/$STAGING")
  git merge-base --is-ancestor "$target" "$REMOTE/main" \
    || die "staging holds a commit that main does not. Staging is meant to be reset to main by deploy-staging.sh."

  if prod_exists; then
    base=$(git rev-parse "$REMOTE/$PROD")
    [ "$base" != "$target" ] || die "production already runs staging's tip."
    git merge-base --is-ancestor "$base" "$target" \
      || die "production is not an ancestor of staging, so this cannot fast-forward. Look at ./release.sh status."
    echo "→ Commits going to production:"
    git log --oneline "$base..$target"
    echo
    local migs
    migs=$(migrations_between "$base" "$target")
    if [ -n "$migs" ]; then
      echo "⚠ Migrations this release will run:"
      echo "$migs" | sed 's/^/    /'
    else
      echo "→ No new migrations."
    fi
  else
    echo "→ production does not exist yet. It will be created at staging's tip: $(git log --oneline -1 "$target")"
  fi

  echo
  echo "Before continuing: staging must have deployed this exact commit and be healthy"
  echo "(Render shows the deploy, and you have tried the change there)."
  confirm "Promote $(git rev-parse --short "$target") to production?" release

  tag=$(next_tag "$bump")
  git tag -a "$tag" "$target" -m "Production release $tag"
  git push "$REMOTE" "$target:refs/heads/$PROD" || { git tag -d "$tag" >/dev/null; die "push refused; no tag kept."; }
  git push "$REMOTE" "$tag"
  echo "✓ production is at $(git rev-parse --short "$target"), tagged $tag."
  echo "  Render does not deploy on its own: open the production web service, then the worker, and press Deploy."
}

cmd_rollback() {
  local tag=${1:-}
  [ -n "$tag" ] || die "Usage: ./release.sh rollback <tag>   (see ./release.sh status)"
  require_clean_tree
  fetch_all
  prod_exists || die "production does not exist yet."
  git rev-parse --verify --quiet "refs/tags/$tag" >/dev/null || die "No tag named $tag."
  git merge-base --is-ancestor "$tag" "$REMOTE/$PROD" || die "$tag is not part of production's history."

  local head migs
  head=$(git rev-parse "$REMOTE/$PROD")
  [ "$(git rev-parse "$tag^{tree}")" != "$(git rev-parse "$head^{tree}")" ] || die "production already has $tag's files."

  migs=$(migrations_between "$tag" "$head")
  if [ -n "$migs" ]; then
    echo "⚠ These migrations arrived after $tag and have already run on the database."
    echo "  The older code must work with them, or restore a database backup instead:"
    echo "$migs" | sed 's/^/    /'
  fi
  confirm "Return production's files to $tag?" rollback

  local new rb
  new=$(git commit-tree "$tag^{tree}" -p "$head" -m "Roll production back to $tag")
  rb="${tag}-rollback-$(date +%H%M%S)"
  git tag -a "$rb" "$new" -m "Production rolled back to $tag"
  git push "$REMOTE" "$new:refs/heads/$PROD" || { git tag -d "$rb" >/dev/null; die "push refused."; }
  git push "$REMOTE" "$rb"
  echo "✓ production now carries $tag's files as $(git rev-parse --short "$new") ($rb)."
  echo "  Press Deploy on the production web service and worker."
}

case "${1:-}" in
  status)   cmd_status ;;
  promote)  shift; cmd_promote "${1:-patch}" ;;
  rollback) shift; cmd_rollback "${1:-}" ;;
  *) die "Usage: ./release.sh status | promote [major|minor|patch] | rollback <tag>" ;;
esac
