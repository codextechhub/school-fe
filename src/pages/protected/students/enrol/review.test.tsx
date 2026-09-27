import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { Review } from "./index";

/**
 * The enrol form's Review step reads back the admission number the save sends.
 *
 * Bright Star's policy suggests `BSS/2026/0042` and the registrar leaves the
 * box untouched, so the typed field is empty while the save sends the
 * suggestion. Review has to name `BSS/2026/0042`, not "Not issued": the
 * registrar checking Tunde's record before saving would otherwise believe he
 * has no number when one is about to be issued.
 */
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const FORM: Record<string, string> = {
  first_name: "Tunde",
  middle_name: "",
  last_name: "Okafor",
  date_of_birth: "2015-03-02",
  gender: "MALE",
  previous_school: "",
  student_number: "",
  enrolment_date: "2026-09-27",
  address: "",
  blood_group: "",
  allergies: "",
  conditions: "",
  emergency_contact_name: "",
};

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function renderReview(admissionNumber: string) {
  act(() => {
    root.render(
      <Review
        form={FORM}
        admissionNumber={admissionNumber}
        hidden={() => false}
        guardians={[]}
        asApplicant={false}
        className="JSS 1A"
        onJump={() => undefined}
      />,
    );
  });
}

describe("enrol Review", () => {
  it("shows the number the save sends when the typed field is empty", () => {
    renderReview("BSS/2026/0042");
    expect(container.textContent).toContain("BSS/2026/0042");
    expect(container.textContent).not.toContain("Not issued");
  });

  it("says no number is issued when the save sends none", () => {
    renderReview("");
    expect(container.textContent).toContain("Not issued - it can be added later from the record");
  });
});
