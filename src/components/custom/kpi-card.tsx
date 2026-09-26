import { HelpCircle, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { INFORMATION_CARD_SURFACE } from "@/components/ui/card-surface";

interface KpiCardProps {
  label: string;
  value: number | string;
  foot?: string;
  tone?: "default" | "alert" | "warn" | "live";
  /** Optional help text shown on a small ? icon (native tooltip). */
  help?: string;
  /** Optional period-over-period delta as a percentage; coloured + arrowed. */
  delta?: number;
  deltaLabel?: string;
}

export default function KpiCard({ label, value, foot, tone = "default", help, delta, deltaLabel }: KpiCardProps) {
  return (
    <div
      className={cn(
        INFORMATION_CARD_SURFACE,
        "rounded-md px-5.5 py-5 min-h-26 space-y-2.5",
        tone === "alert" && "bg-red-50 border-red-200",
        tone === "warn" && "bg-amber-50 border-amber-200",
      )}
    >
      <h5 className="font-mont text-sm font-medium text-gray-01 inline-flex items-center gap-1.5">
        {label}
        {help && (
          <span title={help} className="cursor-help text-gray-05">
            <HelpCircle className="size-3.5" />
          </span>
        )}
      </h5>
      <div className="flex items-center gap-2">
        {tone === "live" && (
          <span className="relative inline-flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
        )}
        <p
          className={cn(
            "font-semibold text-2xl text-[#221122]",
            tone === "alert" && "text-red-700",
            tone === "warn" && "text-amber-700",
          )}
        >
          {value}
        </p>
      </div>
      {delta != null && (
        <p className={cn("inline-flex items-center gap-1 font-mont text-xs font-semibold", delta >= 0 ? "text-green-01" : "text-destructive")}>
          {delta >= 0 ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
          {delta >= 0 ? "+" : ""}{delta}%
          <span className="font-normal text-gray-05">{deltaLabel ?? "vs prior period"}</span>
        </p>
      )}
      {foot && <p className="text-xs text-gray-01">{foot}</p>}
    </div>
  );
}
