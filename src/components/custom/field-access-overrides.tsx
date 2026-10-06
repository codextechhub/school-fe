import { useMemo, useState } from "react";
import {
  CalendarClock,
  Info,
  Plus,
  ShieldMinus,
  ShieldPlus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { CustomDateInput } from "@/components/custom/custom-date-input";
import { useCatalogueScope } from "@/components/custom/catalogue-scope";
import {
  CatalogueScopeNotice,
  CatalogueScopePrompt,
  CatalogueScopeSelect,
} from "@/components/custom/catalogue-scope-select";
import { SearchSelect } from "@/components/custom/search-select";
import {
  SkeletonCard,
  SkeletonLoadingLabel,
} from "@/components/custom/skeletons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { usePermissions } from "@/hooks/use-permissions";
import { cn } from "@/lib/utils";
import { P } from "@/permissions";
import { selectUser } from "@/redux/features/auth/auth-slice";
import {
  useCreateUserFieldAccessOverrideMutation,
  useDeleteUserFieldAccessOverrideMutation,
  useGetAccessCatalogueQuery,
  useGetUserFieldAccessOverridesQuery,
} from "@/redux/services/roles/roles-api";
import type {
  CatalogueModule,
  FieldAccessKind,
  FieldAccessMode,
  UserFieldAccessOverride,
} from "@/redux/services/roles/roles-types";
import { useAppSelector } from "@/redux/store";
import { useAsAt } from "@/lib/as-at";
import { formatRelativeDate } from "@/utils/helpers";
import { formatDate, zonedInstant, type DisplayPrefs } from "@/lib/dates";
import { activeDisplayPrefs } from "@/lib/school-display";

interface Props {
  userId: number;
  userName?: string | null;
  /**
   * True when the person's access reaches past the reader's branches (see
   * `personBranchIds`). Stands in for the server's own answer until the list
   * response carries one.
   */
  outsideReach?: boolean;
  className?: string;
}

/** Said where a branch-bound reader may read a person's exceptions but not change them. */
export const EXCEPTIONS_READ_ONLY =
  "This person's access reaches beyond your branch, so only a school-wide administrator can change their exceptions.";

/**
 * The branches a person's access reaches, the set their exceptions are judged by.
 *
 * An exception follows the person wherever they work, so it is measured by
 * their postings and the branches their roles reach, together. No posting, or
 * a role reaching the whole school, makes it the whole school (empty). A
 * branch-bound reader may set an exception only when this is non-empty and
 * every branch in it is theirs: a DENY written from Lekki on the school-wide
 * bursar would otherwise take her access away at Ikeja too.
 */
export function personBranchIds(
  postings: readonly number[],
  reach: { school_wide: boolean; branches: readonly { id: number }[] },
): number[] {
  if (!postings.length || reach.school_wide) return [];
  return [...new Set([...postings, ...reach.branches.map((b) => b.id)])];
}

/** The day an exception lapses, in the school's style and zone. */
const formatExpiry = (value: string, prefs: DisplayPrefs = activeDisplayPrefs(null)): string =>
  formatDate(value, prefs);

/**
 * The catalogue narrowed to what a field picker can use.
 *
 * Most resources carry permissions and no fields, so the unfiltered tree opens
 * on an empty resource. Only resources with at least one field are kept, and a
 * module is kept only while it still has such a resource.
 */
export function modulesWithFields(modules: CatalogueModule[]): CatalogueModule[] {
  return modules
    .map((module) => ({
      ...module,
      resources: module.resources.filter((resource) => resource.fields.length > 0),
    }))
    .filter((module) => module.resources.length > 0);
}

/**
 * One sentence comparing an exception with the switch the person's roles give.
 *
 * It names switch states only. Whether a screen shows or greys the field is
 * decided elsewhere, so the sentence never claims a visible effect.
 */
export function fieldExceptionEffect(row: UserFieldAccessOverride): string {
  const expiry = row.expires_at && !row.is_expired
    ? ` until ${formatExpiry(row.expires_at)}`
    : "";

  const kind = row.access === "READ" ? "Read" : "Write";

  if (row.is_expired) return "Expired. This person's roles decide the access again.";
  if (!row.role_state) {
    return row.mode === "ALLOW"
      ? `${kind} is allowed for this person${expiry}.`
      : `${kind} is denied for this person${expiry}.`;
  }
  const roleAllows =
    row.access === "READ" ? row.role_state.read : row.role_state.write;
  if (row.mode === "ALLOW") {
    return roleAllows
      ? `The role already allows ${kind}. The exception keeps ${kind} allowed${expiry}.`
      : `The role does not allow ${kind}. ${kind} is allowed for this person${expiry}.`;
  }
  return roleAllows
    ? `The role allows ${kind}. ${kind} is denied for this person${expiry}.`
    : `The role already denies ${kind}. The denial stays in place${expiry}.`;
}

/** The API's own sentence for a refusal, such as a day before history starts. */
function errorMessage(error: unknown): string | undefined {
  const data = (error as { data?: { message?: unknown } } | undefined)?.data;
  return typeof data?.message === "string" ? data.message : undefined;
}

/**
 * Field exceptions sit beside permission exceptions and share their guards.
 *
 * On a profile read as at an earlier day the list is the one that stood that
 * day, read-only, without the comparison with the person's roles: role
 * switches keep no history, so there is nothing true to compare against.
 *
 * Adding and lifting also need the person inside the reader's branches. The
 * list response's `can_change_exceptions` answers that where the server sends
 * it, and `outsideReach` otherwise; a reader holding the keys without the reach
 * reads the list with the reason.
 */
export default function FieldAccessOverrides({
  userId,
  userName,
  outsideReach = false,
  className,
}: Props) {
  const { hasPermission, hasAnyPermission } = usePermissions();
  const signedInUser = useAppSelector(selectUser);
  const canView =
    hasPermission(P.VIEW_ROLES) &&
    hasAnyPermission(P.VIEW_USER_OVERRIDES, P.CREATE_USER_OVERRIDE, P.DELETE_USER_OVERRIDE);
  const isSelf = String(userId) === String(signedInUser?.id ?? "");
  const asAt = useAsAt();

  if (!canView) return null;

  return (
    <FieldExceptionsSection
      userId={userId}
      userName={userName}
      asAt={asAt}
      canCreate={hasPermission(P.CREATE_USER_OVERRIDE) && !isSelf && !asAt}
      canDelete={hasPermission(P.DELETE_USER_OVERRIDE) && !isSelf && !asAt}
      outsideReach={outsideReach}
      className={className}
    />
  );
}

function FieldExceptionsSection({
  userId,
  userName,
  asAt,
  canCreate: holdsCreate,
  canDelete: holdsDelete,
  outsideReach,
  className,
}: {
  userId: number;
  userName?: string | null;
  asAt?: string;
  canCreate: boolean;
  canDelete: boolean;
  outsideReach: boolean;
  className?: string;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [pendingLift, setPendingLift] =
    useState<UserFieldAccessOverride | null>(null);
  const query = useGetUserFieldAccessOverridesQuery({ userId, asAt });
  const rows = query.currentData?.data ?? [];
  const mayChange = query.currentData?.can_change_exceptions ?? !outsideReach;
  const canCreate = holdsCreate && mayChange;
  const canDelete = holdsDelete && mayChange;
  const readOnlyNote = (holdsCreate || holdsDelete) && !mayChange;
  const [lift, lifting] = useDeleteUserFieldAccessOverrideMutation();

  const confirmLift = async () => {
    if (!pendingLift) return;
    try {
      await lift({ userId, id: pendingLift.id }).unwrap();
      toast.success("Field exception lifted.");
      setPendingLift(null);
    } catch {
      // The shared API error handler presents the backend response.
    }
  };

  return (
    <section className={cn("min-w-0", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-black-01">Field exceptions</h3>
          <p className="mt-1 text-xs text-gray-05">
            {asAt
              ? "Read or Write access changed for this person alone, as it stood that day."
              : "Read or Write access changed for this person alone, on top of their roles."}
          </p>
          {readOnlyNote && <p className="mt-1 text-xs text-gray-01">{EXCEPTIONS_READ_ONLY}</p>}
        </div>
        {canCreate && (
          <Button variant="outline" size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="size-3.5" /> Add exception
          </Button>
        )}
      </div>

      <div className="mt-4">
        {query.isFetching && !query.currentData ? (
          <div className="rounded-md border border-white-02">
            <SkeletonLoadingLabel text="Loading field exceptions..." />
            {[0, 1].map((index) => (
              <SkeletonCard key={index} lines={2} rowIndex={index} />
            ))}
          </div>
        ) : query.isError ? (
          <p className="rounded-md bg-gray-03 px-3 py-6 text-center text-sm text-gray-01">
            {errorMessage(query.error) ?? "Could not load field exceptions."}
          </p>
        ) : rows.length === 0 ? (
          <p className="rounded-md bg-gray-03 px-3 py-6 text-center text-sm text-gray-01">
            No field exceptions. Field access comes entirely from roles.
          </p>
        ) : (
          <ul className="grid gap-3">
            {rows.map((row) => (
              <li
                key={row.id}
                className={cn(
                  "min-w-0 rounded-lg border border-white-02 px-3.5 py-3",
                  row.is_expired && "border-dashed bg-gray-04/40",
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className={cn(
                      "text-sm font-medium text-black-01",
                      row.is_expired && "text-gray-01 line-through",
                    )}>
                      {row.field_label}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      <Badge variant="outline">{row.access === "READ" ? "Read" : "Write"}</Badge>
                      <Badge variant={row.mode === "ALLOW" ? "success" : "rejected"}>
                        {row.mode === "ALLOW" ? (
                          <ShieldPlus className="size-3" />
                        ) : (
                          <ShieldMinus className="size-3" />
                        )}
                        {row.mode === "ALLOW" ? "Allowed" : "Denied"}
                      </Badge>
                    </div>
                  </div>
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => setPendingLift(row)}
                      className="inline-flex items-center gap-1 rounded-md border border-white-02 px-1.5 py-1 text-[11px] font-semibold text-gray-01 hover:border-destructive/40 hover:text-destructive"
                    >
                      <Trash2 className="size-3" /> Lift
                    </button>
                  )}
                </div>
                <p className="mt-2 flex items-start gap-1.5 text-xs text-gray-01">
                  <Info className="mt-0.5 size-3 shrink-0" />
                  <span>{fieldExceptionEffect(row)}</span>
                </p>
                <p className="mt-2 rounded-md bg-gray-04/60 px-2.5 py-1.5 text-xs text-gray-01">
                  “{row.reason}”
                </p>
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-gray-05">
                  <span>
                    Set by {row.created_by_name || "-"} · {formatRelativeDate(row.created_at)}
                  </span>
                  {row.expires_at ? (
                    <span className="inline-flex items-center gap-1">
                      <CalendarClock className="size-3" />
                      {row.is_expired ? "Expired" : `Expires ${formatExpiry(row.expires_at)}`}
                    </span>
                  ) : (
                    <span>No expiry</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {canCreate && (
        <AddFieldExceptionDrawer
          open={addOpen}
          onOpenChange={setAddOpen}
          userId={userId}
          userName={userName}
          existing={rows}
        />
      )}

      <Dialog
        open={Boolean(pendingLift)}
        onOpenChange={(open) => !open && setPendingLift(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Lift this field exception?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-01">
            {pendingLift?.field_label} returns to the access provided by this person's roles.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="white" size="sm" disabled={lifting.isLoading} onClick={() => setPendingLift(null)}>
              Cancel
            </Button>
            <Button size="sm" loading={lifting.isLoading} onClick={() => void confirmLift()}>
              Lift exception
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

/**
 * The form that adds one field exception for one person.
 *
 * The field is narrowed in the catalogue's Module, Resource, Field order, and
 * only resources that carry fields are offered. Nothing is preselected: the
 * Field box appears once a resource is chosen, with a prompt in its place until
 * then. Changing the module or the resource clears the chosen field, because a
 * field key belongs to exactly one resource. Access, mode, reason and expiry
 * keep what was entered.
 */
function AddFieldExceptionDrawer({
  open,
  onOpenChange,
  userId,
  userName,
  existing,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: number;
  userName?: string | null;
  existing: UserFieldAccessOverride[];
}) {
  const [fieldKey, setFieldKey] = useState("");
  const [access, setAccess] = useState<FieldAccessKind>("READ");
  const [mode, setMode] = useState<FieldAccessMode>("DENY");
  const [reason, setReason] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [touched, setTouched] = useState(false);
  const catalogue = useGetAccessCatalogueQuery(undefined, { skip: !open });
  const modules = useMemo(() => modulesWithFields(catalogue.data?.data ?? []), [catalogue.data]);
  const scope = useCatalogueScope(modules);
  const { activeModule, activeResource } = scope;
  const selectedField = activeResource?.fields.find((field) => field.key === fieldKey);
  const alreadyExists = existing.find(
    (row) => row.field_key === fieldKey && row.access === access,
  );
  const [create, saving] = useCreateUserFieldAccessOverrideMutation();

  const fieldOptions = useMemo(
    () =>
      (activeResource?.fields ?? []).map((field) => ({
        value: field.key,
        label: field.group ? `${field.label} - ${field.group}` : field.label,
      })),
    [activeResource],
  );

  const reset = () => {
    scope.clear();
    setFieldKey("");
    setAccess("READ");
    setMode("DENY");
    setReason("");
    setExpiresAt("");
    setTouched(false);
  };

  const submit = async () => {
    setTouched(true);
    if (!fieldKey || !reason.trim()) return;
    try {
      await create({
        userId,
        field: fieldKey,
        access,
        mode,
        reason: reason.trim(),
        // The end of the chosen day in the school's zone, not the device's.
        expires_at: expiresAt
          ? zonedInstant(expiresAt, "23:59:59", activeDisplayPrefs(null).timeZone)
          : null,
      }).unwrap();
      toast.success("Field exception applied.");
      reset();
      onOpenChange(false);
    } catch {
      // The shared API error handler presents the backend response.
    }
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <SheetContent className="flex w-full flex-col sm:max-w-[500px]">
        <SheetHeader className="border-b border-white-02">
          <SheetTitle className="text-base font-semibold font-mont">
            Add field exception
          </SheetTitle>
          <SheetDescription>
            Set Read or Write for one field, for {userName || "this user"} alone.
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="min-w-0 flex-1">
          <div className="space-y-5 px-4 py-4">
            <CatalogueScopeSelect
              idPrefix="field-exception"
              modules={modules}
              activeModule={activeModule}
              activeResource={activeResource}
              loading={catalogue.isFetching}
              onModuleChange={(key) => {
                scope.chooseModule(key);
                setFieldKey("");
              }}
              onResourceChange={(key) => {
                scope.chooseResource(key);
                setFieldKey("");
              }}
            />
            <CatalogueScopeNotice activeModule={activeModule} activeResource={activeResource} />
            {activeResource ? (
              <SearchSelect
                id="field-exception-field"
                label="Field"
                isRequired
                placeholder="Search field labels"
                revealOnSearch
                options={fieldOptions}
                loading={catalogue.isFetching}
                value={fieldKey}
                error={touched && !fieldKey ? "Choose a field." : undefined}
                onChange={(event) => {
                  const next = event.target.value;
                  setFieldKey(next);
                  const field = activeResource.fields.find((entry) => entry.key === next);
                  if (field && !field.writable) setAccess("READ");
                }}
              />
            ) : (
              <div className="grid gap-1.5">
                <p className="text-sm text-black-01 after:pl-1.5 after:text-error after:content-['*']">Field</p>
                <CatalogueScopePrompt noun="fields" />
                {touched && <p className="text-xs font-medium text-destructive/70">Choose a field.</p>}
              </div>
            )}

            <ChoiceButtons<FieldAccessKind>
              label="Access"
              value={access}
              options={[
                { value: "READ", label: "Read", note: "The Read switch for this field." },
                { value: "WRITE", label: "Write", note: "The Write switch for this field.", disabled: selectedField ? !selectedField.writable : false },
              ]}
              onChange={setAccess}
            />
            <ChoiceButtons<FieldAccessMode>
              label="Mode"
              value={mode}
              options={[
                { value: "DENY", label: "Deny", note: "Deny even when a role allows it." },
                { value: "ALLOW", label: "Allow", note: "Allow even when no role allows it." },
              ]}
              onChange={setMode}
            />

            {alreadyExists && (
              <p className="rounded-md bg-yellow-01/10 px-3 py-2 text-xs text-yellow-01">
                Saving replaces the existing {alreadyExists.mode === "ALLOW" ? "allow" : "deny"} {alreadyExists.access === "READ" ? "read" : "write"} exception on this field.
              </p>
            )}

            <div className="grid gap-1">
              <label htmlFor="field-exception-reason" className="text-sm text-black-01 after:pl-1.5 after:text-error after:content-['*']">
                Reason
              </label>
              <textarea
                id="field-exception-reason"
                rows={3}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                onBlur={() => setTouched(true)}
                className="w-full rounded-md border border-white-02 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                placeholder="Why this person needs the exception."
              />
              {touched && !reason.trim() && (
                <p className="text-xs font-medium text-error">A reason is required.</p>
              )}
            </div>
            <CustomDateInput
              id="field-exception-expiry"
              label="Expires on (optional)"
              placeholder="Never expires"
              value={expiresAt}
              onValueChange={setExpiresAt}
            />
          </div>
        </ScrollArea>
        <SheetFooter className="border-t border-white-02">
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button variant="white" className="sm:flex-1" disabled={saving.isLoading} onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button className="sm:flex-1" loading={saving.isLoading} onClick={() => void submit()}>
              {alreadyExists ? "Replace exception" : "Apply exception"}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function ChoiceButtons<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string; note: string; disabled?: boolean }[];
  onChange: (value: T) => void;
}) {
  return (
    <div>
      <p className="mb-1.5 text-sm text-black-01">{label}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            disabled={option.disabled}
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
            className={cn(
              "rounded-md border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-45",
              value === option.value
                ? "border-primary bg-primary/5"
                : "border-white-02 hover:border-primary/40",
            )}
          >
            <span className="block text-sm font-medium text-black-01">{option.label}</span>
            <span className="mt-1 block text-xs text-gray-01">{option.note}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
