import { P } from "@/permissions";

import type { GuideRecord } from "../types";
import { OWNER, R } from "./shared";

export const GRADEBOOK_GUIDES = [
  {
    id: "school.gradebook.enter-scores",
    slug: "enter-scores-on-a-score-sheet",
    title: "Enter scores on a score sheet",
    summary: "Open your sheets for the {term}, enter each student's marks, use ABS and Excused where a mark cannot be given, and submit the sheet when every cell is filled.",
    category: "gradebook",
    tags: ["gradebook", "score sheet", "marks", "continuous assessment", "examination", "absent", "excused", "submit"],
    aliases: ["enter marks", "enter scores", "my sheets", "exam scores", "ca scores", "absent from exam", "excused from test", "submit sheet", "returned sheet", "wrong mark"],
    audiences: ["teacher", "school-administrator"],
    routes: [R.GRADEBOOK.INDEX, R.GRADEBOOK.SHEET],
    actionIds: ["view-my-score-sheets"],
    access: { mode: "any", permissions: [P.ENTER_OWN_SCORES, P.ENTER_ANY_SCORES] },
    primaryRoute: R.GRADEBOOK.INDEX,
    sections: [
      { id: "before-you-start", title: "Before you start" },
      { id: "open-a-sheet", title: "Open a sheet" },
      { id: "enter-marks", title: "Enter marks" },
      { id: "absent-and-excused", title: "Absent and excused" },
      { id: "on-a-phone", title: "On a phone" },
      { id: "submit", title: "Submit the sheet" },
      { id: "returned", title: "A sheet that comes back" },
      { id: "common-problems", title: "Common problems" },
    ],
    estimatedMinutes: 5,
    owner: OWNER,
    reviewedAt: "2026-10-15",
    risk: "medium",
    status: "published",
    relatedGuideIds: ["school.attendance.take-the-register"],
    article: () => import("../content/gradebook/enter-scores"),
  },
] as const satisfies readonly GuideRecord[];
