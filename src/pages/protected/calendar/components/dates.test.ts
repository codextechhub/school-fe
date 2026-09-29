import { describe, expect, it } from "vitest";

import { formatDate, formatRange, monthLabel } from "./dates";

const slash = { timeZone: "Africa/Lagos", dateFormat: "DD_MM_YYYY", clock: "H12" } as const;

describe("calendar date formatters", () => {
  it("default to the house style when the session carries no settings", () => {
    expect(formatDate("2025-11-21")).toBe("21 Nov 2025");
    expect(formatRange("2025-10-27", "2025-10-31")).toBe("27 - 31 Oct 2025");
    expect(monthLabel(2025, 11)).toBe("November 2025");
  });

  it("follow the school's date style", () => {
    expect(formatDate("2025-11-21", slash)).toBe("21/11/2025");
    expect(formatRange("2025-10-27", "2025-10-31", slash)).toBe("27/10/2025 - 31/10/2025");
    expect(formatRange("2025-10-01", "2025-10-01", slash)).toBe("01/10/2025");
    expect(monthLabel(2025, 11, slash)).toBe("November 2025");
  });

  it("keep an empty start empty", () => {
    expect(formatDate("")).toBe("");
    expect(formatRange("", "2025-10-31")).toBe("");
  });
});
