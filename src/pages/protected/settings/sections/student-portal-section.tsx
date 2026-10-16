import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  SettingsPanel,
  SettingsSectionHeader,
} from "@/components/settings/settings-layout";
import { P } from "@/permissions";
import {
  useGetStudentPortalRulesQuery,
  useUpdateStudentPortalRulesMutation,
} from "@/redux/services/students/students-api";
import type { StudentPortalRules } from "@/redux/services/students/students-types";
import { parseApiError, writeErrorMessage } from "@/utils/api-error";
import { useSettingsWrite } from "../use-settings-write";
import { readSessionDays } from "./session-days";
import { ReadOnlyNote, SectionLoadError, SectionLoading } from "./shared";

/**
 * What students may do for themselves in the student portal.
 *
 * A student signs in on the school's own sign-in page with their admission
 * number or email, once portal access has been given from their profile.
 * Most of what they see is read-only; the photograph is the one record they
 * may change, and this decides whether they may. It also sets how long a
 * student stays signed in to the student app on their phone between uses.
 *
 * One rule for every branch, so a branch-bound reader sees it and cannot save
 * it. Whether students may pay their own fees sits with the fee rules in
 * Finance settings, beside the fee due date.
 */
export function StudentPortalSection() {
  const query = useGetStudentPortalRulesQuery();
  const rules = query.data?.data;

  if (query.isLoading) return <SectionLoading label="Loading student portal rules…" />;
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
        title="Student portal"
        description="What students may change for themselves once they can sign in. Whether they may pay their own fees is set in Finance settings, under Fee due dates."
      />
      <StudentPortalForm key={JSON.stringify(rules)} rules={rules} />
    </div>
  );
}

function StudentPortalForm({ rules }: { rules: StudentPortalRules }) {
  const { canSave, reason } = useSettingsWrite(P.UPDATE_SETTINGS);
  const [save, { isLoading: saving }] = useUpdateStudentPortalRulesMutation();
  const [photo, setPhoto] = useState(rules.photo_self_edit);
  const [days, setDays] = useState(String(rules.session_days));
  const read = readSessionDays(days);
  const photoChanged = photo !== rules.photo_self_edit;
  const daysChanged = !read.problem && read.days !== rules.session_days;
  const changed = photoChanged || daysChanged;

  const onSave = async () => {
    if (!changed || read.problem) return;
    try {
      await save({
        ...(photoChanged ? { photo_self_edit: photo } : {}),
        ...(daysChanged && read.days !== null ? { session_days: read.days } : {}),
      }).unwrap();
      toast.success("Student portal rules saved.");
    } catch (error) {
      toast.error(writeErrorMessage(error, "We could not save these rules. Try again."));
    }
  };

  return (
    <div className="space-y-5">
      <SettingsPanel title="Photograph" description="The picture on the student's profile, ID card and report card.">
        <label className="flex items-start gap-3 px-4 py-4 sm:px-5">
          <Switch
            checked={photo}
            onCheckedChange={setPhoto}
            disabled={!canSave}
            aria-label="Students may change their own photograph"
          />
          <span className="min-w-0">
            <span className="block font-mont text-sm font-medium text-gray-01">
              Students may change their own photograph
            </span>
            <span className="mt-0.5 block font-mont text-xs leading-5 text-gray-05">
              {photo
                ? "A student can upload a new photograph or remove theirs from the portal. Staff can still change it from the student's profile."
                : "Only staff can change a student's photograph, from the student's profile."}
            </span>
          </span>
        </label>
      </SettingsPanel>

      <SettingsPanel
        title="Staying signed in"
        description="How long a student stays signed in to the student app on their phone or tablet without opening it."
      >
        <label className="block min-w-0 px-4 py-4 sm:px-5">
          <span className="font-mont text-sm font-medium text-gray-01">Days signed in</span>
          <span className="mt-0.5 block font-mont text-xs leading-5 text-gray-05">
            Each time a student opens the app the count starts again, so a student who uses it every week never has to sign in. From 1 to 90 days.
          </span>
          <Input
            className="mt-2 max-w-32"
            inputMode="numeric"
            disabled={!canSave}
            aria-invalid={read.problem ? true : undefined}
            value={days}
            onChange={(event) => setDays(event.target.value)}
          />
          {read.problem ? (
            <p role="alert" className="mt-1.5 font-mont text-[11px] text-destructive">
              {read.problem}
            </p>
          ) : null}
        </label>
      </SettingsPanel>

      {canSave ? (
        <div className="flex flex-wrap items-center justify-end gap-3">
          {changed ? <span className="font-mont text-xs text-gray-05">Unsaved changes</span> : null}
          <Button onClick={onSave} loading={saving} disabled={!changed || saving || Boolean(read.problem)}>
            Save student portal rules
          </Button>
        </div>
      ) : (
        <ReadOnlyNote reason={reason} />
      )}
    </div>
  );
}
