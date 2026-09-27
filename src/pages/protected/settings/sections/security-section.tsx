import { useState } from "react";
import { toast } from "sonner";
import { RotateCcw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import {
  PolicyBadge,
  SettingsPanel,
  SettingsRow,
  SettingsSectionHeader,
} from "@/components/settings/settings-layout";
import { usePermissions } from "@/hooks/use-permissions";
import { P } from "@/permissions";
import { useGetAllMyBranchesQuery } from "@/redux/services/branches/branches-api";
import {
  useGetSchoolSecuritySettingsQuery,
  useUpdateSchoolSecuritySettingsMutation,
} from "@/redux/services/school/school-settings-api";
import type {
  SecurityCompliance,
  SecuritySettingKey,
  SecuritySettingsData,
  SecuritySourceScope,
} from "@/redux/services/school/school-settings-types";
import { fieldErrorsFor, parseApiError, writeErrorMessage } from "@/utils/api-error";
import { SectionLoadError, SectionLoading } from "./shared";

const FIELDS: Array<{
  key: SecuritySettingKey;
  label: string;
  description: string;
  suffix: string;
}> = [
  {
    key: "failed_login_threshold",
    label: "Wrong passwords before an account locks",
    description: "How many times someone can mistype a password before their account locks.",
    suffix: "attempts",
  },
  {
    key: "account_lock_minutes",
    label: "How long a locked account stays locked",
    description: "After this, the person can try again, or an administrator can unlock them sooner.",
    suffix: "minutes",
  },
  {
    key: "self_reset_expiry_hours",
    label: "Password reset link a person asks for",
    description: "How long the link in a forgot-password email keeps working.",
    suffix: "hours",
  },
  {
    key: "admin_reset_expiry_hours",
    label: "Password reset link an administrator sends",
    description: "How long the link keeps working when an administrator resets someone's password.",
    suffix: "hours",
  },
  {
    key: "invitation_expiry_days",
    label: "Staff invitation",
    description: "How long a new staff member has to accept their invitation, including one that was resent.",
    suffix: "days",
  },
  {
    key: "proxy_idle_timeout_minutes",
    label: "XVS support session",
    description: "When XVS support signs in as one of your staff to help, the session ends after this long with nothing happening.",
    suffix: "minutes",
  },
];

const FIELD_KEYS = FIELDS.map((field) => field.key);

/** The range a value may take here: the product's range, narrowed by the parent's. */
function bounds(compliance: SecurityCompliance | undefined) {
  if (!compliance) return { min: 0, max: Number.MAX_SAFE_INTEGER };
  return compliance.direction === "minimum"
    ? { min: compliance.boundary, max: compliance.max }
    : { min: compliance.min, max: compliance.boundary };
}

/** "1 hour", "24 hours": the unit is written plural and read by count. */
const count = (value: number, unit: string) => `${value} ${value === 1 ? unit.replace(/s$/, "") : unit}`;

function boundText(compliance: SecurityCompliance | undefined, suffix: string) {
  if (!compliance) return "";
  const parent = compliance.parent_scope === "school" ? "the school's setting" : "the XVS baseline";
  const bound = count(compliance.boundary, suffix);
  return compliance.direction === "minimum"
    ? `At least ${bound}, because that is ${parent}.`
    : `At most ${bound}, because that is ${parent}.`;
}

/**
 * Sign-in and account recovery rules for this school, or for one branch of it.
 *
 * **A school can tighten these, never loosen them.** Each value is bounded by
 * its parent: a branch by the school, the school by the XVS baseline. A
 * school that shortens reset links to 2 hours is safer than the platform
 * requires, and allowed; one that stretches invitations to 90 days is not.
 * The inputs carry those bounds, and the server enforces them again.
 *
 * The branch picker is absent for a school with one branch, because there is
 * nothing to choose between.
 */
export function SecuritySection() {
  const { hasPermission } = usePermissions();
  const canSave = hasPermission(P.UPDATE_SETTINGS);
  const [branch, setBranch] = useState("");
  const branches = useGetAllMyBranchesQuery();
  const query = useGetSchoolSecuritySettingsQuery({ branch: branch || undefined });
  // currentData, not data: while another branch loads, `data` still holds the
  // previous scope's values, and a save from that form would write them here.
  const data = query.currentData?.data;

  const branchList = branches.data ?? [];
  const branchName = branchList.find((b) => String(b.id) === branch)?.name;

  return (
    <div className="space-y-5">
      <SettingsSectionHeader
        title="Sign-in and security"
        description="How strict sign-in and password recovery are for your staff. You can make any of these stricter than XVS requires, but never looser."
      />

      {branchList.length > 1 ? (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-white-02 bg-white p-4">
          <div className="w-full sm:w-60">
            <NativeSelect
              aria-label="Which settings to edit"
              value={branch}
              disabled={branches.isLoading}
              onChange={(event) => setBranch(event.target.value)}
            >
              <option value="">Whole school</option>
              {branchList.map((item) => (
                <option key={item.id} value={String(item.id)}>{item.name}</option>
              ))}
            </NativeSelect>
          </div>
          <p className="min-w-0 flex-1 font-mont text-xs leading-5 text-gray-05">
            {branchName
              ? `Changes here apply to ${branchName} only, and can only be stricter than the whole school's.`
              : "Changes here apply to every branch, unless a branch has been made stricter on its own."}
          </p>
        </div>
      ) : null}

      {data ? (
        // Keyed by scope, so switching branch starts a clean draft.
        <SecurityForm
          key={`${branch}:${JSON.stringify(data.settings)}`}
          data={data}
          branch={branch}
          scopeName={branchName ?? "the whole school"}
          canSave={canSave}
        />
      ) : query.isError ? (
        <SectionLoadError
          forbidden={parseApiError(query.error).status === 403}
          retry={query.refetch}
        />
      ) : (
        <SectionLoading label="Loading security settings…" />
      )}
    </div>
  );
}

function SecurityForm({
  data,
  branch,
  scopeName,
  canSave,
}: {
  data: SecuritySettingsData;
  branch: string;
  scopeName: string;
  canSave: boolean;
}) {
  const [save, { isLoading: saving }] = useUpdateSchoolSecuritySettingsMutation();
  const [draft, setDraft] = useState<Record<SecuritySettingKey, string>>(
    () => Object.fromEntries(FIELD_KEYS.map((key) => [key, String(data.settings[key])])) as Record<SecuritySettingKey, string>,
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const problem = (key: SecuritySettingKey): string => {
    const raw = draft[key].trim();
    const value = Number(raw);
    if (raw === "" || !Number.isInteger(value)) return "Enter a whole number.";
    const { min, max } = bounds(data.compliance[key]);
    if (value < min) return `Must be ${min} or more.`;
    if (value > max) return `Must be ${max} or less.`;
    return "";
  };

  const changed = FIELD_KEYS.filter((key) => Number(draft[key]) !== data.settings[key]);
  const invalid = FIELD_KEYS.some((key) => problem(key) !== "");

  const submit = async (patch: Partial<Record<SecuritySettingKey, number | null>>, done: string) => {
    setErrors({});
    try {
      await save({ ...patch, branch: branch || undefined }).unwrap();
      toast.success(done);
    } catch (error) {
      const byField = fieldErrorsFor(error, FIELD_KEYS);
      setErrors(byField);
      if (Object.keys(byField).length === 0) {
        toast.error(writeErrorMessage(error, "We could not save these settings. Try again."));
      }
    }
  };

  const onSave = () => {
    if (invalid || changed.length === 0) return;
    submit(
      Object.fromEntries(changed.map((key) => [key, Number(draft[key])])),
      `Saved for ${scopeName}.`,
    );
  };

  return (
    <SettingsPanel
      title="Rules"
      description={`These apply to ${scopeName}. Every change is recorded with who made it.`}
    >
      {FIELDS.map((field) => {
        const compliance = data.compliance[field.key];
        const { min, max } = bounds(compliance);
        const error = errors[field.key] || problem(field.key);
        return (
          <SettingsRow
            key={field.key}
            icon={ShieldCheck}
            label={field.label}
            description={[field.description, boundText(compliance, field.suffix)].filter(Boolean).join(" ")}
            badge={<SourceBadge source={data.source_scopes[field.key]} />}
            value={
              <span className="flex flex-col items-end gap-1">
                <span className="flex flex-wrap items-center justify-end gap-2">
                  <Input
                    aria-label={field.label}
                    type="number"
                    inputMode="numeric"
                    min={min}
                    max={max}
                    disabled={!canSave}
                    aria-invalid={error ? true : undefined}
                    className="w-24"
                    value={draft[field.key]}
                    onChange={(event) => setDraft({ ...draft, [field.key]: event.target.value })}
                  />
                  <span className="w-16 text-left font-mont text-xs font-normal text-gray-05">{field.suffix}</span>
                  {canSave && data.overrides[field.key] ? (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={saving}
                      onClick={() => submit({ [field.key]: null }, "Put back to the inherited value.")}
                    >
                      <RotateCcw className="size-3.5" />
                      Reset
                    </Button>
                  ) : null}
                </span>
                {error ? (
                  <span role="alert" className="font-mont text-[11px] font-normal text-destructive">{error}</span>
                ) : null}
              </span>
            }
          />
        );
      })}
      {canSave ? (
        <div className="flex flex-wrap items-center justify-end gap-3 px-4 py-3.5 sm:px-5">
          {changed.length > 0 ? (
            <span className="font-mont text-xs text-gray-05">
              {changed.length} unsaved {changed.length === 1 ? "change" : "changes"}
            </span>
          ) : null}
          <Button onClick={onSave} loading={saving} disabled={invalid || changed.length === 0 || saving}>
            Save
          </Button>
        </div>
      ) : (
        <p className="px-4 py-3.5 font-mont text-xs text-gray-05 sm:px-5">
          You can read these rules. Changing them is the school administrator's to do.
        </p>
      )}
    </SettingsPanel>
  );
}

function SourceBadge({ source }: { source?: SecuritySourceScope }) {
  if (source === "branch") return <PolicyBadge kind="configured">Set for this branch</PolicyBadge>;
  if (source === "school") return <PolicyBadge kind="configured">Set by your school</PolicyBadge>;
  if (source === "platform") return <PolicyBadge kind="enforced">XVS baseline</PolicyBadge>;
  return <PolicyBadge kind="default">Default</PolicyBadge>;
}
