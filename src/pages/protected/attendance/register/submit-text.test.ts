import { describe, expect, it } from "vitest";

import { submitBarNote, submitConfirmText, submittedText } from "./submit-text";

const off = { notices_on: false, will_email: 0, no_email: 0 };
const nobody = { notices_on: true, will_email: 0, no_email: 0 };
const noAddress = { notices_on: true, will_email: 0, no_email: 2 };
const some = { notices_on: true, will_email: 2, no_email: 1 };

describe("the submit wording", () => {
  it("says nothing goes when notices are off", () => {
    expect(submitBarNote(off)).toBe("Guardian notices are off for this school.");
    expect(submitConfirmText(off)).toMatch(/sends nothing/);
  });

  it("says nothing goes when nobody is absent", () => {
    expect(submitConfirmText(nobody)).toBe("Nobody is marked absent, so no guardian will be emailed.");
    expect(submittedText(nobody)).toBe("Nobody was absent, so nothing was sent.");
  });

  it("says nothing goes when no absent child's guardian has an address", () => {
    expect(submitBarNote(noAddress)).toMatch(/nothing will be sent/);
    expect(submittedText(noAddress)).toBe("No guardian could be emailed: no email on file.");
  });

  it("counts the emails and the children with no address", () => {
    expect(submitBarNote(some)).toBe("Guardians of 2 absent students will be emailed. 1 more has no email on file.");
    expect(submitConfirmText(some)).toMatch(/cannot be taken back/);
    expect(submittedText(some)).toBe("2 guardians emailed, 1 with no email on file.");
  });
});
