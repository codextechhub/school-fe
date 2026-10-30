import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { FieldAccessPayload } from "@/redux/features/auth/auth-types";
import type { SchoolProfile } from "@/redux/services/school/school-types";

const mocks = vi.hoisted(() => ({
  fieldAccess: {} as FieldAccessPayload,
  update: vi.fn(),
}));

vi.mock("@/hooks/use-permissions", () => ({
  usePermissions: () => ({ fieldAccess: mocks.fieldAccess }),
}));

vi.mock("@/hooks/use-school-display", () => ({
  useSchoolDisplay: () => ({ prefs: { timeZone: "Africa/Lagos" } }),
}));

vi.mock("@/redux/services/school/school-api", () => ({
  useUpdateSchoolProfileMutation: () => [mocks.update, { isLoading: false }],
}));

import { SchoolProfileForm } from "./school-profile-form";

const PROFILE: SchoolProfile = {
  name: "Bright Star School",
  slug: "bright-star",
  code: "BSS",
  status: "ACTIVE",
  ownership_type: "PRIVATE",
  term_structure: "3_TERMS",
  currency: "NGN",
  address: "14 Lantern Road",
  website: "https://bright-star.example.com",
  motto: "Knowledge and Light",
  registration_id: "REG-BRIGHT-14",
  logo: "",
  missing_required: [],
  options: {
    ownership_type: [{ value: "PRIVATE", label: "Private" }],
    term_structure: [{ value: "3_TERMS", label: "Three terms" }],
    currency: [{ value: "NGN", label: "Nigerian naira" }],
  },
  editable_fields: [
    "ownership_type", "term_structure", "currency", "address", "website",
    "motto", "registration_id",
  ],
};

function render(profile: SchoolProfile) {
  const html = renderToStaticMarkup(
    <MemoryRouter>
      <SchoolProfileForm profile={profile} canEdit />
    </MemoryRouter>,
  );
  return new DOMParser().parseFromString(html, "text/html");
}

describe("school profile Field Access", () => {
  beforeEach(() => {
    mocks.fieldAccess = {};
    mocks.update.mockReset();
  });

  it("removes hidden address and registration fields completely", () => {
    mocks.fieldAccess = {
      "school.profile": {
        hidden: ["address", "registration_id"],
        read_only: [],
        open_on_create: [],
      },
    };
    const { address: _address, registration_id: _registration, ...visible } = PROFILE;
    const document = render(visible);

    expect(document.querySelector("#address")).toBeNull();
    expect(document.querySelector("#registration_id")).toBeNull();
    expect(document.body.textContent).not.toContain("14 Lantern Road");
    expect(document.body.textContent).not.toContain("REG-BRIGHT-14");
  });

  it("removes hidden ownership and public text fields", () => {
    mocks.fieldAccess = {
      "school.profile": {
        hidden: ["ownership_type", "website", "motto"],
        read_only: [],
        open_on_create: [],
      },
    };
    const {
      ownership_type: _ownership,
      website: _website,
      motto: _motto,
      ...visible
    } = PROFILE;
    const document = render(visible);

    expect(document.querySelector("#ownership_type")).toBeNull();
    expect(document.querySelector("#website")).toBeNull();
    expect(document.querySelector("#motto")).toBeNull();
  });

  it("greys fields the record marks read-only", () => {
    const document = render({
      ...PROFILE,
      _read_only_fields: ["address", "registration_id"],
      editable_fields: PROFILE.editable_fields.filter(
        (field) => !["address", "registration_id"].includes(field),
      ),
    });

    expect(document.querySelector<HTMLInputElement>("#address")?.disabled).toBe(true);
    expect(document.querySelector<HTMLInputElement>("#registration_id")?.disabled).toBe(true);
  });

  it("keeps writable fields enabled", () => {
    const document = render(PROFILE);

    expect(document.querySelector<HTMLInputElement>("#address")?.disabled).toBe(false);
    expect(document.querySelector<HTMLInputElement>("#registration_id")?.disabled).toBe(false);
  });
});
