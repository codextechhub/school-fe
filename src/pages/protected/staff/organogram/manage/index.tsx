/**
 * Manage organogram: units, posts and appointments, and dotted lines.
 *
 * Admits a reader holding any organogram write key. Hiding the link is not
 * enough, because an address is typed as easily as it is clicked, and this is
 * where the size of the establishment lives: the post list shows headcount and
 * unfilled seats, which the chart deliberately does not. The server remains
 * the gate for every write, and narrows a branch administrator to their own
 * branch's units and posts.
 *
 * Arriving with `?action=new` opens on the Posts tab, where the post form
 * answers it; `?tab=` picks a tab directly.
 */

import { useState } from "react";
import { Briefcase, Building2, Spline } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router";
import { cn } from "@/lib/utils";
import PageAccessDenied from "@/components/custom/page-access-denied";
import { PageShell } from "@/components/layout/page-shell";
import { usePermissions } from "@/hooks/use-permissions";
import { P } from "@/permissions";
import { routesPath } from "@/routes/routesPath";
import OrgNodeManager from "./org-node-manager";
import PositionManager from "./position-manager";
import MatrixManager from "./matrix-manager";

const TABS = [
  { id: "units", label: "Units", icon: Building2 },
  { id: "positions", label: "Posts", icon: Briefcase },
  { id: "matrix", label: "Dotted lines", icon: Spline },
] as const;

type TabId = (typeof TABS)[number]["id"];

function initialTab(params: URLSearchParams): TabId {
  if (params.get("action") === "new") return "positions";
  const asked = params.get("tab");
  return TABS.some((t) => t.id === asked) ? (asked as TabId) : "units";
}

export default function OrganogramManage() {
  const [params] = useSearchParams();
  const [tab, setTab] = useState<TabId>(() => initialTab(params));
  const navigate = useNavigate();
  const { hasAnyPermission } = usePermissions();

  if (!hasAnyPermission(P.CREATE_ORG_STRUCTURE, P.UPDATE_ORG_STRUCTURE, P.DELETE_ORG_STRUCTURE, P.APPOINT_TO_POST)) {
    return (
      <PageAccessDenied
        onBack={() => navigate(routesPath.PROTECTED.STAFF.ORGANOGRAM)}
        message="You don't have permission to manage the organogram."
      />
    );
  }

  return (
    <PageShell className="space-y-5 text-black-01">
      <div>
        <p className="font-mont font-semibold text-gray-01">Manage organogram</p>
        <p className="mt-0.5 text-xs text-gray-01">
          The school&apos;s units, the posts in them and who holds each, and the dotted lines between posts.
        </p>
      </div>

      <div role="tablist" className="flex max-w-full items-center gap-1 overflow-x-auto border-b border-white-02">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "relative flex items-center gap-1.5 whitespace-nowrap px-3 py-2.5 text-[13px] font-semibold transition-colors",
              tab === t.id ? "text-primary" : "text-gray-01 hover:text-black-01",
            )}
          >
            <t.icon className="size-4" />
            {t.label}
            {tab === t.id && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />}
          </button>
        ))}
      </div>

      {tab === "units" && <OrgNodeManager />}
      {tab === "positions" && <PositionManager />}
      {tab === "matrix" && <MatrixManager />}
    </PageShell>
  );
}
