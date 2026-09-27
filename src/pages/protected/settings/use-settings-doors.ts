import type { ElementType } from "react";
import {
  Banknote,
  Building2,
  GitBranch,
  ShieldAlert,
  ShieldCheck,
  ShoppingCart,
  Users,
} from "lucide-react";
import { useCapabilities } from "@/hooks/use-capabilities";
import { usePermissions } from "@/hooks/use-permissions";
import { P } from "@/permissions";
import { routesPath } from "@/routes/routesPath";

const R = routesPath.PROTECTED;

export interface SettingsDoor {
  title: string;
  description: string;
  to: string;
  icon: ElementType;
}

/**
 * The settings that live on screens of their own, and the ones this reader
 * can open.
 *
 * Each door is gated exactly as the screen behind it is (the sidebar's own
 * test, or the package's settings key and the school's plan), so the list
 * never offers a way in that ends at a refusal.
 */
export function useSettingsDoors(): SettingsDoor[] {
  const { hasPermission, hasAnyPermission, hasModuleAccess } = usePermissions();
  const { hasCapability } = useCapabilities();

  const doors: Array<SettingsDoor & { show: boolean }> = [
    {
      title: "Roles and permissions",
      description: "Who can do what in XVS, and the roles your staff hold.",
      to: R.ROLES.INDEX,
      icon: ShieldCheck,
      show: hasPermission(P.VIEW_ROLES),
    },
    {
      title: "Field access",
      description: "Which fields each role can see or change on a record.",
      to: R.ROLES.FIELD_ACCESS,
      icon: ShieldAlert,
      show: hasPermission(P.VIEW_ROLES) && hasAnyPermission(P.VIEW_FIELD_ACCESS, P.UPDATE_FIELD_ACCESS),
    },
    {
      title: "Branches",
      description: "Your school's branches and their details.",
      to: R.BRANCHES.INDEX,
      icon: Building2,
      show: hasPermission(P.BROWSE_BRANCHES),
    },
    {
      title: "Approval paths",
      description: "Which documents need approval, and who approves them at each step.",
      to: R.WORKFLOW.TEMPLATES,
      icon: GitBranch,
      show: hasModuleAccess("workflow.template."),
    },
    {
      title: "Approvers",
      description: "The groups of people who approve documents.",
      to: R.WORKFLOW.APPROVER_GROUPS,
      icon: Users,
      show: hasPermission(P.VIEW_APPROVER_GROUPS),
    },
    {
      title: "Finance settings",
      description: "Accounts, documents, banking, and when fee bills fall due.",
      to: R.FINANCE.SETTINGS,
      icon: Banknote,
      show: hasCapability("finance") && hasPermission(P.FIN_VIEW_SETTINGS),
    },
    {
      title: "Procurement settings",
      description: "Purchasing rules, limits and document numbering.",
      to: R.PROCUREMENT.SETTINGS,
      icon: ShoppingCart,
      show: hasCapability("procurement") && hasPermission(P.PROC_VIEW_SETTINGS),
    },
  ];

  return doors.filter((door) => door.show);
}
