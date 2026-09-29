import type { ReactNode } from "react";
import { useFormik } from "formik";
import { toast } from "sonner";
import { Link } from "react-router";
import { LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CustomInput } from "@/components/custom/custom-input";
import { CustomNativeSelect } from "@/components/custom/custom-native-select";
import { useUpdateSchoolProfileMutation } from "@/redux/services/school/school-api";
import type {
  SchoolProfile,
  SchoolProfileUpdate,
} from "@/redux/services/school/school-types";
import { requestSupportOpen } from "@/components/layout/support-open";
import { routesPath } from "@/routes/routesPath";
import { schoolProfileSchema } from "@/schema/onboarding";
import { writeErrorMessage } from "@/utils/api-error";

type ProfileField = keyof SchoolProfileUpdate;

/**
 * The part of the school profile the school itself fills in.
 *
 * Used by the onboarding profile step and by Settings, so the two can never
 * offer different fields or different rules.
 *
 * **What is editable is the server's answer, not this form's.** A field is
 * open only when the reader may edit the profile (`canEdit`) AND the record's
 * `editable_fields` names it. Currency and term structure drop out of that list
 * once a school is live, because a ledger already posted in one currency cannot
 * be re-read in another, and a term structure already carrying fees cannot be
 * re-cut. Those two are then shown locked with the reason, rather than offered
 * as a select whose Save the server refuses.
 *
 * Locked, the term structure is only where the school started: the word it
 * uses (Term or Semester) and the parts of its year are its own to change in
 * Settings, Academic structure, and the note under the field says so.
 */
export function SchoolProfileForm({
  profile,
  canEdit,
  footer,
  readOnlyText = "You can read your school's profile. Changing it is the school administrator's to do.",
}: {
  profile: SchoolProfile;
  canEdit: boolean;
  /** Extra actions beside Save, such as a way back to the checklist. */
  footer?: ReactNode;
  /** Why a reader who may not edit is only reading. */
  readOnlyText?: string;
}) {
  const [update, { isLoading }] = useUpdateSchoolProfileMutation();
  const editable = new Set(profile.editable_fields);
  const open = (field: ProfileField) => canEdit && editable.has(field);
  const lockedByServer = (field: ProfileField) =>
    canEdit && !editable.has(field);

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
    enableReinitialize: true,
    onSubmit: async (values, helpers) => {
      // Only what moved, and only what the server accepts. The endpoint refuses
      // a payload that changes nothing, and an untouched field sent back would
      // read as an edit in the audit trail this save writes.
      const changed: SchoolProfileUpdate = {};
      for (const [key, value] of Object.entries(values) as [ProfileField, string][]) {
        if (!editable.has(key)) continue;
        if (value !== (profile[key] ?? "")) changed[key] = value;
      }
      if (Object.keys(changed).length === 0) return;

      try {
        await update(changed).unwrap();
        toast.success("Saved. Your changes are recorded.");
        helpers.resetForm({ values });
      } catch (error) {
        toast.error(writeErrorMessage(error, "We could not save your profile. Try again."));
      }
    },
  });

  const lockNote = (field: ProfileField) =>
    lockedByServer(field) ? <LockedNote /> : null;

  return (
    <form
      onSubmit={formik.handleSubmit}
      className="bg-white rounded-md border border-white-02 px-4 py-5 sm:px-6 space-y-4 max-w-200"
    >
      <p className="text-xs uppercase tracking-widest text-gray-05 font-mont">
        Yours to confirm
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Options ship with the record, so no value here is one the server refuses. */}
        <CustomNativeSelect
          id="ownership_type"
          disabled={!open("ownership_type")}
          label="Ownership type"
          isRequired
          options={profile.options.ownership_type}
          placeholder="How is the school owned?"
          {...formik.getFieldProps("ownership_type")}
          error={formik.touched.ownership_type ? formik.errors.ownership_type : ""}
        />
        <div className="min-w-0">
          <CustomNativeSelect
            id="term_structure"
            disabled={!open("term_structure")}
            label="Term structure"
            isRequired
            options={profile.options.term_structure}
            placeholder="How is your year divided?"
            {...formik.getFieldProps("term_structure")}
            error={formik.touched.term_structure ? formik.errors.term_structure : ""}
          />
          {lockedByServer("term_structure") ? <TermStructureNote /> : null}
        </div>
        <div className="min-w-0">
          <CustomNativeSelect
            id="currency"
            disabled={!open("currency")}
            label="Currency"
            isRequired
            options={profile.options.currency}
            placeholder="Select a currency"
            {...formik.getFieldProps("currency")}
            error={formik.touched.currency ? formik.errors.currency : ""}
          />
          {lockNote("currency")}
        </div>
        <CustomInput
          id="registration_id"
          disabled={!open("registration_id")}
          label="Registration number"
          placeholder="Optional"
          {...formik.getFieldProps("registration_id")}
          error={formik.touched.registration_id ? formik.errors.registration_id : ""}
        />
        <CustomInput
          id="address"
          disabled={!open("address")}
          label="Address"
          placeholder="Optional"
          containerClass="sm:col-span-2"
          {...formik.getFieldProps("address")}
          error={formik.touched.address ? formik.errors.address : ""}
        />
        <CustomInput
          id="website"
          disabled={!open("website")}
          label="Website"
          placeholder="https://example.com"
          {...formik.getFieldProps("website")}
          error={formik.touched.website ? formik.errors.website : ""}
        />
        <CustomInput
          id="motto"
          disabled={!open("motto")}
          label="Motto"
          placeholder="Optional"
          {...formik.getFieldProps("motto")}
          error={formik.touched.motto ? formik.errors.motto : ""}
        />
      </div>

      {/* A fact, not a setting: XVS shows West Africa Time everywhere. */}
      <p className="text-xs text-gray-05">All times are shown in West Africa Time (WAT).</p>

      {canEdit || footer ? (
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
          {footer}
        </div>
      ) : null}
      <p className="text-xs text-gray-05">
        {canEdit
          ? "Every save here is recorded against your school."
          : readOnlyText}
      </p>
    </form>
  );
}

/** Under a locked term structure: where the school's terms are actually changed. */
function TermStructureNote() {
  return (
    <p className="mt-1.5 flex items-start gap-1.5 text-xs text-gray-05 text-pretty">
      <LockKeyhole className="mt-0.5 size-3.5 shrink-0" />
      <span>
        Where your school started. Change what you call the parts of your year, and how many
        there are, in{" "}
        <Link
          to={routesPath.PROTECTED.SETTINGS.ACADEMICS}
          className="font-medium text-primary underline-offset-2 hover:underline"
        >
          Academic structure
        </Link>
        .
      </span>
    </p>
  );
}

function LockedNote() {
  return (
    <p className="mt-1.5 flex items-start gap-1.5 text-xs text-gray-05 text-pretty">
      <LockKeyhole className="mt-0.5 size-3.5 shrink-0" />
      <span>
        Fixed once the school is live.{" "}
        <button
          type="button"
          onClick={() => requestSupportOpen()}
          className="font-medium text-primary underline-offset-2 hover:underline"
        >
          Contact XVS
        </button>{" "}
        to change it.
      </span>
    </p>
  );
}
