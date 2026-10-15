import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetPublishPreviewQuery, usePublishClassesMutation } from "@/redux/services/gradebook/gradebook-api";
import type { ApprovalRow, PublishResult } from "@/redux/services/gradebook/gradebook-types";
import { parseApiError } from "@/utils/api-error";

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

/** The toast after a publish: what went out, and which classes were refused and why. */
function announce(results: PublishResult[]) {
  const done = results.filter((result) => result.published);
  const refused = results.filter((result) => !result.published);
  const emailed = done.reduce((sum, result) => sum + result.emailed, 0);
  const held = done.reduce((sum, result) => sum + result.held, 0);
  const sent = `${plural(emailed, "guardian")} emailed that the report card is ready${
    held ? `, ${plural(held, "result")} held and not released` : ""
  }.`;
  if (done.length && !refused.length) {
    toast.success(done.length === 1 ? `${done[0].class.name} published` : `${done.length} classes published`, {
      description: sent,
    });
    return;
  }
  const why = refused.map((result) => `${result.class.name}: ${result.message ?? "not published"}`).join(" ");
  if (done.length) {
    toast.warning(`${done.length} of ${results.length} classes published`, { description: `${sent} ${why}` });
  } else {
    toast.error(results.length === 1 ? `${refused[0].class.name} was not published` : "No class was published", {
      description: why,
    });
  }
}

/**
 * The second look before publishing one class or several.
 *
 * Each class shows what the server says publishing it now would do: how many
 * results are released, how many guardians are emailed, how many have no
 * email on file, and each held student with who held them. Previews are read
 * fresh on opening, because a hold placed a minute ago changes them.
 *
 * Each class is published in its own transaction. A class that stopped
 * awaiting approval in the meantime is refused on its own and the others still
 * go out; the toast names what was refused and why. `onClose` hands back the
 * ids that were published.
 */
export function PublishDialog({
  rows,
  onClose,
}: {
  rows: ApprovalRow[];
  onClose: (published: number[]) => void;
}) {
  const [publish, publishing] = usePublishClassesMutation();
  const several = rows.length > 1;

  const onConfirm = async () => {
    const result = await publish({ classes: rows.map((row) => row.class.id) });
    if ("error" in result) {
      onClose([]);
      return;
    }
    announce(result.data.data);
    onClose(result.data.data.filter((item) => item.published).map((item) => item.class.id));
  };

  return (
    <AlertDialog open onOpenChange={(next) => !next && !publishing.isLoading && onClose([])}>
      <AlertDialogContent className="max-h-[90vh]">
        <AlertDialogHeader>
          <AlertDialogTitle>
            {several ? `Publish ${rows.length} classes?` : `Publish ${rows[0].class.name}?`}
          </AlertDialogTitle>
          <AlertDialogDescription>
            Publishing locks every mark, comment and rating in {several ? "these classes" : "this class"}. After it, a
            change is an amendment.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <ScrollArea className="max-h-[50vh]">
          <ul className="space-y-3">
            {rows.map((row) => (
              <PreviewBlock key={row.class.id} row={row} titled={several} />
            ))}
          </ul>
        </ScrollArea>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={publishing.isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={publishing.isLoading}
            onClick={(event) => {
              event.preventDefault();
              void onConfirm();
            }}
          >
            {publishing.isLoading ? "Publishing…" : several ? `Publish ${rows.length} classes` : "Approve and publish"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function PreviewBlock({ row, titled }: { row: ApprovalRow; titled: boolean }) {
  const { data, isFetching, error } = useGetPublishPreviewQuery(
    { classId: row.class.id },
    { refetchOnMountOrArgChange: true },
  );
  const preview = data?.data;

  return (
    <li className="rounded-md border border-border p-3">
      {titled && <p className="mb-2 text-sm font-semibold text-black-01">{row.class.name}</p>}
      {error ? (
        <p className="text-sm text-[#A32D2D]">{parseApiError(error).message}</p>
      ) : !preview || isFetching ? (
        <Skeleton className="h-16 w-full" />
      ) : (
        <dl className="space-y-1 text-sm">
          <Line label="Results released" value={String(preview.released)} />
          <Line label="Guardians emailed" value={String(preview.emailed)} />
          <Line
            label="No email on file"
            value={String(preview.no_email)}
            tone={preview.no_email ? "text-[#A32D2D]" : "text-gray-05"}
          />
          {preview.held.map((held) => (
            <Line
              key={held.student.id}
              label={`Held · ${held.student.name}`}
              value={held.held_by ? `by ${held.held_by}` : "held"}
              tone="text-[#854F0B]"
            />
          ))}
        </dl>
      )}
    </li>
  );
}

function Line({ label, value, tone = "text-black-01" }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className={tone === "text-black-01" ? "text-gray-06" : tone}>{label}</dt>
      <dd className={`font-medium ${tone}`}>{value}</dd>
    </div>
  );
}
