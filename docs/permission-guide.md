# Frontend Permission Guide

This document explains how the frontend permission system works in school-fe. Any developer adding new menu items or action buttons must follow this guide. If the permission system changes, update this file at the same time.

---

## Overview

Permissions come from the backend at login. The backend uses a role-based access control (RBAC) system where each user is assigned a role, and each role has a set of permission keys. The frontend receives these keys in the login response and stores them in Redux (persisted via `redux-persist` so they survive page refresh).

**Permission key format: `module.resource.action`**

Examples:
- `school.students.view`
- `school.students.create`
- `school.branches.view`
- `academics.session.view`

The backend is the source of truth. Always verify a permission key exists in the backend registry before using it on the frontend.

---

## Permission Registry

All backend permission keys live in **one file only**: `src/permissions/index.ts`.

Nowhere else in the codebase should reference a raw `"school.x.y"` or `"academics.x.y"` string. Everything uses the opaque numeric codes exported as `P.*` constants.

```ts
import { P } from "@/permissions";

// Names describe UI capabilities - never use raw strings or codes directly
P.BROWSE_STUDENTS        // "100301"  →  "school.students.view" internally
P.ENROLL_STUDENT         // "100302"  →  "school.students.create"
P.VIEW_STUDENT_SENSITIVE // "100339"  →  "school.students.view_sensitive"
P.BROWSE_SESSIONS        // "300101"  →  "academics.session.view"
```

The `P` object is a flat map of UI-intent names to opaque numeric codes. Names describe what the user is doing in the UI - not the backend key structure. A reader of any file outside `src/permissions/index.ts` cannot infer the backend key format from the constant name alone.

To add a new permission: pick the next code in the correct range, add it to `REGISTRY` and `P` with a UI-intent name, then use `P.YOUR_CONSTANT` everywhere.

**Code format: `MM RR AA`**

| Digits | Meaning | Examples |
|--------|---------|---------|
| MM | Module | 10=school, 30=academics |
| RR | Resource within module | see the module tables below |
| AA | Action | 01=view, 02=create, 03=update, 04=delete, 08=manage, 09=suspend, 10=reactivate, 11=assign, 39=view_sensitive |

---

## How Permissions Flow

```
Login response
  └── data.permissions: string[]        ← flat array of permitted keys
        └── stored in Redux auth slice   ← persisted to localStorage
              └── rehydrated on refresh  ← PersistGate blocks render until done
```

**Key files:**
| File | Role |
|------|------|
| `src/redux/features/auth/auth-slice.ts` | Stores and exposes `permissions[]` |
| `src/redux/store.ts` | Persists `auth` slice (including permissions) |
| `src/hooks/use-permissions.ts` | Hook for checking permissions in components |
| `src/components/custom/permission-gate.tsx` | UI-level guard |
| `src/components/app-sidebar.tsx` | Sidebar filtering |

---

## The Two Enforcement Points (frontend)

> **By design, school-fe has NO route-level permission guards.** Enforcement is
> page-level (sidebar filtering + `PermissionGate`) with the **backend as the
> authoritative check** - every protected API call is validated server-side and
> returns 403 if the caller lacks the key. The frontend gates only shape the UI;
> they never protect data on their own.

### 1. Sidebar - hide menu items the user cannot access

Each nav item in `app-sidebar.tsx` has an optional `permission` field. Items are filtered before render; a group is hidden when all its items are filtered out.

```ts
{
  title: "Students",
  url: routesPath.PROTECTED.STUDENTS.INDEX,
  icon: StudentsIcon,
  permission: P.BROWSE_STUDENTS,
  permissionMode: "any",
}

// Multiple permissions - any one grants visibility
{
  title: "Academics",
  permission: [P.BROWSE_SESSIONS, P.BROWSE_CALENDAR, P.BROWSE_CLASSES],
  permissionMode: "any",   // visible if any key is present
}

// Multiple permissions - must have all
{
  title: "Roles",
  permission: [P.VIEW_ROLES, P.ASSIGN_ROLE],
  permissionMode: "all",   // visible only if both keys are present
}

// Always visible (no permission required)
{
  title: "Overview",
  permission: null,
}
```

> **Sidebar alone is not enough.** A user can type the URL directly. The page
> still renders, but every API call it makes is checked server-side, so no
> protected data is exposed. Guard sensitive affordances inside the page with
> `PermissionGate` (below), and rely on the backend 403 as the real boundary.

---

### 2. `PermissionGate` - hide or replace UI elements inside a page

Use this for buttons, sections, or any element inside a page the user can already visit.

```tsx
import PermissionGate from "@/components/custom/permission-gate";
import { P } from "@/permissions";

// Hide entirely when permission is missing
<PermissionGate permission={P.ENROLL_STUDENT}>
  <Button>Enroll Student</Button>
</PermissionGate>

// Show a fallback instead
<PermissionGate
  permission={P.MODIFY_STUDENT}
  fallback={<span className="text-gray-01 text-sm">View only</span>}
>
  <Button>Edit Student</Button>
</PermissionGate>

// Render disabled button instead of hiding
<PermissionGate
  permission={P.MANAGE_FEES}
  fallback={<Button disabled>Manage Fees</Button>}
>
  <Button>Manage Fees</Button>
</PermissionGate>

// Multiple permissions - any one
<PermissionGate permission={[P.ADD_BRANCH, P.MODIFY_BRANCH]}>
  <Button>Save</Button>
</PermissionGate>

// Multiple permissions - all required
<PermissionGate
  permission={[P.BROWSE_STUDENTS, P.MODIFY_STUDENT]}
  mode="all"
>
  <Button>Edit</Button>
</PermissionGate>
```

**For dropdown action lists** (plain object arrays, not JSX), use `usePermissions()` directly:

```tsx
import { usePermissions } from "@/hooks/use-permissions";
import { P } from "@/permissions";

const { hasPermission } = usePermissions();

dropDownList={(row) => [
  {
    label: "View Details",
    onActionClick: () => navigate(routesPath.VIEW(row._slug)),
  },
  ...(hasPermission(P.MODIFY_STUDENT) ? [{
    label: "Edit Student",
    onActionClick: () => navigate(routesPath.EDIT(row._slug)),
  }] : []),
  ...(hasPermission(P.MANAGE_STUDENTS) ? [{
    label: "Withdraw",
    className: "text-destructive",
    onActionClick: () => handleWithdraw(row._slug),
  }] : []),
]}
```

---

## Checklist: Adding a New Protected Feature

When adding a new section to the app, work through this checklist:

- [ ] **Verify the permission keys exist** in the backend registry (`vs_rbac` app / `seed_school_permissions`). Don't invent keys - a typo silently denies access to everyone.
- [ ] **Add the key** to `REGISTRY` and a UI-intent `P.*` constant in `src/permissions/index.ts` - nowhere else references the raw string.
- [ ] **Add a sidebar item** in `app-sidebar.tsx` with the correct `permission` and `permissionMode`.
- [ ] **Add `PermissionGate`** around action buttons inside the page (Add, Edit, Manage).
- [ ] **Use `hasPermission()` directly** to filter dropdown action items.
- [ ] **Trust the backend** - the protected endpoint must enforce the same key server-side. The frontend gate is presentation only.
- [ ] **Test both paths**: (a) a user with the permission sees the affordance, (b) a user without does not - and the API returns 403 if they force the request.

---

## The `usePermissions` Hook

```ts
import { usePermissions } from "@/hooks/use-permissions";
import { P } from "@/permissions";

const { hasPermission, hasAnyPermission, hasAllPermissions, hasModuleAccess } = usePermissions();

hasPermission(P.BROWSE_STUDENTS)                               // single key
hasAnyPermission(P.BROWSE_STUDENTS, P.BROWSE_TEACHERS)         // at least one
hasAllPermissions(P.BROWSE_STUDENTS, P.MODIFY_STUDENT)         // all required
hasModuleAccess("school.", "academics.")                      // any key under a module prefix
```

---

## Known Edge Cases

### 1. Permissions sync on mount and token refresh

Permissions are loaded at login. Two mechanisms keep them in sync after that:

- **On app mount** - `authenticated.tsx` calls `GET /user/auth/me/` via `useGetMeQuery`. The `onQueryStarted` handler dispatches `updatePermissions` with the fresh list. This catches any role changes that happened while the token was still valid.
- **On token refresh** - `base-api.ts` calls `fetchFreshPermissions()` immediately after a successful token refresh and dispatches `updatePermissions`. This covers the silent re-authentication path.

**Remaining gap:** If a user's permissions are revoked and their token has not yet expired, there is a window (up to the token's lifespan) before the next app mount triggers a sync. The backend will still return 403 on any API call that requires the revoked permission, so the user cannot actually perform the action even if the UI briefly shows the button.

### 2. Adding a wrong code fails silently

A code that doesn't exist in `REGISTRY` (e.g. a typo or a code that was never added) resolves to `""` via `resolvePermissionKey`, which will never match any backend permission. The guard **fails closed** - it denies everyone, including admins. TypeScript will catch a code that isn't a valid `PermissionCode` value, but it won't catch a valid code that was mapped to the wrong backend key. Always cross-reference with the backend's `seed_school_permissions` table before committing.

### 3. Routes with `permission: null` (always-visible) are unguarded

The Overview route is intentionally accessible to all authenticated users (`permission: null` in the sidebar). If sensitive data is ever added to the Overview page, guard those affordances with `PermissionGate` and confirm the backend enforces the key at that time.

### 4. No permission bypass for superusers on the frontend

The frontend checks the flat `permissions[]` array. If a school_admin's login response includes all their permission keys (as `get_effective_permissions()` returns), everything works. If a user somehow gets an empty permissions array from the login response, they will be blocked by every gate. Verify the backend returns the full set.

---

## Field Access - hiding and greying individual fields

An administrator turns **Read** and **Write** on or off per role, per field, on the Field Access screen. The backend applies those switches on every response and every save; a screen follows them through one shared hook, so the two never disagree.

What the backend sends:

| Where | What it says |
|-------|--------------|
| Any response | A field the user may not read is **absent**. There is no list of removed names. |
| A detail response | `_read_only_fields` names fields present in the payload that the user may not change. |
| Login and `/user/auth/me/` | `field_access`: `{ "module.resource": { hidden?, read_only?, open_on_create? } }`. An absent resource or name means full access. |
| A refused write | 403 with `error.code` `field_write_denied` and per-field messages in `error.detail`. |

The map is stored in the auth slice beside `permissions`, swapped with it on a proxy start or exit, and returned by `usePermissions()` as `fieldAccess`.

### Usage

The hook and the form-field wrapper come from the shared finance package, so this app and the console use one copy. Resource names for the school's own screens are in `src/lib/field-resources.ts`.

```tsx
import { AccessField, fieldWriteErrors, useFieldAccess } from "@/components/finance-ui";
import { CREATING, FIELD_RESOURCE } from "@/lib/field-resources";

// An existing record: the record decides (absent = hidden, _read_only_fields = greyed).
const access = useFieldAccess(FIELD_RESOURCE.STUDENTS, student);

{!access.isHidden("allergies") && <Row label="Allergies" value={student.allergies || "Not recorded"} />}

<AccessField access={access} name="allergies">
  <Field label="Allergies"><input ... /></Field>
</AccessField>

await save(access.writableOnly(body));        // never sends a field the user may not write
const perField = fieldWriteErrors(error);     // per-field messages of a field_write_denied 403

// A table's columns: the signed-in user's map decides.
const columns = useFieldAccess(FIELD_RESOURCE.STUDENTS);

// An Add form: the map decides, and every question is asked as a record being created.
const access = useFieldAccess(FIELD_RESOURCE.STUDENTS);

<AccessField access={access} name="enrolment_date" creating>...</AccessField>
{access.anyVisible("blood_group", "allergies", CREATING) && <MedicalSection />}
await enrol(access.writableOnly(body, CREATING));
```

### Rules

- **Hidden means not there.** No label, no lock, no "Restricted" text, no empty space, no column. A section whose fields are all hidden disappears.
- **Read-only means greyed, disabled and never sent.**
- **Every Add form asks as a record being created.** It passes `creating` to `AccessField` and `CREATING` to `isHidden`, `isReadOnly`, `anyVisible` and `writableOnly`. A field listed under `open_on_create` is then offered, editable and sent even when it is also under `hidden` or `read_only`: a staff member's email, a guardian's phone and a pupil's admission date. On an existing record those switches apply as usual. Without the option, a hidden open-on-create field stays hidden, which is right for columns and headings and wrong for an Add form.
- **Adding a new guardian depends on its required fields.** `canCreateGuardian(access)` offers "Add a new one" only when the user may give every field a new guardian requires at creation; otherwise only the search for an existing guardian is offered.
- A field the viewer cannot see is neither complete nor a gap: completeness scores count only the fields a record carries.
- The request interceptor stays silent on `field_write_denied`; the form shows each message under its field.

---

## Architecture Diagram

```
User navigates to URL
        │
        ▼
  Authenticated         ← checks for valid access token (cookie)
  middleware            ← redirects to /accounts if missing; resyncs permissions via /me
        │
        ▼
  Page renders          ← NO route-level permission guard (by design)
        │
        ├── Sidebar     ← already filtered; matching items only shown
        │
        └── Page body
              ├── PermissionGate  ← hides/replaces buttons & sections
              └── hasPermission() ← filters dropdown action items
        │
        ▼
  API call              ← BACKEND is authoritative: 403 if the key is missing
```

---

## Current Permission Map

### `school` module (MM=10) - administration & people

| Backend key | Code | Sensitivity | UI constant |
|---|---|---|---|
| school.dashboard.view | 100101 | NORMAL | `VIEW_SCHOOL_DASHBOARD` |
| school.branches.view | 100201 | NORMAL | `BROWSE_BRANCHES` |
| school.branches.create | 100202 | SENSITIVE | `ADD_BRANCH` |
| school.branches.update | 100203 | NORMAL | `MODIFY_BRANCH` |
| school.branches.manage | 100208 | SENSITIVE | `MANAGE_BRANCH` |
| school.students.view | 100301 | NORMAL | `BROWSE_STUDENTS` |
| school.students.create | 100302 | NORMAL | `ENROLL_STUDENT` |
| school.students.update | 100303 | NORMAL | `MODIFY_STUDENT` |
| school.students.manage | 100308 | SENSITIVE | `MANAGE_STUDENTS` |
| school.students.view_sensitive | 100339 | SENSITIVE | `VIEW_STUDENT_SENSITIVE` |
| school.teachers.view | 100401 | NORMAL | `BROWSE_TEACHERS` |
| school.teachers.create | 100402 | NORMAL | `INVITE_TEACHER` |
| school.teachers.update | 100403 | NORMAL | `MODIFY_TEACHER` |
| school.teachers.manage | 100408 | SENSITIVE | `MANAGE_TEACHERS` |
| school.administrators.view | 100501 | NORMAL | `BROWSE_ADMINISTRATORS` |
| school.administrators.create | 100502 | SENSITIVE | `INVITE_ADMINISTRATOR` |
| school.administrators.update | 100503 | SENSITIVE | `MODIFY_ADMINISTRATOR` |
| school.administrators.suspend | 100509 | SENSITIVE | `SUSPEND_ADMINISTRATOR` |
| school.administrators.reactivate | 100510 | SENSITIVE | `REACTIVATE_ADMINISTRATOR` |
| school.fees.view | 100601 | NORMAL | `VIEW_FEES` |
| school.fees.manage | 100608 | SENSITIVE | `MANAGE_FEES` |
| school.settings.view | 100701 | NORMAL | `VIEW_SETTINGS` |
| school.settings.manage | 100708 | SENSITIVE | `MANAGE_SETTINGS` |
| school.profile.view | 101201 | NORMAL | `VIEW_SCHOOL_PROFILE` |
| school.profile.update | 101203 | SENSITIVE | `UPDATE_SCHOOL_PROFILE` |
| school.roles.view | 100801 | NORMAL | `VIEW_ROLES` |
| school.roles.assign | 100811 | SENSITIVE | `ASSIGN_ROLE` |

### `onboarding` module (MM=20) - the control room and the go-live gate

Open to a school that has **not** gone live: these four are the only keys that
work before go-live, alongside `school.profile.*` and filing a support ticket.

`onboarding.progress.view` is the one key a **branch admin** holds by default:
they read the control room and change nothing. Onboarding belongs to the school
as a whole, so transitioning a step and asking CodeX to go live stay with the
school administrator.
Approve, reject and reinstate are CodeX's and are deliberately absent from this
registry - the backend refuses them to any caller outside the platform tenant
however the key was obtained, so a school app has no use for them.

| Backend key | Code | Sensitivity | UI constant |
|---|---|---|---|
| onboarding.progress.view | 200101 | NORMAL | `VIEW_ONBOARDING` |
| onboarding.task.update | 200203 | NORMAL | `UPDATE_ONBOARDING_TASK` |
| onboarding.go_live.view | 200301 | NORMAL | `VIEW_GO_LIVE_REQUESTS` |
| onboarding.go_live.submit | 200302 | SENSITIVE | `REQUEST_GO_LIVE` |

### `academics` module (MM=30) - sessions, calendar & classes

| Backend key | Code | Sensitivity | UI constant |
|---|---|---|---|
| academics.session.view | 300101 | NORMAL | `BROWSE_SESSIONS` |
| academics.session.create | 300102 | NORMAL | `CREATE_SESSION` |
| academics.session.update | 300103 | NORMAL | `MODIFY_SESSION` |
| academics.session.manage | 300108 | SENSITIVE | `MANAGE_SESSIONS` |
| academics.calendar.view | 300201 | NORMAL | `BROWSE_CALENDAR` |
| academics.calendar.create | 300202 | NORMAL | `CREATE_CALENDAR_EVENT` |
| academics.calendar.update | 300203 | NORMAL | `MODIFY_CALENDAR_EVENT` |
| academics.calendar.manage | 300208 | SENSITIVE | `MANAGE_CALENDAR` |
| academics.classes.view | 300301 | NORMAL | `BROWSE_CLASSES` |
| academics.classes.create | 300302 | NORMAL | `CREATE_CLASS` |
| academics.classes.update | 300303 | NORMAL | `MODIFY_CLASS` |
| academics.classes.manage | 300308 | SENSITIVE | `MANAGE_CLASSES` |
| academics.classes.assign | 300311 | SENSITIVE | `ASSIGN_CLASS` |
