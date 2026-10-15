import { useRef, useState } from "react";
import { Download, FileUp } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useSchoolDisplay } from "@/hooks/use-school-display";
import { cn } from "@/lib/utils";
import {
  useConfirmSheetImportMutation,
  useDownloadSheetTemplateMutation,
  usePreviewSheetImportMutation,
} from "@/redux/services/gradebook/gradebook-api";
import type { ImportPreview, Sheet, SheetKey } from "@/redux/services/gradebook/gradebook-types";
import { DrawerShell } from "@/pages/protected/students/drawers/drawer-shell";
import { apiErrorMessage, isApiCode } from "@/utils/api-error";
import { downloadObjectUrl } from "@/utils/attachment-download";

import { cellVerdict, defaultChosen, rowIsReady } from "./upload";

const TONE = {
  new: "text-[#0F6B32] font-medium",
  replaces: "text-[#854F0B] font-medium",
  same: "text-gray-06",
  blank: "text-gray-05",
  issue: "text-[#A32D2D]",
} as const;

/**
 * Filling a score sheet from a spreadsheet.
 *
 * The teacher downloads the sheet as an Excel file (every pupil, the marks
 * already entered, a page explaining how to fill it), fills it offline, and
 * uploads it. Uploading checks every row and saves nothing: the drawer then
 * shows, per pupil and column, what saving would do (a new mark, the same
 * mark, a mark that replaces one already entered, or a blank that leaves the
 * sheet as it is) and every problem the file has. The rows that would change
 * something and have no problem start ticked; saving writes the ticked rows
 * all or nothing, through the same rules as typing them in.
 *
 * A check lapses after a while, and a sheet changed by anyone after the check
 * is not overwritten: the drawer says so and checks the same file again.
 */
export function UploadDrawer({ sheet, sheetKey, onClose }: { sheet: Sheet; sheetKey: SheetKey; onClose: () => void }) {
  const { formatInstantTime } = useSchoolDisplay();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [chosen, setChosen] = useState<number[]>([]);
  const [failure, setFailure] = useState<string | null>(null);
  const [template, templating] = useDownloadSheetTemplateMutation();
  const [check, checking] = usePreviewSheetImportMutation();
  const [confirm, confirming] = useConfirmSheetImportMutation();

  const takeTemplate = async () => {
    const result = await template(sheetKey);
    if ("error" in result) {
      toast.error("The template could not be downloaded", { description: apiErrorMessage(result.error, "Try again.") });
      return;
    }
    downloadObjectUrl(result.data.url, result.data.filename);
    URL.revokeObjectURL(result.data.url);
  };

  const checkFile = async (picked: File) => {
    setFailure(null);
    const result = await check({ ...sheetKey, file: picked });
    if ("error" in result) {
      setPreview(null);
      setFailure(apiErrorMessage(result.error, "The file could not be checked."));
      return;
    }
    setPreview(result.data.data);
    setChosen(defaultChosen(result.data.data));
  };

  const onSave = async () => {
    if (!preview?.token) return;
    const result = await confirm({ ...sheetKey, token: preview.token, rows: chosen });
    if ("error" in result) {
      if (isApiCode(result.error, "SHEET_CHANGED_SINCE_PREVIEW") && file) {
        toast.warning("The sheet changed since the file was checked", {
          description: "Nothing was saved. The file has been checked again against the sheet as it is now.",
        });
        await checkFile(file);
        return;
      }
      setFailure(apiErrorMessage(result.error, "The marks could not be saved."));
      return;
    }
    toast.success("Marks saved from the file", {
      description: `${chosen.length} pupil${chosen.length === 1 ? "" : "s"} on ${sheet.subject.name}, ${sheet.class.name}.`,
    });
    onClose();
  };

  const toggle = (row: number, on: boolean) =>
    setChosen((current) => (on ? [...current, row] : current.filter((value) => value !== row)));

  return (
    <DrawerShell
      open
      onClose={onClose}
      title={`Upload marks · ${sheet.subject.name}`}
      subtitle={`${sheet.class.name} · ${sheet.term.name}. Nothing is saved until you confirm.`}
      saveLabel={chosen.length ? `Save ${chosen.length} row${chosen.length === 1 ? "" : "s"}` : "Save"}
      onSave={() => void onSave()}
      canSave={!!preview?.token && chosen.length > 0 && !checking.isLoading}
      saving={confirming.isLoading}
      wide
    >
      <div className="space-y-4">
        <ol className="space-y-3 text-sm text-black-01">
          <li className="flex flex-wrap items-center justify-between gap-2">
            <span>1. Download the sheet as an Excel file, with the marks already entered.</span>
            <Button size="sm" variant="outline" disabled={templating.isLoading} onClick={() => void takeTemplate()}>
              <Download className="size-4" aria-hidden="true" />
              Download the template
            </Button>
          </li>
          <li className="flex flex-wrap items-center justify-between gap-2">
            <span>2. Fill it in, then upload it here. Excel or CSV, up to 2 MB.</span>
            <Button size="sm" variant="outline" disabled={checking.isLoading} onClick={() => input.current?.click()}>
              <FileUp className="size-4" aria-hidden="true" />
              {checking.isLoading ? "Checking…" : file ? "Choose another file" : "Choose a file"}
            </Button>
            <input
              ref={input}
              type="file"
              accept=".xlsx,.csv"
              aria-label="Spreadsheet to upload"
              className="hidden"
              onChange={(event) => {
                const picked = event.target.files?.[0];
                event.target.value = "";
                if (!picked) return;
                setFile(picked);
                void checkFile(picked);
              }}
            />
          </li>
        </ol>

        {failure && (
          <p role="alert" className="rounded-md border border-[#F5C4C4] bg-[#FCEBEB] px-3 py-2 text-sm text-[#A32D2D]">
            {failure}
          </p>
        )}

        {preview && (
          <section className="space-y-3">
            <p className="text-sm text-black-01">
              {file?.name ? <span className="font-medium">{file.name}: </span> : null}
              {preview.summary.rows} rows · {preview.summary.ready} ready · {preview.summary.with_issues} with a problem ·{" "}
              {preview.summary.replaces} would replace a mark already entered
              {preview.expires_at && (
                <span className="text-gray-05"> · this check lapses at {formatInstantTime(preview.expires_at)}</span>
              )}
            </p>

            {preview.file_issues.length > 0 ? (
              <div className="rounded-md border border-[#F5C4C4] bg-[#FCEBEB] px-3 py-2 text-sm text-[#A32D2D]">
                <p className="font-medium">The file does not fit this sheet, so nothing in it can be saved.</p>
                <ul className="mt-1 list-disc pl-5">
                  {preview.file_issues.map((issue, index) => (
                    <li key={`${issue.code}-${index}`}>{issue.message}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <Table className="text-[13px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8">
                      <span className="sr-only">Save this row</span>
                    </TableHead>
                    <TableHead>Row</TableHead>
                    <TableHead className="min-w-40">Pupil</TableHead>
                    {sheet.components.map((component) => (
                      <TableHead key={component.id} className="text-center">
                        {component.short_name}
                        <span className="block text-[11px] font-normal text-gray-05">{component.max_score}</span>
                      </TableHead>
                    ))}
                    <TableHead>Problems</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.rows.map((row) => {
                    const ready = rowIsReady(row);
                    const rowIssues = row.issues.filter((issue) => issue.component === undefined);
                    return (
                      <TableRow key={row.row_number} className={cn(!ready && "bg-[#FCEBEB]/40")}>
                        <TableCell>
                          <Checkbox
                            checked={chosen.includes(row.row_number)}
                            disabled={!ready}
                            aria-label={`Save row ${row.row_number}`}
                            onCheckedChange={(value) => toggle(row.row_number, value === true)}
                          />
                        </TableCell>
                        <TableCell className="text-gray-05">{row.row_number}</TableCell>
                        <TableCell>
                          {row.student ? (
                            <span className="block text-black-01">{row.student.name}</span>
                          ) : (
                            <span className="block text-[#A32D2D]">No pupil found</span>
                          )}
                          <span className="block text-xs text-gray-05">{row.admission_number || "No admission number"}</span>
                        </TableCell>
                        {sheet.components.map((component) => {
                          const verdict = cellVerdict(
                            row.cells.find((cell) => cell.component === component.id),
                            row.issues.find((issue) => issue.component === component.id)?.message,
                          );
                          return (
                            <TableCell key={component.id} className={cn("text-center", TONE[verdict.tone])}>
                              {verdict.text || "-"}
                            </TableCell>
                          );
                        })}
                        <TableCell className="text-[#A32D2D]">{rowIssues.map((issue) => issue.message).join("; ")}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
            <p className="text-xs leading-5 text-gray-05">
              Green is a new mark, amber replaces one already entered, grey is unchanged. A blank cell in the file
              leaves the sheet&apos;s mark as it is. Rows with a problem cannot be saved; fix them in the file and upload
              it again.
            </p>
          </section>
        )}
      </div>
    </DrawerShell>
  );
}
