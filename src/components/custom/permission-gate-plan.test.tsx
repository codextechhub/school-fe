import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

/**
 * The second question a control has to pass: did the school buy it?
 *
 * Bright Star is on a plan without bulk import. Its administrator holds
 * `import.batches.create`, because an administrator holds every key - the role
 * question is always yes for her and says nothing about the plan. So the
 * Upload button rendered, she chose her student roll, and the server refused
 * the request: "Bulk Data Import is not part of this school's plan."
 *
 * The button should never have been there. These pin the four things that have
 * to hold for that to be true and stay true.
 */
const hasCapability = vi.fn();
const hasPermission = vi.fn();

vi.mock("@/hooks/use-capabilities", () => ({
  useCapabilities: () => ({
    hasCapability,
    hasAnyCapability: () => true,
    isKnown: true,
  }),
}));

vi.mock("@/hooks/use-permissions", () => ({
  usePermissions: () => ({
    hasPermission,
    hasAnyPermission: () => hasPermission(),
    hasAllPermissions: () => hasPermission(),
    hasModuleAccess: () => true,
  }),
}));

const { default: PermissionGate } = await import("./permission-gate");
const { P } = await import("@/permissions");

function uploadButton(capability?: string) {
  return renderToStaticMarkup(
    <PermissionGate permission={P.UPLOAD_IMPORT_BATCH} capability={capability}>
      <button>Upload a file</button>
    </PermissionGate>,
  );
}

describe("A control the school has not bought", () => {
  beforeEach(() => {
    hasCapability.mockReset();
    hasPermission.mockReset();
  });

  it("is withheld even from somebody who holds the key", () => {
    hasPermission.mockReturnValue(true);
    hasCapability.mockReturnValue(false);
    expect(uploadButton("bulk_import")).not.toContain("Upload a file");
  });

  it("appears once the plan reaches it and the reader holds the key", () => {
    hasPermission.mockReturnValue(true);
    hasCapability.mockReturnValue(true);
    expect(uploadButton("bulk_import")).toContain("Upload a file");
  });

  it("is still withheld from somebody without the key, plan or no plan", () => {
    // The plan does not hand anybody a permission they were never granted.
    hasPermission.mockReturnValue(false);
    hasCapability.mockReturnValue(true);
    expect(uploadButton("bulk_import")).not.toContain("Upload a file");
  });

  it("says nothing about tiers when it withholds", () => {
    // A bursar refused mid-task has no use for our pricing vocabulary. The gate
    // renders the caller's own fallback, or nothing, and never a sales line.
    hasPermission.mockReturnValue(true);
    hasCapability.mockReturnValue(false);
    const markup = uploadButton("bulk_import").toLowerCase();
    for (const word of ["core", "plus", "advanced", "plan", "upgrade"]) {
      expect(markup).not.toContain(word);
    }
  });
});

describe("A control on every plan", () => {
  beforeEach(() => {
    hasCapability.mockReset();
    hasPermission.mockReset();
  });

  it("never asks the plan question at all", () => {
    // Most of the product is core, and those gates must not become
    // store-dependent components for a question they do not ask - which is why
    // the capability hook lives in a child rendered only when one is declared.
    hasPermission.mockReturnValue(true);
    expect(uploadButton()).toContain("Upload a file");
    expect(hasCapability).not.toHaveBeenCalled();
  });
});
