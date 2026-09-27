import type { PermissionCode } from "@/permissions";

export type WalkthroughPlacement = "top" | "right" | "bottom" | "left" | "auto";

export type WalkthroughContentStep = {
  id: string;
  kind?: "content";
  target?: string;
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
