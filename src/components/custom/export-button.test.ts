/**
 * The school's general ledger exports its last 31 days when no dates are set,
 * so the button stops and says so in the server's sentence. A list that
 * exports everything it shows runs without asking.
 */
import { describe, expect, it } from "vitest";
import type { FromScreen } from "@/redux/services/exports/exports-types";
import { partWindow } from "./export-button";

const plan = (date_window: FromScreen["date_window"]) => ({ date_window }) as FromScreen;
const sentence = "Includes general ledger postings from 5 Sep 2026 to 6 Oct 2026, the last 31 days. Set the dates in the builder to include earlier ones.";

describe("the export's date window", () => {
  it("is named when the file covers only the recent part of the list", () => {
    const window = { id: "posting_date", label: "Posting date", start: "2026-09-05", end: "2026-10-06", whole_list: false, sentence };
    expect(partWindow(plan(window))?.sentence).toBe(sentence);
  });

  it("is not, when the file holds the whole list or the screen sent its own dates", () => {
    expect(partWindow(plan({ id: "invoice_date", label: "Invoice date", start: "2021-02-03", end: "2026-10-06", whole_list: true, sentence: "Includes every one of the invoices the list shows." }))).toBeNull();
    expect(partWindow(plan(null))).toBeNull();
  });
});
