import { Info } from "lucide-react";
import { SettingsSectionHeader } from "@/components/settings/settings-layout";
import { LogoField } from "@/components/school-profile/logo-field";
import { SchoolProfileForm } from "@/components/school-profile/school-profile-form";
import { usePermissions } from "@/hooks/use-permissions";
import { P } from "@/permissions";
import { useGetSchoolProfileQuery } from "@/redux/services/school/school-api";
import { parseApiError } from "@/utils/api-error";
import { SectionLoadError, SectionLoading } from "./shared";

/**
 * The school's identity after go-live: its crest and the details every module
 * prints.
 *
 * The same form as the onboarding step, so the two can never disagree. What
 * differs is only what the server allows: once the school is live, currency and
 * term structure are no longer in the record's editable fields and the form
 * shows them locked.
 */
export function ProfileSection() {
  const { hasPermission } = usePermissions();
  const { data, isLoading, error, refetch } = useGetSchoolProfileQuery();
  const profile = data?.data;

  if (isLoading) return <SectionLoading label="Loading your school profile…" />;
  if (error || !profile) {
    return (
      <SectionLoadError
        forbidden={parseApiError(error).status === 403}
        retry={refetch}
      />
    );
  }

  const canEdit = hasPermission(P.UPDATE_SCHOOL_PROFILE);

  return (
    <div className="space-y-5">
      <SettingsSectionHeader
        title="School profile"
        description="Your crest and the details XVS prints on letters, receipts and report cards across every module."
      />

      <section className="max-w-200 rounded-md border border-white-02 bg-white px-4 py-5 sm:px-6">
        <p className="font-mont text-xs uppercase tracking-widest text-gray-05">Set by XVS</p>
        <div className="mt-3 grid gap-4 sm:grid-cols-3">
          <ReadOnlyField label="School name" value={profile.name} />
          <ReadOnlyField label="Sign-in address" value={profile.slug} />
          <ReadOnlyField label="School code" value={profile.code} />
        </div>
        <p className="mt-3 flex items-start gap-1.5 text-pretty text-xs text-gray-05">
          <Info className="mt-0.5 size-3.5 shrink-0" />
          Your sign-in address is the web address your staff use, so it is fixed.
          If any of these is wrong, tell XVS.
        </p>
      </section>

      <LogoField logoUrl={profile.logo} canEdit={canEdit} />

      <SchoolProfileForm profile={profile} canEdit={canEdit} />
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-sm text-black-01">{label}</p>
      <p className="mt-1.5 truncate rounded-md bg-gray-03 px-3 py-2.5 text-sm text-gray-01">
        {value || "-"}
      </p>
    </div>
  );
}
