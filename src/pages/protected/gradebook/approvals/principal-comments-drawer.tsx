import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useFieldAccess } from "@/components/finance-ui";
import { FIELD_RESOURCE } from "@/lib/field-resources";
import {
  useGetPrincipalCommentsQuery,
  useSavePrincipalCommentsMutation,
} from "@/redux/services/gradebook/gradebook-api";
import type { ApprovalRow, PrincipalComments } from "@/redux/services/gradebook/gradebook-types";
import { DrawerShell } from "@/pages/protected/students/drawers/drawer-shell";

import { bandLabel } from "./band-label";

/**
 * The principal's comment on a class, one for each band of overall average.
 *
 * A report card prints the comment for the band its student's average falls
 * in, so a class carries one comment per band, not one in all. Each band
 * starts from the school's remark template, which the principal can take as
 * it is and then edit for this class. A band left without one prints the
 * school's remark. Only the bands whose text changed are sent; the rest keep
 * what they have. A written comment can be changed but not emptied, because
 * the server refuses a blank one.
 *
 * Read-only once the class is published, and for a role that may not write
 * the principal's comment. The school's templates follow their own switch: a
 * reader who may not read them writes from a blank box.
 */
export function PrincipalCommentsDrawer({ row, onClose }: { row: ApprovalRow; onClose: () => void }) {
  const { data, isLoading } = useGetPrincipalCommentsQuery({ classId: row.class.id });
  const comments = data?.data;
  return comments && !isLoading ? (
    <CommentsForm comments={comments} row={row} onClose={onClose} />
  ) : (
    <DrawerShell
      open
      onClose={onClose}
      title="Principal's comments"
      subtitle={row.class.name}
      saveLabel="Save comments"
      onSave={() => undefined}
      canSave={false}
      readOnly
    >
      <div className="space-y-3">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    </DrawerShell>
  );
}

function CommentsForm({
  comments,
  row,
  onClose,
}: {
  comments: PrincipalComments;
  row: ApprovalRow;
  onClose: () => void;
}) {
  const access = useFieldAccess(FIELD_RESOURCE.GRADEBOOK_RESULT);
  const bands = [...comments.bands].sort((a, b) => b.band_min - a.band_min);
  const saved = Object.fromEntries(bands.map((band) => [band.band_min, band.override?.text ?? ""]));
  const [texts, setTexts] = useState<Record<number, string>>(saved);
  const [save, saving] = useSavePrincipalCommentsMutation();
  const writes = !comments.locked && !access.isReadOnly("comments");
  const changed = bands.filter((band) => (texts[band.band_min] ?? "").trim() !== (saved[band.band_min] ?? "").trim());
  const blank = changed.some((band) => !(texts[band.band_min] ?? "").trim());

  const onSave = async () => {
    const result = await save({
      classId: row.class.id,
      body: { comments: changed.map((band) => ({ band_min: band.band_min, text: texts[band.band_min].trim() })) },
    });
    if ("error" in result) return;
    toast.success("Principal's comments saved", {
      description: `Each prints on the report cards in ${row.class.name} whose average falls in its band.`,
    });
    onClose();
  };

  return (
    <DrawerShell
      open
      onClose={onClose}
      title="Principal's comments"
      subtitle={`${row.class.name} · one for each band of overall average`}
      saveLabel="Save comments"
      onSave={() => void onSave()}
      canSave={changed.length > 0 && !blank}
      saving={saving.isLoading}
      readOnly={!writes}
      wide
    >
      {bands.length === 0 ? (
        <p className="text-sm text-gray-06">
          The school has no remark bands yet. They are set in Settings, Gradebook, under the principal&apos;s remarks.
        </p>
      ) : (
        <>
          {writes && (
            <p className="mb-3 text-xs leading-5 text-gray-05">
              A band left blank prints the school&apos;s remark. A comment once written can be changed, not emptied.
            </p>
          )}
          <ul className="space-y-4">
            {bands.map((band) => {
              const text = texts[band.band_min] ?? "";
              const id = `principal-band-${band.band_min}`;
              return (
                <li key={band.band_min} className="space-y-2 rounded-md border border-border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label htmlFor={id} className="text-sm font-medium text-black-01">
                      {bandLabel(bands, band)}
                    </label>
                    {writes && band.template && band.template !== text && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setTexts((current) => ({ ...current, [band.band_min]: band.template ?? "" }))}
                      >
                        Use the school&apos;s remark
                      </Button>
                    )}
                  </div>
                  {band.template && <p className="text-xs text-gray-05">School&apos;s remark: {band.template}</p>}
                  {writes ? (
                    <Textarea
                      id={id}
                      rows={3}
                      maxLength={600}
                      value={text}
                      placeholder="Write the comment as it will print"
                      onChange={(event) => setTexts((current) => ({ ...current, [band.band_min]: event.target.value }))}
                    />
                  ) : (
                    <p id={id} className="rounded-md bg-gray-50 px-3 py-2 text-sm text-black-01">
                      {text || "No comment written for this class. The school's remark prints."}
                    </p>
                  )}
                  {band.override?.written_by && (
                    <p className="text-xs text-gray-05">Written by {band.override.written_by}</p>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
      {comments.locked && (
        <p className="mt-3 text-xs text-gray-05">The class is published, so its comments no longer change.</p>
      )}
    </DrawerShell>
  );
}
