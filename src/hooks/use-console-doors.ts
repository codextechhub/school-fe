import { consoleOffersScreens } from "@/components/finance-ui/console-nav";
import { schoolFinanceNav, schoolProcurementNav } from "@/components/layout/console-nav-for-school";
import { useCapabilities } from "@/hooks/use-capabilities";
import { usePermissions } from "@/hooks/use-permissions";

/**
 * Whether the Finance and Procurement consoles are offered to this reader.
 *
 * Two conditions, both required. The school must have bought the area
 * (`hasCapability`), and the area must hold a screen this reader can open. The
 * second is asked of the console's own menu, narrowed to what this app mounts,
 * so the door appears only when a screen behind it opens: a reader whose only
 * finance key belongs to a screen the school app does not serve is not handed
 * a console with nothing of theirs in it.
 *
 * The sidebar and the home dashboard's shortcuts both read this, so the two
 * cannot disagree about whether somebody works in finance.
 */
export function useConsoleDoors(): { finance: boolean; procurement: boolean } {
  const { hasAnyPermission, hasModuleAccess } = usePermissions();
  const { hasCapability } = useCapabilities();
  const gate = { hasAnyPermission, hasModuleAccess };
  return {
    finance: hasCapability("finance") && consoleOffersScreens(schoolFinanceNav, gate),
    procurement: hasCapability("procurement") && consoleOffersScreens(schoolProcurementNav, gate),
  };
}
