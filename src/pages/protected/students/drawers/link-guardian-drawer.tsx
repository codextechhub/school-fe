import { useState } from "react";
import { toast } from "sonner";

import { NativeSelect } from "@/components/ui/native-select";
import { SegmentedToggle } from "@/components/custom/segmented-toggle";
import { cn } from "@/lib/utils";
import { writeErrorMessage } from "@/utils/api-error";
import {
  useGetGuardiansQuery,
  useGetStudentGuardiansQuery,
  useLinkGuardianMutation,
} from "@/redux/services/students/students-api";
import {
  RELATIONSHIPS,
  type StudentDetail,
} from "@/redux/services/students/students-types";

import { Checkbox } from "@/components/ui/checkbox";

import { AccessField, useFieldAccess } from "@/components/finance-ui";
import { FIELD_RESOURCE } from "@/lib/field-resources";

import { DrawerShell, Field, inputClass } from "./drawer-shell";
import { guardianMatchLine } from "../format";

/**
 * Link a guardian to a student.
 *
 * **Search first, create second, and that order is the point.** A guardian
 * belongs to the school, not to a child: typing a new record for a parent who
 * already has one at this school splits a household in two, and the Guardians
 * screen then shows one parent twice with a child each instead of one parent
 * with two children. So the search tab opens by default and says what a match
 * already stands for before it is picked.
 *
 * **A student has exactly one primary contact.** Marking a new link primary
 * MOVES the marker rather than adding a second, which the note says out loud
 * before the save rather than after it.
 */
export function LinkGuardianDrawer({
  student,
  open,
  onClose,
}: {
  student: StudentDetail;
  open: boolean;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<"search" | "new">("search");
  const [search, setSearch] = useState("");
  const [picked, setPicked] = useState<number | null>(null);
  const [relationship, setRelationship] = useState("");
  const [primary, setPrimary] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  // A new guardian needs a phone, so without Write on it only the search is offered.
  const access = useFieldAccess(FIELD_RESOURCE.GUARDIANS);
  const canAddNew = !access.isReadOnly("phone");

  const query = search.trim();
  const { data: matchesData, isFetching } = useGetGuardiansQuery(
    { search: query },
    // One character is a keystroke, not a search.
    { skip: query.length < 2 },
  );
  const matches = (matchesData?.data ?? []).slice(0, 6);

  const { data: existingData } = useGetStudentGuardiansQuery(student.id);
  const existing = existingData?.data ?? [];
  const alreadyLinked = new Set(existing.map((l) => l.guardian.id));
  const hasPrimary = existing.some((l) => l.is_primary);

  const [link, { isLoading }] = useLinkGuardianMutation();

  const valid =
    mode === "search"
      ? picked != null && !alreadyLinked.has(picked) && Boolean(relationship)
      : name.trim().length > 0 && phone.trim().length > 0 && Boolean(relationship);

  function reset() {
    setMode("search");
    setSearch("");
    setPicked(null);
    setRelationship("");
    setPrimary(false);
    setName("");
    setPhone("");
    setEmail("");
  }

  async function save() {
    if (!valid) return;
    try {
      await link({
        id: student.id,
        relationship,
        is_primary: primary,
        ...(mode === "search"
          ? { guardian_id: picked as number }
          : access.writableOnly({
              full_name: name.trim(),
              phone: phone.trim(),
              ...(email.trim() ? { email: email.trim() } : {}),
            })),
      }).unwrap();
      toast.success("Guardian linked.");
      reset();
      onClose();
    } catch (error) {
      toast.error(writeErrorMessage(error, "We could not link that guardian."));
    }
  }

  return (
    <DrawerShell
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Link a guardian"
      subtitle={`To ${student.full_name}.`}
      saveLabel="Link guardian"
      onSave={save}
      canSave={valid}
      saving={isLoading}
    >
      {/* The app's toggle, so the marker SLIDES between the two rather than
          blinking off one and onto the other. This drawer's choice is the one
          that decides whether a household stays whole or gets a duplicate
          parent, so which side you are on has to be unmistakable - and a plain
          background swap is the weakest way to say it. */}
      {canAddNew && (
        <SegmentedToggle
          className="mb-4"
          ariaLabel="How to link a guardian"
          value={mode}
          onChange={(next) => {
            setMode(next);
            setPicked(null);
          }}
          options={[
            { value: "search", label: "Find an existing guardian" },
            { value: "new", label: "Add a new one" },
          ]}
        />
      )}

      <div className="grid gap-4">
        {mode === "search" ? (
          <>
            <Field
              label="Search the school's guardians"
              hint="Check here first: a parent already at this school should be reused, not typed again."
            >
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Guardian's name"
                className={inputClass}
              />
            </Field>

            {query.length >= 2 && (
              <div className="grid gap-1.5">
                {isFetching ? (
                  <p className="text-xs text-gray-05">Searching…</p>
                ) : matches.length === 0 ? (
                  <p className="text-xs text-gray-05">
                    Nobody at this school matches "{query}". Use "Add a new one".
                  </p>
                ) : (
                  matches.map((g) => {
                    const linked = alreadyLinked.has(g.id);
                    return (
                      <button
                        key={g.id}
                        type="button"
                        disabled={linked}
                        onClick={() => setPicked(g.id)}
                        className={cn(
                          "min-w-0 rounded-lg border px-3 py-2 text-left",
                          linked
                            ? "cursor-not-allowed border-white-02 bg-gray-04 opacity-70"
                            : picked === g.id
                              ? "border-primary bg-white-03"
                              : "border-white-02 bg-white hover:border-primary/40",
                        )}
                      >
                        <p className="truncate text-sm text-black-01">
                          {g.full_name}
                        </p>
                        <p className="truncate text-xs text-gray-05">
                          {linked
                            ? "Already linked to this student"
                            : guardianMatchLine(g)}
                        </p>
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </>
        ) : (
          <>
            <Field label="Full name">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClass}
              />
            </Field>
            <AccessField access={access} name="phone">
              <Field
                label="Phone"
                hint="A guardian needs a number the school can reach."
              >
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={inputClass}
                />
              </Field>
            </AccessField>
            <AccessField access={access} name="email">
              <Field label="Email (optional)">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                />
              </Field>
            </AccessField>
          </>
        )}

        <Field label="Relationship">
          <NativeSelect
            value={relationship}
            onChange={(e) => setRelationship(e.target.value)}
            className="h-9"
          >
            <option value="">Select a relationship</option>
            {RELATIONSHIPS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </NativeSelect>
        </Field>

        <label className="flex items-start gap-2.5">
          <Checkbox
            checked={primary}
            onCheckedChange={(next) => setPrimary(next === true)}
            className="mt-0.5"
          />
          <span className="min-w-0 text-sm text-black-01">
            Primary contact
            <span className="mt-0.5 block text-xs text-gray-05">
              {hasPrimary
                ? "A student has exactly one. Marking this one primary moves the marker off the current contact."
                : "This student has no primary contact yet, so this guardian becomes it."}
            </span>
          </span>
        </label>
      </div>
    </DrawerShell>
  );
}
