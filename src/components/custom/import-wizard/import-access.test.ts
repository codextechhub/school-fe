import { describe, expect, it } from "vitest";

import { P, resolvePermissionKey, type PermissionCode } from "@/permissions";

import { canRollBackImport, canRunImport } from "./import-access";

/**
 * The wizard makes three server writes: upload, check and import. A button
 * that opens it is offered only to a reader who would get through all three.
 */
const holding =
  (...codes: PermissionCode[]) =>
  (code: PermissionCode) =>
    codes.includes(code);

describe("canRunImport", () => {
  it("never opens without the upload key, whatever else is held", () => {
    expect(
      canRunImport(
        "students",
        holding(P.IMPORT_STUDENTS, P.RUN_IMPORT_VALIDATION, P.EXECUTE_IMPORT_BATCH),
      ),
    ).toBe(false);
  });

  it("lets the dataset's own key stand in for check and import", () => {
    expect(canRunImport("students", holding(P.UPLOAD_IMPORT_BATCH, P.IMPORT_STUDENTS))).toBe(true);
    expect(canRunImport("guardians", holding(P.UPLOAD_IMPORT_BATCH, P.IMPORT_STUDENTS))).toBe(true);
    expect(canRunImport("staff", holding(P.UPLOAD_IMPORT_BATCH, P.IMPORT_STAFF))).toBe(true);
    expect(canRunImport("subjects", holding(P.UPLOAD_IMPORT_BATCH, P.IMPORT_STRUCTURE))).toBe(true);
  });

  it("does not let one dataset's key open another's file", () => {
    expect(canRunImport("staff", holding(P.UPLOAD_IMPORT_BATCH, P.IMPORT_STUDENTS))).toBe(false);
  });

  it("otherwise needs both engine keys, not either", () => {
    expect(canRunImport("staff", holding(P.UPLOAD_IMPORT_BATCH, P.RUN_IMPORT_VALIDATION))).toBe(false);
    expect(canRunImport("staff", holding(P.UPLOAD_IMPORT_BATCH, P.EXECUTE_IMPORT_BATCH))).toBe(false);
    expect(
      canRunImport(
        "staff",
        holding(P.UPLOAD_IMPORT_BATCH, P.RUN_IMPORT_VALIDATION, P.EXECUTE_IMPORT_BATCH),
      ),
    ).toBe(true);
  });

  it("resolves the staff import key the backend registers for the staff dataset", () => {
    expect(resolvePermissionKey(P.IMPORT_STAFF)).toBe("school.staff.import");
  });
});

/**
 * Rollback follows the server: the engine key rolls back any batch, and the
 * bank-statement key rolls back a bank statement and nothing else.
 */
describe("canRollBackImport", () => {
  it("lets the engine's rollback key roll back any dataset", () => {
    expect(canRollBackImport("students", holding(P.RUN_IMPORT_ROLLBACK))).toBe(true);
    expect(canRollBackImport("bank_statements", holding(P.RUN_IMPORT_ROLLBACK))).toBe(true);
  });

  it("lets the bank-statement import key roll back a bank statement", () => {
    expect(canRollBackImport("bank_statements", holding(P.FIN_IMPORT_BANK))).toBe(true);
  });

  it("does not let the bank-statement key roll back another dataset", () => {
    expect(canRollBackImport("students", holding(P.FIN_IMPORT_BANK))).toBe(false);
    expect(canRollBackImport(undefined, holding(P.FIN_IMPORT_BANK))).toBe(false);
  });

  it("does not let a school dataset's own key roll back its batch", () => {
    expect(canRollBackImport("students", holding(P.IMPORT_STUDENTS))).toBe(false);
    expect(canRollBackImport("staff", holding(P.IMPORT_STAFF))).toBe(false);
    expect(canRollBackImport("academic_structure", holding(P.IMPORT_STRUCTURE))).toBe(false);
  });

  it("resolves the bank-statement key the backend declares the rollback for", () => {
    expect(resolvePermissionKey(P.FIN_IMPORT_BANK)).toBe("finance.bankaccount.import");
  });
});
