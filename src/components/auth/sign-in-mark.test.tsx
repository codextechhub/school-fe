import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const slug = vi.fn();
vi.mock("@/utils/school-host", () => ({ currentSchoolSlug: () => slug() }));

const { default: SignInMark } = await import("./sign-in-mark");
const { schoolLogoUrl } = await import("@/utils/school-brand");

function render(forSlug: string) {
  slug.mockReturnValue(forSlug);
  return renderToStaticMarkup(<SignInMark className="mb-6" />);
}

describe("schoolLogoUrl", () => {
  it("addresses the API, not the app", () => {
    // The two are different origins in every environment that matters, so a
    // bare path would be fetched from the school app and find nothing.
    expect(schoolLogoUrl("holy-cross")).toBe(
      "http://test.local/v1/i/public/schools/holy-cross/logo/",
    );
  });

  it("has nothing to ask for without a slug", () => {
    expect(schoolLogoUrl("")).toBe("");
    expect(schoolLogoUrl("   ")).toBe("");
  });

  it("normalises the slug the way the host does", () => {
    expect(schoolLogoUrl("  Holy-Cross  ")).toContain("/holy-cross/");
  });
});

describe("SignInMark", () => {
  it("asks for the school's crest when the address names a school", () => {
    const html = render("holy-cross");

    expect(html).toContain("/i/public/schools/holy-cross/logo/");
    expect(html).not.toContain("/image/logo.png");
  });

  it("shows the XVS mark on an address that names no school", () => {
    // The bare product host has no school to show, and must not ask for one.
    const html = render("");

    expect(html).toContain('src="/image/logo.png"');
    expect(html).toContain('alt="XVS"');
  });

  it("keeps the class it was given either way", () => {
    expect(render("holy-cross")).toContain("mb-6");
    expect(render("")).toContain("mb-6");
  });

  it("turns over to the wordmark, the way the sidebar's mark does", () => {
    // The flip is the shared mark's; what this asserts is that the sign-in
    // page gets it rather than a plain crest.
    expect(render("holy-cross")).toContain("school-mark__ink");
    expect(render("")).toContain("school-mark__ink");
  });
});
