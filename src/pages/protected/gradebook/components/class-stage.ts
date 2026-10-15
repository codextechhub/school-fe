import type { ClassStage } from "@/redux/services/gradebook/gradebook-types";

/**
 * Where a class stands in the chain, as every gradebook screen words it:
 * entering marks, compiling, with the principal, published.
 */
export const CLASS_STAGE: Record<ClassStage, { text: string; variant: "pending" | "active" | "blue" }> = {
  ENTERING: { text: "Entering", variant: "pending" },
  COMPILING: { text: "Compiling", variant: "pending" },
  AWAITING: { text: "Awaiting approval", variant: "blue" },
  PUBLISHED: { text: "Published", variant: "active" },
};
