import type {
  StudentDetail,
  StudentDocumentRow,
  StudentGuardianLink,
  StudentRow,
} from "@/redux/services/students/students-types";

export type ProfileGapDestination = "edit" | "guardian" | "documents";

export interface ProfileGap {
  key: string;
  label: string;
  destination: ProfileGapDestination;
}

export interface ProfileCompleteness {
  percentage: number;
  completed: number;
  total: number;
  gaps: ProfileGap[];
}

interface FieldDefinition {
  key: keyof StudentDetail;
  label: string;
}

const RECORD_FIELDS: FieldDefinition[] = [
  { key: "student_number", label: "Admission number" },
  { key: "first_name", label: "First name" },
  { key: "last_name", label: "Last name" },
  { key: "date_of_birth", label: "Date of birth" },
  { key: "gender", label: "Gender" },
  { key: "nationality", label: "Nationality" },
  { key: "state_of_origin", label: "State of origin" },
  { key: "address", label: "Home address" },
  { key: "phone", label: "Student phone" },
  { key: "email", label: "Student email" },
  { key: "previous_school", label: "Previous school" },
  { key: "enrolment_date", label: "Admission date" },
];

const SENSITIVE_FIELDS: FieldDefinition[] = [
  { key: "blood_group", label: "Blood group" },
  { key: "allergies", label: "Allergies" },
  { key: "conditions", label: "Medical conditions" },
  { key: "emergency_contact_name", label: "Emergency contact" },
  { key: "emergency_contact_phone", label: "Emergency phone" },
];

function hasValue(value: unknown): boolean {
  return typeof value === "string" ? value.trim().length > 0 : value != null;
}

/**
 * Measures whether the directory row is ready for day-to-day school work.
 *
 * The list endpoint deliberately excludes private profile details, so this
 * score uses only fields already present on every row. It must not imply that
 * the full student record is complete.
 */
export function getDirectoryRecordHealth(student: StudentRow) {
  const fields = [
    student.student_number,
    student.class_name,
    student.primary_guardian,
    student.photo_url,
  ];
  const completed = fields.filter(hasValue).length;
  const total = fields.length;

  return {
    completed,
    total,
    percentage: Math.round((completed / total) * 100),
    gaps: total - completed,
  };
}

/**
 * Measures the information a school needs to maintain a useful student file.
 *
 * Medical fields participate only when the API exposed them to this viewer.
 * Required document checklist rows and guardian links participate only after
 * those supporting calls have loaded, so a pending request never lowers the
 * score or reports a false gap.
 */
export function getStudentProfileCompleteness({
  student,
  guardians,
  documents,
}: {
  student: StudentDetail;
  guardians?: StudentGuardianLink[];
  documents?: StudentDocumentRow[];
}): ProfileCompleteness {
  const visibleFields =
    student.blood_group === undefined
      ? RECORD_FIELDS
      : [...RECORD_FIELDS, ...SENSITIVE_FIELDS];
  const gaps: ProfileGap[] = [];
  let completed = 0;

  for (const field of visibleFields) {
    if (hasValue(student[field.key])) {
      completed += 1;
    } else {
      gaps.push({
        key: String(field.key),
        label: field.label,
        destination: "edit",
      });
    }
  }

  let total = visibleFields.length;

  if (guardians !== undefined) {
    total += 1;
    if (guardians.length > 0) {
      completed += 1;
    } else {
      gaps.push({
        key: "guardian",
        label: "Guardian",
        destination: "guardian",
      });
    }
  }

  if (documents !== undefined) {
    const requiredDocuments = documents.filter((document) => document.required);
    total += requiredDocuments.length;
    for (const document of requiredDocuments) {
      if (document.attached) {
        completed += 1;
      } else {
        gaps.push({
          key: `document-${document.document_type}`,
          label: document.label,
          destination: "documents",
        });
      }
    }
  }

  return {
    percentage: total === 0 ? 100 : Math.round((completed / total) * 100),
    completed,
    total,
    gaps,
  };
}
