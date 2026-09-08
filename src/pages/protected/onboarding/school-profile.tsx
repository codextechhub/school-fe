import { useFormik } from "formik";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { CircleAlert, Info, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CustomInput } from "@/components/custom/custom-input";
import { CustomNativeSelect } from "@/components/custom/custom-native-select";
import { routesPath } from "@/routes/routesPath";
import { requestSupportOpen } from "@/components/layout/support-open";
import { usePermissions } from "@/hooks/use-permissions";
import { P } from "@/permissions";
import {
  useGetSchoolProfileQuery,
  useUpdateSchoolProfileMutation,
} from "@/redux/services/school/school-api";
import type {
  SchoolProfile,
  SchoolProfileUpdate,
} from "@/redux/services/school/school-types";
import { schoolProfileSchema } from "@/schema/onboarding";
import { apiErrorMessage, parseApiError } from "@/utils/api-error";
import { SUPPORT_MAIL } from "@/utils/static";
import { LogoField } from "./components/logo-field";
import { OutlinedNotice } from "./components/outlined-notice";
import { PageShell } from "@/components/layout/page-shell";

/**
 * The school's own profile - the "Complete your school profile" step.
 *
 * Two halves, and the split is the point. What CodeX allocates when it creates
 * the school (its name, its address and its code) is shown and cannot be typed
 * over: the address in particular is the host every one of this school's users
 * signs in at. What only the school knows - how it is owned, how its year is
 * divided, what it trades in - is the form.
 *
 * The "still to fill in" line at the top is the server's own answer, read from
 * the same list the go-live gate uses, so this screen can never tell a school
 * it is finished while the checklist says otherwise.
 */
export default function SchoolProfilePage() {
  const navigate = useNavigate();
  const { data, isLoading, error, refetch } = useGetSchoolProfileQuery();
  const profile = data?.data ?? null;
  const { status } = parseApiError(error);

  if (isLoading) {
    return (
      <PageShell className="space-y-5" aria-busy>
        <span className="sr-only">Loading your school profile…</span>
        <Skeleton className="h-6 w-56" aria-hidden />
        <Skeleton className="h-96 w-full max-w-200 rounded-md" aria-hidden />
      </PageShell>
    );
  }

  if (status === 403) {
    return (
      <PageShell>
        <OutlinedNotice
          icon={ShieldOff}
          title="You cannot open your school's profile"
          body={`Your account does not carry access to this school's profile. Ask whoever set up your account, or reach CodeX at ${SUPPORT_MAIL}.`}
          actionLabel="Back to control room"
          onAction={() => navigate(routesPath.PROTECTED.ONBOARDING.INDEX)}
        />
      </PageShell>
    );
  }

  if (error || !profile) {
    return (
      <PageShell>
        <OutlinedNotice
          icon={CircleAlert}
          title="We could not load your school profile"
          body="Something went wrong on the way to the server. Nothing about your school has changed."
          actionLabel="Try again"
          onAction={() => refetch()}
        />
      </PageShell>
    );
  }

  return <ProfileForm profile={profile} />;
}

function ProfileForm({ profile }: { profile: SchoolProfile }) {
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const [update, { isLoading }] = useUpdateSchoolProfileMutation();

  // A branch admin may read this record - the currency and term structure
  // govern screens they work in - and may not change it. They get the same page
  // with the fields locked, rather than a form that collects their typing and
  // then answers 403 to the Save they were invited to press.
  const canEdit = hasPermission(P.UPDATE_SCHOOL_PROFILE);

  const formik = useFormik({
    initialValues: {
      ownership_type: profile.ownership_type ?? "",
      term_structure: profile.term_structure ?? "",
      currency: profile.currency ?? "",
      address: profile.address ?? "",
      website: profile.website ?? "",
      motto: profile.motto ?? "",
      registration_id: profile.registration_id ?? "",
    },
    validationSchema: schoolProfileSchema,
    onSubmit: async (values, helpers) => {
      // Only what actually moved. The endpoint refuses a payload that changes
      // nothing, and sending every field would make an untouched form look like
      // an edit to the audit trail this save writes.
      const changed: SchoolProfileUpdate = {};
      for (const [key, value] of Object.entries(values)) {
        const before = (profile as unknown as Record<string, string>)[key] ?? "";
        if (value !== before) {
          (changed as Record<string, string>)[key] = value;
        }
      }
      if (Object.keys(changed).length === 0) return;

      try {
        await update(changed).unwrap();
        toast.success("Saved. Your changes are recorded.");
        helpers.resetForm({ values });
      } catch (error) {
        toast.error(
          apiErrorMessage(error, "We could not save your profile. Try again."),
        );
      }
    },
  });

  const missing = profile.missing_required.filter(
    // name, slug and code are CodeX's to fix, so listing them here would be
    // telling the school to go and do something it cannot do.
    (row) => !["name", "slug", "code"].includes(row.field),
  );
  const notOursToFix = profile.missing_required.filter((row) =>
    ["name", "slug", "code"].includes(row.field),
  );

  return (
    <PageShell className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold font-mont text-black-01">
          Your school profile
        </h2>
        <p className="mt-1 text-sm text-gray-01 max-w-[70ch] text-pretty">
          The details XVS uses across every module. CodeX filled in most of this
          when it created your school; the rest is yours to confirm.
        </p>
      </div>

      {canEdit && missing.length > 0 && (
        <div className="rounded-md border border-yellow-01/40 bg-yellow-01/8 px-4 py-3 max-w-200">
          <p className="text-sm font-medium text-black-01">
            Still to fill in
          </p>
          <p className="mt-1 text-[13px] text-gray-01 text-pretty">
            {missing.map((row) => row.label).join(", ")}. This step stays open
            until they are all set.
          </p>
        </div>
      )}

      {notOursToFix.length > 0 && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 max-w-200">
          <p className="text-sm font-medium text-black-01">
            Something is missing that only CodeX can set
          </p>
          <p className="mt-1 text-[13px] text-gray-01 text-pretty">
            {notOursToFix.map((row) => row.label).join(", ")}. Raise this with
            CodeX and they will put it right.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => requestSupportOpen()}
          >
            Tell CodeX
          </Button>
        </div>
      )}

      {/* ── What CodeX set ────────────────────────────────────────────────── */}
      <section className="bg-white rounded-md border border-white-02 px-4 py-5 sm:px-6 max-w-200">
        <p className="text-xs uppercase tracking-widest text-gray-05 font-mont">
          Set by CodeX
        </p>
        <div className="mt-3 grid gap-4 sm:grid-cols-3">
          <ReadOnlyField label="School name" value={profile.name} />
          <ReadOnlyField label="Sign-in address" value={profile.slug} />
          <ReadOnlyField label="School code" value={profile.code} />
        </div>
        <p className="mt-3 flex items-start gap-1.5 text-xs text-gray-05 text-pretty">
          <Info className="size-3.5 shrink-0 mt-0.5" />
          Your sign-in address is the web address your staff use, so it is fixed
          here. If any of these is wrong, tell CodeX before you go live.
        </p>
      </section>

      <LogoField logoUrl={profile.logo} canEdit={canEdit} />

      {/* ── What the school sets ──────────────────────────────────────────── */}
      <form
        onSubmit={formik.handleSubmit}
        className="bg-white rounded-md border border-white-02 px-4 py-5 sm:px-6 space-y-4 max-w-200"
      >
        <p className="text-xs uppercase tracking-widest text-gray-05 font-mont">
          Yours to confirm
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Options come from the server with the record, so this form cannot
              offer a value the model will refuse. */}
          <CustomNativeSelect
            id="ownership_type"
            disabled={!canEdit}
            label="Ownership type"
            isRequired
            options={profile.options.ownership_type}
            placeholder="How is the school owned?"
            {...formik.getFieldProps("ownership_type")}
            error={
              formik.touched.ownership_type ? formik.errors.ownership_type : ""
            }
          />
          <CustomNativeSelect
            id="term_structure"
            disabled={!canEdit}
            label="Term structure"
            isRequired
            options={profile.options.term_structure}
            placeholder="How is your year divided?"
            {...formik.getFieldProps("term_structure")}
            error={
              formik.touched.term_structure ? formik.errors.term_structure : ""
            }
          />
          <CustomNativeSelect
            id="currency"
            disabled={!canEdit}
            label="Currency"
            isRequired
            options={profile.options.currency}
            placeholder="Select a currency"
            {...formik.getFieldProps("currency")}
            error={formik.touched.currency ? formik.errors.currency : ""}
          />
          <CustomInput
            id="registration_id"
            disabled={!canEdit}
            label="Registration number"
            placeholder="Optional"
            {...formik.getFieldProps("registration_id")}
            error={
              formik.touched.registration_id
                ? formik.errors.registration_id
                : ""
            }
          />
          <CustomInput
            id="address"
            disabled={!canEdit}
            label="Address"
            placeholder="Optional"
            containerClass="sm:col-span-2"
            {...formik.getFieldProps("address")}
            error={formik.touched.address ? formik.errors.address : ""}
          />
          <CustomInput
            id="website"
            disabled={!canEdit}
            label="Website"
            placeholder="https://example.com"
            {...formik.getFieldProps("website")}
            error={formik.touched.website ? formik.errors.website : ""}
          />
          <CustomInput
            id="motto"
            disabled={!canEdit}
            label="Motto"
            placeholder="Optional"
            {...formik.getFieldProps("motto")}
            error={formik.touched.motto ? formik.errors.motto : ""}
          />
        </div>

        {/* Not a setting. XVS shows West Africa Time everywhere and a school
            cannot change it, so it is stated rather than offered as a control
            that would do nothing. */}
        <p className="text-xs text-gray-05">
          All times are shown in West Africa Time (WAT).
        </p>

        <div className="flex flex-wrap gap-2 pt-1">
          {canEdit && (
            <Button
              type="submit"
              loading={isLoading}
              disabled={!formik.isValid || !formik.dirty || isLoading}
            >
              Save changes
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(routesPath.PROTECTED.ONBOARDING.INDEX)}
          >
            Back to control room
          </Button>
        </div>
        <p className="text-xs text-gray-05">
          {canEdit
            ? "Every save here is recorded against your school."
            : "You can read your school's profile. Changing it is the school administrator's to do."}
        </p>
      </form>
    </PageShell>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-sm text-black-01">{label}</p>
      <p className="mt-1.5 rounded-md bg-gray-03 px-3 py-2.5 text-sm text-gray-01 truncate">
        {value || "-"}
      </p>
    </div>
  );
}
