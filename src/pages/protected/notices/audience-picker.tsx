import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import type {
  AudienceKind,
  NoticeAudience,
  NoticeAudienceOptions,
} from "@/redux/services/notices/notices-types";

import { audienceKey } from "./notice-copy";

/**
 * Who a notice is for, chosen from what the poster may address.
 *
 * The whole school is one choice that stands alone: ticking it clears the
 * rest, and ticking anything else clears it. Branches appear only at a school
 * with more than one; levels and the whole school only for a whole-school
 * poster. The class list has its own search, because a large school runs
 * dozens of classes.
 */
export function AudiencePicker({
  options,
  value,
  onChange,
  disabled,
}: {
  options: NoticeAudienceOptions;
  value: NoticeAudience[];
  onChange: (next: NoticeAudience[]) => void;
  disabled?: boolean;
}) {
  const [classSearch, setClassSearch] = useState("");
  const chosen = useMemo(() => new Set(value.map(audienceKey)), [value]);
  const wholeSchool = chosen.has(audienceKey({ kind: "SCHOOL", id: null }));

  const toggle = (kind: AudienceKind, id: number | null, name: string) => {
    const key = audienceKey({ kind, id });
    if (kind === "SCHOOL") {
      onChange(wholeSchool ? [] : [{ kind, id: null, name }]);
      return;
    }
    const rest = value.filter((entry) => entry.kind !== "SCHOOL");
    onChange(
      chosen.has(key)
        ? rest.filter((entry) => audienceKey(entry) !== key)
        : [...rest, { kind, id, name }],
    );
  };

  const classes = options.classes.filter((row) =>
    row.name.toLowerCase().includes(classSearch.trim().toLowerCase()),
  );

  return (
    <div className="grid gap-4">
      {options.school ? (
        <Choice
          label="Whole school"
          checked={wholeSchool}
          disabled={disabled}
          onToggle={() => toggle("SCHOOL", null, "Whole school")}
        />
      ) : null}

      {options.branches.length > 0 ? (
        <Group title="Branches">
          {options.branches.map((row) => (
            <Choice
              key={row.id}
              label={row.name}
              checked={chosen.has(audienceKey({ kind: "BRANCH", id: row.id }))}
              disabled={disabled}
              onToggle={() => toggle("BRANCH", row.id, row.name)}
            />
          ))}
        </Group>
      ) : null}

      {options.levels.length > 0 ? (
        <Group title="Levels">
          {options.levels.map((row) => (
            <Choice
              key={row.id}
              label={row.name}
              checked={chosen.has(audienceKey({ kind: "LEVEL", id: row.id }))}
              disabled={disabled}
              onToggle={() => toggle("LEVEL", row.id, row.name)}
            />
          ))}
        </Group>
      ) : null}

      <Group title="Classes">
        {options.classes.length > 8 ? (
          <div className="relative col-span-full">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-05" />
            <input
              value={classSearch}
              onChange={(event) => setClassSearch(event.target.value)}
              placeholder="Search classes"
              aria-label="Search classes"
              className="h-9 w-full rounded-lg border border-white-02 bg-white pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
          </div>
        ) : null}
        {options.classes.length === 0 ? (
          <p className="col-span-full text-xs text-gray-05">
            There are no classes you can post to this year.
          </p>
        ) : (
          <ScrollArea className="col-span-full max-h-56">
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {classes.map((row) => (
                <Choice
                  key={row.id}
                  label={row.name}
                  checked={chosen.has(audienceKey({ kind: "CLASS", id: row.id }))}
                  disabled={disabled}
                  onToggle={() => toggle("CLASS", row.id, row.name)}
                />
              ))}
            </div>
          </ScrollArea>
        )}
      </Group>
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="grid min-w-0 gap-1.5">
      <legend className="mb-1.5 text-xs font-medium text-gray-05">{title}</legend>
      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

function Choice({
  label,
  checked,
  disabled,
  onToggle,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onToggle: () => void;
}) {
  return (
    <label className="flex min-w-0 cursor-pointer items-center gap-2.5 rounded-md border border-white-02 px-3 py-2 text-sm text-black-01 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60">
      <Checkbox checked={checked} disabled={disabled} onCheckedChange={onToggle} />
      <span className="min-w-0 truncate">{label}</span>
    </label>
  );
}
