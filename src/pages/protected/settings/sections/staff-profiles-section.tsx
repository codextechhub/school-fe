import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { SettingsPanel, SettingsSectionHeader } from "@/components/settings/settings-layout";
import { usePermissions } from "@/hooks/use-permissions";
import { P } from "@/permissions";
import {
  useGetStaffProfileVisibilityQuery,
  useUpdateStaffProfileVisibilityMutation,
  type ConfigurableAudience,
  type StaffProfilePolicy,
} from "@/redux/services/school/staff-profile-visibility-api";
import type { StaffProfileSection } from "@/redux/services/staff/staff-types";
import { apiErrorMessage, parseApiError } from "@/utils/api-error";
import { SectionLoadError, SectionLoading } from "./shared";

/**
 * How much of a colleague's staff profile each relationship sees.
 *
 * Every member of staff reads the whole organogram and may open anybody's
 * profile from it; this grid decides what the profile then shows. A tick
 * gives that relationship the section even where the reader's role lacks the
 * key an administrator would need: a teacher who line-manages three others
 * reads those three people's leave and nobody else's. The contact card is
 * always shown. Administrators are not configured here: they see what their
 * role allows, as they always have. A role's field switches (Field Access)
 * still hide a field whatever the grid says.
 */
export function StaffProfilesSection() {
  const { hasPermission } = usePermissions();
  const canSave = hasPermission(P.UPDATE_FIELD_ACCESS);
  const query = useGetStaffProfileVisibilityQuery();
  const [save, { isLoading: saving }] = useUpdateStaffProfileVisibilityMutation();
  const data = query.data?.data;
  const [draft, setDraft] = useState<StaffProfilePolicy | null>(null);
  const [refusal, setRefusal] = useState<string | null>(null);
  const policy = draft ?? data?.policy ?? null;
  const dirty = useMemo(
    () => !!draft && !!data && JSON.stringify(draft) !== JSON.stringify(data.policy),
    [draft, data],
  );

  if (query.isLoading) return <SectionLoading label="Loading staff profile settings…" />;
  if (query.isError || !data || !policy) {
    return (
      <SectionLoadError
        forbidden={parseApiError(query.error).status === 403}
        retry={query.refetch}
      />
    );
  }

  const configurable = data.audiences.filter((a) => a.configurable);
  const fixed = data.audiences.filter((a) => !a.configurable);

  const toggle = (audience: ConfigurableAudience, group: StaffProfileSection, on: boolean) => {
    setRefusal(null);
    setDraft((current) => {
      const base = current ?? data.policy;
      const groups = new Set(base[audience]);
      if (on) groups.add(group); else groups.delete(group);
      return {
        ...base,
        [audience]: data.groups.map((g) => g.key).filter((key) => groups.has(key)),
      };
    });
  };

  const submit = async () => {
    if (!draft) return;
    setRefusal(null);
    try {
      await save({ policy: draft }).unwrap();
      setDraft(null);
      toast.success("Staff profiles now follow the new rules.");
    } catch (error) {
      setRefusal(apiErrorMessage(error, "The staff profile rules could not be saved."));
    }
  };

  return (
    <div className="space-y-5">
      <SettingsSectionHeader
        title="Staff profiles"
        description="Everybody at your school can open a colleague's profile from the organogram. Choose how much each relationship sees. Contact details are always shown."
        action={
          canSave ? (
            <div className="flex flex-wrap items-center gap-2">
              {data.source === "school" && (
                <Button variant="outline" size="sm" disabled={saving} onClick={() => setDraft(data.default_policy)}>
                  Use the defaults
                </Button>
              )}
              <Button size="sm" disabled={!dirty || saving} onClick={() => void submit()}>
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          ) : null
        }
      />

      {refusal && (
        <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {refusal}
        </p>
      )}

      <SettingsPanel
        title="Who sees what"
        description={
          data.source === "school"
            ? "Your school's own rules."
            : "The defaults, until your school saves its own."
        }
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-40">Section</TableHead>
              {data.audiences.map((a) => (
                <TableHead key={a.key} className="min-w-28 text-center" title={a.description}>
                  {a.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.groups.map((group) => (
              <TableRow key={group.key}>
                <TableCell className="align-top">
                  <div className="font-mont text-sm font-medium text-gray-01">{group.label}</div>
                  <div className="mt-0.5 max-w-xs whitespace-normal font-mont text-xs leading-5 text-gray-05">
                    {group.description}
                  </div>
                </TableCell>
                {configurable.map((a) => {
                  const key = a.key as ConfigurableAudience;
                  const on = group.locked || policy[key].includes(group.key);
                  return (
                    <TableCell key={a.key} className="text-center align-middle">
                      {group.locked ? (
                        <Lock className="mx-auto size-4 text-gray-05" aria-label="Always shown" />
                      ) : (
                        <Checkbox
                          checked={on}
                          disabled={!canSave || saving}
                          onCheckedChange={(value) => toggle(key, group.key, value === true)}
                          aria-label={`${a.label}: ${group.label}`}
                        />
                      )}
                    </TableCell>
                  );
                })}
                {fixed.map((a) => (
                  <TableCell key={a.key} className="text-center align-middle font-mont text-xs text-gray-05">
                    {a.summary ?? "Fixed"}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </SettingsPanel>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {data.audiences.map((a) => (
          <p key={a.key} className="font-mont text-xs leading-5 text-gray-05">
            <span className="font-semibold text-gray-01">{a.label}:</span> {a.description}
          </p>
        ))}
      </div>

      {!canSave && (
        <p className="font-mont text-xs text-gray-05">
          Only somebody who may change field access can change these rules.
        </p>
      )}
    </div>
  );
}
