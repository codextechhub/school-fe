import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Check, Upload, AlertTriangle, Download, ChevronRight, ChevronLeft, ChevronDown, X, FileSpreadsheet, Play, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Combobox, ComboboxContent, ComboboxInput, ComboboxItem, ComboboxList, ComboboxEmpty } from "@/components/ui/combobox";
import { cn } from "@/lib/utils";
import { formatBytes } from "@/utils/format-bytes";
import { useFieldAccess } from "@/components/finance-ui/field-access";
import { usePermissions } from "@/hooks/use-permissions";
import { P } from "@/permissions";
import { canRollBackImport } from "./import-access";
import { toast } from "sonner";
import { useSchoolDisplay } from "@/hooks/use-school-display";
import {
  useGetImportTemplatesQuery,
  useGetImportTemplateQuery,
  useGetImportJobsQuery,
  useGetImportJobQuery,
  useRollbackImportJobMutation,
  useDownloadImportTemplateMutation,
  importDownloadUrls,
} from "@/redux/services/dashboard/import-api";
import type { DatasetType, ImportBatch, ImportTemplate, ValidationSeverity } from "@/redux/services/dashboard/import-types";

// ── Types ───────────────────────────────────────────────────────────────────

export type WizardStep = 1 | 2 | 3 | 4 | 5 | 6 | 7;

const STEP_LABELS = ["Upload", "Headers", "Validation", "Review", "Confirm", "Import", "Complete"];

export const unwrap = <T,>(res: { data: T } | T | undefined): T | undefined => {
  if (!res) return undefined;
  return (res as { data: T }).data ?? (res as T);
};

export function extractUploadError(err: unknown): string | null {
  if (!err || typeof err !== "object") return null;
  const data = (err as { data?: unknown }).data;
  if (!data) return null;
  if (typeof data === "string") return data;
  if (typeof data === "object") {
    const d = data as Record<string, unknown>;
    // Try structured DRF error keys first, then fall back to the envelope message
    for (const key of ["file", "template_id", "detail", "non_field_errors", "message"]) {
      const val = d[key];
      if (Array.isArray(val) && typeof val[0] === "string") return val[0];
      if (typeof val === "string") return val;
    }
    // Last resort: first non-boolean, non-object value in the response
    for (const v of Object.values(d)) {
      if (Array.isArray(v) && typeof v[0] === "string") return v[0];
      if (typeof v === "string") return v;
    }
  }
  return null;
}

// ── Stepper ─────────────────────────────────────────────────────────────────

/**
 * The house wizard stepper. `labels` defaults to the import wizard's own steps,
 * so its callers are unchanged; the Export Centre builder passes its four.
 * Shared rather than copied so the two wizards cannot drift apart visually.
 */
export function WizardStepper({
  currentStep,
  labels = STEP_LABELS,
}: {
  currentStep: number;
  labels?: string[];
}) {
  const STEP_LABELS = labels;
  return (
    <div className="bg-white rounded-md border border-white-02 px-5 py-4">
      <div className="flex items-center">
        {STEP_LABELS.map((label, i) => {
          const num = (i + 1) as WizardStep;
          const isComplete = num < currentStep;
          const isActive = num === currentStep;
          return (
            <div key={num} className="flex min-w-0 items-center flex-1">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={cn(
                  "size-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 transition-all",
                  isComplete && "bg-green-600 text-white",
                  isActive && "bg-primary text-white ring-4 ring-primary/10",
                  !isComplete && !isActive && "bg-gray-100 text-gray-400 border border-gray-200",
                )}>
                  {isComplete ? <Check className="size-3.5" /> : num}
                </div>
                <div className="min-w-0 hidden lg:block">
                  <p className={cn(
                    "text-[10px] uppercase tracking-wide",
                    isActive ? "text-gray-500" : "text-gray-300",
                  )}>Step {num}</p>
                  <p className={cn(
                    "text-xs truncate",
                    isActive && "font-semibold text-black-01",
                    isComplete && "text-black-01",
                    !isActive && !isComplete && "text-gray-400",
                  )}>{label}</p>
                </div>
              </div>
              {i < STEP_LABELS.length - 1 && (
                <div className={cn(
                  "flex-1 h-px mx-3 min-w-3",
                  isComplete ? "bg-green-600" : "bg-gray-200",
                )} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Step 1: Upload ──────────────────────────────────────────────────────────

export function UploadStep({
  datasetType,
  lockTemplate,
  templateId,
  onTemplateChange,
  file,
  onFileChange,
  notes,
  onNotesChange,
  onNext,
  onCancel,
  uploading,
  uploadError,
  uploadErrorMsg,
  onRetry,
}: {
  datasetType?: DatasetType;
  lockTemplate?: boolean;
  templateId: number | null;
  onTemplateChange: (id: number | null) => void;
  file: File | null;
  onFileChange: (f: File | null) => void;
  notes: string;
  onNotesChange: (n: string) => void;
  onNext: () => void;
  onCancel?: () => void;
  uploading: boolean;
  uploadError: boolean;
  uploadErrorMsg: string | null;
  onRetry: () => void;
}) {
  const params = useMemo(() => {
    const p: Record<string, string | number> = { page_size: 100, status: "active" };
    if (datasetType) p.dataset_type = datasetType;
    return p;
  }, [datasetType]);

  const { data: templatesData, isLoading: templatesLoading } = useGetImportTemplatesQuery(params);
  const templates = useMemo(() => templatesData?.data ?? [], [templatesData]);

  // Auto-select the first matching template when locked
  useEffect(() => {
    if (lockTemplate && !templateId && templates.length > 0) {
      onTemplateChange(templates[0].id);
    }
  }, [lockTemplate, templateId, templates, onTemplateChange]);

  const templateItems = useMemo(() => templates.map((t) => String(t.id)), [templates]);

  const templateFilter = useCallback((itemValue: string, query: string) => {
    if (!query) return true;
    const t = templates.find((t) => String(t.id) === itemValue);
    if (!t) return false;
    return `${t.name} ${t.dataset_type}`.toLowerCase().includes(query.toLowerCase());
  }, [templates]);

  const templateLabel = useCallback((itemValue: string) => {
    const t = templates.find((t) => String(t.id) === itemValue);
    return t ? t.name : itemValue;
  }, [templates]);

  const { data: templateDetailData } = useGetImportTemplateQuery(templateId!, { skip: !templateId });
  const template = unwrap<ImportTemplate>(templateDetailData);


  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [csvPreview, setCsvPreview] = useState<{ headers: string[]; rows: string[][] } | null>(null);

  const validateFile = useCallback((f: File): string | null => {
    const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
    if (!["csv", "xlsx", "xls"].includes(ext)) return `Unsupported file type ".${ext}". Use CSV, XLSX, or XLS.`;
    if (f.size > 50 * 1024 * 1024) return `File is ${formatBytes(f.size)} - maximum allowed size is 50 MB.`;
    return null;
  }, []);

  const parseCSVPreview = useCallback((f: File) => {
    if (!f.name.toLowerCase().endsWith(".csv")) { setCsvPreview(null); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split(/\r?\n/).filter((l) => l.trim()).slice(0, 6);
      if (lines.length === 0) { setCsvPreview(null); return; }
      const parseLine = (line: string): string[] => {
        const cells: string[] = [];
        let cell = "";
        let inQ = false;
        for (const ch of line) {
          if (ch === '"') { inQ = !inQ; }
          else if (ch === "," && !inQ) { cells.push(cell.trim()); cell = ""; }
          else { cell += ch; }
        }
        cells.push(cell.trim());
        return cells;
      };
      const headers = parseLine(lines[0]);
      const rows = lines.slice(1).map(parseLine);
      setCsvPreview({ headers, rows });
    };
    reader.readAsText(f.slice(0, 8192)); // read first 8 KB only
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (!f) return;
    const err = validateFile(f);
    if (err) { toast.error(err); return; }
    onFileChange(f);
    parseCSVPreview(f);
  }, [onFileChange, validateFile, parseCSVPreview]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const err = validateFile(f);
    if (err) { toast.error(err); if (fileInputRef.current) fileInputRef.current.value = ""; return; }
    onFileChange(f);
    parseCSVPreview(f);
  };

  const canNext = !!templateId && !!file && !uploading;

  // The fixed template's name, from the detail fetch or the list, whichever
  // has arrived.
  const lockedName =
    template?.name
    ?? templates.find((t) => t.id === templateId)?.name
    ?? (templates.length === 1 ? templates[0].name : undefined);

  const ext = file?.name.split(".").pop()?.toUpperCase() ?? "";

  return (
    <div className="bg-white rounded-md border border-white-02 p-6 space-y-5">
      <div className="border-b border-white-02 pb-4">
        <h2 className="text-base font-semibold font-mont text-black-01">Select template & upload file</h2>
        <p className="text-xs text-gray-01 mt-1">Choose the dataset template that matches your file, then drop your CSV or XLSX to begin.</p>
      </div>

      {/* Template selector.

          When the template is FIXED there is no choice to offer, and offering
          a dead one is worse than offering none: a disabled input greys its own
          text, so a template that had loaded correctly looked exactly like a
          template that had failed to load, and the first thing a school did was
          try to pick one. The settled case is shown as a fact instead. */}
      <div>
        <div className="flex items-center gap-2 mb-1.5">
          <label className="block text-xs font-semibold text-black-01">Import template</label>
        </div>
        {lockTemplate ? (
          <div className="flex h-10 items-center gap-2 rounded-md border border-white-02 bg-gray-04 px-3">
            <FileSpreadsheet className="size-4 shrink-0 text-primary" />
            <span className="truncate text-sm font-medium text-black-01">
              {/* Whichever request has landed. The list arrives first and the
                  detail follows, so reading only the detail showed "no
                  template" for the moment in between - the very state this
                  block exists to stop the reader seeing. */}
              {lockedName
                ?? (templatesLoading ? "Loading…" : "No template is set up for this import")}
            </span>
          </div>
        ) : (
        <Combobox
          value={templateId ? String(templateId) : null}
          onValueChange={(v) => { if (!lockTemplate) onTemplateChange(v ? Number(v) : null); }}
          items={templateItems}
          filter={templateFilter}
          itemToStringLabel={templateLabel}
        >
          <ComboboxInput
            placeholder={templatesLoading ? "Loading templates…" : "Search or select a template…"}
            showTrigger={!lockTemplate}
            showClear={!!templateId && !lockTemplate}
            disabled={lockTemplate}
            className="h-10"
          />
          {!lockTemplate && (
            <ComboboxContent>
              <ComboboxList>
                {templates.map((t) => (
                  <ComboboxItem key={t.id} value={String(t.id)}>
                    <span>{t.name}</span>
                    <span className="text-gray-400 text-xs ml-1 capitalize">{t.dataset_type}</span>
                  </ComboboxItem>
                ))}
                <ComboboxEmpty>
                  {templatesLoading ? "Loading…" : templates.length === 0 ? "No active templates found." : "No templates match your search."}
                </ComboboxEmpty>
              </ComboboxList>
            </ComboboxContent>
          )}
        </Combobox>
        )}
        <p className="text-[11px] text-gray-400 mt-1">
          {lockTemplate ? "Template is fixed for this import type." : "Only Active templates are available for import."}
        </p>

        {template && <TemplateCard template={template} />}
      </div>

      {/* Dropzone / file meta */}
      <div>
        <label className="block text-xs font-semibold text-black-01 mb-1.5">Upload file</label>
        <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFileInput} />

        {!file ? (
          <div
            ref={dropRef}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={cn(
              "border-2 border-dashed rounded-md py-10 px-6 text-center cursor-pointer transition-colors",
              dragOver ? "border-primary bg-primary/5" : "border-gray-200 bg-gray-50/50 hover:border-primary hover:bg-primary/5",
            )}
          >
            <div className="size-10 mx-auto mb-2 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-primary">
              <Upload className="size-5" />
            </div>
            <p className="text-sm font-medium text-black-01">Drop file here or click to browse</p>
            <p className="text-xs text-gray-01 mt-0.5">Files up to 50 MB. Empty rows are ignored.</p>
            <p className="text-[11px] text-gray-400 mt-2">Supported: <b>.csv</b> · <b>.xlsx</b> · <b>.xls</b></p>
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-md border border-gray-200 bg-gray-50/50 px-4 py-3">
            <div className="size-9 rounded-lg bg-green-50 text-green-600 flex items-center justify-center text-[10px] font-bold tracking-wider shrink-0">
              {ext}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-black-01 truncate">{file.name}</p>
              <p className="text-xs text-gray-01 mt-0.5">{formatBytes(file.size)}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => { onFileChange(null); setCsvPreview(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}>
              <X className="size-3.5" /> Remove
            </Button>
          </div>
        )}
      </div>

      {/* CSV preview */}
      {file && csvPreview && (
        <div className="mt-3 rounded-md border border-gray-200 overflow-x-auto">
          <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 border-b border-gray-200">
            <FileSpreadsheet className="size-3.5 text-gray-400" />
            <p className="text-[11px] text-gray-500 font-medium">Preview - first {csvPreview.rows.length} {csvPreview.rows.length === 1 ? "row" : "rows"}</p>
          </div>
          <table className="text-[11px] w-full">
            <thead>
              <tr className="bg-gray-50">
                {csvPreview.headers.map((h, i) => (
                  <th key={i} className="px-3 py-1.5 text-left font-semibold text-gray-500 whitespace-nowrap border-b border-gray-200 border-r last:border-r-0">{h || `col_${i + 1}`}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {csvPreview.rows.map((row, ri) => (
                <tr key={ri} className="border-b border-white-02 last:border-0">
                  {csvPreview.headers.map((_, ci) => (
                    <td key={ci} className="px-3 py-1.5 text-gray-600 font-mono whitespace-nowrap max-w-[160px] truncate border-r border-white-02 last:border-r-0">{row[ci] ?? ""}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Notes */}
      <div>
        <label className="block text-xs font-semibold text-black-01 mb-1.5">
          Notes <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <Textarea
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="Anything reviewers should know about this batch - source, contact, follow-ups…"
          className="min-h-[70px]"
        />
      </div>

      {/* Upload error retry banner */}
      {uploadError && (
        <div className="flex items-center gap-3 rounded-md border border-destructive/30 bg-red-50 px-4 py-3">
          <AlertTriangle className="size-4 text-destructive shrink-0" />
          <div className="flex-1">
            <p className="text-xs font-semibold text-destructive">Upload failed</p>
            <p className="text-[11px] text-gray-500 mt-0.5">
              {uploadErrorMsg ?? "The server could not process your file. Check the file format and try again."}
            </p>
          </div>
          <Button size="sm" variant="white" onClick={onRetry} disabled={!canNext}>
            Retry
          </Button>
        </div>
      )}

      <StepFooter step={1}>
        {onCancel && <Button variant="ghost" onClick={onCancel}>Cancel</Button>}
        <Button onClick={onNext} disabled={!canNext}>
          {uploading ? "Uploading…" : "Parse & continue"} <ChevronRight className="size-3.5" />
        </Button>
      </StepFooter>
    </div>
  );
}

// ── Template info card ──────────────────────────────────────────────────────

function TemplateCard({ template }: { template: ImportTemplate }) {
  const requiredCount = template.columns.filter((c) => c.is_required).length;
  const [downloadTemplate, { isLoading: isDownloading }] = useDownloadImportTemplateMutation();
  const format = template.default_file_format === "xls" ? "xlsx" : template.default_file_format;

  const handleDownload = async () => {
    try {
      // Use the shared API client so the bearer token, impersonation header,
      // and mandatory tenant assertion are applied consistently.
      const blobUrl = await downloadTemplate({ id: template.id, format }).unwrap();
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `${template.code}_template.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      toast.error("Download failed. Please try again.");
    }
  };

  return (
    <div className="mt-3 rounded-md border border-gray-200 bg-gray-50/50 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm text-black-01">{template.name}</span>
          <Badge variant="inactive" className="capitalize text-[10px]">{template.dataset_type}</Badge>
          <Badge variant="active" className="text-[10px]">Active</Badge>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline disabled:cursor-not-allowed disabled:opacity-60"
          onClick={handleDownload}
          disabled={isDownloading}
        >
          <Download className="size-3" /> {isDownloading ? "Downloading…" : "Download template"}
        </button>
      </div>
      <div className="flex gap-4 flex-wrap text-xs text-gray-01">
        <span>Code: <b className="text-black-01">{template.code}</b></span>
        <span>Columns: <b className="text-black-01">{template.columns.length}</b></span>
        <span>Required: <b className="text-black-01">{requiredCount}</b></span>
        <span>Format: <b className="text-black-01 uppercase">{template.default_file_format}</b></span>
      </div>
      {template.instructions && (
        <TemplateInstructions text={template.instructions} />
      )}
    </div>
  );
}

/**
 * The template's rules, folded away until they are wanted.
 *
 * **Length is the point.** A template that states every refusal and every
 * warning is what stops a school building the wrong spreadsheet, so the answer
 * is not to write less of it: the students template alone runs to four
 * paragraphs, and unfolded it pushed the file drop zone off the screen, which
 * is the one thing the reader came to this step to do.
 *
 * Folded is the default and shows the first lines, so the reader can see what
 * kind of thing it is before deciding to open it. It stays open once opened,
 * because somebody reading the rules is building the file beside them.
 */
function TemplateInstructions({ text }: { text: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded border border-gray-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
      >
        <span className="text-xs font-semibold text-black-01">
          How to fill this in
        </span>
        <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium text-primary">
          {open ? "Hide" : "Read"}
          <ChevronDown
            className={cn(
              "size-3.5 transition-transform",
              open && "rotate-180",
            )}
          />
        </span>
      </button>
      <div
        className={cn(
          "px-3 pb-3 text-xs leading-relaxed whitespace-pre-line text-gray-01",
          // Folded, the first lines are still readable, so the reader can tell
          // what is behind the button rather than guessing from its label.
          !open && "line-clamp-2 pb-2 text-gray-05",
        )}
      >
        {text}
      </div>
    </div>
  );
}

async function triggerDownload(url: string, filename: string) {
  try {
    const token = document.cookie.match(/(?:^|;\s*)token=([^;]*)/)?.[1];
    const res = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error(`${res.status}`);
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
  } catch {
    toast.error("Download failed. Please try again.");
  }
}

// ── Step 2: Header Review ───────────────────────────────────────────────────

export function HeaderReviewStep({
  batch,
  onBack,
  onNext,
}: {
  batch: ImportBatch;
  onBack: () => void;
  onNext: () => void;
}) {
  const expected = batch.template_headers_snapshot ?? [];
  const uploaded = batch.uploaded_headers ?? [];

  const expectedSet = new Set(expected.map((h) => h.toLowerCase()));
  const uploadedSet = new Set(uploaded.map((h) => h.toLowerCase()));

  const missingFromUpload = expected.filter((h) => !uploadedSet.has(h.toLowerCase()));
  const extraInUpload = uploaded.filter((h) => !expectedSet.has(h.toLowerCase()));

  const totalIssues = missingFromUpload.length + extraInUpload.length;
  const isFullMatch = totalIssues === 0;

  const templateColumns = batch.template?.columns ?? [];
  const requiredCols = new Set(templateColumns.filter((c) => c.is_required).map((c) => c.column_name.toLowerCase()));

  // For each missing expected header, find closest uploaded header as a hint
  const fuzzyHint = (expected: string): string | null => {
    const el = expected.toLowerCase();
    // exact substring in either direction
    const match = extraInUpload.find(
      (u) => u.toLowerCase().includes(el) || el.includes(u.toLowerCase())
    );
    if (match) return match;
    // shared word match
    const eWords = el.split(/[\s_-]+/);
    return extraInUpload.find((u) => {
      const uWords = u.toLowerCase().split(/[\s_-]+/);
      return eWords.some((w) => w.length > 2 && uWords.some((uw) => uw.includes(w) || w.includes(uw)));
    }) ?? null;
  };

  return (
    <div className="bg-white rounded-md border border-white-02 p-6 space-y-5">
      <div className="flex items-center justify-between border-b border-white-02 pb-4">
        <div>
          <h2 className="text-base font-semibold font-mont text-black-01">Header comparison</h2>
          <p className="text-xs text-gray-01 mt-1">Compare the headers your file contains against the template.</p>
        </div>
        <Badge variant="inactive" className="text-[10px]">
          <FileSpreadsheet className="size-3" /> {batch.original_filename} · {batch.total_rows} {batch.total_rows === 1 ? "row" : "rows"}
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {/* Template headers */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-black-01">Template headers (expected)</p>
            <Badge variant="inactive" className="text-[10px]">{expected.length} fields</Badge>
          </div>
          <div className="rounded-md border border-gray-200 overflow-hidden divide-y divide-white-02">
            {expected.map((h) => {
              const isMissing = !uploadedSet.has(h.toLowerCase());
              const isRequired = requiredCols.has(h.toLowerCase());
              return (
                <div key={h} className={cn("flex items-center justify-between px-3 py-2.5 text-xs", isMissing && "bg-red-50")}>
                  <span className={cn("font-mono", isMissing && "text-destructive line-through opacity-70")}>
                    {h}{isRequired && <span className="text-destructive font-bold"> *</span>}
                  </span>
                  {isMissing ? (
                    <div className="flex flex-col items-end gap-0.5">
                      <Badge variant="destructive" className="text-[10px]">Missing in upload</Badge>
                      {(() => { const hint = fuzzyHint(h); return hint ? <span className="text-[10px] text-gray-400 italic">→ did you mean <b className="text-amber-600 not-italic">{hint}</b>?</span> : null; })()}
                    </div>
                  ) : isRequired ? (
                    <Badge variant="inactive" className="text-[10px]">Required</Badge>
                  ) : (
                    <Badge variant="inactive" className="text-[10px] opacity-60">Optional</Badge>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Uploaded headers */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-black-01">Uploaded file headers (detected)</p>
            <Badge variant={extraInUpload.length > 0 ? "pending" : "inactive"} className="text-[10px]">
              {totalIssues > 0 ? `${totalIssues} issues` : "All matched"}
            </Badge>
          </div>
          <div className="rounded-md border border-gray-200 overflow-hidden divide-y divide-white-02">
            {uploaded.map((h) => {
              const isExtra = !expectedSet.has(h.toLowerCase());
              return (
                <div key={h} className={cn("flex items-center justify-between px-3 py-2.5 text-xs", isExtra && "bg-amber-50")}>
                  <span className={cn("font-mono", isExtra && "text-amber-600")}>{h}</span>
                  {isExtra ? (
                    <Badge variant="pending" className="text-[10px]">Unmapped column</Badge>
                  ) : (
                    <Badge variant="active" className="text-[10px]">Matched</Badge>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Zero-row warning */}
      {batch.total_rows === 0 && (
        <div className="flex items-center gap-3 rounded-md border border-destructive/30 bg-red-50 px-4 py-3">
          <AlertTriangle className="size-5 text-destructive shrink-0" />
          <div className="flex-1">
            <p className="text-xs font-semibold text-destructive">No data rows detected</p>
            <p className="text-[11px] text-gray-500 mt-0.5">
              The file appears to be empty (headers only or completely blank). Go back and upload a file that contains at least one data row.
            </p>
          </div>
        </div>
      )}

      {/* Summary banner */}
      {batch.total_rows > 0 && (
        <div className={cn(
          "flex items-center gap-3 rounded-md border px-4 py-3",
          isFullMatch ? "border-green-200 bg-green-50" : "border-amber-200 bg-amber-50",
        )}>
          {isFullMatch ? (
            <Check className="size-5 text-green-600 shrink-0" />
          ) : (
            <AlertTriangle className="size-5 text-amber-600 shrink-0" />
          )}
          <div className="flex-1">
            <p className={cn("text-xs font-semibold", isFullMatch ? "text-green-700" : "text-amber-700")}>
              {isFullMatch ? "Full match - all headers aligned" : `Partial match - ${totalIssues} header issue${totalIssues > 1 ? "s" : ""} detected`}
            </p>
            <p className="text-[11px] text-gray-500 mt-0.5">
              {isFullMatch
                ? "All uploaded columns match the template. You can proceed to validation."
                : "Headers will be fuzzy-matched during validation. You can still proceed."}
            </p>
          </div>
          <Badge variant={isFullMatch ? "active" : "pending"} className="text-[10px] shrink-0">
            {isFullMatch ? "Full match" : "Partial match"}
          </Badge>
        </div>
      )}

      <StepFooter step={2}>
        <Button variant="white" onClick={onBack}><ChevronLeft className="size-3.5" /> Back</Button>
        <Button onClick={onNext} disabled={batch.total_rows === 0}>Continue to validation <ChevronRight className="size-3.5" /></Button>
      </StepFooter>
    </div>
  );
}

// ── Step 3: Validation (animated progress) ──────────────────────────────────

export function ValidationStep({ phase, onComplete }: { phase: "running" | "done"; onComplete: () => void }) {
  const [progress, setProgress] = useState(0);
  const progressRef = useRef(0);
  const doneCalledRef = useRef(false);

  // Phase 1: 0 → 90% over 2 s (ease-out), then hold
  useEffect(() => {
    if (phase !== "running") return;
    let raf: number;
    let start: number | null = null;
    const duration = 2000;
    const animate = (ts: number) => {
      if (!start) start = ts;
      const t = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 2); // ease-out quad
      const p = Math.round(eased * 90);
      progressRef.current = p;
      setProgress(p);
      if (t < 1) raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  // Phase 2: current → 100% over 400 ms, then advance
  useEffect(() => {
    if (phase !== "done") return;
    let raf: number;
    let start: number | null = null;
    const startP = progressRef.current;
    const duration = 400;
    const animate = (ts: number) => {
      if (!start) start = ts;
      const t = Math.min((ts - start) / duration, 1);
      const p = Math.round(startP + t * (100 - startP));
      progressRef.current = p;
      setProgress(p);
      if (t < 1) {
        raf = requestAnimationFrame(animate);
      } else if (!doneCalledRef.current) {
        doneCalledRef.current = true;
        onComplete();
      }
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [phase, onComplete]);

  return (
    <div className="bg-white rounded-md border border-white-02 p-6">
      <div className="text-center py-10 space-y-4">
        <div className="size-11 mx-auto rounded-full border-[3px] border-primary/20 border-t-primary animate-spin" />
        <div>
          <p className="text-base font-semibold text-black-01">Validating your file against the template…</p>
          <p className="text-xs text-gray-01 mt-1">Checking required fields, data types, choices and cross-references.</p>
        </div>
        <div className="max-w-md mx-auto">
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-[width] duration-75" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-xs text-gray-400 mt-2 tabular-nums">{progress}%</p>
        </div>
      </div>
    </div>
  );
}

// ── Step 4: Review Issues ───────────────────────────────────────────────────

export function ReviewIssuesStep({
  batch,
  batchId,
  onBack,
  onNext,
  onCancel,
}: {
  batch: ImportBatch;
  batchId: number;
  onBack: () => void;
  onNext: () => void;
  onCancel?: () => void;
}) {
  const [sevFilter, setSevFilter] = useState<"all" | ValidationSeverity>("all");

  const summary = batch.validation_summary as Record<string, number> | null;
  const errorCount = summary?.error_count ?? batch.error_count;
  const warningCount = summary?.warning_count ?? batch.warning_count;
  const infoCount = summary?.info_count ?? 0;
  const totalIssues = errorCount + warningCount + infoCount;

  const issues = batch.validation_issues ?? [];
  const filtered = sevFilter === "all" ? issues : issues.filter((i) => i.severity === sevFilter);

  // Use error_rows (distinct rows with errors) when available; fall back to counting
  // unique row numbers from the issues list so one row with many errors counts once.
  const errorRows = summary?.error_rows
    ?? new Set(issues.filter((i) => i.severity === "error" && i.row_number != null).map((i) => i.row_number)).size;
  const validRows = batch.total_rows - errorRows;
  const isAllBad = errorRows > 0 && validRows <= 0;
  const isPartialBad = errorRows > 0 && validRows > 0;
  const canProceed = errorCount === 0 && batch.is_ready_for_import;

  return (
    <div className="bg-white rounded-md border border-white-02 p-6 space-y-5">
      <div className="flex items-center justify-between border-b border-white-02 pb-4">
        <div>
          <h2 className="text-base font-semibold font-mont text-black-01">Review validation issues</h2>
          <p className="text-xs text-gray-01 mt-1">
            {totalIssues} issue{totalIssues !== 1 ? "s" : ""} found across {batch.total_rows} {batch.total_rows === 1 ? "row" : "rows"}.
            {errorCount > 0 && " Fix every error before publishing."}
          </p>
        </div>
        <Button variant="white" size="sm" onClick={() => triggerDownload(importDownloadUrls.validationIssuesExport(batchId), `batch_${batchId}_issues.csv`)}>
          <Download className="size-3.5" /> Export Error Data
        </Button>
      </div>

      {/* Severity pills */}
      <div className="flex gap-2.5 flex-wrap">
        {errorCount > 0 && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-red-50 text-destructive border border-red-200 text-xs font-semibold">
            <span className="text-sm">{errorCount}</span> Errors
          </div>
        )}
        {warningCount > 0 && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-amber-50 text-amber-600 border border-amber-200 text-xs font-semibold">
            <span className="text-sm">{warningCount}</span> Warnings
          </div>
        )}
        {infoCount > 0 && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-blue-50 text-blue-600 border border-blue-200 text-xs font-semibold">
            <span className="text-sm">{infoCount}</span> Info
          </div>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 border-b border-white-02">
        {([
          ["all", "All", totalIssues],
          ["error", "Errors", errorCount],
          ["warning", "Warnings", warningCount],
          ["info", "Info", infoCount],
        ] as const).map(([key, label, count]) => (
          <button
            key={key}
            onClick={() => setSevFilter(key)}
            className={cn(
              "px-3 py-2 text-xs font-medium border-b-2 -mb-px transition-colors",
              sevFilter === key
                ? "border-primary text-primary"
                : "border-transparent text-gray-400 hover:text-gray-600",
            )}
          >
            {label}
            <span className={cn(
              "ml-1.5 px-1.5 py-0.5 rounded-full text-[10px]",
              sevFilter === key ? "bg-primary/10 text-primary" : "bg-gray-100 text-gray-400",
            )}>{count}</span>
          </button>
        ))}
      </div>

      {/* Issues grouped by row */}
      {filtered.length === 0 ? (
        <div className="text-center py-10">
          <Check className="size-7 text-green-500 mx-auto mb-2" />
          <p className="text-sm font-medium text-black-01">No issues in this category</p>
          {sevFilter === "all" && <p className="text-xs text-gray-400 mt-1">All rows passed validation.</p>}
        </div>
      ) : (() => {
        const grouped = new Map<string, typeof filtered>();
        filtered.forEach((issue) => {
          const key = issue.row_number != null ? `Row ${issue.row_number}` : "File-level";
          if (!grouped.has(key)) grouped.set(key, []);
          grouped.get(key)!.push(issue);
        });
        return (
          <div className="space-y-3">
            {Array.from(grouped.entries()).map(([rowLabel, rowIssues]) => (
              <div key={rowLabel} className="rounded-md border border-gray-200 overflow-hidden">
                <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 border-b border-gray-200">
                  <span className="text-[10px] font-mono font-semibold text-gray-500 uppercase tracking-wide">{rowLabel}</span>
                  <span className={cn(
                    "ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded",
                    rowIssues.some((i) => i.severity === "error") ? "bg-red-50 text-destructive" :
                    rowIssues.some((i) => i.severity === "warning") ? "bg-amber-50 text-amber-600" :
                    "bg-blue-50 text-blue-600"
                  )}>
                    {rowIssues.length} {rowIssues.length === 1 ? "issue" : "issues"}
                  </span>
                </div>
                <div className="divide-y divide-white-02">
                  {rowIssues.map((issue) => (
                    <div key={issue.id} className="flex items-start gap-3 px-3 py-2.5">
                      <span className={cn(
                        "shrink-0 mt-0.5 inline-block px-1.5 py-0.5 rounded text-[10px] font-bold uppercase",
                        issue.severity === "error" && "bg-red-50 text-destructive",
                        issue.severity === "warning" && "bg-amber-50 text-amber-600",
                        issue.severity === "info" && "bg-blue-50 text-blue-600",
                      )}>{issue.severity}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-black-01">{issue.message}</p>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          {issue.column_name && (
                            <span className="text-[10px] font-mono text-gray-400">column: <b className="text-gray-600">{issue.column_name}</b></span>
                          )}
                          {issue.field_name && issue.field_name !== issue.column_name && (
                            <span className="text-[10px] font-mono text-gray-400">field: <b className="text-gray-600">{issue.field_name}</b></span>
                          )}
                          <span className="text-[10px] font-mono px-1 py-0.5 bg-gray-100 border border-gray-200 rounded text-gray-400">{issue.code}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        );
      })()}

      {/* All rows invalid - hard block */}
      {isAllBad && (
        <div className="flex items-start gap-3 rounded-md border border-red-200 bg-red-50 px-4 py-3">
          <AlertTriangle className="size-4 text-destructive shrink-0 mt-0.5" />
          <div className="text-xs text-black-01 leading-relaxed">
            <strong>All {errorRows} {errorRows === 1 ? "row has" : "rows have"} errors - there is nothing to import.</strong>{" "}
            Fix the affected rows in your file and re-upload to continue.
          </div>
        </div>
      )}

      {/* Partial files are blocked: publishing a subset would break dataset-wide
          invariants such as a bank statement's opening-to-closing balance. */}
      {isPartialBad && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="size-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-black-01 leading-relaxed">
              <strong>{errorRows} {errorRows === 1 ? "row has" : "rows have"} errors.</strong>{" "}
              Correct those rows and upload the file again. The wizard will not publish only part of the file.
            </div>
          </div>
        </div>
      )}

      {errorCount > 0 && errorRows === 0 && (
        <div className="flex items-start gap-3 rounded-md border border-red-200 bg-red-50 px-4 py-3">
          <AlertTriangle className="size-4 text-destructive shrink-0 mt-0.5" />
          <div className="text-xs text-black-01 leading-relaxed">
            <strong>The file has a blocking validation error.</strong>{" "}
            Correct the file-level issue, such as an opening/closing balance mismatch, and upload again.
          </div>
        </div>
      )}

      <StepFooter step={4}>
        <Button variant="white" onClick={onBack}><ChevronLeft className="size-3.5" /> Back</Button>
        <div className="flex gap-2.5">
          {onCancel && <Button variant="ghost" onClick={onCancel}>Cancel import</Button>}
          <Button onClick={onNext} disabled={!canProceed}>
            Proceed to import <ChevronRight className="size-3.5" />
          </Button>
        </div>
      </StepFooter>
    </div>
  );
}

// ── Step 5: Confirm ─────────────────────────────────────────────────────────

export function ConfirmStep({
  batch,
  onBack,
  onStart,
  onCancel,
}: {
  batch: ImportBatch;
  onBack: () => void;
  onStart: () => void;
  onCancel?: () => void;
}) {
  const summary = batch.validation_summary as Record<string, number> | null;
  const errorCount = summary?.error_count ?? batch.error_count;
  const rowsReady = errorCount === 0 ? batch.total_rows : 0;
  const canRollback = canRollBackImport(batch.dataset_type, usePermissions().hasPermission);
  // The parsed preview is a Field Access field: a viewer who may not read it gets no preview.
  const access = useFieldAccess("import.batches", batch);
  const previewRows = access.isHidden("preview_rows") ? [] : batch.preview_rows ?? [];
  const statementContext = batch.domain_context?.type === "bank_statement"
    ? batch.domain_context
    : null;
  const { formatDay } = useSchoolDisplay();

  return (
    <div className="bg-white rounded-md border border-white-02 p-6 space-y-5">
      <div className="flex items-center justify-between border-b border-white-02 pb-4">
        <div>
          <h2 className="text-base font-semibold font-mont text-black-01">Confirm import</h2>
          <p className="text-xs text-gray-01 mt-1">Review the summary below. This is the last step before data is written.</p>
        </div>
        <Badge variant="active" className="text-[10px]">ready_to_import</Badge>
      </div>

      {statementContext ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Bank account", statementContext.bank_account_name],
            [
              "Statement date",
              formatDay(statementContext.statement_date),
            ],
            ["Opening balance", statementContext.opening_balance_major],
            ["Closing balance", statementContext.closing_balance_major],
          ].map(([label, value]) => (
            <div key={label} className="rounded-md border border-blue-200 bg-blue-50/50 px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-blue-600">{label}</p>
              <p className="mt-1 break-words text-sm font-semibold tabular-nums text-black-01">{value}</p>
            </div>
          ))}
        </div>
      ) : null}

      <div className="grid grid-cols-2 rounded-md border border-gray-200 overflow-hidden">
        <SummaryCell label="Template" value={batch.template?.name ?? "-"} />
        <SummaryCell label="Dataset type" value={batch.dataset_type} className="capitalize" />
        <SummaryCell label="Source file" value={batch.original_filename} />
        <SummaryCell label="File format" value={batch.file_format.toUpperCase()} />
        <SummaryCell label="Total rows" value={String(batch.total_rows)} big />
        <SummaryCell label="Rows ready to import" value={String(rowsReady)} big accent="success" suffix={`of ${batch.total_rows}`} />
        <SummaryCell label="Blocking errors" value={String(errorCount)} big accent={errorCount > 0 ? "destructive" : undefined} />
        <SummaryCell label="Columns" value={String(batch.total_columns)} big />
      </div>

      {/* Data preview */}
      {previewRows.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-black-01 mb-2">Data preview <span className="text-gray-400 font-normal">(first {previewRows.length} {previewRows.length === 1 ? "row" : "rows"})</span></p>
          <div className="rounded-md border border-gray-200 overflow-x-auto">
            <table className="text-[11px] w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {batch.uploaded_headers.map((h, i) => (
                    <th key={i} className="px-3 py-2 text-left font-semibold text-gray-500 whitespace-nowrap border-r border-gray-200 last:border-r-0">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row, ri) => (
                  <tr key={ri} className="border-b border-white-02 last:border-0 hover:bg-gray-50/50">
                    {batch.uploaded_headers.map((h, ci) => (
                      <td key={ci} className="px-3 py-2 font-mono text-gray-600 whitespace-nowrap max-w-[180px] truncate border-r border-white-02 last:border-r-0">
                        {row[h] != null ? String(row[h]) : <span className="text-gray-300 italic">empty</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-3">
        <AlertTriangle className="size-4 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-semibold text-amber-700">This action will write data to the database.</p>
          <p className="text-[11px] text-gray-500 mt-0.5">
            Publishing starts only after every validation error is cleared.
            {canRollback
              ? " You can roll back this import after it completes."
              : " To correct it afterwards, import a corrected file."}
          </p>
        </div>
      </div>

      <StepFooter step={5}>
        <Button variant="white" onClick={onBack}><ChevronLeft className="size-3.5" /> Back</Button>
        <div className="flex gap-2.5">
          {onCancel && <Button variant="ghost" onClick={onCancel}>Cancel import</Button>}
          <Button
            variant="default"
            className="bg-green-600 hover:bg-green-700 text-white"
            disabled={!batch.is_ready_for_import || errorCount > 0}
            onClick={onStart}
          >
            <Play className="size-3.5" /> Start import
          </Button>
        </div>
      </StepFooter>
    </div>
  );
}

function SummaryCell({ label, value, big, accent, suffix, className }: {
  label: string;
  value: string;
  big?: boolean;
  accent?: "success" | "destructive";
  suffix?: string;
  className?: string;
}) {
  return (
    <div className="px-4 py-3 border-b border-r border-gray-200 last:border-r-0 [&:nth-child(2n)]:border-r-0 [&:nth-last-child(-n+2)]:border-b-0">
      <p className="text-[10px] uppercase tracking-wide text-gray-500 font-semibold mb-1">{label}</p>
      <p className={cn(
        "font-medium tabular-nums",
        big ? "text-xl font-bold" : "text-sm",
        accent === "success" && "text-green-600",
        accent === "destructive" && "text-destructive",
        className,
      )}>
        {value}
        {suffix && <span className="text-xs text-gray-400 font-normal ml-1.5">{suffix}</span>}
      </p>
    </div>
  );
}

// ── Step 6: Import Progress ─────────────────────────────────────────────────

export function ImportProgressStep({
  batchId,
  jobId,
  onComplete,
}: {
  batchId: number;
  jobId: number | null;
  onComplete: (jobId: number) => void;
}) {
  const { data: jobsData } = useGetImportJobsQuery(
    { batchId },
    { skip: !!jobId, pollingInterval: 2000 },
  );

  const latestJobId = jobId ?? (jobsData?.data?.[0]?.id ?? null);

  const { data: jobData } = useGetImportJobQuery(
    { batchId, jobId: latestJobId! },
    { skip: !latestJobId, pollingInterval: 2000 },
  );
  const job = jobData?.data;

  const isTerminal = job && ["succeeded", "failed", "cancelled", "rolled_back"].includes(job.status);

  useEffect(() => {
    if (isTerminal && latestJobId) {
      const timer = setTimeout(() => onComplete(latestJobId), 800);
      return () => clearTimeout(timer);
    }
  }, [isTerminal, latestJobId, onComplete]);

  const progress = job?.progress_percent ?? 0;
  const processed = job?.processed_rows ?? 0;
  const succeeded = job?.succeeded_rows ?? 0;
  const failed = job?.failed_rows ?? 0;
  const skipped = job?.skipped_rows ?? 0;
  const total = job?.total_rows ?? 0;

  return (
    <div className="bg-white rounded-md border border-white-02 p-6 space-y-5">
      <div className="flex items-center justify-between border-b border-white-02 pb-4">
        <div>
          <h2 className="text-base font-semibold font-mont text-black-01">Import in progress…</h2>
          <p className="text-xs text-gray-01 mt-1">Writing records. This page will auto-advance when the job completes.</p>
        </div>
        <Badge variant="inactive" className="text-[10px] animate-pulse">
          <span className="size-1.5 rounded-full bg-primary" /> import_running
        </Badge>
      </div>

      <div className="text-center py-2">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="size-7 rounded-full border-[3px] border-primary/20 border-t-primary animate-spin" />
          <p className="text-sm font-semibold text-black-01">Processing batch · {total} {total === 1 ? "row" : "rows"}</p>
        </div>
        <div className="max-w-lg mx-auto">
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-[width] duration-300" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-xs text-gray-400 mt-2 tabular-nums">{progress}%</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <CounterCard label="Processed" value={processed} />
        <CounterCard label="Succeeded" value={succeeded} accent="success" />
        <CounterCard label="Failed" value={failed} accent="destructive" />
        <CounterCard label="Skipped" value={skipped} accent="warning" />
      </div>
    </div>
  );
}

function CounterCard({ label, value, accent }: { label: string; value: number; accent?: "success" | "destructive" | "warning" }) {
  return (
    <div className="rounded-md border border-gray-200 bg-gray-50/50 px-4 py-3">
      <p className={cn(
        "text-[10px] uppercase tracking-wide font-semibold",
        accent === "success" && "text-green-600",
        accent === "destructive" && "text-destructive",
        accent === "warning" && "text-amber-600",
        !accent && "text-gray-500",
      )}>{label}</p>
      <p className={cn(
        "text-2xl font-bold tabular-nums mt-1",
        accent === "success" && "text-green-600",
        accent === "destructive" && "text-destructive",
        accent === "warning" && "text-amber-600",
      )}>{value}</p>
    </div>
  );
}

// ── Step 7: Complete ────────────────────────────────────────────────────────

/**
 * The outcome of a finished import, and what to do about it.
 *
 * Rollback is offered only to a reader the rollback endpoint accepts (see
 * `canRollBackImport`): the holder of `import.rollbacks.run`, or, on a bank
 * statement, the holder of the bank-statement import key. No school role holds
 * either for a school dataset: a school corrects a bad load by importing a
 * corrected file, so neither the button nor the advice to use it appears for
 * them. The server imposes no time limit on a rollback, so none is promised
 * here.
 *
 * `returnLabel` is the finish button's whole label, verb included
 * ("Back to students"), and is shown as given.
 */
export function CompleteStep({
  batch,
  batchId,
  jobId,
  onNewImport,
  onViewDetails,
  onReturn,
  returnLabel,
}: {
  batch: ImportBatch;
  batchId: number;
  jobId: number | null;
  onNewImport: () => void;
  onViewDetails?: (batchId: number) => void;
  onReturn?: () => void;
  returnLabel?: string;
}) {
  const latestJobId = jobId;
  const { hasPermission } = usePermissions();
  const canRollback = canRollBackImport(batch.dataset_type, hasPermission);
  // The batch page refuses a reader without this key, so it is not offered.
  const canViewDetails = hasPermission(P.VIEW_IMPORT_BATCHES);
  const { formatInstantTime } = useSchoolDisplay();

  const { data: jobData } = useGetImportJobQuery(
    { batchId, jobId: latestJobId! },
    { skip: !latestJobId },
  );
  const job = jobData?.data;

  const [rollbackImport, { isLoading: rollingBack }] = useRollbackImportJobMutation();
  const [rollbackConfirm, setRollbackConfirm] = useState(false);
  const [rollbackReason, setRollbackReason] = useState("");

  const handleRollback = async () => {
    if (!latestJobId) return;
    try {
      await rollbackImport({ batchId, jobId: latestJobId, reason: rollbackReason }).unwrap();
      toast.success("Rollback initiated. Records are being reverted.");
      setRollbackConfirm(false);
    } catch { /* interceptor shows the error toast */ }
  };

  const isSuccess = batch.status === "import_succeeded";
  const isPartial = batch.status === "import_partial";
  const isFailed = batch.status === "import_failed";

  const statusLabel = isSuccess ? "Import succeeded" : isPartial ? "Import partial" : "Import failed";
  const statusColor = isSuccess ? "text-green-700" : isPartial ? "text-amber-700" : "text-destructive";
  const iconBg = isSuccess ? "bg-green-50 text-green-600" : isPartial ? "bg-amber-50 text-amber-600" : "bg-red-50 text-destructive";

  const skippedRows = job?.row_results?.filter((r) => r.action === "skip") ?? [];
  const failedRows = job?.row_results?.filter((r) => r.action === "failed") ?? [];
  const PREVIEW_LIMIT = 5;

  return (
    <div className="bg-white rounded-md border border-white-02 p-6 space-y-5">
      <div className="flex items-center gap-4">
        <div className={cn("size-14 rounded-xl flex items-center justify-center shrink-0", iconBg)}>
          {isSuccess ? <Check className="size-7" /> : <AlertTriangle className="size-7" />}
        </div>
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className={cn("text-lg font-semibold font-mont", statusColor)}>{statusLabel}</h2>
            <Badge
              variant={isSuccess ? "active" : isPartial ? "pending" : "destructive"}
              className="text-[10px]"
            >
              {batch.status.replace(/_/g, "_")}
            </Badge>
          </div>
          <p className="text-xs text-gray-01 mt-1">
            {isSuccess && "All rows were imported successfully."}
            {isPartial && (() => {
              const unimported = (job?.failed_rows ?? 0) + (job?.skipped_rows ?? 0);
              return `Import completed with partial success. ${unimported} ${unimported === 1 ? "row" : "rows"} could not be imported.`;
            })()}
            {isFailed && "The import job failed. Check the details for error information."}
          </p>
        </div>
      </div>

      {job && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Succeeded" value={job.succeeded_rows} icon={<Check className="size-4" />} iconBg="bg-green-50 text-green-600" />
          <StatCard label="Failed" value={job.failed_rows} icon={<X className="size-4" />} iconBg="bg-red-50 text-destructive" />
          <StatCard label="Skipped" value={job.skipped_rows} icon={<ChevronRight className="size-4" />} iconBg="bg-amber-50 text-amber-600" />
          <StatCard label="Processed" value={job.processed_rows} icon={<FileSpreadsheet className="size-4" />} iconBg="bg-blue-50 text-blue-600" />
        </div>
      )}

      {/* Skipped row breakdown */}
      {skippedRows.length > 0 && (
        <div className="rounded-md border border-amber-200 overflow-hidden">
          <div className="flex items-center gap-2 bg-amber-50 px-4 py-2.5 border-b border-amber-200">
            <AlertTriangle className="size-3.5 text-amber-600 shrink-0" />
            <p className="text-xs font-semibold text-amber-700">
              {skippedRows.length} {skippedRows.length === 1 ? "row" : "rows"} skipped
            </p>
          </div>
          <div className="divide-y divide-amber-100">
            {skippedRows.slice(0, PREVIEW_LIMIT).map((r) => (
              <div key={r.id} className="flex items-start gap-3 px-4 py-2.5">
                <span className="text-[10px] font-mono bg-amber-100 text-amber-700 rounded px-1.5 py-0.5 shrink-0 mt-0.5">
                  Row {r.row_number}
                </span>
                <p className="text-xs text-gray-600">{r.status_message || "No reason provided."}</p>
              </div>
            ))}
            {skippedRows.length > PREVIEW_LIMIT && (
              <div className="px-4 py-2.5 text-xs text-gray-400 italic">
                +{skippedRows.length - PREVIEW_LIMIT} more - view import details for the full list.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Failed row breakdown */}
      {failedRows.length > 0 && (
        <div className="rounded-md border border-red-200 overflow-hidden">
          <div className="flex items-center gap-2 bg-red-50 px-4 py-2.5 border-b border-red-200">
            <X className="size-3.5 text-destructive shrink-0" />
            <p className="text-xs font-semibold text-destructive">
              {failedRows.length} {failedRows.length === 1 ? "row" : "rows"} failed
            </p>
          </div>
          <div className="divide-y divide-red-100">
            {failedRows.slice(0, PREVIEW_LIMIT).map((r) => (
              <div key={r.id} className="flex items-start gap-3 px-4 py-2.5">
                <span className="text-[10px] font-mono bg-red-100 text-destructive rounded px-1.5 py-0.5 shrink-0 mt-0.5">
                  Row {r.row_number}
                </span>
                <p className="text-xs text-gray-600">{r.status_message || "No reason provided."}</p>
              </div>
            ))}
            {failedRows.length > PREVIEW_LIMIT && (
              <div className="px-4 py-2.5 text-xs text-gray-400 italic">
                +{failedRows.length - PREVIEW_LIMIT} more - view import details for the full list.
              </div>
            )}
          </div>
        </div>
      )}

      {job && (
        <div className="grid grid-cols-3 rounded-md border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-r border-gray-200">
            <p className="text-[10px] uppercase tracking-wide text-gray-500 font-semibold mb-1">Task ID</p>
            <p className="text-xs font-mono text-gray-600">{job.task_id || `job-${job.id}`}</p>
          </div>
          <div className="px-4 py-3 border-r border-gray-200">
            <p className="text-[10px] uppercase tracking-wide text-gray-500 font-semibold mb-1">Started</p>
            <p className="text-xs text-black-01">{job.started_at ? formatInstantTime(job.started_at) : "-"}</p>
          </div>
          <div className="px-4 py-3">
            <p className="text-[10px] uppercase tracking-wide text-gray-500 font-semibold mb-1">Completed</p>
            <p className="text-xs text-black-01">{job.completed_at ? formatInstantTime(job.completed_at) : "-"}</p>
          </div>
        </div>
      )}

      {/* What to do next guidance */}
      {(isPartial || isFailed) && (
        <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 space-y-1">
          <p className="text-xs font-semibold text-blue-700">What to do next</p>
          {isPartial && (
            <ul className="text-[11px] text-blue-600 space-y-0.5 list-disc list-inside">
              <li>Review the skipped/failed rows above to understand why they were rejected.</li>
              <li>Fix the data in those rows and create a new import batch with just the corrected rows.</li>
              {canRollback && (
                <li>If the data was imported incorrectly, use the rollback option below.</li>
              )}
            </ul>
          )}
          {isFailed && (
            <ul className="text-[11px] text-blue-600 space-y-0.5 list-disc list-inside">
              <li>The import job failed before completing. No data was written.</li>
              <li>Review the error details above and contact support if the error persists.</li>
              <li>You can safely re-run the import once the issue is resolved.</li>
            </ul>
          )}
        </div>
      )}

      {/* Rollback inline confirm */}
      {canRollback && rollbackConfirm && (
        <div className="rounded-md border border-destructive/30 bg-red-50 px-4 py-3 space-y-3">
          <p className="text-xs font-semibold text-destructive">Confirm rollback</p>
          <p className="text-[11px] text-gray-500">This will revert all records written by this import. Provide an optional reason.</p>
          <input
            type="text"
            value={rollbackReason}
            onChange={(e) => setRollbackReason(e.target.value)}
            placeholder="Reason (optional)"
            className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-destructive"
          />
          <div className="flex gap-2.5">
            <Button size="sm" variant="ghost" onClick={() => { setRollbackConfirm(false); setRollbackReason(""); }}>Cancel</Button>
            <Button size="sm" className="bg-destructive text-white hover:bg-destructive/90" onClick={handleRollback} disabled={rollingBack}>
              {rollingBack ? "Rolling back…" : "Confirm rollback"}
            </Button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-white-02">
        <div className="flex flex-wrap gap-2.5">
          {onViewDetails && canViewDetails && (
            <Button variant="white" onClick={() => onViewDetails(batchId)}>
              <ExternalLink className="size-3.5" /> View import details
            </Button>
          )}
          {canRollback && latestJobId && (isPartial || isFailed) && !rollbackConfirm && (
            <Button variant="ghost" className="text-destructive hover:text-destructive hover:bg-red-50" onClick={() => setRollbackConfirm(true)}>
              Roll back import
            </Button>
          )}
        </div>
        <div className="flex flex-wrap gap-2.5 sm:ml-auto">
          {onReturn && (
            <Button variant="white" onClick={onReturn}>
              <ChevronLeft className="size-3.5" /> {returnLabel ?? "Go back"}
            </Button>
          )}
          <Button onClick={onNewImport}>
            <Upload className="size-3.5" /> Start another import
          </Button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, iconBg }: { label: string; value: number; icon: React.ReactNode; iconBg: string }) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-gray-200 bg-white px-4 py-3">
      <div className={cn("size-9 rounded-lg flex items-center justify-center shrink-0", iconBg)}>{icon}</div>
      <div>
        <p className="text-xl font-bold tabular-nums">{value}</p>
        <p className="text-xs text-gray-01">{label}</p>
      </div>
    </div>
  );
}

// ── Shared footer ───────────────────────────────────────────────────────────

function StepFooter({ step, children }: { step: number; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between pt-5 border-t border-white-02">
      <span className="text-[11px] text-gray-400">Step {step} of 7</span>
      <div className="flex items-center gap-2.5">{children}</div>
    </div>
  );
}
