import { describe, expect, it } from "vitest";
import {
  formatKoboAsNaira,
  humanizePermissionKeys,
  userFacingMessage,
} from "./user-facing-message";

describe("user-facing API messages", () => {
  it("shows minor-unit amounts in naira", () => {
    expect(formatKoboAsNaira(850)).toBe("₦8.50");
    expect(userFacingMessage("The difference is 123,450 kobo."))
      .toBe("The difference is ₦1,234.50.");
    expect(userFacingMessage("Balance cannot be -850 kobo."))
      .toBe("Balance cannot be -₦8.50.");
  });

  it("does not leave the unit name in server text", () => {
    expect(userFacingMessage("Amounts must be supplied in kobo."))
      .toBe("Amounts must be supplied in naira.");
  });

  it("replaces permission keys with action labels", () => {
    expect(humanizePermissionKeys(
      "'finance.invoice.create' is restricted and cannot be placed in a permission group.",
    )).toBe(
      "'Create invoice' is restricted and cannot be placed in a permission group.",
    );
    expect(humanizePermissionKeys("Missing platform.tasks.view_sensitive."))
      .toBe("Missing View sensitive tasks.");
  });
});
