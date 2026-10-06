import { describe, expect, it } from "vitest";
import {
  formatKoboAsNaira,
  humanizePermissionKeys,
  userFacingMessage,
} from "./user-facing-message";

describe("user-facing API messages", () => {
  it("formats a minor-unit amount in naira", () => {
    expect(formatKoboAsNaira(850)).toBe("₦8.50");
    expect(formatKoboAsNaira(-123450)).toBe("-₦1,234.50");
  });

  it("leaves money wording as the server wrote it", () => {
    expect(userFacingMessage("One thousand naira, fifty kobo"))
      .toBe("One thousand naira, fifty kobo");
    expect(userFacingMessage("The difference is ₦1,234.50."))
      .toBe("The difference is ₦1,234.50.");
  });

  it("replaces permission keys with action labels", () => {
    expect(humanizePermissionKeys(
      "'finance.invoice.create' is restricted and cannot be placed in a permission group.",
    )).toBe(
      "'Create invoice' is restricted and cannot be placed in a permission group.",
    );
    expect(humanizePermissionKeys("Missing platform.tasks.view_sensitive."))
      .toBe("Missing View sensitive tasks.");
    expect(userFacingMessage("Missing finance.invoice.create."))
      .toBe("Missing Create invoice.");
  });
});
