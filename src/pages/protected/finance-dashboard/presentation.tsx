/**
 * School finance dashboard presentation.
 *
 * Headline cards read only blocks present in the permission-filtered dashboard
 * response. The shared package still draws the detailed cards below them. The
 * tab panel moves in the same direction as its measured tab highlight, while a
 * reduced-motion preference makes the change immediate.
 */

import { type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowDownRight, ArrowUpRight, Banknote, CalendarClock, CircleAlert,
  Clock3, FileText, Landmark, ReceiptText, ShieldAlert,
  TrendingUp, Wallet,
  type LucideIcon,
} from "lucide-react";
import { formatMoney } from "@/utils/money";
import type { ReceivablesDashboard, SpendDashboard } from "@/redux/services/finance/reports-types";
import { runwayLabel } from "@/pages/protected/finance/dashboard-spend";
import { cn } from "@/lib/utils";

type Tone = "blue" | "green" | "amber" | "red" | "violet";

type KpiProps = {
  label: string;
  value: string;
  icon: LucideIcon;
  tone: Tone;
  delta?: number | null;
  goodWhenUp?: boolean;
  spark?: number[];
  note?: ReactNode;
  badge?: string;
};

function Sparkline({ values }: { values: number[] }) {
  const min = Math.min(...values);
  const range = Math.max(...values) - min || 1;
  const points = values.map((value, index) =>
    `${((index / (values.length - 1)) * 100).toFixed(2)},${(32 - ((value - min) / range) * 28).toFixed(2)}`,
  ).join(" ");
  return (
    <svg viewBox="0 0 100 36" preserveAspectRatio="none" className="finance-kpi-spark" aria-hidden="true">
      <polygon points={`0,36 ${points} 100,36`} fill="currentColor" opacity="0.09" />
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="2"
        vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function FinanceKpiTile({ label, value, icon: Icon, tone, delta, goodWhenUp = true, spark, note, badge }: KpiProps) {
  const hasDelta = delta != null;
  const favorable = hasDelta && ((delta >= 0) === goodWhenUp);
  return (
    <section className={cn("finance-kpi", `finance-kpi--${tone}`)}>
      <div className="finance-kpi-top">
        <span className="finance-kpi-icon" aria-hidden="true"><Icon size={19} strokeWidth={1.9} /></span>
        <span className="finance-kpi-label">{label}</span>
      </div>
      <strong className="finance-kpi-value font-mont text-base font-semibold tabular-nums">{value}</strong>
      <div className="finance-kpi-meta">
        {hasDelta && (
          <span className={cn("finance-kpi-change", favorable ? "finance-kpi-change--good" : "finance-kpi-change--bad")}>
            {delta >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
            {Math.abs(delta)}%
          </span>
        )}
        {!hasDelta && badge && <span className="finance-kpi-badge">{badge}</span>}
        {note && <span className="finance-kpi-note">{note}</span>}
      </div>
      {spark && spark.length > 1 && <Sparkline values={spark} />}
    </section>
  );
}

/** The detailed shared tab keeps its cards, while this row gives its figures a common visual hierarchy. */
export function ReceivablesHeadline({ d, currency }: { d: ReceivablesDashboard; currency?: string | null }) {
  const c = d.collections;
  const s = d.receivables_summary;
  return (
    <div className="finance-kpi-grid">
      {c?.billed && <FinanceKpiTile icon={FileText} tone="blue" label={`Billed ${d.window.label.toLowerCase()}`}
        value={formatMoney(c.billed.kobo, currency)} note={c.invoice_count != null ? `${c.invoice_count} invoices` : d.window.name} />}
      {c?.collected && <FinanceKpiTile icon={ReceiptText} tone="green" label="Collected"
        value={formatMoney(c.collected.kobo, currency)} badge={c.rate_pct != null ? `${c.rate_pct}%` : undefined}
        note={`Of ${d.window.name} fees`} />}
      {d.days_to_pay != null && <FinanceKpiTile icon={Clock3} tone="violet" label="Days to pay"
        value={`${d.days_to_pay} days`} note="Median to full payment" />}
      {s && <FinanceKpiTile icon={CircleAlert} tone="red" label="Overdue"
        value={formatMoney(s.overdue_amount.kobo, currency)} note={`${s.overdue_payers} payers past due`} />}
      {d.credit && <FinanceKpiTile icon={Wallet} tone="amber" label="Credit held"
        value={formatMoney(d.credit.total.kobo, currency)} note={`${d.credit.payers} payers in credit`} />}
    </div>
  );
}

export function SpendHeadline({ d, currency }: { d: SpendDashboard; currency?: string | null }) {
  return (
    <div className="finance-kpi-grid">
      {d.runway && <FinanceKpiTile icon={Banknote} tone="green" label="Cash runway"
        value={runwayLabel(d.runway.months)} note={d.runway.months == null ? "Needs more history" : "At recent outflow"} />}
      {d.spend && <FinanceKpiTile icon={TrendingUp} tone="red" label={`Operating spend ${d.window.label.toLowerCase()}`}
        value={formatMoney(d.spend.amount.kobo, currency)} delta={d.spend.delta_pct} goodWhenUp={false}
        note="vs previous window" />}
      {d.payroll && <FinanceKpiTile icon={CalendarClock} tone="blue" label="Payroll"
        value={formatMoney(d.payroll.gross.kobo, currency)} note={d.payroll.label} />}
      {d.tax_owed && <FinanceKpiTile icon={ShieldAlert} tone="amber" label="Tax owed"
        value={formatMoney(d.tax_owed.amount.kobo, currency)} note={d.tax_owed.next?.name ?? "Open returns"} />}
      {d.unmatched && <FinanceKpiTile icon={Landmark} tone="violet" label="Unmatched bank lines"
        value={d.unmatched.lines.toLocaleString()} note={d.unmatched.lines ? "Waiting on a match" : "All lines matched"} />}
    </div>
  );
}

type View = "overview" | "receivables" | "spend";

export function FinanceTabMotion({ view, direction, children }: { view: View; direction: number; children: ReactNode }) {
  const reduced = useReducedMotion();
  const distance = reduced ? 0 : 48;
  const duration = reduced ? 0 : 0.3;
  const variants = {
    enter: (side: number) => ({ x: side * distance, opacity: reduced ? 1 : 0 }),
    center: { x: 0, opacity: 1 },
    exit: (side: number) => ({ x: -side * distance, opacity: reduced ? 1 : 0, position: "absolute" as const, inset: 0 }),
  };
  return (
    <div className="finance-tab-viewport">
      <AnimatePresence mode="popLayout" initial={false} custom={direction}>
        <motion.div key={view} custom={direction} variants={variants}
          initial="enter" animate="center" exit="exit"
          transition={{ duration, ease: [0.22, 1, 0.36, 1] }}
          className="finance-tab-panel">
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
