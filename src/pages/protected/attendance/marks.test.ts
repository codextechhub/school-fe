import { describe, expect, it } from "vitest";

import { markLabel, noticeText } from "./marks";

describe("markLabel", () => {
  it("names a mark, and says a missing one was not taken", () => {
    expect(markLabel("L")).toBe("Late");
    expect(markLabel(null)).toBe("Not taken");
  });
});

describe("noticeText", () => {
  it("says when the guardian was emailed", () => {
    expect(noticeText("A", "SENT", "8:14 am")).toEqual({ text: "Emailed 8:14 am", warn: false });
  });

  it("warns when there was no address to email", () => {
    expect(noticeText("A", "NO_EMAIL", null)).toEqual({ text: "No email on file", warn: true });
  });

  it("says nothing went for an excused child", () => {
    expect(noticeText("E", "NONE", null).text).toBe("Nothing sent · Excused");
  });

  it("says the school has notices off", () => {
    expect(noticeText("A", "NOTICES_OFF", null).text).toBe("Notices off");
  });
});
