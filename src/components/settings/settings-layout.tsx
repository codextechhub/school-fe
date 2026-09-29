import { useEffect, useRef, useState, type ElementType, type ReactNode, type RefObject } from "react";
import { ArrowRight, CheckCircle2, ChevronDown, CircleDashed, History, LockKeyhole } from "lucide-react";
import { Link } from "react-router";
import { PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export interface ConsoleSettingsSection {
  key: string;
  title: string;
  description: string;
  icon: ElementType;
  /** The `ConsoleSettingsGroup` key this section sits under, when it has one. */
  group?: string;
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

/** A heading in the sections rail that holds several sections under one name. */
export interface ConsoleSettingsGroup {
  key: string;
  title: string;
  icon: ElementType;
}

type RailEntry =
  | { kind: "section"; section: ConsoleSettingsSection }
  | { kind: "group"; group: ConsoleSettingsGroup; sections: ConsoleSettingsSection[] };

/** Sections in their given order, with grouped ones gathered where their group first appears. */
function railEntries(sections: ConsoleSettingsSection[], groups: ConsoleSettingsGroup[]): RailEntry[] {
  const byKey = new Map(groups.map((g) => [g.key, g]));
  const entries: RailEntry[] = [];
  const placed = new Map<string, Extract<RailEntry, { kind: "group" }>>();
  for (const section of sections) {
    const group = section.group ? byKey.get(section.group) : undefined;
    if (!group) {
      entries.push({ kind: "section", section });
      continue;
    }
    const existing = placed.get(group.key);
    if (existing) {
      existing.sections.push(section);
    } else {
      const entry = { kind: "group" as const, group, sections: [section] };
      placed.set(group.key, entry);
      entries.push(entry);
    }
  }
  return entries;
}

const XL_QUERY = "(min-width: 1280px)";
/** Space kept under the fitted box, so it does not sit on the window's edge. */
const FIT_BOTTOM_GAP = 24;
const FIT_MIN_HEIGHT = 420;

/**
 * The height that fits a box from its top to the bottom of the window, at xl
 * and up; `undefined` below xl, where the page scrolls as usual.
 *
 * Measured rather than calculated from the header's height, because banners
 * above the page (a proxy session, an announcement) move the box down.
 */
function useFitToWindow(ref: RefObject<HTMLElement | null>, enabled: boolean, remeasure: unknown) {
  const [height, setHeight] = useState<number | undefined>(undefined);
  useEffect(() => {
    if (!enabled || typeof window === "undefined" || !window.matchMedia) return;
    const media = window.matchMedia(XL_QUERY);
    const measure = () => {
      const box = ref.current;
      if (!box || !media.matches) {
        setHeight(undefined);
        return;
      }
      const top = box.getBoundingClientRect().top + window.scrollY;
      setHeight(Math.max(FIT_MIN_HEIGHT, window.innerHeight - top - FIT_BOTTOM_GAP));
    };
    measure();
    window.addEventListener("resize", measure);
    media.addEventListener?.("change", measure);
    return () => {
      window.removeEventListener("resize", measure);
      media.removeEventListener?.("change", measure);
    };
  }, [ref, enabled, remeasure]);
  return height;
}

/**
 * A settings console: a rail of sections beside the open one.
 *
 * **Groups.** A section that names a `group` sits under that group's heading
 * in the rail, which opens and closes like a sub-menu; the group holding the
 * open section is always open. Below xl the rail is a row of pills: groups
 * show as one pill each, and the open group's sections follow in a second
 * row, so a phone never scrolls sideways past a dozen pills to find one.
 *
 * **`fitScreen`.** At xl and up the rail and the open section sit in a box as
 * tall as the window, and each scrolls on its own, so a long section scrolls
 * without taking the rail away and the page itself never grows. Below xl the
 * page scrolls as every other page does. Both are opt-in, so a console that
 * passes neither keeps a flat rail on a scrolling page.
 */
export function ConsoleSettingsLayout({
  title,
  description,
  basePath,
  activeSection,
  sections,
  groups = [],
  fitScreen = false,
  scopeLabel,
  guideTargetPrefix,
  children,
}: {
  title: string;
  description: string;
  basePath: string;
  activeSection: string;
  sections: ConsoleSettingsSection[];
  groups?: ConsoleSettingsGroup[];
  fitScreen?: boolean;
  scopeLabel?: string | null;
  guideTargetPrefix?: string;
  children: ReactNode;
}) {
  const railRef = useRef<HTMLDivElement>(null);
  const subRailRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const entries = railEntries(sections, groups);
  const activeGroup = sections.find((s) => s.key === activeSection)?.group;
  const activeEntry = entries.find(
    (e): e is Extract<RailEntry, { kind: "group" }> => e.kind === "group" && e.group.key === activeGroup,
  );
  const [opened, setOpened] = useState<Record<string, boolean>>({});
  const isOpen = (key: string) => key === activeGroup || Boolean(opened[key]);

  const fittedHeight = useFitToWindow(boxRef, fitScreen, activeSection);
  const fitted = fittedHeight !== undefined;

  // Below xl the rows scroll sideways, and a deep link can land on a pill off
  // the right edge. Bring it into view by moving the row itself, never the page.
  useEffect(() => {
    for (const rail of [railRef.current, subRailRef.current]) {
      const active = rail?.querySelector<HTMLElement>('[aria-current="page"], [data-active-group="true"]');
      if (!rail || !active || rail.scrollWidth <= rail.clientWidth) continue;
      const left = active.offsetLeft - rail.offsetLeft;
      const right = left + active.offsetWidth;
      if (left < rail.scrollLeft || right > rail.scrollLeft + rail.clientWidth) {
        rail.scrollLeft = Math.max(0, left - 16);
      }
    }
  }, [activeSection]);

  // A new section starts at its top, as a new page would.
  useEffect(() => {
    if (contentRef.current) contentRef.current.scrollTop = 0;
  }, [activeSection]);

  const hrefOf = (key: string) => (key === "overview" ? basePath : `${basePath}/${key}`);

  const rail = (
    <div className="hidden space-y-1 rounded-xl border border-white-02 bg-white p-2 xl:block">
      {entries.map((entry) => {
        if (entry.kind === "section") {
          return <RailLink key={entry.section.key} section={entry.section} to={hrefOf(entry.section.key)} active={entry.section.key === activeSection} />;
        }
        const { group } = entry;
        const Icon = group.icon;
        const open = isOpen(group.key);
        const holdsActive = group.key === activeGroup;
        return (
          <div key={group.key}>
            <button
              type="button"
              aria-expanded={open}
              onClick={() => setOpened((current) => ({ ...current, [group.key]: !open }))}
              disabled={holdsActive}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left transition-colors disabled:cursor-default",
                holdsActive ? "text-primary" : "text-gray-01 hover:bg-gray-02/50",
              )}
            >
              <span className={cn("grid size-8 shrink-0 place-content-center rounded-md bg-gray-02 text-gray-05", holdsActive && "bg-primary/10 text-primary")}>
                <Icon className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-mont text-xs font-semibold">{group.title}</span>
                <span className="mt-0.5 block truncate font-mont text-[10px] text-gray-05">
                  {entry.sections.map((s) => s.title).join(", ")}
                </span>
              </span>
              <ChevronDown className={cn("size-4 shrink-0 text-gray-05 transition-transform", open && "rotate-180")} aria-hidden />
            </button>
            {open ? (
              <div className="mb-1 ml-7 space-y-0.5 border-l border-white-02 pl-3">
                {entry.sections.map((section) => {
                  const active = section.key === activeSection;
                  return (
                    <Link
                      key={section.key}
                      to={hrefOf(section.key)}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "block rounded-md px-2.5 py-1.5 transition-colors",
                        active ? "bg-primary/8 text-primary" : "text-gray-01 hover:bg-gray-02/50",
                      )}
                    >
                      <span className="block font-mont text-xs font-semibold">{section.title}</span>
                      <span className="block truncate font-mont text-[10px] text-gray-05">{section.description}</span>
                    </Link>
                  );
                })}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );

  const pills = (
    <div className="xl:hidden">
      <div ref={railRef} className="flex max-w-full gap-2 overflow-x-auto pb-1">
        {entries.map((entry) => {
          if (entry.kind === "section") {
            return <RailLink key={entry.section.key} section={entry.section} to={hrefOf(entry.section.key)} active={entry.section.key === activeSection} pill />;
          }
          const holdsActive = entry.group.key === activeGroup;
          return (
            <Link
              key={entry.group.key}
              to={hrefOf(entry.sections[0].key)}
              data-active-group={holdsActive ? "true" : undefined}
              className={pillClass(holdsActive)}
            >
              <span className={cn("grid size-8 shrink-0 place-content-center rounded-md bg-gray-02 text-gray-05", holdsActive && "bg-primary/10 text-primary")}>
                <entry.group.icon className="size-4" />
              </span>
              <span className="font-mont text-xs font-semibold">{entry.group.title}</span>
            </Link>
          );
        })}
      </div>
      {activeEntry ? (
        <div ref={subRailRef} className="mt-2 flex max-w-full gap-1.5 overflow-x-auto pb-1" aria-label={`${activeEntry.group.title} sections`}>
          {activeEntry.sections.map((section) => {
            const active = section.key === activeSection;
            return (
              <Link
                key={section.key}
                to={hrefOf(section.key)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 font-mont text-xs font-medium transition-colors",
                  active ? "border-primary/30 bg-primary/8 text-primary" : "border-white-02 bg-white text-gray-01 hover:bg-gray-02/50",
                )}
              >
                {section.title}
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );

  return (
    <PageShell className="space-y-5 px-4.5 pb-6 pt-14 text-black-01 sm:py-6">
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

      <div
        ref={boxRef}
        style={fitted ? { height: fittedHeight } : undefined}
        className="grid min-w-0 grid-cols-1 gap-5 xl:grid-cols-[240px_minmax(0,1fr)]"
      >
        <nav
          data-guide={guideTargetPrefix ? `${guideTargetPrefix}.sections` : undefined}
          aria-label={`${title} sections`}
          className={cn("min-w-0", fitted && "min-h-0")}
        >
          {pills}
          {fitted ? (
            <ScrollArea className="hidden h-full xl:block">{rail}</ScrollArea>
          ) : (
            <div className="xl:sticky xl:top-4">{rail}</div>
          )}
        </nav>

        <section data-guide={guideTargetPrefix ? `${guideTargetPrefix}.content` : undefined} className={cn("min-w-0", fitted && "min-h-0")}>
          {fitted ? (
            <ScrollArea className="h-full" viewportRef={contentRef} viewportClassName="pr-3">
              <div className="pb-2">{children}</div>
            </ScrollArea>
          ) : (
            children
          )}
        </section>
      </div>
    </PageShell>
  );
}

function pillClass(active: boolean) {
  return cn(
    "group flex min-w-max items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-colors",
    active ? "border-primary/20 bg-primary/8 text-primary" : "border-white-02 bg-white text-gray-01 hover:bg-gray-02/50",
  );
}

function RailLink({
  section,
  to,
  active,
  pill = false,
}: {
  section: ConsoleSettingsSection;
  to: string;
  active: boolean;
  pill?: boolean;
}) {
  const Icon = section.icon;
  return (
    <Link
      to={to}
      aria-current={active ? "page" : undefined}
      className={
        pill
          ? pillClass(active)
          : cn(
              "group flex min-w-0 items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-colors",
              active ? "border-primary/20 bg-primary/8 text-primary" : "border-transparent text-gray-01 hover:bg-gray-02/50",
            )
      }
    >
      <span className={cn("grid size-8 shrink-0 place-content-center rounded-md bg-gray-02 text-gray-05", active && "bg-primary/10 text-primary")}>
        <Icon className="size-4" />
      </span>
      <span className="min-w-0">
        <span className="block font-mont text-xs font-semibold">{section.title}</span>
        {pill ? null : <span className="mt-0.5 block truncate font-mont text-[10px] text-gray-05">{section.description}</span>}
      </span>
    </Link>
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
