import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { parseApiError } from "@/utils/api-error";
import { useBulkCreateLevelsMutation } from "@/redux/services/academics/academics-api";
import type { Program } from "@/redux/services/academics/academics-types";

/**
 * A run of levels, typed one per line.
 *
 * The preview is the point. A school adding "JSS1 / JSS2 / JSS3" wants to know
 * BEFORE saving which of the three already exist, because the server refuses
 * the whole batch if any of them do - half-creating a run leaves a school
 * unable to tell which of the names it typed took, so the backend deliberately
 * creates none. A preview that only appears after the refusal makes the person
 * guess which line to delete.
 *
 * The check is against the levels already loaded for this programme, which is
 * the same scope the constraint uses (a level name is unique inside its
 * programme, not across the school). The server checks again regardless; this
 * is here so the answer arrives before the button is pressed, not instead of it.
 */
export function BulkLevelsDrawer({
  open,
  program,
  onClose,
}: {
  open: boolean;
  program: Program | null;
  onClose: () => void;
}) {
  const [text, setText] = useState("");
  const [create, { isLoading }] = useBulkCreateLevelsMutation();

  const openedFor = open ? String(program?.id ?? "") : "shut";
  const [lastOpenedFor, setLastOpenedFor] = useState(openedFor);
  if (openedFor !== lastOpenedFor) {
    setLastOpenedFor(openedFor);
    if (open) setText("");
  }

  const existing = useMemo(
    () =>
      new Set((program?.levels ?? []).map((l) => l.name.trim().toLowerCase())),
    [program],
  );

  const rows = useMemo(() => {
    const names = text
      .split("\n")
      .map((n) => n.trim())
      .filter(Boolean);
    const seen = new Set<string>();
    return names.map((name) => {
      const key = name.toLowerCase();
      // A repeat within the box clashes too - the server refuses the batch
      // for it, so a database-only preview would call the second one new.
      const clash = existing.has(key) || seen.has(key);
      seen.add(key);
      return { name, clash };
    });
  }, [text, existing]);

  const clashes = rows.filter((r) => r.clash).length;
  const valid = rows.length > 0 && clashes === 0;

  const save = async () => {
    if (!program) return;
    try {
      const result = await create({
        program: program.id,
        names: rows.map((r) => r.name),
        // The programme's own branch, so a branch-only programme cannot
        // acquire school-wide levels.
        branch: program.branch ?? null,
      }).unwrap();
      toast.success(result.message);
      onClose();
    } catch (error) {
      toast.error(parseApiError(error).message || "Those could not be added.");
    }
  };

  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 bg-white p-0 sm:max-w-lg"
      >
        <SheetHeader className="border-b border-border px-5 pb-4 pt-5 pr-12 text-left">
          <SheetTitle className="truncate font-mont text-base">
            Add levels in bulk
          </SheetTitle>
          <SheetDescription className="text-[13px] text-gray-01 text-pretty">
            One level name per line. Codes are generated for you.
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="min-w-0 flex-1" viewportClassName="px-5 py-5">
          <p className="mb-3 text-[13px] text-gray-06">
            Adding to{" "}
            <span className="font-medium text-black-01">{program?.name}</span>
            {program?.scope_label && (
              <span className="text-gray-05"> · {program.scope_label}</span>
            )}
          </p>

          <label className="mb-1.5 block text-[13px] font-medium text-gray-06">
            Level names *
          </label>
          <textarea
            rows={6}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={"JSS1\nJSS2\nJSS3"}
            className="w-full resize-y rounded-lg border border-white-02 px-3 py-2.5 font-mono text-sm outline-none focus:border-primary"
          />

          <div className="mt-4">
            <p className="mb-2 text-[13px] font-medium text-gray-06">
              What will be created
            </p>
            {rows.length === 0 ? (
              <p className="text-xs text-gray-05">Nothing to add yet.</p>
            ) : (
              <>
                <div className="overflow-hidden rounded-lg border border-white-02">
                  {rows.map((row, i) => (
                    <div
                      key={`${row.name}-${i}`}
                      className={cn(
                        "flex items-center justify-between gap-3 px-3 py-2 text-sm",
                        i > 0 && "border-t border-white-02",
                      )}
                    >
                      <span className="min-w-0 truncate text-black-01">
                        {row.name}
                      </span>
                      {/* No code column. The server suffixes a generated code
                          to keep it unique across the school, and this drawer
                          only holds THIS programme's levels - so any code shown
                          here would be a guess, and three levels would all read
                          "VOC" while being saved as VOC, VOC2 and VOC3. */}
                      <span
                        className={cn(
                          "shrink-0 text-xs",
                          row.clash ? "text-error-text" : "text-green-01-text",
                        )}
                      >
                        {row.clash ? "Already exists" : "New"}
                      </span>
                    </div>
                  ))}
                </div>
                {clashes > 0 && (
                  <p className="mt-2 text-xs text-error-text text-pretty">
                    {clashes === 1
                      ? "One of these already exists in this programme. Remove that line - nothing is added while it is there."
                      : `${clashes} of these already exist in this programme. Remove those lines - nothing is added while they are there.`}
                  </p>
                )}
              </>
            )}
          </div>
        </ScrollArea>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-white-02 px-5 py-4">
          <Button variant="ghost" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={save} disabled={!valid || isLoading}>
            {isLoading && <Loader2 className="size-4 animate-spin" />}
            {rows.length > 1 ? `Add ${rows.length} levels` : "Add level"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
