import type { PermissionCode } from "@/permissions";

export type WalkthroughPlacement = "top" | "right" | "bottom" | "left" | "auto";

export type WalkthroughContentStep = {
  id: string;
  kind?: "content";
  target?: string;
  /**
   * Title and body may name `{term}`, `{Term}`, `{terms}` or `{Terms}`, which
   * the coach prints in the school's own word (see `fillTermWords`). Use them
   * wherever the step means a part of the school year or a label that says it.
   */
  title: string;
  body: string;
  placement?: WalkthroughPlacement;
  advance: "next" | "target-click" | "route-change" | "manual";
  route?: string;
  search?: string;
  optional?: boolean;
};

export type WalkthroughBranchStep = {
  id: string;
  kind: "branch";
  target: string;
  whenPresent: string;
  whenMissing: string;
};

export type WalkthroughStep = WalkthroughContentStep | WalkthroughBranchStep;

export type Walkthrough = {
  id: string;
  guideId: string;
  route: string;
  permissions: readonly PermissionCode[];
  prerequisites: readonly string[];
  steps: readonly WalkthroughStep[];
  version: number;
};

export type WalkthroughProgress = {
  walkthroughId: string;
  guideId: string;
  version: number;
  currentStepId: string;
  completedStepIds: string[];
  completedAt?: string;
};
