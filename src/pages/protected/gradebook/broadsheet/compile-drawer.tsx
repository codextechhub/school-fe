import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useFieldAccess } from "@/components/finance-ui";
import { FIELD_RESOURCE } from "@/lib/field-resources";
import { cn } from "@/lib/utils";
import { useGetCompileQuery, useSaveCompileMutation } from "@/redux/services/gradebook/gradebook-api";
import type { ClassKey, Compile } from "@/redux/services/gradebook/gradebook-types";
import { DrawerShell } from "@/pages/protected/students/drawers/drawer-shell";

/**
 * One student's report as the class teacher compiles it: their subjects, the
 * overall average and the term's attendance to read, the conduct ratings and
 * the comment to write.
 *
 * The comment is required by the server. Save and next saves this student and
 * moves to the next on the roll, which is how a class teacher works down a
 * class in one sitting; Previous and Next move without saving. A reader who
 * may not compile (an approver, or the class teacher once the class has gone
 * to the principal) reads the same drawer with nothing to change.
 *
 * Field Access: the ratings and the comment follow their switches; a hidden
 * one leaves the drawer, a read-only one shows without its controls, and only
 * what may be written is sent. Every save carries the comment, so where the
 * comment may not be written nothing can be saved and the ratings read only
 * too. The attendance follows the register's counts switch, and the server
 * leaves it out when closed.
 */
export function CompileDrawer({
  classKey,
  className,
  studentId,
  onMove,
  onClose,
}: {
  classKey: ClassKey;
  className: string;
  studentId: number;
  onMove: (studentId: number) => void;
  onClose: () => void;
}) {
  const { data, isFetching } = useGetCompileQuery({ ...classKey, studentId });
  const drawer = data?.data.student.id === studentId ? data.data : undefined;

  return (
    <DrawerShell
      open
      onClose={onClose}
      title={drawer?.student.name ?? "Loading…"}
      subtitle={
        drawer
          ? [className, drawer.student.admission_number || null, `${drawer.index} of ${drawer.of}`].filter(Boolean).join(" · ")
          : className
      }
      saveLabel="Save and next"
      onSave={() => undefined}
      canSave={false}
      readOnly
    >
      {!drawer || isFetching ? (
        <div className="space-y-3">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : (
        <CompileBody key={drawer.student.id} drawer={drawer} classKey={classKey} onMove={onMove} onClose={onClose} />
      )}
    </DrawerShell>
  );
}

function CompileBody({
  drawer,
  classKey,
  onMove,
  onClose,
}: {
  drawer: Compile;
  classKey: ClassKey;
  onMove: (studentId: number) => void;
  onClose: () => void;
}) {
  const access = useFieldAccess(FIELD_RESOURCE.GRADEBOOK_RESULT);
  const [comment, setComment] = useState(drawer.teacher_comment ?? "");
  const [ratings, setRatings] = useState<Record<string, number>>(drawer.ratings ?? {});
  const [save, saving] = useSaveCompileMutation();

  const showComment = !access.isHidden("teacher_comment");
  const writesComment = drawer.can_edit && showComment && !access.isReadOnly("teacher_comment");
  const showRatings = !!drawer.traits && !access.isHidden("ratings");
  const writesRatings = writesComment && showRatings && !access.isReadOnly("ratings");
  const showAverage = !access.isHidden("average");

  const onSave = async () => {
    const result = await save({
      ...classKey,
      studentId: drawer.student.id,
      body: { teacher_comment: comment.trim(), ...(writesRatings ? { ratings } : {}) },
    });
    if ("error" in result) return;
    toast.success("Saved", { description: `${drawer.student.name}'s report is in.` });
    if (drawer.next) onMove(drawer.next);
    else onClose();
  };

  return (
    <div className="space-y-5">
      <dl className="divide-y divide-border rounded-md border border-border">
        {drawer.subjects.map((row) => (
          <div key={row.subject.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
            <dt className="text-gray-06">{row.subject.name}</dt>
            <dd className="font-medium text-black-01">
              {row.state === "NOT_IN" ? "Not in yet" : row.state === "NOT_TAKEN" ? "Does not take it" : `${row.total ?? "-"} · ${row.grade ?? "-"}`}
            </dd>
          </div>
        ))}
        {showAverage && (
          <div className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
            <dt className="text-gray-06">Overall average</dt>
            <dd className="font-semibold text-black-01">{drawer.average ?? "-"}</dd>
          </div>
        )}
        {drawer.attendance && (
          <div className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
            <dt className="text-gray-06">Attendance this term</dt>
            <dd className="text-right font-medium text-black-01">
              Opened {drawer.attendance.opened} · present {drawer.attendance.present} · absent {drawer.attendance.absent}
            </dd>
          </div>
        )}
      </dl>

      {showRatings && drawer.traits && (
        <section className="space-y-2">
          <h3 className="text-sm font-medium text-black-01">
            Conduct and skills <span className="font-normal text-gray-05">· 1 to 5</span>
          </h3>
          <ul className="space-y-2">
            {drawer.traits.map((trait) => (
              <li key={trait} className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm text-gray-06">{trait}</span>
                <span role="radiogroup" aria-label={trait} className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((n) => {
                    const on = ratings[trait] === n;
                    return (
                      <button
                        key={n}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        aria-label={`${trait} ${n}`}
                        disabled={!writesRatings}
                        onClick={() => setRatings((current) => ({ ...current, [trait]: n }))}
                        className={cn(
                          "size-8 rounded-md border text-xs font-semibold",
                          on ? "border-primary bg-primary/10 text-primary" : "border-border bg-white text-gray-05",
                          !writesRatings && "cursor-default",
                        )}
                      >
                        {n}
                      </button>
                    );
                  })}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {showComment && (
        <section className="space-y-2">
          <label htmlFor="teacher-comment" className="text-sm font-medium text-black-01">
            Class teacher&apos;s comment {writesComment && <span className="text-red-600">*</span>}
          </label>
          {writesComment ? (
            <Textarea
              id="teacher-comment"
              rows={4}
              maxLength={600}
              value={comment}
              placeholder="For example: a steady term. Reads widely and helps others."
              onChange={(event) => setComment(event.target.value)}
            />
          ) : (
            <p id="teacher-comment" className="rounded-md bg-gray-50 px-3 py-2 text-sm text-black-01">
              {drawer.teacher_comment || "No comment written yet."}
            </p>
          )}
        </section>
      )}

      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
        <Button variant="outline" size="sm" disabled={!drawer.previous} onClick={() => drawer.previous && onMove(drawer.previous)}>
          Previous
        </Button>
        <Button variant="outline" size="sm" disabled={!drawer.next} onClick={() => drawer.next && onMove(drawer.next)}>
          Next
        </Button>
        {writesComment && (
          <Button className="ml-auto" disabled={!comment.trim() || saving.isLoading} onClick={() => void onSave()}>
            {drawer.next ? "Save and next" : "Save"}
          </Button>
        )}
      </div>
      {!drawer.can_edit && (
        <p className="text-xs text-gray-05">
          {drawer.stage === "AWAITING" || drawer.stage === "PUBLISHED"
            ? "The class has gone to the principal, so its reports are locked."
            : "Only the class teacher writes these."}
        </p>
      )}
    </div>
  );
}
