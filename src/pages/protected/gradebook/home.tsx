import { usePermissions } from "@/hooks/use-permissions";
import { P } from "@/permissions";

import ResultsHub from "./hub";
import MySheets from "./my-sheets";

/**
 * Gradebook, Results this term.
 *
 * One address, two screens, chosen by what the reader may do, as attendance's
 * Today is. A reader of the results hub works every class in their branches
 * and gets the hub; everybody else gets their own sheets. The server draws the
 * same line (`hub/` refuses a reader without the hub key).
 */
export default function GradebookHome() {
  const { hasPermission } = usePermissions();
  return hasPermission(P.VIEW_RESULTS_HUB) ? <ResultsHub /> : <MySheets />;
}
