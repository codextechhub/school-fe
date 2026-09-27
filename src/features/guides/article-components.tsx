import type { ReactNode } from "react";
import { CheckCircle2, CircleAlert, Info, Lightbulb, TriangleAlert } from "lucide-react";

import { cn } from "@/lib/utils";

export function GuideSection({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-white-02 pt-8 first:border-t-0 first:pt-0">
      <h2 className="font-mont text-xl font-semibold tracking-tight text-black-01 sm:text-2xl">{title}</h2>
      <div className="mt-4 space-y-4 text-sm leading-7 text-gray-700">{children}</div>
    </section>
  );
}

export function GuideSteps({ children }: { children: ReactNode }) {
  return <ol className="space-y-4 [counter-reset:guide-step]">{children}</ol>;
}

export function GuideStep({ title, children }: { title: string; children: ReactNode }) {
  return (
    <li className="relative grid min-w-0 grid-cols-[2.25rem_minmax(0,1fr)] gap-3 [counter-increment:guide-step]">
      <span className="grid size-9 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary before:content-[counter(guide-step)]" />
      <div className="min-w-0 rounded-2xl border border-gray-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-black-01">{title}</h3>
        <div className="mt-1.5 text-sm leading-6 text-gray-600">{children}</div>
      </div>
    </li>
  );
}

const CALLOUTS = {
  info: { icon: Info, className: "border-blue-200 bg-blue-50/70 text-blue-950" },
  tip: { icon: Lightbulb, className: "border-emerald-200 bg-emerald-50/70 text-emerald-950" },
  warning: { icon: TriangleAlert, className: "border-amber-200 bg-amber-50/80 text-amber-950" },
  danger: { icon: CircleAlert, className: "border-red-200 bg-red-50/80 text-red-950" },
} as const;

export function GuideCallout({ tone = "info", title, children }: { tone?: keyof typeof CALLOUTS; title: string; children: ReactNode }) {
  const meta = CALLOUTS[tone];
  const Icon = meta.icon;
  return (
    <aside className={cn("rounded-2xl border p-4", meta.className)}>
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 size-4.5 shrink-0" />
        <div className="min-w-0"><p className="text-sm font-semibold">{title}</p><div className="mt-1 text-sm leading-6 opacity-85">{children}</div></div>
      </div>
    </aside>
  );
}

export function GuideChecklist({ items }: { items: readonly string[] }) {
  return (
    <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {items.map((item) => <li key={item} className="flex items-start gap-2 rounded-xl bg-gray-50 px-3 py-2.5 text-sm"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" /><span>{item}</span></li>)}
    </ul>
  );
}

export function GuideFigure({ title, caption, children }: { title: string; caption: string; children: ReactNode }) {
  return (
    <figure className="overflow-hidden rounded-2xl border border-gray-200 bg-gray-50">
      <div className="border-b border-gray-200 bg-white px-4 py-3 text-xs font-semibold text-black-01">{title}</div>
      <div className="p-4 sm:p-6">{children}</div>
      <figcaption className="border-t border-gray-200 bg-white px-4 py-3 text-xs leading-5 text-gray-01">{caption}</figcaption>
    </figure>
  );
}
