import { Trash2 } from "lucide-react";

import { NativeSelect } from "@/components/ui/native-select";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AccessField, useFieldAccess } from "@/components/finance-ui";
import { FIELD_RESOURCE, canCreateGuardian } from "@/lib/field-resources";
import { useGetGuardiansQuery } from "@/redux/services/students/students-api";
import { useRelationshipOptions } from "../relationships";

import { Field, inputClass } from "../drawers/drawer-shell";
import { guardianMatchLine } from "../format";

/**
 * A row on the form: either a guardian already at the school, or a new one.
 *
 * `full_name` is the search text for an existing guardian. A new guardian's
 * name is entered in parts, so the record is created confirmed rather than
 * split from one line and flagged for review.
 */
export interface GuardianDraft {
  kind: "existing" | "new";
  guardianId?: number;
  guardianName?: string;
  guardianMeta?: string;
  full_name: string;
  first_name: string;
  middle_name: string;
  last_name: string;
  phone: string;
  email: string;
  relationship: string;
  is_primary: boolean;
}

/**
 * The guardians section of the enrolment form.
 *
 * **Search before create, and the search result says what it already stands
 * for.** A guardian belongs to the school, not to a child. Typing a fresh
 * record for a parent who already has one splits a household: the Guardians
 * screen then shows the same parent twice with one child each, and the sibling
 * link the screen exists to show is gone. So the picker leads with "already
 * guardian of 2 students" - the sentence that stops the second record being
 * created.
 *
 * **Exactly one primary contact.** Ticking one row unticks the others here
 * rather than letting the server sort it out, because a form that lets you tick
 * two and then rejects the save has taught you nothing about the rule.
 *
 * **A new guardian follows Field Access as a record being created.** Each
 * contact input asks `school.guardians` with `creating`, so a field the backend
 * declares open on create (the phone) is offered even to a registrar who may
 * not read or change it on an existing guardian, while the optional ones follow
 * their switches. "Add a new one" is offered whenever the registrar may give
 * every field a new guardian requires ({@link canCreateGuardian}); otherwise
 * only the search for a guardian already at the school is, because a form
 * missing a required field could never be sent.
 */
export function GuardianRows({
  rows,
  onChange,
  error,
  emailRequired = false,
}: {
  rows: GuardianDraft[];
  onChange: (rows: GuardianDraft[]) => void;
  error?: string;
  /** The school requires an email for a guardian it has not met before. */
  emailRequired?: boolean;
}) {
  const relationshipOptions = useRelationshipOptions();
  const access = useFieldAccess(FIELD_RESOURCE.GUARDIANS);
  const canAddNew = canCreateGuardian(access);

  function patch(index: number, next: Partial<GuardianDraft>) {
    onChange(rows.map((r, i) => (i === index ? { ...r, ...next } : r)));
  }

  function setPrimary(index: number) {
    onChange(rows.map((r, i) => ({ ...r, is_primary: i === index })));
  }

  function remove(index: number) {
    const left = rows.filter((_, i) => i !== index);
    // Removing the primary must not leave the student without one.
    if (left.length && !left.some((r) => r.is_primary)) left[0].is_primary = true;
    onChange(left);
  }

  return (
    <section className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-black-01">Guardians</h3>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              onChange([
                ...rows,
                {
                  kind: "existing",
                  full_name: "",
                  first_name: "",
                  middle_name: "",
                  last_name: "",
                  phone: "",
                  email: "",
                  relationship: "",
                  is_primary: rows.length === 0,
                },
              ])
            }
          >
            Find an existing guardian
          </Button>
          {canAddNew && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() =>
                onChange([
                  ...rows,
                  {
                    kind: "new",
                    full_name: "",
                    first_name: "",
                    middle_name: "",
                    last_name: "",
                    phone: "",
                    email: "",
                    relationship: "",
                    is_primary: rows.length === 0,
                  },
                ])
              }
            >
              Add a new one
            </Button>
          )}
        </div>
      </div>

      {rows.length === 0 ? (
        <p
          className={cn(
            "rounded-lg border border-dashed px-3 py-6 text-center text-sm",
            error
              ? "border-red-300 bg-red-50 text-red-700"
              : "border-white-02 bg-white text-gray-05",
          )}
        >
          {error ??
            "No guardian linked yet. Every student needs at least one, and exactly one primary contact."}
        </p>
      ) : (
        <ul className="grid gap-3">
          {rows.map((row, index) => (
            <li
              key={index}
              className="grid gap-3 rounded-xl border border-white-02 bg-white p-3.5"
            >
              {row.kind === "existing" ? (
                <ExistingPicker
                  row={row}
                  canAddNew={canAddNew}
                  takenIds={rows
                    .filter((r, i) => i !== index && r.guardianId)
                    .map((r) => r.guardianId as number)}
                  onPatch={(next) => patch(index, next)}
                />
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  <AccessField access={access} name="first_name" creating>
                    <Field label="First name">
                      <input
                        value={row.first_name}
                        onChange={(e) => patch(index, { first_name: e.target.value })}
                        className={inputClass}
                      />
                    </Field>
                  </AccessField>
                  <AccessField access={access} name="middle_name" creating>
                    <Field label="Middle name (optional)">
                      <input
                        value={row.middle_name}
                        onChange={(e) => patch(index, { middle_name: e.target.value })}
                        className={inputClass}
                      />
                    </Field>
                  </AccessField>
                  <AccessField access={access} name="last_name" creating>
                    <Field label="Last name">
                      <input
                        value={row.last_name}
                        onChange={(e) => patch(index, { last_name: e.target.value })}
                        className={inputClass}
                      />
                    </Field>
                  </AccessField>
                  <AccessField access={access} name="phone" creating>
                    <Field
                      label="Phone"
                      hint="A number the school can reach."
                    >
                      <input
                        value={row.phone}
                        onChange={(e) => patch(index, { phone: e.target.value })}
                        className={inputClass}
                      />
                    </Field>
                  </AccessField>
                  <AccessField access={access} name="email" creating>
                    <Field
                      label={emailRequired ? "Email" : "Email (optional)"}
                      required={emailRequired}
                    >
                      <input
                        type="email"
                        value={row.email}
                        onChange={(e) => patch(index, { email: e.target.value })}
                        className={inputClass}
                      />
                    </Field>
                  </AccessField>
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Relationship">
                  <NativeSelect
                    value={row.relationship}
                    onChange={(e) => patch(index, { relationship: e.target.value })}
                    className="h-9"
                  >
                    <option value="">Select a relationship</option>
                    {relationshipOptions.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </NativeSelect>
                </Field>

                <div className="flex items-end justify-between gap-2">
                  <label className="flex items-center gap-2 text-sm text-black-01">
                    <input
                      type="radio"
                      name="primary-contact"
                      checked={row.is_primary}
                      onChange={() => setPrimary(index)}
                      className="size-4"
                    />
                    Primary contact
                  </label>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    aria-label="Remove this guardian"
                    onClick={() => remove(index)}
                    className="text-gray-05 hover:text-red-600"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {error && rows.length > 0 && (
        <p className="text-xs text-red-600">{error}</p>
      )}
    </section>
  );
}

/**
 * Pick a guardian who is already at this school.
 *
 * The search text lives in `full_name` on the row, so the same field is the
 * query before a pick and the typed name after switching to "add a new one" -
 * one place, and no way for the two to disagree. Typing again clears the pick,
 * so the row can never show one guardian's name while carrying another's id.
 */
function ExistingPicker({
  row,
  canAddNew,
  takenIds,
  onPatch,
}: {
  row: GuardianDraft;
  /** Whether the form offers "Add a new one", so a miss only points there when it does. */
  canAddNew: boolean;
  takenIds: number[];
  onPatch: (next: Partial<GuardianDraft>) => void;
}) {
  const query = row.guardianId ? "" : row.full_name.trim();
  const { data, isFetching } = useGetGuardiansQuery(
    { search: query },
    { skip: query.length < 2 },
  );
  const matches = (data?.data ?? []).slice(0, 5);

  const wardLine = guardianMatchLine;

  if (row.guardianId) {
    return (
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-black-01">
            {row.guardianName}
          </p>
          <p className="truncate text-xs text-gray-05">{row.guardianMeta}</p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() =>
            onPatch({
              guardianId: undefined,
              guardianName: "",
              guardianMeta: "",
              full_name: "",
            })
          }
        >
          Change
        </Button>
      </div>
    );
  }

  return (
    // Relative, because the matches float OVER the form rather than pushing it
    // down. Inline results reflow every field below the box on each keystroke,
    // so the row you were reaching for moves as you type towards it.
    <div className="relative grid gap-2">
      <Field
        label="Search the school's guardians"
        hint="A parent already here should be reused, not typed again - that is what keeps siblings together."
      >
        <input
          value={row.full_name}
          onChange={(e) => onPatch({ full_name: e.target.value })}
          placeholder="Guardian's name"
          className={inputClass}
        />
      </Field>
      <div className="absolute inset-x-0 top-full z-20 grid gap-1.5 empty:hidden">
      {query.length >= 2 &&
        (isFetching ? (
          <p className="rounded-lg border border-white-02 bg-white px-3 py-2 text-xs text-gray-05 shadow-sm">
            Searching…
          </p>
        ) : matches.length === 0 ? (
          <p className="rounded-lg border border-white-02 bg-white px-3 py-2 text-xs text-gray-05 shadow-sm">
            Nobody here matches "{query}".{canAddNew ? ' Use "Add a new one" instead.' : ""}
          </p>
        ) : (
          matches.map((g) => {
            const taken = takenIds.includes(g.id);
            return (
              <button
                key={g.id}
                type="button"
                disabled={taken}
                onClick={() =>
                  onPatch({
                    guardianId: g.id,
                    guardianName: g.full_name,
                    guardianMeta: wardLine(g),
                  })
                }
                className={cn(
                  "min-w-0 rounded-lg border px-3 py-2 text-left shadow-sm",
                  taken
                    ? "cursor-not-allowed border-white-02 bg-gray-04 opacity-70"
                    : "border-white-02 bg-white hover:border-primary/40",
                )}
              >
                <p className="truncate text-sm text-black-01">{g.full_name}</p>
                <p className="truncate text-xs text-gray-05">
                  {taken ? "Already added to this form" : wardLine(g)}
                </p>
              </button>
            );
          })
        ))}
      </div>
    </div>
  );
}
