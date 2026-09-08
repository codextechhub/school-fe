import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { Check, Download, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import CustomTable from "@/components/custom/custom-table";
import PermissionGate from "@/components/custom/permission-gate";
import { P } from "@/permissions";
import { routesPath } from "@/routes/routesPath";
import { usePermissions } from "@/hooks/use-permissions";
import { apiErrorMessage, parseApiError } from "@/utils/api-error";
import BulkImportDrawer from "@/components/custom/bulk-import-drawer";
import {
  importDownloadUrls,
  useGetImportBatchesQuery,
  useGetImportTemplatesQuery,
} from "@/redux/services/dashboard/import-api";
import { useTransitionOnboardingTaskMutation } from "@/redux/services/onboarding/onboarding-api";
import type {
  DatasetType,
  ImportTemplateListItem,
} from "@/redux/services/dashboard/import-types";
import { PageShell } from "@/components/layout/page-shell";

/**
 * "Upload Initial Datasets", drawn as the design draws it.
 *
 * The design's shape, top to bottom: a Required datasets card with a progress
 * bar over the three the step is really about, a searchable table of templates
 * to download and import against, the school's own batches, and a short "Before
 * you upload" note. That order is deliberate in the design and kept here - the
 * progress card answers "am I done?" before the tables answer "what do I do?".
 *
 * Three things it does that the design could assume and this cannot.
 *
 * **The templates table is whatever the server offers, never a hard-coded
 * list.** CodeX's own templates are withheld server-side and a request naming
 * one is refused - see the backend's `vs_import_data/datasets.py`, which exists
 * because a school administrator could briefly provision a tenant, and create
 * branches the branch API refuses them, through this engine. A list written
 * here would drift from that rule in the dangerous direction.
 *
 * **A dataset with no template still gets a row**, greyed, so a school sees
 * what the step will eventually ask for rather than a screen that looks
 * incomplete. The server's templates are merged OVER those placeholders by
 * dataset slug, so seeding one lights up one row and leaves the rest alone with
 * no edit here. `PLACEHOLDER_TEMPLATES` says which, and why the list is as
 * short as it is.
 *
 * **The upload itself is the shared import wizard**, the same one the staff and
 * student directories open and the same one the Data Imports console runs. This
 * screen owns the checklist around an import - which datasets the step needs
 * and how far they have got - and owns none of the importing. What an upload
 * DID is read on the batch, under Data Imports, for the same reason.
 */

/**
 * The three datasets this step is about, in the design's order.
 *
 * Named here rather than read from the server because the step's requirements
 * are the step's, not the catalogue's: a school must load all three to close
 * it, whether or not a template exists for each yet.
 *
 * The third is `guardians`, which is the dataset the design called "Parents".
 * A guardian row IS a parent record - see `vs_import_data/datasets.py`, where
 * the reason the dataset exists at all is that the student import carries only
 * one guardian per child, so every second parent would otherwise be typed in by
 * hand. The engine has no `parents` dataset and never had one, so requiring it
 * under that name asked for something nothing could ever satisfy: the card sat
 * at "Not available yet" and the step could not be finished.
 */
const REQUIRED_DATASETS = [
  { slug: "students", name: "Students" },
  { slug: "staff", name: "Staff" },
  { slug: "guardians", name: "Guardians" },
] as const;

/**
 * Rows for datasets the engine cannot serve yet.
 *
 * A school needs to see what the step will eventually ask for, so a dataset
 * with no template still gets a row, with its controls greyed. When a template
 * is seeded the server's copy replaces the placeholder by dataset slug and the
 * controls come alive.
 *
 * **A placeholder is only ever for a dataset that does not exist.** One written
 * for a dataset the engine already serves shows twice: once greyed under the
 * invented name and once live under the real one, so the step advertises as
 * "coming" a thing the reader can already do on the row below. Staff, parents
 * and classes each did that once their templates were seeded - the engine's
 * list is `DatasetTypeChoices`, and anything on it belongs to the server.
 *
 * Historical records is the one left, because there is no dataset behind it:
 * no `historical` in the engine's choices and no model to import into.
 *
 * The datasets CodeX loads on a school's behalf - schools, branches, CX users,
 * bank statements - are NOT here and are not offered by the server either.
 * They are not a school's to load, so listing them would only be noise.
 */
const PLACEHOLDER_TEMPLATES = [
  { slug: "historical", name: "Historical Records Import", code: "HIS_V1", cols: 22, req: 7 },
] as const;

const TEMPLATE_COLUMNS = ["Template", "Dataset", "Columns", "Action"];
/** Which datasets the step actually requires, for the Required/Optional chip. */
const REQUIRED_SLUGS = new Set(REQUIRED_DATASETS.map((d) => d.slug as string));
const BATCH_COLUMNS = ["Batch", "File", "Rows", "Status", "Action"];
const DATA_KEY = "INITIAL_DATA";

/**
 * What the import wizard can be pointed at.
 *
 * Bank statements are excluded because they are the finance module's own
 * reconciliation flow rather than a dataset a school loads during setup, and
 * BulkImportDrawer excludes them from its prop for the same reason.
 */
type ImportableDataset = Exclude<DatasetType, "bank_statements">;

/**
 * One row of the templates table: either a template the server offers, or a
 * placeholder for a dataset that has none yet.
 *
 * `dataset_type` is a plain string rather than `DatasetType` because a
 * placeholder names a dataset the engine does not know - "structure" and
 * "historical" have no template and no model behind them. `placeholder` is what
 * separates the two, and only a false one may be handed to the wizard, which
 * takes a real dataset. The compiler enforces that at the one call site.
 */
type TemplateRow = {
  id: number;
  name: string;
  code: string;
  dataset_type: string;
  total_columns: number;
  required_columns: number;
  default_file_format?: string;
  can_import: boolean;
  placeholder: boolean;
};

export default function OnboardingImport() {
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();

  const templates = useGetImportTemplatesQuery({ page_size: 100 });
  const batches = useGetImportBatchesQuery({ page_size: 50 });

  const [transition, transitionState] = useTransitionOnboardingTaskMutation();

  const [query, setQuery] = useState("");
  // Which dataset the wizard is open on, or null when it is closed. The wizard
  // is pointed at a DATASET rather than a template id because that is what it
  // takes: it resolves the template itself and shows it as a settled fact.
  const [importing, setImporting] = useState<ImportableDataset | null>(null);

  // Memoised, not `templates.data ?? []` inline: the fallback allocates a
  // new array on every render, so every memo below it recomputed on every
  // render and the memos were doing nothing at all.
  const offered = useMemo(() => templates.data?.data ?? [], [templates.data]);
  const batchRowsData = useMemo(() => batches.data?.data ?? [], [batches.data]);
  const canImport = hasPermission(P.UPLOAD_IMPORT_BATCH);

  /**
   * The rows the table shows: the design's five, with any real template the
   * server offers taking the place of its placeholder.
   *
   * Merged by dataset slug rather than replacing the list wholesale, so seeding
   * one dataset lights up one row and leaves the rest as they were. Students is
   * live and arrives through the server's list; the four without a template
   * still show, greyed.
   *
   * The rows carry no `slug` of their own - `dataset_type` already is one, and
   * a second copy meant casting a server value into the placeholder union,
   * which claimed a dataset we had never listed was one of the four we had.
   */
  const rows = useMemo<TemplateRow[]>(() => {
    const fromServer = (t: ImportTemplateListItem): TemplateRow => ({
      id: t.id,
      name: t.name,
      code: t.code,
      dataset_type: t.dataset_type,
      total_columns: t.total_columns,
      required_columns: t.required_columns,
      default_file_format: t.default_file_format,
      can_import: t.can_import,
      placeholder: false,
    });

    const live = new Map<string, ImportTemplateListItem>(
      offered.map((t) => [t.dataset_type as string, t]),
    );
    const merged = PLACEHOLDER_TEMPLATES.map((entry): TemplateRow => {
      const real = live.get(entry.slug);
      if (real) {
        live.delete(entry.slug);
        return fromServer(real);
      }
      return {
        id: -1,
        name: entry.name,
        code: entry.code,
        dataset_type: entry.slug,
        total_columns: entry.cols,
        required_columns: entry.req,
        placeholder: true,
        // Stated rather than left off. Without it the merged union has the
        // property on one arm only, every read of it is a type error, and the
        // row callback was widened to `any` to get at it - which turned off
        // checking for every other field on the row as well.
        can_import: false,
      };
    });
    // Anything the server offers that the design never listed still belongs on
    // the table - the server decides what a school may load, not this file.
    for (const extra of live.values()) {
      merged.push(fromServer(extra));
    }
    // Required first. A live template arrives through the loop above and would
    // otherwise land at the BOTTOM, under the optional placeholders - so the
    // one dataset the step actually needs sat below two it does not, purely
    // because the server had it and the others were hard-coded.
    return merged.sort(
      (a, b) =>
        Number(REQUIRED_SLUGS.has(b.dataset_type)) -
        Number(REQUIRED_SLUGS.has(a.dataset_type)),
    );
  }, [offered]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter(
      (t) =>
        t.name.toLowerCase().includes(needle) ||
        t.dataset_type.toLowerCase().includes(needle),
    );
  }, [rows, query]);

  /**
   * How far the three required datasets have got.
   *
   * Only a fully succeeded import counts, which the design states outright: a
   * partial import reads like success and leaves rows behind, so treating it as
   * done would close the step on incomplete data.
   */
  const required = useMemo(() => {
    const rows = batchRowsData;
    return REQUIRED_DATASETS.map((entry) => {
      const mine = rows.filter((b) => b.dataset_type === entry.slug);
      const done = mine.some((b) => b.status === "import_succeeded");
      const partial = mine.some((b) => b.status === "import_partial");
      const available = offered.some((t) => t.dataset_type === entry.slug);
      return {
        ...entry,
        done,
        partial,
        state: done
          ? "Imported"
          : partial
            ? "Partly imported"
            : available
              ? "Not started"
              : "Not available yet",
      };
    });
  }, [batchRowsData, offered]);

  const doneCount = required.filter((r) => r.done).length;
  const allDone = doneCount === REQUIRED_DATASETS.length;

  async function finishDataSetup() {
    try {
      await transition({ key: DATA_KEY, status: "DONE" }).unwrap();
      toast.success("Data setup marked as done.");
      navigate(routesPath.PROTECTED.ONBOARDING.INDEX);
    } catch (error) {
      const parsed = parseApiError(error);
      toast.error(apiErrorMessage(parsed, "We could not close that step."));
    }
  }

  const templateRows = useMemo(
    () =>
      visible.map((template) => {
        const locked =
          template.placeholder || template.can_import === false;
        return {
        Template: (
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-black-01 font-mont truncate">
              {template.name}
            </p>
            <p className="mt-px font-mono text-[11px] text-gray-05 truncate">
              {template.code ?? template.dataset_type}
            </p>
          </div>
        ),
        // The design's chip says whether the STEP needs this dataset, not what
        // the dataset is called - the name is already in the column beside it.
        Dataset: REQUIRED_SLUGS.has(template.dataset_type) ? (
          <Badge variant="blue">Required</Badge>
        ) : (
          <Badge variant="inactive">Optional</Badge>
        ),
        Columns: (
          <span className="text-gray-01">
            {template.total_columns} columns
            {` · ${template.required_columns} required`}
          </span>
        ),
        Action: (
          <div className="flex items-center justify-end gap-3 whitespace-nowrap">
            {/* Both controls stay on the row and are greyed out. A template
                that is coming should look like the thing it will become, so
                the row does not change shape the day it arrives. */}
            <span
              className={
                locked
                  ? "inline-flex items-center gap-1.5 text-[13px] font-medium text-gray-05 opacity-70 cursor-not-allowed"
                  : "hidden"
              }
              title="This template is not available yet"
            >
              <Download className="size-3.5" />
              Template
            </span>
            {!locked && (
              <a
                href={importDownloadUrls.templateDownload(
                  template.id,
                  template.default_file_format === "xlsx" ? "xlsx" : "csv",
                )}
                className="inline-flex items-center gap-1.5 text-[13px] font-medium text-primary hover:underline"
              >
                <Download className="size-3.5" />
                Template
              </a>
            )}
            {canImport && (
              <Button
                size="sm"
                onClick={() => {
                  if (locked) return;
                  setImporting(template.dataset_type as ImportableDataset);
                }}
                disabled={locked}
                title={locked ? "This template is not available yet" : undefined}
              >
                Import
              </Button>
            )}
          </div>
        ),
        };
      }),
    [visible, canImport],
  );

  const batchRows = useMemo(
    () =>
      batchRowsData.map((batch) => ({
        Batch: (
          <span className="font-mono text-xs text-gray-05">#{batch.id}</span>
        ),
        File: (
          <div className="min-w-0">
            <p className="text-xs font-medium text-black-01 truncate">
              {batch.original_filename}
            </p>
            <p className="text-[11px] text-gray-05">
              {new Date(batch.created_at).toLocaleString()}
            </p>
          </div>
        ),
        Rows: batch.total_rows ?? "-",
        Status: <StatusChip status={batch.status} failed={batch.has_critical_errors} />,
        Action: (
          <div className="text-right whitespace-nowrap">
            <Button
              variant="ghost"
              size="xs"
              className="text-primary"
              onClick={() =>
                navigate(
                  routesPath.PROTECTED.DATA_IMPORTS.BATCHES.VIEW(String(batch.id)),
                )
              }
            >
              {batch.has_critical_errors ? "Fix rows" : "View results"}
            </Button>
          </div>
        ),
      })),
    [batchRowsData, navigate],
  );

  return (
    <PageShell className="gap-5" grid>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 max-w-[62ch]">
          <h1 className="text-lg font-semibold text-black-01 font-mont text-balance">
            Upload Initial Datasets
          </h1>
          <p className="mt-1 text-sm text-gray-01 text-pretty">
            Pick the template that matches your file, download it if you need the
            format, then run it through the import wizard.
          </p>
        </div>
        <PermissionGate permission={P.UPDATE_ONBOARDING_TASK}>
          <Button
            className="h-10 shrink-0"
            disabled={!allDone || transitionState.isLoading}
            onClick={() => void finishDataSetup()}
          >
            Finish data setup
          </Button>
        </PermissionGate>
      </div>

      {/* Required datasets: the progress card, before either table. */}
      <section className="bg-white rounded-md border border-white-02 px-3 py-4 sm:px-5 min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-base font-semibold text-black-01 font-mont">
            Required datasets
          </p>
          <span className="text-xs font-semibold text-gray-05 font-mont">
            {doneCount} of {REQUIRED_DATASETS.length} fully imported
          </span>
        </div>

        <div className="mt-3 h-1.5 rounded-full bg-gray-03 overflow-hidden">
          <span
            className="block h-full rounded-full bg-primary transition-[width] duration-500"
            style={{ width: `${(doneCount / REQUIRED_DATASETS.length) * 100}%` }}
          />
        </div>

        <div className="mt-3.5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {required.map((entry) => (
            <div
              key={entry.slug}
              className="flex items-start gap-2.5 rounded-md border border-border px-3 py-2.5 min-w-0"
            >
              <span
                className={[
                  "size-5.5 rounded-full grid place-content-center shrink-0 mt-px",
                  entry.done
                    ? "bg-green-01/10 text-green-01"
                    : "bg-gray-03 text-gray-04",
                ].join(" ")}
              >
                <Check className="size-3" />
              </span>
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-black-01 font-mont truncate">
                  {entry.name}
                </p>
                <p className="text-[11px] text-gray-05">{entry.state}</p>
                {entry.partial && (
                  <p className="mt-0.5 text-[11px] text-gray-06 text-pretty">
                    Some rows did not land, so this does not satisfy the
                    onboarding step yet.
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {!allDone && (
          <p className="mt-3 text-[11px] text-gray-05">
            Only a fully succeeded import counts towards this step.
          </p>
        )}
      </section>

      {/* Templates. Search sits on the page ground above the table, as the
          design has it, with the count opposite. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-80">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search templates"
            className="h-10 pr-10"
          />
          <Search className="size-4 absolute right-3 top-3 text-gray-05 pointer-events-none" />
        </div>
        <span className="text-sm text-gray-05 tabular-nums">
          {visible.length} of {rows.length} templates
        </span>
      </div>

      <section className="bg-white rounded-md border border-white-02 px-3 py-4 sm:px-5 min-w-0">
        <div className="overflow-x-auto">
          <CustomTable
            tableHeaderList={TEMPLATE_COLUMNS}
            tableBodyList={templateRows}
            loading={templates.isLoading}
            loadingText="Loading templates…"
            emptyText={query ? "No template matches that." : "No templates yet."}
            hidePagination
          />
        </div>
      </section>

      {/* Batches */}
      <PermissionGate permission={P.VIEW_IMPORT_BATCHES}>
        <section className="bg-white rounded-md border border-white-02 px-3 py-4 sm:px-5 min-w-0">
          <p className="mb-3 text-sm font-semibold font-mont text-black-01">
            Import batches
          </p>
          <div className="overflow-x-auto">
            <CustomTable
              tableHeaderList={BATCH_COLUMNS}
              tableBodyList={batchRows}
              loading={batches.isLoading}
              loadingText="Loading your uploads…"
              emptyText="You have not uploaded anything yet."
              hidePagination
            />
          </div>
        </section>
      </PermissionGate>

      {/* Before you upload */}
      <section className="bg-white rounded-md border border-white-02 px-3 py-4 sm:px-5 min-w-0">
        <p className="text-sm font-semibold text-black-01 font-mont">
          Before you upload
        </p>
        <div className="mt-2 grid gap-1.5 text-[13px] text-gray-01">
          <p>Files must be CSV or XLSX and under 50 MB.</p>
          <p>
            A file uploaded against the wrong template is rejected - the column
            signature has to match.
          </p>
          <p>
            Students must reference classes that already exist, so finish
            Academic Structure first.
          </p>
          <p>
            Branches are opened by CodeX rather than uploaded. Ask the team if
            you need another branch.
          </p>
        </div>
        <p className="mt-3 text-[11px] text-gray-05">
          Validation and import are handled by the CodeX Data Import Engine.
        </p>
      </section>

      {/* The same wizard the staff and student directories open, and the same
          one the Data Imports console runs. An onboarding upload is not a
          different kind of import, so it is not a different implementation of
          one: the step owns the checklist around it and nothing else. */}
      {importing && (
        <BulkImportDrawer
          open
          datasetType={importing}
          title="Import your data"
          description="Load this dataset from a spreadsheet. Nothing is written until you confirm."
          returnLabel="Back to setup"
          onClose={() => setImporting(null)}
        />
      )}
    </PageShell>
  );
}

/**
 * The batch's state, in the school's words, coloured by who has to act.
 *
 * The engine has fourteen states because it separates things a school does not
 * care about - detecting a dataset from mapping its columns. A reader needs one
 * of three: it worked, it needs me, or it is still going.
 */
const STATUS_LABEL: Record<
  string,
  { text: string; tone: "success" | "rejected" | "pending" }
> = {
  import_succeeded: { text: "Imported", tone: "success" },
  import_partial: { text: "Partly imported", tone: "rejected" },
  import_failed: { text: "Import failed", tone: "rejected" },
  validation_failed: { text: "Needs fixing", tone: "rejected" },
  rolled_back: { text: "Rolled back", tone: "rejected" },
  cancelled: { text: "Cancelled", tone: "rejected" },
  mapping_required: { text: "Needs fixing", tone: "rejected" },
  import_queued: { text: "Importing", tone: "pending" },
  import_running: { text: "Importing", tone: "pending" },
  ready_to_import: { text: "Ready to import", tone: "pending" },
  uploaded: { text: "Checking", tone: "pending" },
  validating: { text: "Checking", tone: "pending" },
  detecting: { text: "Checking", tone: "pending" },
  draft: { text: "Not sent", tone: "pending" },
};

export function StatusChip({
  status,
  failed,
}: {
  status: string;
  failed: boolean;
}) {
  // Blocking problems read as needing the reader whatever stage the engine
  // thinks it is at: its state is about the pipeline, this column is about
  // whose turn it is.
  if (failed) return <Badge variant="rejected">Needs fixing</Badge>;
  const known = STATUS_LABEL[status];
  if (known) return <Badge variant={known.tone}>{known.text}</Badge>;
  return <Badge variant="pending">{status.replace(/_/g, " ")}</Badge>;
}
