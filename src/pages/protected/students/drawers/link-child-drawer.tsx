import { useState } from "react";
import { toast } from "sonner";

import { NativeSelect } from "@/components/ui/native-select";
import { writeErrorMessage } from "@/utils/api-error";
import {
  useLinkGuardianMutation,
  useSearchStudentsQuery,
} from "@/redux/services/students/students-api";
import { useRelationshipOptions } from "../relationships";
import { cn } from "@/lib/utils";

import { Checkbox } from "@/components/ui/checkbox";

import { DrawerShell, Field } from "./drawer-shell";

/**
 * Link another child to a guardian who is already at the school.
 *
 * The mirror of the link-guardian drawer, and it exists because the two are
 * asked from different places: standing on a child you look for their parent,
 * and standing on a parent you look for their other children. Same endpoint -
 * a link is one row either way - so the rules cannot drift between them.
 *
 * **This is how a household stays whole.** The alternative is opening the
 * sibling's record and typing the parent's details again, which mints a second
 * guardian and splits the family: the directory then shows the same parent
 * twice with one child each, and the sibling link the Guardians screen exists
 * to show is gone.
 */
export function LinkChildDrawer({
  guardianId,
  guardianName,
  linkedStudentIds,
  open,
  onClose,
}: {
  guardianId: number;
  guardianName: string;
  /** Already linked, so the picker can say so instead of letting a 400 do it. */
  linkedStudentIds: number[];
  open: boolean;
  onClose: () => void;
}) {
  const relationshipOptions = useRelationshipOptions();
  const [search, setSearch] = useState("");
  const [picked, setPicked] = useState<{ id: number; label: string } | null>(null);
  const [relationship, setRelationship] = useState("");
  const [primary, setPrimary] = useState(false);

  const query = search.trim();
  const { data, isFetching } = useSearchStudentsQuery(query, {
    // One character is a keystroke, not a search.
    skip: query.length < 2,
  });
  const hits = data?.data ?? [];

  const [link, { isLoading }] = useLinkGuardianMutation();
  const valid = Boolean(picked && relationship);

  function reset() {
    setSearch("");
    setPicked(null);
    setRelationship("");
    setPrimary(false);
  }

  async function save() {
    if (!picked || !valid) return;
    try {
      await link({
        id: picked.id,
        guardian_id: guardianId,
        relationship,
        is_primary: primary,
      }).unwrap();
      toast.success(`${picked.label} linked to ${guardianName}.`);
      reset();
      onClose();
    } catch (error) {
      toast.error(
        writeErrorMessage(error, "We could not link that student."),
      );
    }
  }

  return (
    <DrawerShell
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Link another child"
      subtitle={`To ${guardianName}.`}
      saveLabel="Link child"
      onSave={save}
      canSave={valid}
      saving={isLoading}
    >
      <div className="grid gap-4">
        {picked ? (
          <div className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-white-02 bg-white p-3">
            <p className="min-w-0 truncate text-sm font-medium text-black-01">
              {picked.label}
            </p>
            <button
              type="button"
              onClick={() => setPicked(null)}
              className="text-xs text-primary underline-offset-2 hover:underline"
            >
              Change
            </button>
          </div>
        ) : (
          <Field
            label="Find the student"
            hint="By name or admission number."
          >
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Student's name"
              className="h-9 w-full rounded-lg border border-white-02 bg-white px-3 text-sm outline-none focus:border-primary"
            />
          </Field>
        )}

        {!picked && query.length >= 2 && (
          <div className="grid gap-1.5">
            {isFetching ? (
              <p className="text-xs text-gray-05">Searching…</p>
            ) : hits.length === 0 ? (
              <p className="text-xs text-gray-05">
                No student here matches "{query}".
              </p>
            ) : (
              hits.map((s) => {
                const already = linkedStudentIds.includes(s.id);
                const meta = [
                  s.student_number || "No admission number",
                  s.class_name || "No class",
                ].join(" · ");
                return (
                  <button
                    key={s.id}
                    type="button"
                    disabled={already}
                    onClick={() =>
                      setPicked({ id: s.id, label: s.full_name })
                    }
                    className={cn(
                      "min-w-0 rounded-lg border px-3 py-2 text-left",
                      already
                        ? "cursor-not-allowed border-white-02 bg-gray-04 opacity-70"
                        : "border-white-02 bg-white hover:border-primary/40",
                    )}
                  >
                    <p className="truncate text-sm text-black-01">
                      {s.full_name}
                    </p>
                    <p className="truncate text-xs text-gray-05">
                      {already ? "Already linked to this guardian" : meta}
                    </p>
                  </button>
                );
              })
            )}
          </div>
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

        <label className="flex items-start gap-2.5 text-sm text-black-01">
          <Checkbox
            checked={primary}
            onCheckedChange={(next) => setPrimary(next === true)}
            className="mt-0.5"
          />
          <span>
            Primary contact for this student
            {/* A student has exactly one. Saying which way the marker moves
                beats letting the registrar find out afterwards. */}
            <span className="mt-0.5 block text-xs text-gray-05">
              If they already have one, this moves the marker rather than
              adding a second.
            </span>
          </span>
        </label>
      </div>
    </DrawerShell>
  );
}
