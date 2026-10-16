import type { HubClass } from "@/redux/services/gradebook/gradebook-types";

export type HubStageFilter = "ALL" | "ENTERING" | "COMPILING" | "FINAL";

/**
 * The results hub keeps the final two states together because both have left
 * the class teacher. This keeps the stage switch compact while the status chip
 * on each row still says whether it awaits approval or is published.
 */
export function filterHubClasses(classes: HubClass[], stage: HubStageFilter) {
  if (stage === "ALL") return classes;
  if (stage === "FINAL") return classes.filter((item) => item.stage === "AWAITING" || item.stage === "PUBLISHED");
  return classes.filter((item) => item.stage === stage);
}

export function hubStageOptions(classes: HubClass[]) {
  return [
    { value: "ALL" as const, label: "All classes", count: classes.length },
    {
      value: "ENTERING" as const,
      label: "Entering scores",
      count: classes.filter((item) => item.stage === "ENTERING").length,
    },
    {
      value: "COMPILING" as const,
      label: "Compiling",
      count: classes.filter((item) => item.stage === "COMPILING").length,
    },
    {
      value: "FINAL" as const,
      label: "Approval and published",
      count: classes.filter((item) => item.stage === "AWAITING" || item.stage === "PUBLISHED").length,
    },
  ];
}
