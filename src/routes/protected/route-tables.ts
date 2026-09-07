import { type RouteObject } from "react-router";
import { overviewRoutes } from "./overview-routes";
import { branchesRoutes } from "./branches-routes";
import { rolesRoutes } from "./roles-routes";
import { workflowRoutes } from "./workflow-routes";
import { academicRoutes } from "./academic-routes";
import { classesRoutes } from "./classes-routes";
import { studentsRoutes } from "./students-routes";
import { staffRoutes } from "./staff-routes";
import { supportRoutes } from "./support-routes";
import { financeRoutes } from "./finance-routes";
import { procurementRoutes } from "./procurement-routes";
import { dataImportRoutes } from "./data-import-routes";
import { exportRoutes } from "./export-routes";
import { onboardingRoutes } from "./onboarding-routes";

/**
 * Every screen inside the dashboard shell, without the shell itself.
 *
 * Split from `index.tsx` because that module imports DashboardLayout eagerly,
 * and the things that need to ask "does this build serve this address?" are
 * either inside the shell already or must not drag it in:
 *
 *   - the notification bell, which the shell renders, so importing the barrel
 *     there would close a cycle;
 *   - the palette's coverage audit, which walks the mounted paths;
 *   - anything else that has to answer the question without rendering.
 *
 * Every route module here is import-cheap: `lazy()` page imports and type-only
 * handles, so reading the table costs no page chunk.
 */
export const protectedChildren: RouteObject[] = [
  ...onboardingRoutes,
  ...overviewRoutes,
  ...branchesRoutes,
  ...rolesRoutes,
  ...workflowRoutes,
  ...academicRoutes,
  ...classesRoutes,
  ...studentsRoutes,
  ...staffRoutes,
  ...supportRoutes,
  ...financeRoutes,
  ...procurementRoutes,
  ...dataImportRoutes,
  ...exportRoutes,
];
