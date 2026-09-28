/**
 * School procurement dashboard presentation.
 *
 * Headline cards use only fields present in the permission-filtered response.
 * The shared views draw their detailed cards below each headline. The tab panel
 * follows the direction of the selected tab and honours reduced motion.
 */

import { type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowDownRight, ArrowUpRight, CheckCircle2, CircleAlert,
  Clock3, Layers3, Package, ShoppingBag, Truck, UsersRound,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/utils/money";
import { compactMoney, plural } from "@/pages/protected/finance/dashboard-cards";
import type {
  ProcurementDashboard, ProcurementStockDashboard, ProcurementSuppliersDashboard,
} from "@/redux/services/procurement/procurement-ext-types";

type Tone = "blue" | "green" | "teal" | "amber" | "red" | "violet";

type KpiProps = {
  label: string;
  value: string;
  icon: LucideIcon;
  tone: Tone;
  delta?: number | null;
  goodWhenUp?: boolean;
  note?: ReactNode;
  badge?: string;
};

function ProcurementKpiTile({ label, value, icon: Icon, tone, delta, goodWhenUp = true, note, badge }: KpiProps) {
  const hasDelta = delta != null;
  const favorable = hasDelta && ((delta >= 0) === goodWhenUp);
  return (
    <section className={cn("procurement-kpi", `procurement-kpi--${tone}`)}>
      <div className="procurement-kpi-top">
        <span className="procurement-kpi-icon" aria-hidden="true"><Icon size={19} strokeWidth={1.9} /></span>
        <span className="procurement-kpi-label">{label}</span>
      </div>
      <strong className="procurement-kpi-value font-mont tabular-nums">{value}</strong>
      {hasDelta ? (
        <span className={cn("procurement-kpi-badge", favorable ? "procurement-kpi-badge--good" : "procurement-kpi-badge--bad")}>
          {delta >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}{Math.abs(delta)}%
        </span>
      ) : badge ? <span className="procurement-kpi-badge">{badge}</span> : null}
      {note && <span className="procurement-kpi-note">{note}</span>}
    </section>
  );
}

export function OverviewHeadline({ d, currency }: { d: ProcurementDashboard; currency?: string | null }) {
  const k = d.kpis;
  const windowName = d.window.label.toLowerCase();
  return (
    <div className="procurement-kpi-grid">
      {k.spend && <ProcurementKpiTile icon={ShoppingBag} tone="blue" label={`Spend ${windowName}`}
        value={formatMoney(k.spend.value.kobo, currency)} delta={k.spend.delta_pct} goodWhenUp={false}
        note={k.spend.prior_value && k.spend.delta_pct != null
          ? `vs ${compactMoney(k.spend.prior_value.kobo, currency)} at the same point before` : d.window.name} />}
      {k.open_purchase_orders && <ProcurementKpiTile icon={Package} tone="violet" label="Open orders"
        value={String(k.open_purchase_orders.count)}
        badge={k.open_purchase_orders.partial_count ? `${k.open_purchase_orders.partial_count} partial` : undefined}
        note={`${compactMoney(k.open_purchase_orders.amount.kobo, currency)} on open orders`} />}
      <ProcurementKpiTile icon={Clock3} tone="amber" label="Waiting on you"
        value={String(k.pending_approvals.count)}
        badge={k.pending_approvals.slow_count ? `${k.pending_approvals.slow_count} over 5 days` : undefined}
        note={k.pending_approvals.count
          ? `${compactMoney(k.pending_approvals.amount.kobo, currency)} across ${plural(k.pending_approvals.type_count, "document type")}`
          : "Nothing is waiting on you"} />
      {k.overdue_invoices && <ProcurementKpiTile icon={CircleAlert} tone="red" label="Overdue bills"
        value={formatMoney(k.overdue_invoices.amount.kobo, currency)}
        badge={k.overdue_invoices.count ? plural(k.overdue_invoices.count, "bill") : undefined}
        note={k.overdue_invoices.oldest_days != null
          ? `Oldest ${plural(k.overdue_invoices.oldest_days, "day")} past due` : "Nothing is overdue"} />}
      {k.active_vendors && <ProcurementKpiTile icon={UsersRound} tone="green" label="Active vendors"
        value={String(k.active_vendors.count)}
        badge={k.active_vendors.on_hold_count ? `${k.active_vendors.on_hold_count} on hold` : undefined}
        note={k.active_vendors.first_time_count
          ? `${k.active_vendors.first_time_count} ordered from for the first time ${windowName}` : "No new vendors"} />}
    </div>
  );
}

export function SuppliersHeadline({ d, currency }: { d: ProcurementSuppliersDashboard; currency?: string | null }) {
  const s = d.spend;
  const windowName = d.window.label.toLowerCase();
  const over = d.non_po && d.non_po.pct != null && d.non_po.pct > d.non_po.limit_pct;
  const pct = (value: number | null | undefined) => value == null ? "-" : `${Math.round(value * 10) / 10}%`;
  if (!s && d.vendors_paid == null && !d.deliveries && !d.non_po) return null;
  return (
    <div className="procurement-kpi-grid">
      {s && <ProcurementKpiTile icon={ShoppingBag} tone="blue" label={`Spend ${windowName}`}
        value={formatMoney(s.value.kobo, currency)} delta={s.plan ? null : s.delta_pct} goodWhenUp={false}
        badge={s.plan?.pct != null ? `${Math.round(s.plan.pct)}% of plan` : undefined}
        note={s.plan
          ? `Year to date ${compactMoney(s.plan.spent_ytd.kobo, currency)} of ${compactMoney(s.plan.planned.kobo, currency)} planned, ${s.plan.year_elapsed_pct}% of the year gone`
          : s.prior_value ? `vs ${compactMoney(s.prior_value.kobo, currency)} at the same point before` : d.window.name} />}
      {d.vendors_paid != null && <ProcurementKpiTile icon={UsersRound} tone="violet" label="Vendors paid"
        value={String(d.vendors_paid)}
        note={s && s.vendors_with_spend
          ? `80% of spend with ${s.vendors_for_80pct} of ${plural(s.vendors_with_spend, "vendor")}` : windowName} />}
      {d.deliveries && <ProcurementKpiTile icon={Truck} tone="green" label="Delivered on time"
        value={pct(d.deliveries.on_time_pct)}
        badge={d.deliveries.on_time_change_pts != null
          ? `${d.deliveries.on_time_change_pts >= 0 ? "+" : ""}${d.deliveries.on_time_change_pts} pts` : undefined}
        note={d.deliveries.on_time_pct == null ? "No receipt had an expected date" : "Of receipts with an expected date"} />}
      {d.deliveries && <ProcurementKpiTile icon={CheckCircle2} tone="teal" label="Accepted on receipt"
        value={pct(d.deliveries.accepted_pct)}
        note={d.deliveries.rejected_lines
          ? `${plural(d.deliveries.rejected_lines, "line")} with items rejected ${windowName}` : "Nothing rejected"} />}
      {d.non_po && <ProcurementKpiTile icon={CircleAlert} tone="amber" label="Spend without a PO"
        value={compactMoney(d.non_po.amount.kobo, currency)}
        badge={d.non_po.count ? plural(d.non_po.count, "bill") : undefined}
        note={<span className={cn(over && "font-medium text-amber-700")}>
          {pct(d.non_po.pct)} of spend · limit {d.non_po.limit_pct}%{over ? ", over the limit" : ""}
        </span>} />}
    </div>
  );
}

export function StockHeadline({ d, currency }: { d: ProcurementStockDashboard; currency?: string | null }) {
  const p = d.position;
  if (!p && !d.receipts) return null;
  return (
    <div className="procurement-kpi-grid">
      {p && <ProcurementKpiTile icon={Layers3} tone="blue" label="Stock value"
        value={formatMoney(p.value.kobo, currency)}
        note={`${plural(p.items, "item")} across ${plural(p.stores, "store")}`} />}
      {p && <ProcurementKpiTile icon={Package} tone="amber" label="Below reorder level"
        value={String(p.below_reorder)}
        note={p.out_within_week ? `${plural(p.out_within_week, "item")} will run out within a week` : "None will run out this week"} />}
      {p && <ProcurementKpiTile icon={CircleAlert} tone="red" label="Out of stock"
        value={String(p.out_of_stock)}
        note={p.out_names.length ? p.out_names.join(", ") + (p.out_of_stock > p.out_names.length ? " and others" : "") : "Nothing is out"} />}
      {d.receipts && <ProcurementKpiTile icon={Truck} tone="green" label="Deliveries this week"
        value={String(d.receipts.this_week)}
        note={d.receipts.this_week_short
          ? `${plural(d.receipts.this_week_short, "delivery", "deliveries")} arrived short or with items rejected` : "All arrived in full"} />}
      {p && <ProcurementKpiTile icon={Clock3} tone="violet" label="Not moved in 90 days"
        value={String(p.idle)} note={p.idle ? `${compactMoney(p.idle_value.kobo, currency)} tied up` : "Everything has moved"} />}
    </div>
  );
}

type View = "overview" | "suppliers" | "stock";

export function ProcurementTabMotion({ view, direction, children }: { view: View; direction: number; children: ReactNode }) {
  const reduced = useReducedMotion();
  const distance = reduced ? 0 : 48;
  const duration = reduced ? 0 : 0.3;
  const variants = {
    enter: (side: number) => ({ x: side * distance, opacity: reduced ? 1 : 0 }),
    center: { x: 0, opacity: 1 },
    exit: (side: number) => ({ x: -side * distance, opacity: reduced ? 1 : 0, position: "absolute" as const, inset: 0 }),
  };
  return (
    <div className="procurement-tab-viewport">
      <AnimatePresence mode="popLayout" initial={false} custom={direction}>
        <motion.div key={view} custom={direction} variants={variants}
          initial="enter" animate="center" exit="exit"
          transition={{ duration, ease: [0.4, 0, 0.2, 1] }}
          className="procurement-tab-panel">
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
