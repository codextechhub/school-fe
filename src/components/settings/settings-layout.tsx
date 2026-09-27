import { useEffect, useRef, type ElementType, type ReactNode } from "react";
import { ArrowRight, CheckCircle2, CircleDashed, History, LockKeyhole } from "lucide-react";
import { Link } from "react-router";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface ConsoleSettingsSection {
  key: string;
  title: string;
  description: string;
  icon: ElementType;
}

export interface SettingsConsumerInfo {
  service: string;
  consumer: string;
  impact: string;
}

export function SettingsConsumer({ consumer }: { consumer?: SettingsConsumerInfo | null }) {
  if (!consumer) return null;
  return (
    <span className="mt-2 flex min-w-0 flex-wrap items-center gap-1.5 font-mont text-[10px] font-normal">
      <Badge variant="success" className="max-w-full gap-1 font-mont text-[10px]">
        <CheckCircle2 className="size-3 shrink-0" />
        <span className="truncate">Used by {consumer.service}</span>
      </Badge>
      <code className="max-w-full truncate rounded bg-gray-02 px-1.5 py-0.5 text-gray-05" title={consumer.consumer}>{consumer.consumer}</code>
      <span className="basis-full leading-4 text-gray-05">{consumer.impact}</span>
    </span>
  );
}

export function ConsoleSettingsLayout({
  title,
  description,
  basePath,
  activeSection,
  sections,
  scopeLabel,
  guideTargetPrefix,
  children,
}: {
  title: string;
  description: string;
  basePath: string;
  activeSection: string;
  sections: ConsoleSettingsSection[];
  scopeLabel?: string | null;
  guideTargetPrefix?: string;
  children: ReactNode;
}) {
  const railRef = useRef<HTMLDivElement>(null);

  // Below xl the sections are a row that scrolls sideways, and a deep link
  // can land on a section whose pill is off the right edge. Bring it into
  // view by moving the row itself, never the page.
  useEffect(() => {
    const rail = railRef.current;
    const active = rail?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!rail || !active || rail.scrollWidth <= rail.clientWidth) return;
    const left = active.offsetLeft - rail.offsetLeft;
    const right = left + active.offsetWidth;
    if (left < rail.scrollLeft || right > rail.scrollLeft + rail.clientWidth) {
      rail.scrollLeft = Math.max(0, left - 16);
    }
  }, [activeSection]);

  return (
    <main className="min-w-0 space-y-5 px-4.5 pb-6 pt-14 text-black-01 sm:py-6">
      <div data-guide={guideTargetPrefix ? `${guideTargetPrefix}.heading` : undefined} className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-mont text-xl font-semibold text-gray-01">{title}</h1>
          <p className="mt-1 max-w-3xl font-mont text-xs leading-5 text-gray-05">{description}</p>
        </div>
        {scopeLabel ? (
          <Badge variant="outline" className="max-w-full gap-1.5 px-2.5 py-1 font-mont text-xs">
            <span className="size-1.5 shrink-0 rounded-full bg-green-01" />
            <span className="truncate">{scopeLabel}</span>
          </Badge>
        ) : null}
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-5 xl:grid-cols-[220px_minmax(0,1fr)]">
        <nav data-guide={guideTargetPrefix ? `${guideTargetPrefix}.sections` : undefined} aria-label={`${title} sections`} className="min-w-0">
          <div ref={railRef} className="flex max-w-full gap-2 overflow-x-auto pb-1 xl:sticky xl:top-4 xl:block xl:space-y-1 xl:overflow-visible xl:rounded-xl xl:border xl:border-white-02 xl:bg-white xl:p-2">
            {sections.map((section) => {
              const Icon = section.icon;
              const active = section.key === activeSection;
              const to = section.key === "overview" ? basePath : `${basePath}/${section.key}`;
              return (
                <Link
                  key={section.key}
                  to={to}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group flex min-w-max items-center gap-2.5 rounded-lg border border-white-02 bg-white px-3 py-2.5 text-left transition-colors xl:min-w-0 xl:border-transparent",
                    active ? "border-primary/20 bg-primary/8 text-primary xl:border-primary/20" : "text-gray-01 hover:bg-gray-02/50",
                  )}
                >
                  <span className={cn("grid size-8 shrink-0 place-content-center rounded-md bg-gray-02 text-gray-05", active && "bg-primary/10 text-primary")}>
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-mont text-xs font-semibold">{section.title}</span>
                    <span className="mt-0.5 hidden truncate font-mont text-[10px] text-gray-05 xl:block">{section.description}</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>

        <section data-guide={guideTargetPrefix ? `${guideTargetPrefix}.content` : undefined} className="min-w-0">{children}</section>
      </div>
    </main>
  );
}

export function SettingsSectionHeader({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="font-mont text-base font-semibold text-gray-01">{title}</h2>
        <p className="mt-1 max-w-2xl font-mont text-xs leading-5 text-gray-05">{description}</p>
      </div>
      {action}
    </div>
  );
}

export function SettingsPanel({ title, description, children, className }: { title?: string; description?: string; children: ReactNode; className?: string }) {
  return (
    <section className={cn("overflow-hidden rounded-xl border border-white-02 bg-white", className)}>
      {title || description ? (
        <div className="border-b border-white-02 px-4 py-3.5 sm:px-5">
          {title ? <h3 className="font-mont text-sm font-semibold text-gray-01">{title}</h3> : null}
          {description ? <p className="mt-0.5 font-mont text-xs leading-5 text-gray-05">{description}</p> : null}
        </div>
      ) : null}
      <div className="divide-y divide-white-02">{children}</div>
    </section>
  );
}

export function SettingsRow({ label, description, value, badge, icon: Icon }: {
  label: string;
  description: string;
  value?: ReactNode;
  badge?: ReactNode;
  icon?: ElementType;
}) {
  return (
    <div className="flex flex-col gap-3 px-4 py-4 xl:flex-row xl:items-center sm:px-5">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        {Icon ? <span className="mt-0.5 grid size-8 shrink-0 place-content-center rounded-md bg-gray-02 text-gray-05"><Icon className="size-4" /></span> : null}
        <div className="min-w-0">
          <p className="font-mont text-sm font-medium text-gray-01">{label}</p>
          <p className="mt-0.5 font-mont text-xs leading-5 text-gray-05">{description}</p>
        </div>
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-2 pl-11 xl:max-w-[48%] xl:justify-end xl:pl-0">
        {value ? <span className="min-w-0 break-words text-right font-mont text-sm font-semibold text-gray-01">{value}</span> : null}
        {badge}
      </div>
    </div>
  );
}

export function PolicyBadge({ kind, children }: { kind: "enforced" | "default" | "configured"; children?: ReactNode }) {
  const Icon = kind === "enforced" ? LockKeyhole : kind === "configured" ? CheckCircle2 : CircleDashed;
  return (
    <Badge variant={kind === "configured" ? "success" : kind === "enforced" ? "outline" : "inactive"} className="gap-1 font-mont text-[10px]">
      <Icon className="size-3" />
      {children ?? (kind === "enforced" ? "Enforced" : kind === "configured" ? "Configured" : "Default")}
    </Badge>
  );
}

export function SettingsOverviewCard({ icon: Icon, title, description, to, status, tone = "neutral" }: {
  icon: ElementType;
  title: string;
  description: string;
  to: string;
  status?: string;
  tone?: "neutral" | "attention" | "ready";
}) {
  return (
    <Link to={to} className="group flex min-w-0 flex-col rounded-xl border border-white-02 bg-white p-4 transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <span className="grid size-9 place-content-center rounded-lg bg-primary/10 text-primary"><Icon className="size-4.5" /></span>
        {status ? (
          <Badge variant={tone === "ready" ? "success" : tone === "attention" ? "pending" : "inactive"} className="font-mont text-[10px]">{status}</Badge>
        ) : null}
      </div>
      <h3 className="mt-4 font-mont text-sm font-semibold text-gray-01">{title}</h3>
      <p className="mt-1 flex-1 font-mont text-xs leading-5 text-gray-05">{description}</p>
      <span className="mt-4 inline-flex items-center gap-1 font-mont text-xs font-semibold text-primary">
        Open settings <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}

const displayValue = (value: unknown) => {
  if (value === true) return "Allowed";
  if (value === false) return "Blocked";
  if (value == null || value === "") return "Not set";
  if (typeof value === "object" && !Array.isArray(value)) {
    const named = value as { name?: unknown; code?: unknown };
    if (typeof named.name === "string") {
      return typeof named.code === "string" ? `${named.code} · ${named.name}` : named.name;
    }
    return JSON.stringify(value);
  }
  return String(value);
};

export interface SettingsAuditRow {
  id: string | number;
  message: string;
  actor?: string | null;
  created_at: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
}

export function SettingsAuditHistory({ rows }: { rows: SettingsAuditRow[] }) {
  return (
    <SettingsPanel title="Recent changes" description="The latest saved changes for this entity. The full immutable record remains in the Finance audit trail.">
      {rows.length === 0 ? (
        <SettingsRow icon={History} label="No settings changes yet" description="The first successful save will appear here with its author and before-and-after values." />
      ) : rows.map((row) => {
        const keys = Array.from(new Set([...Object.keys(row.before || {}), ...Object.keys(row.after || {})]));
        return (
          <div key={row.id} className="px-4 py-4 sm:px-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-mont text-sm font-semibold text-gray-01">{row.message}</p>
                <p className="mt-0.5 font-mont text-xs text-gray-05">{row.actor ?? "System"} · {new Date(row.created_at).toLocaleString()}</p>
              </div>
              <PolicyBadge kind="configured">Saved</PolicyBadge>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {keys.map((key) => (
                <div key={key} className="min-w-0 rounded-lg bg-gray-02/60 px-3 py-2 font-mont text-xs">
                  <p className="truncate font-semibold text-gray-01">{key.replaceAll("_", " ")}</p>
                  <p className="mt-1 break-words text-gray-05">{displayValue(row.before?.[key])} → {displayValue(row.after?.[key])}</p>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </SettingsPanel>
  );
}
