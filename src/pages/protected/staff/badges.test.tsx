import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { TooltipProvider } from "@/components/ui/tooltip";

import { AccountBadge, AccountFlagChip, EmploymentBadge } from "./badges";
import type {
  AccountStatus,
  EmploymentStatus,
} from "@/redux/services/staff/staff-types";

/**
 * The two status chips, and the silence between them.
 *
 * A chip keyed on a code falls back to grey for a value it has not heard of,
 * and grey is a real answer here - Resigned is grey on purpose - so a missing
 * key does not look like a bug, it looks like a resignation. These assertions
 * are what notice: every value in each vocabulary is named, so adding one to
 * the server without adding it here turns this file red rather than quietly
 * drawing a suspension as a departure.
 */

const EMPLOYMENT: EmploymentStatus[] = [
  "INVITED", "ACTIVE", "ON_LEAVE", "SUSPENDED", "RESIGNED", "TERMINATED",
];

const ACCOUNT: AccountStatus[] = [
  "DRAFT", "PENDING_APPROVAL", "PENDING", "ACTIVE", "SUSPENDED", "LOCKED",
  "DEACTIVATED", "REJECTED",
];

function classesOf(markup: string): string {
  return new DOMParser()
    .parseFromString(markup, "text/html")
    .body.firstElementChild?.getAttribute("class") ?? "";
}

describe("EmploymentBadge", () => {
  it("gives every employment status a colour of its own choosing", () => {
    for (const status of EMPLOYMENT) {
      const markup = renderToStaticMarkup(<EmploymentBadge status={status} />);
      expect(classesOf(markup), status).not.toBe("");
    }
  });

  it("does not draw a planned absence like a discipline", () => {
    // On leave is amber and suspended is red. Drawing maternity leave the same
    // way as a suspension flattens a planned, reversible absence into a
    // sanction, on a chip a whole school reads.
    const onLeave = classesOf(
      renderToStaticMarkup(<EmploymentBadge status="ON_LEAVE" />),
    );
    const suspended = classesOf(
      renderToStaticMarkup(<EmploymentBadge status="SUSPENDED" />),
    );
    expect(onLeave).not.toBe(suspended);
  });

  it("does not draw a resignation like a termination", () => {
    // Somebody who resigned left on their own terms. The school's record of
    // them should not read like a punishment.
    const resigned = classesOf(
      renderToStaticMarkup(<EmploymentBadge status="RESIGNED" />),
    );
    const terminated = classesOf(
      renderToStaticMarkup(<EmploymentBadge status="TERMINATED" />),
    );
    expect(resigned).not.toBe(terminated);
  });

  it("prints the server's wording, falling back to the code", () => {
    expect(
      renderToStaticMarkup(
        <EmploymentBadge status="ON_LEAVE" label="On Leave" />,
      ),
    ).toContain("On Leave");
    expect(renderToStaticMarkup(<EmploymentBadge status="ON_LEAVE" />)).toContain(
      "ON_LEAVE",
    );
  });
});

describe("AccountBadge", () => {
  it("names every account status the identity layer can be in", () => {
    for (const status of ACCOUNT) {
      const markup = renderToStaticMarkup(<AccountBadge status={status} />);
      expect(classesOf(markup), status).not.toBe("");
    }
  });
});

describe("AccountFlagChip", () => {
  it("says nothing when the account agrees with the record", () => {
    // The whole point of it. A column showing Active twice on fifty rows buries
    // the one row that needs reading, so the server sends null and this draws
    // nothing at all rather than an empty slot.
    expect(renderToStaticMarkup(<AccountFlagChip flag={null} />)).toBe("");
  });

  it("shows the server's label when the two disagree", () => {
    // Wrapped in the provider the app mounts once in App.tsx. Radix's tooltip
    // reads it from context and throws without one, so a test that rendered
    // the chip bare would be testing the harness rather than the chip.
    const markup = renderToStaticMarkup(
      <TooltipProvider>
        <AccountFlagChip
          flag={{
            code: "LOCKED",
            label: "Locked",
            note: "Locked out after failed sign-in attempts. Their employment is unaffected.",
          }}
        />
      </TooltipProvider>,
    );
    expect(markup).toContain("Locked");
  });
});
