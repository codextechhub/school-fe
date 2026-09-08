import { useState } from "react";
import { Loader2 } from "lucide-react";
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
import { SearchSelect } from "@/components/custom/search-select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { parseApiError } from "@/utils/api-error";
import { useBranchLens } from "@/hooks/use-branch-lens";
import type { AnyEntityWrite } from "@/redux/services/academics/academics-types";
import {
  codeFromName,
  type EntityCopy,
  type EntityDraft,
} from "./entity-draft";

/**
 * One drawer for every catalogue entity: department, programme, level, class,
 * subject.
 *
 * One form because they ARE one form - a name, a code and where it applies -
 * and five copies of it would drift the moment one of them gained a field. The
 * kinds differ in their labels, in the extra controls they need, and in nothing
 * else; the extras arrive as `children` rather than as five branches inside
 * this file.
 *
 * Two rules live here rather than in each screen:
 *
 * **Scope is stated, not offered, where it is not a choice.** An account tied
 * to one branch cannot create something school-wide, and a level inside a
 * branch-only programme cannot be wider than its parent. In both cases the
 * server would refuse a wider write, so a radio would be a control that lies.
 * `lockedTo` replaces it with a sentence saying which branch and why.
 *
 * **The server's duplicate refusal lands under the field it names.** The API
 * answers DUPLICATE_NAME or DUPLICATE_CODE with a sentence written for this
 * screen, and `detail.field` says which box was wrong. A toast would put it
 * where the reader is not looking and take it away before they look up.
 */

export function EntityDrawer({
  open,
  copy,
  initial,
  editing,
  saving,
  onClose,
  onSave,
  children,
  leading,
  extrasValid = true,
  extraBody,
  lockedTo,
  derivedName,
  onNameEdited,
  deriveCode,
}: {
  open: boolean;
  copy: EntityCopy;
  /** The row being edited, or a blank draft to create one. */
  initial: EntityDraft;
  /** True when this is an edit: changes the Save label and nothing else. */
  editing: boolean;
  saving: boolean;
  onClose: () => void;
  /** Resolve to the caller's mutation. Rejections are read for a refusal. */
  onSave: (body: AnyEntityWrite) => Promise<unknown>;
  /** Kind-specific controls (a department picker, offered-at levels). */
  children?: (draft: EntityDraft) => React.ReactNode;
  /**
   * Controls that come BEFORE the name, because they build it.
   *
   * A class is a level plus an arm, and its name and code are both derived from
   * those two - so asking for the name first is asking a question whose answer
   * the next two fields are about to overwrite. Whatever FORMS a field belongs
   * above it.
   */
  leading?: React.ReactNode;
  /**
   * Fields the kind-specific controls own, merged into the one request.
   *
   * The parent holds their state, because it is the parent that knows what a
   * programme or a subject needs. Passing it in - rather than letting the
   * children write straight to the server - keeps the drawer's promise that
   * Save is ONE call: a programme whose department arrived in a second request
   * is a programme that can end up in half of what was asked for.
   */
  extraBody?: AnyEntityWrite;
  /** False while a kind-specific control is incomplete. */
  extrasValid?: boolean;
  /**
   * Scope this row cannot choose, because its PARENT already decided.
   *
   * A level inside a branch-only programme cannot be school-wide - it would be
   * visible where its own parent is not, and `assert_within_parent` refuses it.
   * So the branch is stated with the reason, rather than offered and refused.
   * Null (the default) means the row is free to choose.
   */
  lockedTo?: { id: number; name: string; reason: string } | null;
  /**
   * A name the caller is composing from its own controls.
   *
   * The class drawer builds "JSS1 A" from the level and the arm as they are
   * picked. While this is set the field follows it; the caller stops sending it
   * once `onNameEdited` fires, and the person's own text is then left alone.
   * Same rule as the code field, for the same reason.
   */
  derivedName?: string;
  onNameEdited?: () => void;
  /** Overrides the first-three-letters rule where a kind needs its own. */
  deriveCode?: (name: string) => string;
}) {
  const {
    applies: multiBranch,
    isTied,
    branch: tiedBranch,
    branches,
    label: tiedLabel,
  } = useBranchLens();

  const [draft, setDraft] = useState<EntityDraft>(initial);
  /**
   * Which fields have been filled in and left, so a message is owed.
   *
   * NOT "focus passed through". The drawer puts focus in the name box on open,
   * so a blur-marks-touched rule scolded the reader for a field they had never
   * typed in the moment they reached for anything else - and the inserted
   * message pushed every control below it down by a line WHILE THEY WERE
   * CLICKING one, so the click landed on empty space and the drawer appeared to
   * ignore them. That is the bug this rule exists to prevent, not a nicety.
   */
  const [touched, setTouched] = useState<{ name?: boolean; code?: boolean }>(
    {},
  );
  const [edited, setEdited] = useState<{ name?: boolean; code?: boolean }>({});
  /**
   * Whether the code in the box is OURS or THEIRS.
   *
   * A code we generated follows the name, because it was only ever a guess at
   * what the name implies. A code the person typed is left alone, because it is
   * an answer. Without the distinction, generating SCI from "Sciences", hitting
   * the duplicate refusal and then renaming to "Technical Studies" leaves SCI
   * behind and fails again for the same reason - which is exactly what it did.
   */
  const [codeIsOurs, setCodeIsOurs] = useState(!initial.code);
  const [refusal, setRefusal] = useState<{
    field: string;
    message: string;
  } | null>(null);

  // Re-seed on a different row, during render rather than in an effect: an
  // effect paints the previous row's values for a frame first.
  const openedFor = open ? JSON.stringify(initial) : "shut";
  const [lastOpenedFor, setLastOpenedFor] = useState(openedFor);
  const [initialExtra, setInitialExtra] = useState(() =>
    JSON.stringify(extraBody ?? {}),
  );
  if (openedFor !== lastOpenedFor) {
    setLastOpenedFor(openedFor);
    if (open) {
      setDraft(initial);
      setTouched({});
      setEdited({});
      setRefusal(null);
      setCodeIsOurs(!initial.code);
      setInitialExtra(JSON.stringify(extraBody ?? {}));
    }
  }

  const makeCode = deriveCode ?? codeFromName;

  const patch = (next: Partial<EntityDraft>) => {
    setDraft((d) => ({ ...d, ...next }));
    setRefusal(null);
  };

  // Two ways scope stops being a choice, both ending in a sentence rather
  // than a control. The parent wins over the account.
  const tiedLock =
    isTied && tiedBranch !== "all"
      ? {
          id: tiedBranch as number,
          name: tiedLabel,
          reason:
            "Your account is tied to this branch, so anything you create belongs to it.",
        }
      : null;
  const lock = lockedTo ?? tiedLock;
  const effectiveBranch = lock ? lock.id : draft.branch;

  // The derived value wins until the person types over it.
  const shownName = derivedName !== undefined ? derivedName : draft.name;

  /**
   * The code, DERIVED as the form is filled in rather than pushed on change.
   *
   * Derived because the thing it follows does not always announce itself: a
   * class's name is composed from its level and arm by the caller, so choosing
   * a level fires no onChange here at all and a push-based code sat empty until
   * Generate was pressed. Reading it during render means the code appears as
   * the selections are made - pick JSS1 and it says JSS1, add arm C and it says
   * JSS1-C - which is what a generated value should do.
   *
   * Generate is still worth its place: it takes a code the person typed over
   * and hands the field back to us.
   */
  const shownCode = codeIsOurs ? makeCode(shownName) : draft.code;
  const nameEmpty = !!touched.name && !shownName.trim();
  const branchMissing = multiBranch && draft.branch === -1;

  const valid =
    !!shownName.trim() && !nameEmpty && !branchMissing && extrasValid;
  // Extras count as changes, or picking a department on an untouched form
  // would leave Save greyed out. Re-baselined per row below, not at mount.
  const dirty =
    JSON.stringify({
      ...draft,
      name: shownName,
      code: shownCode,
      branch: effectiveBranch,
    }) !==
      JSON.stringify({ ...initial, branch: lock ? lock.id : initial.branch }) ||
    JSON.stringify(extraBody ?? {}) !== initialExtra;

  const save = async () => {
    // A save attempt DOES owe every message, whether the field was touched or
    // not - that is the moment the reader asked for the form to be judged.
    setTouched({ name: true, code: true });
    try {
      await onSave({
        ...extraBody,
        name: shownName.trim(),
        // Left empty on purpose: the server generates one, and its rule is the
        // one that has to hold.
        code: shownCode.trim() || undefined,
        description: draft.description,
        // Sent explicitly, including null. Omitting it on a PATCH means "leave
        // it alone", which is not what picking school-wide means.
        branch: multiBranch ? effectiveBranch : null,
      });
      onClose();
    } catch (error) {
      const parsed = parseApiError(error);
      if (
        parsed.code === "DUPLICATE_NAME" ||
        parsed.code === "DUPLICATE_CODE"
      ) {
        const field = String(parsed.detail.field ?? "name");
        setTouched((t) => ({ ...t, [field]: true }));
        setRefusal({ field, message: parsed.message });
        return;
      }
      // Anything else - a scope conflict, a validation error - is already a
      // sentence written for this reader, so it is shown rather than swallowed.
      setRefusal({
        field: "",
        message: parsed.message || "That could not be saved.",
      });
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
            {copy.title}
          </SheetTitle>
          <SheetDescription className="text-[13px] text-gray-01 text-pretty">
            {copy.subtitle}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="min-w-0 flex-1" viewportClassName="px-5 py-5">
          {leading}

          <Field
            label={`${copy.nameLabel} *`}
            error={
              nameEmpty
                ? "A name is required."
                : refusal?.field === "name"
                  ? refusal.message
                  : ""
            }
          >
            <Input
              value={shownName}
              onChange={(e) => {
                onNameEdited?.();
                setEdited((t) => ({ ...t, name: true }));
                // No code: `shownCode` derives it from the name each render.
                patch({ name: e.target.value });
              }}
              // Only once they have actually typed something here. See `touched`.
              onBlur={() =>
                edited.name && setTouched((t) => ({ ...t, name: true }))
              }
              placeholder={copy.namePlaceholder}
              aria-invalid={nameEmpty || refusal?.field === "name" || undefined}
            />
          </Field>

          <div className="mt-4">
            <Field
              label="Code"
              error={refusal?.field === "code" ? refusal.message : ""}
            >
              <div className="flex gap-2">
                <Input
                  value={shownCode}
                  onChange={(e) => {
                    setCodeIsOurs(false);
                    patch({ code: e.target.value.toUpperCase() });
                  }}
                  placeholder={copy.codePlaceholder}
                  aria-invalid={refusal?.field === "code" || undefined}
                  className="min-w-0 flex-1"
                />
                <Button
                  variant="outline"
                  className="shrink-0 border-primary text-primary"
                  // Only worth pressing once the field is theirs; while it is
                  // ours it already says what this would set.
                  disabled={!shownName.trim() || codeIsOurs}
                  onClick={() => {
                    setCodeIsOurs(true);
                    patch({ code: "" });
                  }}
                >
                  Generate
                </Button>
              </div>
            </Field>
            <p className="mt-1 text-xs text-gray-05">
              {codeIsOurs
                ? "Built from the name as you fill it in. Type your own to override."
                : "Your own code. Generate returns to the built one."}
            </p>
          </div>

          {children?.(draft)}

          {/* Absent at a single-branch school, where every row is school-wide
              and a control with one answer is a question nobody can act on. */}
          {multiBranch && (
            <div className="mt-5 border-t border-white-02 pt-4">
              <p className="mb-2 text-[13px] font-medium text-gray-06">
                Applies to *
              </p>

              {lock ? (
                <div className="rounded-lg border border-white-02 bg-white-05 px-3 py-2.5">
                  <p className="text-sm text-black-01">{lock.name}</p>
                  <p className="mt-0.5 text-xs text-gray-05 text-pretty">
                    {lock.reason}
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <ScopeOption
                      on={draft.branch === null}
                      label="The whole school"
                      onClick={() => patch({ branch: null })}
                    />
                    <ScopeOption
                      on={draft.branch !== null}
                      label="One branch"
                      onClick={() =>
                        patch({ branch: draft.branch ?? branches[0]?.id ?? -1 })
                      }
                    />
                  </div>
                  {/* Searchable, not a bare select. A school with twenty
                      branches turns a native dropdown into a scroll hunt, and
                      the name is the only thing the reader knows - so let them
                      type it. */}
                  {draft.branch !== null && (
                    <div className="mt-2">
                      <SearchSelect
                        aria-label="Branch"
                        placeholder="Search branches"
                        value={draft.branch === -1 ? "" : String(draft.branch)}
                        onChange={(e) =>
                          patch({
                            branch: e.target.value
                              ? Number(e.target.value)
                              : -1,
                          })
                        }
                        options={branches.map((b) => ({
                          value: String(b.id),
                          label: b.name,
                        }))}
                      />
                    </div>
                  )}
                </>
              )}

              {!lock && (
                <p className="mt-2 text-xs text-gray-05 text-pretty">
                  {copy.scopeHint}
                </p>
              )}
            </div>
          )}

          <div className="mt-5 border-t border-white-02 pt-4">
            <Field label="Description">
              <Textarea
                rows={3}
                value={draft.description}
                onChange={(e) => patch({ description: e.target.value })}
                placeholder="Optional"
                className="resize-y"
              />
            </Field>
          </div>

          {refusal && !refusal.field && (
            <p className="mt-4 text-xs text-error-text text-pretty">
              {refusal.message}
            </p>
          )}
        </ScrollArea>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-white-02 px-5 py-4">
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={!valid || !dirty || saving}>
            {saving && <Loader2 className="size-4 animate-spin" />}
            {editing ? "Save changes" : "Create"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[13px] font-medium text-gray-06">
        {label}
      </label>
      {children}
      {error && (
        <p className="mt-1.5 text-xs text-error-text text-pretty">{error}</p>
      )}
    </div>
  );
}

function ScopeOption({
  on,
  label,
  onClick,
}: {
  on: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={cn(
        "rounded-lg border px-3 py-2 text-left text-sm",
        on
          ? "border-primary bg-pry-01 text-primary"
          : "border-white-02 text-gray-06",
      )}
    >
      {label}
    </button>
  );
}
