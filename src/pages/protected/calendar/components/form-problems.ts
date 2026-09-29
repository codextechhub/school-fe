import { useRef, useState } from "react";

/**
 * Why a form will not save, said out loud.
 *
 * The drawers in this module never disable their save button until the draft
 * is valid. It is a common pattern and a bad one: a greyed-out button is a
 * refusal with the reason removed, and the state that shows it up is not an
 * edge case at all.
 *
 * A school adds a period, types "Period 1", sets the start to 08:00, and types
 * 25 into the end time. The box holds text, but not a time, so `end_time` is
 * still the empty string. Were the button greyed out, the form would be
 * invalid, no field marked, and the school would be looking at a screen where
 * everything appears filled in and the only control that matters cannot be
 * pressed. There is no way from there to the answer.
 *
 * So: **the button stays live, and pressing it is what asks the question.**
 * Press it with something missing and the form says which fields, marks them,
 * and puts the cursor in the first one. Nothing is hidden behind a control that
 * will not respond.
 *
 * Fields also speak up on their own once left: blur a field you skipped and it
 * says so immediately, rather than waiting for a submit that the reader has not
 * worked out how to trigger.
 */

export interface Problem {
  /** The field's name, used to mark it and to move the cursor to it. */
  field: string;
  message: string;
}

/**
 * The problems with a draft, from a list written the way the rules read.
 *
 * Takes falsy entries so a caller can write one line per rule:
 * `problemsOf(!name && { field: "name", message: "..." }, ...)`.
 *
 * **Order is the reading order of the form**, because the first entry is the
 * one the cursor jumps to, and jumping past a field the reader has not reached
 * yet to land on one below it is worse than not jumping at all.
 */
export function problemsOf(
  ...entries: (Problem | false | null | undefined | "")[]
): Problem[] {
  return entries.filter(Boolean) as Problem[];
}

export function useFormProblems(problems: Problem[]) {
  const [submitted, setSubmitted] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const fields = useRef<Record<string, HTMLElement | null>>({});

  /** Put on the input itself, so the cursor can be sent to it. */
  const register = (field: string) => (element: HTMLElement | null) => {
    fields.current[field] = element;
  };

  /** Call from a field's `onBlur`: a field once left may complain. */
  const leave = (field: string) => () =>
    setTouched((t) => (t[field] ? t : { ...t, [field]: true }));

  /**
   * True when the draft may be sent. Otherwise it shows every problem, marks
   * the fields and moves the cursor to the first of them.
   */
  const attempt = () => {
    setSubmitted(true);
    if (!problems.length) return true;

    const first = fields.current[problems[0].field];
    // Scroll before focus: focus alone scrolls the field to whichever edge is
    // nearest, which in a tall drawer can leave it under the header.
    first?.scrollIntoView({ block: "center", behavior: "smooth" });
    first?.focus();
    return false;
  };

  /** A field's message, once the reader has left it or pressed save. */
  const errorFor = (field: string) =>
    submitted || touched[field]
      ? (problems.find((p) => p.field === field)?.message ?? "")
      : "";

  /** True while a field should be marked as wrong. */
  const invalid = (field: string) => !!errorFor(field) || undefined;

  /** The whole list, for the summary above the buttons. */
  const showing = submitted ? problems : [];

  const reset = () => {
    setSubmitted(false);
    setTouched({});
  };

  return { register, leave, attempt, errorFor, invalid, showing, reset };
}
