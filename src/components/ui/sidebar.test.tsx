import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SidebarContent } from "./sidebar";

describe("SidebarContent", () => {
  it("keeps vertical scrolling enabled when the sidebar collapses to icons", () => {
    const markup = renderToStaticMarkup(<SidebarContent />);

    expect(markup).toContain("overflow-y-auto");
    expect(markup).toContain("overflow-x-hidden");
    expect(markup).not.toContain("group-data-[collapsible=icon]:overflow-hidden");
  });
});
