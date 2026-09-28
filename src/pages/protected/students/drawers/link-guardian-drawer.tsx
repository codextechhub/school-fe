import { useState } from "react";
import { toast } from "sonner";

import { NativeSelect } from "@/components/ui/native-select";
import { SegmentedToggle } from "@/components/custom/segmented-toggle";
import { cn } from "@/lib/utils";
import { writeErrorMessage } from "@/utils/api-error";
import {
  useGetGuardianRulesQuery,
  useGetGuardiansQuery,
  useGetStudentGuardiansQuery,
  useLinkGuardianMutation,
} from "@/redux/services/students/students-api";
import {
  type StudentDetail,
} from "@/redux/services/students/students-types";

import { Checkbox } from "@/components/ui/checkbox";

import { AccessField, useFieldAccess } from "@/components/finance-ui";
import { CREATING, FIELD_RESOURCE, canCreateGuardian } from "@/lib/field-resources";

import { DrawerShell, Field, inputClass } from "./drawer-shell";
import { guardianMatchLine } from "../format";
import { useRelationshipOptions } from "../relationships";

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
 *
 * **A new guardian follows Field Access as a record being created.** Its
 * contact inputs and the body ask `school.guardians` with `creating`, so a
 * field the backend declares open on create (the phone) is offered and sent
 * even to a user who may not read or change it on an existing guardian. "Add a
 * new one" is offered whenever the user may give every field a new guardian
 * requires ({@link canCreateGuardian}); otherwise the drawer is search only.
 *
 * A new guardian's name is entered in parts, so the record is created
 * confirmed rather than split from one line and flagged for review.
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
  const relationshipOptions = useRelationshipOptions();
  const [mode, setMode] = useState<"search" | "new">("search");
  const [search, setSearch] = useState("");
  const [picked, setPicked] = useState<number | null>(null);
  const [relationship, setRelationship] = useState("");
  const [primary, setPrimary] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const access = useFieldAccess(FIELD_RESOURCE.GUARDIANS);
  const canAddNew = canCreateGuardian(access);

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
  // A new guardian needs an email where the school says so; linking one
  // already on record never does.
  const emailRequired = useGetGuardianRulesQuery().data?.data.email_required ?? false;

  const valid =
    mode === "search"
      ? picked != null && !alreadyLinked.has(picked) && Boolean(relationship)
      : firstName.trim().length > 0 &&
        lastName.trim().length > 0 &&
        phone.trim().length > 0 &&
        (!emailRequired || email.trim().length > 0) &&
        Boolean(relationship);

  function reset() {
    setMode("search");
    setSearch("");
    setPicked(null);
    setRelationship("");
    setPrimary(false);
    setFirstName("");
    setMiddleName("");
    setLastName("");
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
          : access.writableOnly(
              {
                first_name: firstName.trim(),
                ...(middleName.trim() ? { middle_name: middleName.trim() } : {}),
                last_name: lastName.trim(),
                phone: phone.trim(),
                ...(email.trim() ? { email: email.trim() } : {}),
              },
              CREATING,
            )),
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
                    Nobody at this school matches "{query}".{canAddNew ? ' Use "Add a new one".' : ""}
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
            <div className="grid gap-4 sm:grid-cols-2">
              <AccessField access={access} name="first_name" creating>
                <Field label="First name">
                  <input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className={inputClass}
                  />
                </Field>
              </AccessField>
              <AccessField access={access} name="last_name" creating>
                <Field label="Last name">
                  <input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className={inputClass}
                  />
                </Field>
              </AccessField>
            </div>
            <AccessField access={access} name="middle_name" creating>
              <Field label="Middle name (optional)">
                <input
                  value={middleName}
                  onChange={(e) => setMiddleName(e.target.value)}
                  className={inputClass}
                />
              </Field>
            </AccessField>
            <AccessField access={access} name="phone" creating>
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
            <AccessField access={access} name="email" creating>
              <Field
                label={emailRequired ? "Email" : "Email (optional)"}
                required={emailRequired}
              >
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
            {relationshipOptions.map((r) => (
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
