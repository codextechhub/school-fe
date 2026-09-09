import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ChevronDown, Lock, Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { CustomInput } from "@/components/custom/custom-input";
import { CustomTextArea } from "@/components/custom/custom-textarea";
import { usePermissions } from "@/hooks/use-permissions";
import Tabs from "@/components/custom/tab";
import { P } from "@/permissions";
import {
  useCreateSchoolRoleMutation,
  useGetPermissionCatalogueQuery,
  useGetRoleHoldersQuery,
  useGetSchoolRoleQuery,
  useSetSchoolRoleStatusMutation,
  useUpdateSchoolRoleMutation,
  useCreateRoleChangeRequestMutation,
} from "@/redux/services/roles/roles-api";
import type { CataloguePermission } from "@/redux/services/roles/roles-types";
import { writeErrorMessage, fieldErrors } from "@/utils/api-error";
import { MODULE_LABEL } from "../onboarding-labels";

/**
 * One drawer for a role: what it is called, what it is for, and what it reaches.
 *
 * It replaced two things - a create modal that could only name a role, and a
 * preview drawer that could only tick boxes - because they were halves of one
 * job. Naming a role and then hunting for it in a table to say what it does is
 * two screens for one thought.
 *
 * Four things about it are deliberate.
 *
 * **The save replaces rather than adds.** `permission_keys` is the role's whole
 * grant list: anything it does not name is dropped. So the drawer always sends
 * every ticked box, including ones it has greyed out - a permission a school
 * already holds is not removed just because the module it belongs to is not on
 * the school's package today.
 *
 * **Modules start collapsed.** There are over three hundred permissions. An
 * open list of all of them is not a picker, it is a scroll.
 *
 * **Search opens what it finds.** Typing "invoice" is a question about
 * invoices, not about which module invoices live in, so matching groups open
 * themselves and the rest drop away.
 *
 * **A locked role is read-only and says so.** CodeX owns the baseline roles;
 * the server refuses to change one, so there is no Save rather than a Save that
 * fails.
 */
export function RoleDrawer({
  open,
  roleKey,
  onClose,
}: {
  open: boolean;
  /** The role being opened, or null when this is a new one. */
  roleKey: string | null;
  onClose: () => void;
}) {
  const { hasPermission } = usePermissions();
  const creating = roleKey === null;
  const mayWrite = hasPermission(creating ? P.CREATE_ROLE : P.MODIFY_ROLE);

  const role = useGetSchoolRoleQuery(roleKey as string, {
    skip: !open || creating,
  });
  const catalogue = useGetPermissionCatalogueQuery(undefined, { skip: !open });
  const [createRole, { isLoading: saving }] = useCreateSchoolRoleMutation();
  const [updateRole, { isLoading: updating }] = useUpdateSchoolRoleMutation();
  const [raiseRequest, { isLoading: raising }] =
    useCreateRoleChangeRequestMutation();

  const detail = creating ? undefined : role.data?.data;
  const locked = detail?.is_locked ?? false;
  const readOnly = locked || !mayWrite;

  const [search, setSearch] = useState("");
  const [openModules, setOpenModules] = useState<Set<string>>(new Set());
  // Controlled rather than URL-driven: a drawer is not an address, and a
  // ?tab= left in the bar after it closes describes a screen nobody is on.
  const [tab, setTab] = useState("reach");
  const [errors, setErrors] = useState<Record<string, string>>({});
  // Edits carry the role they belong to, so opening a different role falls
  // straight back to that role's own values. Resetting in an effect instead
  // would render one frame of the previous role against the new role's name.
  const [edits, setEdits] = useState<{
    key: string | null;
    ticked: Set<string>;
    name: string;
    description: string;
    reason: string;
  } | null>(null);

  const baseline = useMemo(
    () =>
      new Set(
        (detail?.role_permissions ?? [])
          .filter((row) => row.granted)
          .map((row) => row.permission),
      ),
    [detail],
  );

  const mine = edits && edits.key === roleKey ? edits : null;
  const ticked = mine ? mine.ticked : baseline;
  const name = mine ? mine.name : (detail?.name ?? "");
  const description = mine ? mine.description : (detail?.description ?? "");
  const reason = mine ? mine.reason : "";

  /** Restricted permissions this save would ADD, by key. */
  const restrictedAdditions = useMemo(() => {
    if (!mine) return [] as string[];
    // The catalogue arrives grouped by module, so the flag lives on the
    // permissions inside each group rather than on the group.
    const restricted = new Set(
      (catalogue.data?.data ?? [])
        .flatMap((group) => group.permissions)
        .filter((entry) => entry.is_restricted)
        .map((entry) => entry.key),
    );
    return [...mine.ticked].filter((k) => restricted.has(k) && !baseline.has(k));
  }, [mine, baseline, catalogue.data]);

  // Approval is about who gains, not about the permission. Adding a restricted
  // key to somebody else's role is the job `school.roles.update` exists for and
  // saves outright; adding it to your own is the thing the restriction is for.
  const needsApproval = Boolean(detail?.held_by_me) && restrictedAdditions.length > 0;
  // What the role reaches, as opposed to what it is called. The server records
  // a reason for the first and not the second, so the box only appears when
  // this save would actually change somebody's access.
  const reachChanged = useMemo(() => {
    if (!mine) return false;
    if (mine.ticked.size !== baseline.size) return true;
    for (const key of mine.ticked) if (!baseline.has(key)) return true;
    return false;
  }, [mine, baseline]);
  // Compared against the server's values rather than "has this reader touched
  // anything", so unticking a box that was just ticked greys Save again. The
  // old test was the presence of an edit object, which survived undoing every
  // change: Save stayed live and offered to write a role back exactly as it
  // already was.
  const dirty = useMemo(() => {
    if (!mine) return false;
    if (mine.name.trim() !== (detail?.name ?? "").trim()) return true;
    if (mine.description.trim() !== (detail?.description ?? "").trim()) return true;
    if (mine.ticked.size !== baseline.size) return true;
    for (const key of mine.ticked) {
      if (!baseline.has(key)) return true;
    }
    return false;
  }, [mine, detail, baseline]);

  /** The edit set to build the next one from - the current one, or the server's. */
  const from = () =>
    edits && edits.key === roleKey
      ? edits
      : {
          key: roleKey,
          ticked: baseline,
          name: detail?.name ?? "",
          description: detail?.description ?? "",
          reason: "",
        };

  const patch = (
    change: Partial<{
      ticked: Set<string>; name: string; description: string; reason: string;
    }>,
  ) => setEdits({ ...from(), key: roleKey, ...change });

  // Built from the PREVIOUS edit, not the render-time set: two boxes ticked
  // inside one render both read the same stale set otherwise, and the second
  // discards the first.
  const toggle = (key: string) =>
    setEdits((current) => {
      const base =
        current && current.key === roleKey
          ? current
          : {
              key: roleKey,
              ticked: baseline,
              name: detail?.name ?? "",
              description: detail?.description ?? "",
              reason: "",
            };
      const next = new Set(base.ticked);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return { ...base, key: roleKey, ticked: next };
    });

  /** Tick or untick every permission in one module that this school can use. */
  const toggleGroup = (permissions: CataloguePermission[], on: boolean) =>
    setEdits((current) => {
      const base =
        current && current.key === roleKey
          ? current
          : {
              key: roleKey,
              ticked: baseline,
              name: detail?.name ?? "",
              description: detail?.description ?? "",
              reason: "",
            };
      const next = new Set(base.ticked);
      for (const entry of permissions) {
        // Never touch a permission the school cannot use: a "select all" that
        // silently grants a module they have not bought is a lie on save.
        if (!entry.available) continue;
        if (on) next.add(entry.key);
        else next.delete(entry.key);
      }
      return { ...base, key: roleKey, ticked: next };
    });

  // The catalogue as this school may see it: modules and permissions the plan
  // does not reach are dropped rather than dimmed, so a group left with nothing
  // in it never draws a heading.
  //
  // No exception for a permission the role already holds, because after a tier
  // change it does not hold it: moving down a tier revokes the grants the new
  // tier does not reach, in `apply_plan_entitlements`. Showing a row here for a
  // grant that no longer exists would be the picker disagreeing with the
  // product about what the school has.
  const modules = useMemo(
    () =>
      (catalogue.data?.data ?? [])
        .map((group) => ({
          ...group,
          permissions: group.permissions.filter((entry) => entry.available),
        }))
        .filter((group) => group.permissions.length > 0),
    [catalogue.data],
  );
  const searching = search.trim().length > 0;

  /** Groups narrowed by the search box, with empty ones dropped. */
  const shown = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return modules;
    return modules
      .map((group) => ({
        ...group,
        permissions: group.permissions.filter(
          (entry) =>
            entry.label.toLowerCase().includes(needle) ||
            entry.key.toLowerCase().includes(needle) ||
            (MODULE_LABEL[group.module] ?? group.module)
              .toLowerCase()
              .includes(needle),
        ),
      }))
      .filter((group) => group.permissions.length > 0);
  }, [modules, search]);

  const close = () => {
    setEdits(null);
    setSearch("");
    setErrors({});
    setOpenModules(new Set());
    onClose();
  };

  /** Put the field carrying a complaint in front of the person who has to read it.
   *
   *  The message renders beside its input, and the inputs sit above a permission
   *  tree hundreds of rows tall, so a save refused while somebody is scrolled
   *  down among the checkboxes reads as a save that did nothing: the drawer
   *  stays open and the reason why is a screen and a half away. It is also
   *  inside the "what it can reach" tab, so the input may not be rendered at all
   *  when the refusal arrives.
   *
   *  Switching the tab first, then waiting a frame for the input to exist,
   *  covers both. Focus rather than scroll alone, so it is also announced to a
   *  screen reader and typed into straight away.
   */
  const reveal = (field: string) => {
    const id = { name: "role-name", key: "role-name",
                 description: "role-description", reason: "role-reason" }[field];
    if (!id) return;
    setTab("reach");
    requestAnimationFrame(() => {
      const el = document.getElementById(id);
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.focus({ preventScroll: true });
    });
  };

  const commit = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setErrors({ name: "Give the role a name." });
      reveal("name");
      return;
    }
    // The server refuses an access change with no reason, and refusing here
    // first puts the message beside the box instead of in a toast.
    if ((creating || reachChanged) && !reason.trim()) {
      setErrors({
        reason: creating
          ? "Say what this role is being created for."
          : "Say why this is changing.",
      });
      reveal("reason");
      return;
    }
    try {
      if (creating) {
        await createRole({
          name: trimmed,
          description: description.trim(),
          permission_keys: [...ticked],
          // Creating always sends permission_keys, an empty list included, and
          // the server treats sending it at all as an access change.
          reason: reason.trim(),
        }).unwrap();
        toast.success(`${trimmed} created.`);
      } else if (needsApproval) {
        // Not a refusal turned into a message: the same press does the thing
        // that can actually be done. The reader stays on the screen they were
        // on, and the request carries the keys they ticked.
        await raiseRequest({
          target_role: detail!.id,
          justification: reason.trim(),
          delta_items: restrictedAdditions.map((permission_key) => ({
            permission_key,
            operation: "ADD" as const,
          })),
        }).unwrap();
        toast.success(
          `Sent for approval. ${trimmed} changes once somebody approves it.`,
        );
      } else {
        await updateRole({
          key: roleKey as string,
          name: trimmed,
          description: description.trim(),
          permission_keys: [...ticked],
          // Required by the server whenever permission_keys is sent, and sent
          // only when it is: renaming a role is not an access change.
          ...(reachChanged ? { reason: reason.trim() } : {}),
        }).unwrap();
        toast.success(`${trimmed} updated.`);
      }
      close();
    } catch (error) {
      const perField = fieldErrors(error);
      // Only fields this form actually renders can carry their own message. A
      // complaint about anything else has nowhere to appear, and setting it
      // silently is how a refused save looked like a save that did nothing:
      // the spinner stopped, the drawer stayed open, and nothing said why.
      // Those fall through to the toast instead.
      const SHOWN = new Set(["name", "key", "description", "reason"]);
      const placeable = Object.fromEntries(
        Object.entries(perField).filter(([field]) => SHOWN.has(field)),
      );
      if (Object.keys(placeable).length) {
        // `key` is derived from the name, so its complaint belongs on the name.
        setErrors({
          ...placeable,
          ...(placeable.key ? { name: placeable.key } : {}),
        });
        // Whichever field the server complained about first.
        reveal(Object.keys(placeable)[0]);
        return;
      }
      toast.error(
        writeErrorMessage(error, "We could not save that role. Try again."),
      );
    }
  };

  const [setStatus, { isLoading: settingStatus }] = useSetSchoolRoleStatusMutation();

  const toggleStatus = async () => {
    if (!detail) return;
    const next = detail.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      await setStatus({
        key: detail.key,
        status: next,
        reason:
          next === "INACTIVE"
            ? "Taken out of use from the roles screen."
            : "Put back in use from the roles screen.",
      }).unwrap();
      toast.success(
        next === "INACTIVE"
          ? `${detail.name} is out of use. Nobody holding it has what it granted.`
          : `${detail.name} is back in use.`,
      );
    } catch (error) {
      // `writeErrorMessage`, not `apiErrorMessage`: a serializer leaves
      // `message` as the generic "An error occurred. Check the error details
      // for more information." and puts the sentence that says what to do in
      // `detail.<field>`. Reading only `message` showed the generic line and
      // hid "this is the only role left that can administer roles here".
      toast.error(
        writeErrorMessage(error, "We could not change that. Try again."),
      );
    }
  };

  const loading = (!creating && role.isLoading) || catalogue.isLoading;

  return (
    <Sheet open={open} onOpenChange={(next) => !next && close()}>
      <SheetContent className="w-full sm:max-w-[560px] flex flex-col gap-0 p-0">
        <SheetHeader className="border-b border-border px-5 py-4">
          <p className="text-xs font-medium uppercase tracking-[0.08em] text-gray-05 font-mont">
            {creating ? "New role" : "Role"}
          </p>
          <SheetTitle className="mt-1 text-lg font-semibold font-mont text-black-01">
            {creating ? "Create a custom role" : (detail?.name ?? roleKey ?? "")}
          </SheetTitle>
          <SheetDescription className="text-[13px] text-gray-06 text-pretty">
            {readOnly
              ? locked
                ? "CodeX maintains this role, so it cannot be changed here. This is what it can reach."
                : "What a person with this role can reach. Your account can read this but not change it."
              : "Name it, say what it is for, and tick what it should reach. It is all on this one screen."}
          </SheetDescription>
        </SheetHeader>

        {/* Only for a role that exists: a role being created has no holders to
            show and no second tab worth offering. */}
        {!creating && (
          <div className="px-5 pt-3">
            <Tabs
              tabs={[
                { label: "What it can reach", value: "reach" },
                { label: "Who holds it", value: "people" },
              ]}
              activeTab={tab}
              setActiveTab={setTab}
            />
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {!creating && tab === "people" && (
            <RoleHolders roleKey={roleKey as string} />
          )}
          {(creating || tab === "reach") && (<>
          {locked && (
            <p className="flex items-start gap-2 rounded-md border border-border px-3 py-2.5 text-[13px] text-gray-06">
              <Lock className="size-3.5 shrink-0 mt-0.5 text-gray-05" />
              This is one of the roles CodeX set up for your school. To work
              differently, add a role of your own instead.
            </p>
          )}

          {!readOnly && (
            <div className="space-y-3.5">
              <CustomInput
                id="role-name"
                label="Role name"
                isRequired
                value={name}
                error={errors.name}
                onChange={(event) => {
                  patch({ name: event.target.value });
                  setErrors({});
                }}
                placeholder="e.g. Assistant Bursar"
              />
              <CustomTextArea
                id="role-description"
                label="What is this role for?"
                value={description}
                error={errors.description}
                onChange={(event) => patch({ description: event.target.value })}
                placeholder="Optional. Helps whoever assigns it later."
              />
              {/* Only when this save changes what the role reaches. The server
                  records it against the person saving, so the audit answers
                  "why does the bursar have this?" rather than only "who ticked
                  it". Renaming a role needs no such answer and is not asked. */}
              {/* Why the button below reads differently. Without this the label
                  looks like the screen deciding something on its own. */}
              {needsApproval && (
                <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-5 text-gray-01">
                  You hold this role, so what you have added needs somebody
                  else's approval:{" "}
                  <span className="font-medium">
                    {restrictedAdditions.join(", ")}
                  </span>
                  . The same change to a role you do not hold saves straight
                  away.
                </p>
              )}
              {(creating || reachChanged) && (
                <CustomInput
                  id="role-reason"
                  label={creating ? "Why is this role needed?" : "Why is this changing?"}
                  isRequired
                  value={reason}
                  error={errors.reason}
                  onChange={(event) => {
                    patch({ reason: event.target.value });
                    setErrors({});
                  }}
                  placeholder="e.g. Ada is covering fees while Ngozi is on leave"
                />
              )}
            </div>
          )}

          <div className="border-t border-border pt-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <p className="text-[13px] font-semibold font-mont text-black-01">
                What it can reach
              </p>
              <span className="text-xs text-gray-05">{ticked.size} granted</span>
            </div>

            <div className="relative mt-2.5">
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search permissions"
                aria-label="Search permissions"
                className="h-9.5 pr-9 text-[13px]"
              />
              {searching ? (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-2.5 text-gray-05 hover:text-black-01"
                >
                  <X className="size-4" />
                </button>
              ) : (
                <Search className="pointer-events-none absolute right-3 top-2.5 size-4 text-gray-05" />
              )}
            </div>
          </div>

          {loading &&
            [0, 1, 2].map((row) => (
              <div key={row} className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-full" />
              </div>
            ))}

          {!loading && searching && !shown.length && (
            <p className="py-6 text-center text-[13px] text-gray-06">
              Nothing matches "{search.trim()}".
            </p>
          )}

          {!loading &&
            shown.map((group) => {
              // Searching opens what it finds: a hit hidden inside a shut group
              // is a search that answers "somewhere in there".
              const isOpen = searching || openModules.has(group.module);
              const granted = group.permissions.filter((entry) =>
                ticked.has(entry.key),
              ).length;
              const selectable = group.permissions.filter(
                (entry) => entry.available,
              );
              const allOn =
                selectable.length > 0 &&
                selectable.every((entry) => ticked.has(entry.key));

              return (
                <div
                  key={group.module}
                  className="rounded-md border border-border overflow-hidden"
                >
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() =>
                      setOpenModules((current) => {
                        const next = new Set(current);
                        if (next.has(group.module)) next.delete(group.module);
                        else next.add(group.module);
                        return next;
                      })
                    }
                    className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left hover:bg-gray-03"
                  >
                    <ChevronDown
                      className={cn(
                        "size-4 shrink-0 text-gray-05 transition-transform",
                        isOpen && "rotate-180",
                      )}
                    />
                    <span className="min-w-0 flex-1 text-[13px] font-semibold font-mont text-black-01">
                      {MODULE_LABEL[group.module] ?? group.module}
                    </span>

                    <span className="shrink-0 text-xs text-gray-05">
                      {granted} of {group.permissions.length}
                    </span>
                  </button>

                  {isOpen && (
                    <div className="border-t border-border px-3 py-2.5">
                      {!readOnly && selectable.length > 1 && (
                        <button
                          type="button"
                          onClick={() => toggleGroup(group.permissions, !allOn)}
                          className="mb-2 text-xs font-medium text-primary hover:underline"
                        >
                          {allOn
                            ? "Clear all in this group"
                            : "Select all in this group"}
                        </button>
                      )}
                      <div className="flex flex-col gap-2">
                        {group.permissions.map((entry) => {
                          const on = ticked.has(entry.key);
                          // Everything here is on the plan: the list above
                          // dropped what is not. It was greyed with "Available
                          // once this module is on your plan", which offered a
                          // school something it cannot have from inside the
                          // product; what a school could buy is a conversation
                          // with CodeX, not a dead row in a picker.
                          const disabled = readOnly;
                          return (
                            <label
                              key={entry.key}
                              title={entry.key}
                              className={cn(
                                "flex items-start gap-2.5 text-[13px] text-pretty",
                                on ? "text-black-01" : "text-gray-05",
                                disabled ? "cursor-default" : "cursor-pointer",
                                !entry.available && "opacity-60",
                              )}
                            >
                              <Checkbox
                                checked={on}
                                disabled={disabled}
                                onCheckedChange={() => toggle(entry.key)}
                                className="mt-0.5 shrink-0"
                              />
                              <span className="min-w-0">{entry.label}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </>)}
        </div>

        {/* Taking a role out of use sits apart from Save, because it is not an
            edit to what the role reaches - it decides whether the role grants
            anything at all. Absent for a locked role and while creating one. */}
        {!creating && !locked && mayWrite && detail && (
          <div className="border-t border-border px-5 py-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-black-01">
                {detail.status === "ACTIVE" ? "In use" : "Not in use"}
              </p>
              <p className="text-xs text-gray-06 text-pretty">
                {detail.status === "ACTIVE"
                  ? "Everyone holding it has what it grants."
                  : "Nobody holding it has what it grants, and the assignments are kept."}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="shrink-0"
              loading={settingStatus}
              onClick={toggleStatus}
            >
              {detail.status === "ACTIVE" ? "Take out of use" : "Put back in use"}
            </Button>
          </div>
        )}

        <div className="border-t border-border px-5 py-3.5 flex gap-2.5">
          <Button variant="outline" className="flex-1" onClick={close}>
            {readOnly ? "Close" : "Cancel"}
          </Button>
          {!readOnly && (
            <Button
              className="flex-1"
              onClick={commit}
              loading={saving || updating || raising}
              disabled={!creating && !dirty}
            >
              {creating
                ? "Create role"
                : needsApproval
                  ? "Raise for approval"
                  : "Save changes"}
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}


/** The people holding this role, and where.

The roles table promises a count and could not say who. A school deciding
whether to change what a role reaches needs to know whose access it is about to
change, and that question was answerable only from the console.
*/
function RoleHolders({ roleKey }: { roleKey: string }) {
  const { data, isLoading } = useGetRoleHoldersQuery({ role: roleKey });
  const holders = data?.data ?? [];

  if (isLoading) {
    return <p className="text-[13px] text-gray-06">Loading…</p>;
  }
  if (holders.length === 0) {
    return (
      <p className="rounded-md border border-border px-3 py-2.5 text-[13px] text-gray-06">
        Nobody holds this role yet. Until somebody does, it grants nothing and
        anything routed to it waits.
      </p>
    );
  }
  return (
    <ul className="space-y-2">
      {holders.map((holder) => (
        <li
          key={holder.id}
          className="flex items-start justify-between gap-3 rounded-md border border-border px-3 py-2.5"
        >
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-black-01 truncate">
              {holder.user_name}
            </p>
            <p className="text-xs text-gray-06 truncate">{holder.user_email}</p>
          </div>
          {/* Only where it changes the meaning: a role held school-wide says so
              by saying nothing, and a branch name on every row of a one-branch
              school is a column that repeats itself. */}
          {holder.branch !== null && (
            <Badge variant="inactive" className="text-[11px] shrink-0">
              One branch
            </Badge>
          )}
        </li>
      ))}
    </ul>
  );
}
