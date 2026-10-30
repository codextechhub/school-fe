/**
 * The school's own profile, as `/v1/i/me/profile/` returns it.
 *
 * Distinct from the platform's view of a school: this is what a school admin
 * may read and change about their own school, and it takes no identifier - the
 * school is whichever one the session's tenant owns.
 */

/** One `{value, label}` pair for a select. */
export interface ChoiceOption {
  value: string;
  label: string;
}

/** A required field the school has not filled in, with a label to print. */
export interface MissingProfileField {
  field: string;
  label: string;
}

export interface SchoolProfile {
  _read_only_fields?: string[];
  // Allocated by CodeX when the school is created. Shown, never sent back.
  name: string;
  slug: string;
  code: string;
  status: string;

  // The school's own.
  ownership_type?: string;
  term_structure: string;
  currency: string;
  address?: string;
  website?: string;
  motto?: string;
  registration_id?: string;
  logo: string;

  /**
   * Required fields still empty. Read from the School model's own list, which
   * is the same one the onboarding gate uses, so this screen and the checklist
   * can never name different fields.
   */
  missing_required: MissingProfileField[];
  /**
   * The choice vocabularies, shipped with the record so a form cannot offer a
   * value the server will refuse.
   */
  options: {
    ownership_type: ChoiceOption[];
    term_structure: ChoiceOption[];
    currency: ChoiceOption[];
  };
  /** Which fields this endpoint accepts, stated rather than inferred. */
  editable_fields: string[];
}

export interface SchoolProfileUpdate {
  ownership_type?: string;
  term_structure?: string;
  currency?: string;
  address?: string;
  website?: string;
  motto?: string;
  registration_id?: string;
}
