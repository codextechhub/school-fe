import type { StaffNumberPolicy } from "@/redux/services/staff/staff-types";

/**
 * How the Staff ID box reads under the school's staff number rule.
 *
 * `required` marks the box only where a blank would be refused: a rule that
 * issues numbers fills a blank itself, unless the school has no number to
 * continue from yet, and then the server asks for one to start the series.
 * The hint is the school's own words where it wrote some, since the server
 * refuses a wrong number with the same sentence.
 */
export function staffNumberField(policy: StaffNumberPolicy | undefined): {
  required: boolean;
  hint: string;
  placeholder: string;
} {
  const issues = Boolean(policy?.auto_issue);
  const next = policy?.suggestion ?? "";
  if (issues && next) {
    return {
      required: false,
      hint: `Leave it blank and ${next} is issued. Type a number to use your own.${
        policy?.hint ? ` ${policy.hint}` : ""
      }`,
      placeholder: `Next: ${next}`,
    };
  }
  if (issues && policy?.required) {
    return {
      required: true,
      hint: "This school issues staff IDs automatically but has none to continue from yet. Type this person's number, and the next will follow it.",
      placeholder: "",
    };
  }
  return {
    required: Boolean(policy?.required),
    hint:
      policy?.hint ||
      (policy?.pattern
        ? "In your school's staff ID format. Nobody else here may have it."
        : "Your school's own format. Nothing checks its shape, only that nobody here already has it."),
    placeholder: "",
  };
}

/** Whether a staff number fits the school's pattern; an unreadable pattern is the server's to judge. */
export function fitsPattern(pattern: string, value: string): boolean {
  try {
    return new RegExp(`^(?:${pattern})$`).test(value);
  } catch {
    return true;
  }
}
