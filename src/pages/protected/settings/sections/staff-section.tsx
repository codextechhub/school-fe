import { useState } from "react";
import { toast } from "sonner";
import { Link } from "react-router";
import { CircleAlert, Lock, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import {
  SettingsPanel,
  SettingsSectionHeader,
} from "@/components/settings/settings-layout";
import { cn } from "@/lib/utils";
import { P } from "@/permissions";
import { routesPath } from "@/routes/routesPath";
import {
  useGetStaffRulesQuery,
  useUpdateStaffRulesMutation,
} from "@/redux/services/staff/staff-api";
import type { StaffRules } from "@/redux/services/staff/staff-types";
import { fieldErrorsFor, parseApiError, writeErrorMessage } from "@/utils/api-error";
import { useSettingsWrite } from "../use-settings-write";
import { ReadOnlyNote, SectionLoadError, SectionLoading } from "./shared";

const WEEKDAYS = [
  { value: 1, short: "Mon", label: "Monday" },
  { value: 2, short: "Tue", label: "Tuesday" },
  { value: 3, short: "Wed", label: "Wednesday" },
  { value: 4, short: "Thu", label: "Thursday" },
  { value: 5, short: "Fri", label: "Friday" },
  { value: 6, short: "Sat", label: "Saturday" },
  { value: 7, short: "Sun", label: "Sunday" },
];

const FIELDS = [
  "starting_role",
  "required_documents",
  "self_editable_fields",
  "hire_requires_approval",
  "leave",
] as const;

/**
 * The school's own rules for its staff.
 *
 * The role a new member of staff starts with, the documents the school
 * expects on file, the details staff may change on their own record, whether
 * a hire needs approval before the invitation goes out, and how leave is
 * counted: an allowance per leave type for each academic session, and which
 * days count as working days.
 *
 * Two of these guide rather than refuse. A missing document marks the record
 * for someone to chase and never stops a start, because a school hiring on a
 * Friday for Monday rarely has every paper in hand. Leave past an allowance is
 * shown to the approver, who decides.
 */
export function StaffSection() {
  const query = useGetStaffRulesQuery();
  const rules = query.data?.data;

  if (query.isLoading) return <SectionLoading label="Loading staff rules…" />;
  if (query.isError || !rules) {
    return (
      <SectionLoadError
        forbidden={parseApiError(query.error).status === 403}
        retry={query.refetch}
      />
    );
  }

  return (
    <div className="space-y-5">
      <SettingsSectionHeader
        title="Staff rules"
        description="How new staff start, what the school keeps on file, what staff change themselves, and how leave is counted."
      />
      <StaffForm key={JSON.stringify(rules)} rules={rules} />
    </div>
  );
}

/** "20" or "" (no limit) per leave type, as the inputs hold them. */
function allowanceDraft(rules: StaffRules): Record<string, string> {
  return Object.fromEntries(
    rules.leave.leave_types.map((t) => {
      const days = rules.leave.allowances[t.value];
      return [t.value, days == null ? "" : String(days)];
    }),
  );
}

function StaffForm({ rules }: { rules: StaffRules }) {
  const { canSave, reason } = useSettingsWrite(P.UPDATE_SETTINGS);
  const [save, { isLoading: saving }] = useUpdateStaffRulesMutation();
  const [role, setRole] = useState(rules.starting_role);
  const [documents, setDocuments] = useState<string[]>(rules.required_documents);
  const [selfEdit, setSelfEdit] = useState<string[]>(rules.self_editable_fields);
  const [approval, setApproval] = useState(rules.hire_requires_approval);
  const [allowances, setAllowances] = useState(() => allowanceDraft(rules));
  const [groups, setGroups] = useState(rules.leave.groups);
  const [overrides, setOverrides] = useState(rules.leave.overrides.map((row) => ({ ...row, days: row.days == null ? "" : String(row.days) })));
  const [workingDays, setWorkingDays] = useState<number[]>(rules.leave.working_days);
  const [excludeClosures, setExcludeClosures] = useState(rules.leave.exclude_closures);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const allowanceProblem = (text: string) => {
    if (text.trim() === "") return "";
    const days = Number(text);
    return Number.isInteger(days) && days >= 0 && days <= 366 ? "" : "Use 0 to 366 days, or leave it blank for no limit.";
  };
  const allowanceInvalid = Object.values(allowances).some((v) => allowanceProblem(v));
  const groupInvalid = groups.some((row) => !row.name.trim() || row.name.length > 80) ||
    new Set(groups.map((row) => row.name.trim().toLowerCase())).size !== groups.length;
  const overrideInvalid = overrides.some((row) =>
    (!row.branch_id && !row.group_id) || !!allowanceProblem(row.days),
  ) || new Set(overrides.map((row) => `${row.branch_id ?? ""}:${row.group_id ?? ""}:${row.leave_type}`)).size !== overrides.length;
  const daysProblem = workingDays.length === 0 ? "Choose at least one working day." : "";

  const sorted = (list: (string | number)[]) => [...list].sort().join();
  const changed =
    role !== rules.starting_role ||
    sorted(documents) !== sorted(rules.required_documents) ||
    sorted(selfEdit) !== sorted(rules.self_editable_fields) ||
    approval !== rules.hire_requires_approval ||
    JSON.stringify(allowances) !== JSON.stringify(allowanceDraft(rules)) ||
    JSON.stringify(groups) !== JSON.stringify(rules.leave.groups) ||
    JSON.stringify(overrides) !== JSON.stringify(rules.leave.overrides.map((row) => ({ ...row, days: row.days == null ? "" : String(row.days) }))) ||
    sorted(workingDays) !== sorted(rules.leave.working_days) ||
    excludeClosures !== rules.leave.exclude_closures;

  const toggle = <T,>(list: T[], item: T, on: boolean) =>
    on ? [...list, item] : list.filter((x) => x !== item);

  const onSave = async () => {
    if (!changed || allowanceInvalid || groupInvalid || overrideInvalid || daysProblem) return;
    setErrors({});
    try {
      await save({
        starting_role: role,
        required_documents: documents,
        self_editable_fields: selfEdit,
        hire_requires_approval: approval,
        leave: {
          allowances: Object.fromEntries(
            Object.entries(allowances).map(([type, text]) => [type, text.trim() === "" ? null : Number(text)]),
          ),
          groups: groups.map((row) => ({ ...row, name: row.name.trim() })),
          overrides: overrides.map((row) => ({ ...row, days: row.days.trim() === "" ? null : Number(row.days) })),
          working_days: [...workingDays].sort(),
          exclude_closures: excludeClosures,
        },
      }).unwrap();
      toast.success("Staff rules saved.");
    } catch (error) {
      const byField = fieldErrorsFor(error, FIELDS);
      setErrors(byField);
      if (Object.keys(byField).length === 0) {
        toast.error(writeErrorMessage(error, "We could not save these rules. Try again."));
      }
    }
  };

  return (
    <div className="space-y-5">
      <SettingsPanel
        title="Starting role"
        description="The role everybody added to the staff starts with. Give anyone a different role from their profile afterwards."
      >
        <div className="px-4 py-4 sm:px-5">
          <div className="w-full sm:w-72">
            <NativeSelect
              aria-label="Starting role"
              value={role}
              disabled={!canSave}
              onChange={(event) => setRole(event.target.value)}
            >
              {rules.starting_role_options.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </NativeSelect>
          </div>
          <ErrorLine text={errors.starting_role} />
        </div>
      </SettingsPanel>

      <SettingsPanel
        title="Documents on file"
        description="What the school expects on every staff record. A missing one is flagged on the record for someone to chase, and never stops a person starting."
      >
        <CheckGrid
          options={rules.document_types}
          selected={documents}
          disabled={!canSave}
          onToggle={(value, on) => setDocuments(toggle(documents, value, on))}
        />
        <ErrorLine text={errors.required_documents} padded />
      </SettingsPanel>

      <SettingsPanel
        title="What staff change themselves"
        description="The details anyone on the staff may change on their own record. Everything else is changed for them by somebody who manages staff."
      >
        <CheckGrid
          options={rules.self_editable_options}
          selected={selfEdit}
          disabled={!canSave}
          onToggle={(value, on) => setSelfEdit(toggle(selfEdit, value, on))}
        />
        {rules.self_editable_locked.length > 0 ? (
          <p className="flex items-start gap-1.5 px-4 pb-4 font-mont text-[11px] leading-4 text-gray-05 sm:px-5">
            <Lock className="mt-0.5 size-3 shrink-0" aria-hidden />
            Never changed by the person themselves: {rules.self_editable_locked.map((o) => o.label).join(", ")}.
          </p>
        ) : null}
        <ErrorLine text={errors.self_editable_fields} padded />
      </SettingsPanel>

      <SettingsPanel title="Hiring">
        <label className="flex items-start justify-between gap-4 px-4 py-4 sm:px-5">
          <span className="min-w-0">
            <span className="block font-mont text-sm font-medium text-gray-01">Approve a hire before the invitation goes out</span>
            <span className="mt-0.5 block font-mont text-xs leading-5 text-gray-05">
              When on, a new member of staff waits on the school&apos;s approvers in Workflow, and their
              invitation email is sent only once the hire is approved. A declined hire is closed.
            </span>
          </span>
          <Switch
            checked={approval}
            disabled={!canSave}
            onCheckedChange={setApproval}
            aria-label="Approve a hire before the invitation goes out"
          />
        </label>
        {approval ? (
          <p className="mx-4 mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 font-mont text-xs leading-5 text-amber-900 sm:mx-5">
            <CircleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            <span>
              Hires wait on the school&apos;s hire approvers group, which starts empty. Until somebody is in
              it, every new member of staff waits with nobody to approve them.{" "}
              <Link to={routesPath.PROTECTED.WORKFLOW.APPROVER_GROUPS} className="font-medium underline">
                Add approvers
              </Link>
            </span>
          </p>
        ) : null}
        <ErrorLine text={errors.hire_requires_approval} padded />
      </SettingsPanel>

      <SettingsPanel
        title="Leave allowances"
        description="Days per academic session. The count starts again when a new session begins. Leave past an allowance is shown to the approver, who decides. Leave blank for no limit."
      >
        <div className="grid grid-cols-1 gap-3 px-4 py-4 sm:grid-cols-2 sm:px-5 lg:grid-cols-3">
          {rules.leave.leave_types.map((type) => {
            const problem = allowanceProblem(allowances[type.value] ?? "");
            return (
              <label key={type.value} className="block min-w-0">
                <span className="font-mont text-xs text-gray-01">{type.label}</span>
                <Input
                  className="mt-1"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={366}
                  placeholder="No limit"
                  disabled={!canSave}
                  aria-invalid={problem ? true : undefined}
                  value={allowances[type.value] ?? ""}
                  onChange={(e) => setAllowances({ ...allowances, [type.value]: e.target.value })}
                />
                {problem ? (
                  <span role="alert" className="mt-1 block font-mont text-[11px] text-destructive">{problem}</span>
                ) : null}
              </label>
            );
          })}
        </div>
      </SettingsPanel>

      <SettingsPanel
        title="Leave groups"
        description="Assign a group on each staff profile. An unassigned person follows the school or branch default."
      >
        <div className="space-y-3 px-4 py-4 sm:px-5">
          {groups.map((group, index) => (
            <div key={group.id} className="flex min-w-0 flex-wrap items-center gap-2">
              <Input
                className="min-w-0 flex-1 sm:max-w-72"
                aria-label={`Leave group ${index + 1}`}
                placeholder="Example: Senior staff"
                maxLength={80}
                value={group.name}
                disabled={!canSave}
                onChange={(event) => setGroups(groups.map((row) => row.id === group.id ? { ...row, name: event.target.value } : row))}
              />
              {canSave && <Button type="button" variant="outline" aria-label={`Remove ${group.name || "leave group"}`} onClick={() => {
                setGroups(groups.filter((row) => row.id !== group.id));
                setOverrides(overrides.filter((row) => row.group_id !== group.id));
              }}><Trash2 className="size-4" /></Button>}
            </div>
          ))}
          {groupInvalid && <ErrorLine text="Give each group a different name." />}
          {canSave && <Button type="button" variant="outline" onClick={() => setGroups([...groups, { id: crypto.randomUUID(), name: "" }])}><Plus className="size-4" /> Add group</Button>}
        </div>
      </SettingsPanel>

      <SettingsPanel
        title="Leave exceptions"
        description="Set a different allowance for a branch, a group, or both. A group rule takes priority over a branch rule; a combined rule takes priority over both. Leave days blank for no limit. Remove an exception to inherit the default."
      >
        <div className="space-y-3 px-4 py-4 sm:px-5">
          {overrides.map((row, index) => (
            <div key={index} className="grid min-w-0 grid-cols-1 gap-2 rounded-lg border border-white-02 p-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_8rem_auto]">
              {rules.leave.branch_options.length > 1 && <NativeSelect aria-label={`Exception ${index + 1} branch`} disabled={!canSave} value={row.branch_id ?? ""} onChange={(event) => setOverrides(overrides.map((item, n) => n === index ? { ...item, branch_id: event.target.value ? Number(event.target.value) : null } : item))}>
                <option value="">All branches</option>
                {rules.leave.branch_options.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
              </NativeSelect>}
              <NativeSelect aria-label={`Exception ${index + 1} group`} disabled={!canSave} value={row.group_id ?? ""} onChange={(event) => setOverrides(overrides.map((item, n) => n === index ? { ...item, group_id: event.target.value || null } : item))}>
                <option value="">All staff</option>
                {groups.map((group) => <option key={group.id} value={group.id}>{group.name || "Unnamed group"}</option>)}
              </NativeSelect>
              <NativeSelect aria-label={`Exception ${index + 1} leave type`} disabled={!canSave} value={row.leave_type} onChange={(event) => setOverrides(overrides.map((item, n) => n === index ? { ...item, leave_type: event.target.value } : item))}>
                {rules.leave.leave_types.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
              </NativeSelect>
              <Input aria-label={`Exception ${index + 1} days`} type="number" min={0} max={366} placeholder="No limit" disabled={!canSave} value={row.days} onChange={(event) => setOverrides(overrides.map((item, n) => n === index ? { ...item, days: event.target.value } : item))} />
              {canSave && <Button type="button" variant="outline" aria-label={`Remove exception ${index + 1}`} onClick={() => setOverrides(overrides.filter((_, n) => n !== index))}><Trash2 className="size-4" /></Button>}
            </div>
          ))}
          {overrideInvalid && <ErrorLine text="Each exception needs a branch or group, a valid day count, and a unique branch, group and leave type." />}
          {canSave && <Button type="button" variant="outline" disabled={!groups.length && rules.leave.branch_options.length < 2} onClick={() => setOverrides([...overrides, { branch_id: groups.length ? null : rules.leave.branch_options[0]?.id ?? null, group_id: groups[0]?.id ?? null, leave_type: rules.leave.leave_types[0].value, days: "" }])}><Plus className="size-4" /> Add exception</Button>}
          {canSave && !groups.length && rules.leave.branch_options.length < 2 && (
            <p className="font-mont text-xs text-gray-05">Add a leave group to set a different allowance for some staff.</p>
          )}
        </div>
      </SettingsPanel>

      <SettingsPanel
        title="Counting leave days"
        description="Which days a leave request counts. A new request is counted this way; requests already filed keep their days."
      >
        <div className="space-y-4 px-4 py-4 sm:px-5">
          <div>
            <p className="font-mont text-xs text-gray-01">Working days</p>
            <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Working days">
              {WEEKDAYS.map((day) => {
                const on = workingDays.includes(day.value);
                return (
                  <button
                    key={day.value}
                    type="button"
                    disabled={!canSave}
                    aria-pressed={on}
                    aria-label={day.label}
                    onClick={() => setWorkingDays(toggle(workingDays, day.value, !on))}
                    className={cn(
                      "min-w-12 rounded-lg border px-3 py-1.5 font-mont text-xs transition-colors disabled:cursor-not-allowed",
                      on ? "border-primary bg-primary/5 font-semibold text-primary" : "border-white-02 bg-white text-gray-05 hover:border-gray-02",
                    )}
                  >
                    {day.short}
                  </button>
                );
              })}
            </div>
            <ErrorLine text={daysProblem} />
          </div>
          <label className="flex items-start justify-between gap-4">
            <span className="min-w-0">
              <span className="block font-mont text-sm font-medium text-gray-01">Leave out days the school is closed</span>
              <span className="mt-0.5 block font-mont text-xs leading-5 text-gray-05">
                Public holidays and breaks on the school calendar do not count against anybody&apos;s leave.
              </span>
            </span>
            <Switch
              checked={excludeClosures}
              disabled={!canSave}
              onCheckedChange={setExcludeClosures}
              aria-label="Leave out days the school is closed"
            />
          </label>
          <ErrorLine text={errors.leave} />
        </div>
      </SettingsPanel>

      {canSave ? (
        <div className="flex flex-wrap items-center justify-end gap-3">
          {changed ? <span className="font-mont text-xs text-gray-05">Unsaved changes</span> : null}
          <Button
            onClick={onSave}
            loading={saving}
            disabled={!changed || allowanceInvalid || groupInvalid || overrideInvalid || !!daysProblem || saving}
          >
            Save staff rules
          </Button>
        </div>
      ) : (
        <ReadOnlyNote reason={reason} />
      )}
    </div>
  );
}

function CheckGrid({
  options,
  selected,
  disabled,
  onToggle,
}: {
  options: { value: string; label: string }[];
  selected: string[];
  disabled: boolean;
  onToggle: (value: string, on: boolean) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-2.5 px-4 py-4 sm:grid-cols-2 sm:px-5">
      {options.map((option) => (
        <label key={option.value} className="flex min-w-0 items-center gap-2.5 font-mont text-sm text-gray-01">
          <Checkbox
            checked={selected.includes(option.value)}
            disabled={disabled}
            onCheckedChange={(on) => onToggle(option.value, on === true)}
          />
          <span className="min-w-0">{option.label}</span>
        </label>
      ))}
    </div>
  );
}

function ErrorLine({ text, padded }: { text?: string; padded?: boolean }) {
  if (!text) return null;
  return (
    <p role="alert" className={cn("mt-1 font-mont text-[11px] text-destructive", padded && "px-4 pb-3 sm:px-5")}>
      {text}
    </p>
  );
}
