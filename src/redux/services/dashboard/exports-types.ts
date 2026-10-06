/**
 * Types for the Export Centre (backend app `vs_exports`, mounted at /v1/exports/).
 *
 * Every shape here is read from apps/vs_exports/serializers.py - this feature's
 * API already exists, so nothing below is invented. See
 * docs/EXPORT_BUILD_NOTES.md for the endpoint→screen map.
 */

// ── Closed vocabularies (vs_exports/constants.py) ─────────────────────────────

/** vs_exports RunStatus. EXPIRED is deliberately absent: expiry is a property of
 *  the FILE, derived at read time, so a completed run stays completed forever. */
export type ExportRunStatus =
  | "QUEUED"
  | "RUNNING"
  | "COMPLETED"
  | "COMPLETED_WITH_OMISSIONS"
  | "FAILED"
  | "CANCELLED";

export type ExportTrigger = "MANUAL" | "QUICK" | "RETRY" | "API";
export type ExportFormat = "csv" | "xlsx";
export type ValuesMode = "people" | "system";

/** Why part of a COMPLETED_WITH_OMISSIONS result was left out. */
export type OmissionCode = "FIELD_FORBIDDEN" | "FIELD_WITHDRAWN" | "ROW_CAP_HIT";

export type DeliveryState = "PENDING" | "SENT" | "FAILED" | "REVOKED" | "SKIPPED";
export type DownloadOutcome = "ALLOWED" | "REFUSED";

// ── Runs, files, downloads ────────────────────────────────────────────────────

export interface ExportFile {
  id: number;
  name: string;
  format: ExportFormat;
  size_bytes: number;
  row_count: number;
  columns_produced: string[];
  available_until: string;
  purged_at: string | null;
  download_count: number;
  /** All three are derived server-side at read time, never stored. */
  is_expired: boolean;
  is_purged: boolean;
  is_downloadable: boolean;
}

/** Present only while a run is NOT terminal; null once it has finished.
 *  A null `rows_total` means indeterminate progress - expected, not an error. */
export interface ExportProgress {
  phase: string;
  phase_label: string;
  rows_done: number;
  rows_total: number | null;
  /** Null once the run starts. While queued this is what explains the wait. */
  queue_position: number | null;
}

export interface ExportOmission {
  code: OmissionCode;
  scope: string;
  detail: string;
  items?: string[];
}

/** The UI shows `message` and `recommended_action` and maps nothing itself.
 *  `code` is for support and analytics; it is never rendered raw. */
export interface ExportFailure {
  code: string;
  message: string;
  recommended_action: string;
  reference: string;
  retryable: boolean;
}

/** The frozen config as labels, not as the stored blob. */
export interface ExportRunConfiguration {
  dataset: string;
  scope: string;
  columns: string[];
  filters: string[];
  format: ExportFormat;
  values_mode: ValuesMode;
}

export interface ExportDelivery {
  id: number;
  destination: string;
  recipient: string;
  state: DeliveryState;
  attempted_at: string | null;
  failure_reason: string;
}

export interface ExportRun {
  id: number;
  reference: string;
  export_name: string;
  /** Null for a quick export, which never had a saved recipe. */
  definition_id: number | null;
  status: ExportRunStatus;
  trigger: ExportTrigger;
  requested_by_name: string;
  queued_at: string;
  started_at: string | null;
  ended_at: string | null;
  row_count: number | null;
  attempt: number;
  progress: ExportProgress | null;
  file: ExportFile | null;
}

export interface ExportRunDetail extends ExportRun {
  omissions: ExportOmission[];
  failure: ExportFailure | null;
  configuration: ExportRunConfiguration;
  /** How far the definition has drifted from what produced this file.
   *  `changes` is rendered server-side as sentences, never the stored blob. */
  drift: {
    count: number;
    fields: string[];
    changes: { field: string; label: string; then: string; now: string }[];
  };
  /** Absent today. Delivery (recipients, secure links, revocation) is slice 4 and
   *  is NOT built, so `ExportRunDetailSerializer` does not send this field at
   *  all - it was typed as required, which is why the run-detail screen crashed
   *  on `run.deliveries.length` for every run. Optional until the endpoint
   *  actually returns it; a type that promises a field the server never sends is
   *  worse than no type. */
  deliveries?: ExportDelivery[];
}

/** One download attempt - allowed and refused alike. */
export interface ExportDownloadEntry {
  id: number;
  user_name: string;
  at: string;
  ip_address: string;
  access_kind: "VIEW" | "DOWNLOAD";
  outcome: DownloadOutcome;
  refusal_reason: string;
}

/** Flags so the UI can disable with a reason instead of failing at submit. */
export interface ExportCapabilities {
  can_create: boolean;
  can_run: boolean;
  /** On the wire, but the UI does not surface sharing - it is out of the MVP. */
  can_share: boolean;
  can_export_sensitive: boolean;
  can_view_activity: boolean;
  allowed_entities: { id: number; code: string; name: string }[];
  row_cap: number;
  concurrent_run_limit: number;
  in_flight: number;
  retention_days: number;
}

// ── Catalogue (vs_exports/catalogue.py) ──────────────────────────────────────
// Steps 1 and 2 are entirely catalogue-driven. The UI never hardcodes fields,
// formats or option sets - everything below comes off the wire.

export type FieldKind = "text" | "date" | "datetime" | "money" | "number" | "choice";

export interface DatasetField {
  id: string;
  label: string;
  group: string;
  type: FieldKind;
  /** Always exported, cannot be deselected - the row's identity. */
  locked: boolean;
  /** Needs exports.sensitive_field.export as well; called out at review. */
  sensitive: boolean;
  description: string;
}

export type FilterKind = "date_range" | "choice" | "text" | "boolean" | "number_range";

export interface DatasetFilter {
  id: string;
  label: string;
  type: FilterKind;
  required: boolean;
  choices: { value: string; label: string }[];
  description: string;
  is_primary_date: boolean;
  /** A number_range over an amount: its bounds are naira, with at most two
   *  decimal places, and the server converts them to kobo. */
  money?: boolean;
}

/** One option's schema, discriminated by format - never a flat bag. */
export interface FormatOptionSchema {
  type: "choice" | "boolean" | "text";
  values?: string[];
  default: string | boolean;
  max_length?: number;
}

export interface Dataset {
  id: string;
  module: string;
  name: string;
  description: string;
  scope: "ENTITY" | "TENANT";
  requires_entity: boolean;
  fields: DatasetField[];
  field_count: number;
  default_columns: string[];
  required_filters: string[];
  filters: DatasetFilter[];
  supported_formats: ExportFormat[];
  format_options: Record<ExportFormat, Record<string, FormatOptionSchema>>;
  max_date_span_days: number | null;
  row_cap: number;
}

export interface CatalogueModule {
  name: string;
  datasets: Dataset[];
  /** False when a module has nothing published - that is information, not a gap. */
  available: boolean;
}

/**
 * ── Filter values as the builder holds them ──────────────────────────────────
 * The shape is the filter's kind, and the keys are the backend's:
 * date_range → {start, end}; choice → {values}; text/boolean → {value};
 * number_range → {min, max}. Getting these wrong fails silently at run time.
 * A money filter's bounds are naira, sent as the typed string ("50000.50") so
 * no float ever touches an amount; a saved one may come back as a number.
 */
export interface FilterSpec {
  id: string;
  start?: string;
  end?: string;
  values?: string[];
  value?: string | boolean;
  min?: number | string;
  max?: number | string;
}

// ── Preview and estimate ──────────────────────────────────────────────────────

export interface PreviewWarning {
  code: string;
  message: string;
}

export interface PreviewResult {
  /** Null when counting stopped early; `rows_bucket` then carries the figure. */
  matching_rows: number | null;
  rows_bucket: string | null;
  estimated_bytes: number;
  estimate_confidence: "exact" | "bucketed";
  columns: number;
  row_cap: number;
  warnings: PreviewWarning[];
  sample: { headers: string[]; rows: string[][] };
  /** One sentence a person can check without knowing the schema. */
  reads_as: string;
}

// ── Export from a list screen (vs_exports FromScreenView) ────────────────────
// "Export what this table is showing." The screen forwards its own filter
// params; the module that owns the screen translates them into dataset filters.
// The FE never maps filters itself - it only reports what came back.

/** One screen filter that could NOT be carried into the export.
 *  Its presence means the file will be WIDER than the table on screen, which is
 *  the one outcome the drawer must never let pass silently. */
export interface UnmappedScreenFilter {
  param: string;
  value: string;
  reason: string;
}

/** A filter the export needed that the screen did not supply - in practice the
 *  required date window. Makes the file NARROWER than the screen, which is safe
 *  but still worth showing. */
export interface AddedScreenFilter {
  id: string;
  label: string;
  reason: string;
}

/** The configuration `from-screen` prepared, ready to hand straight to /quick/. */
export interface ScreenExportConfig {
  dataset_key: string;
  columns: string[];
  filters: FilterSpec[];
  sort: { field: string; direction: "asc" | "desc" }[];
  format: ExportFormat;
  values_mode: ValuesMode;
}

/** `from-screen` response: the config, the honesty about it, and an estimate.
 *  Extends PreviewResult because the view spreads the same `estimate()` figures
 *  and sample into its payload. */
export interface ScreenExportPlan extends PreviewResult {
  screen: { key: string; label: string; dataset: string; default_window_days: number };
  config: ScreenExportConfig;
  /** The dataset's own list, not the FE's assumption about it. */
  supported_formats: ExportFormat[];
  /** Every column this caller may pick, already filtered by the sensitive-field
   *  gate - so the picker never offers one that would be dropped from the file. */
  fields: DatasetField[];
  /** Screen params that WERE expressed as export filters. */
  carried: string[];
  unmapped: UnmappedScreenFilter[];
  added: AddedScreenFilter[];
  /** True only when nothing was dropped: the file will match the table. */
  exact: boolean;
  /** Server-authored sentence, present only when `exact` is false. */
  warning: string | null;
}

/** Body for POST /exports/quick/ - the config, plus a name and idempotency key.
 *  Nothing is saved: there is no definition behind the run it creates. */
export interface QuickExportBody extends ScreenExportConfig {
  name?: string;
  format_options?: Record<string, unknown>;
  client_key?: string;
  /** Required for entity-scoped datasets, ignored for tenant-scoped ones. */
  entity?: string;
  /** Produce the file inline instead of queueing it. The server honours this
   *  only when its OWN estimate is small enough, and silently queues instead
   *  when it is not - so the caller must read the returned run rather than
   *  assume a file came back. */
  sync?: boolean;
}

// ── Definitions ───────────────────────────────────────────────────────────────

export interface ExportDefinitionListItem {
  id: number;
  name: string;
  description: string;
  dataset: { id: string; name: string; module: string; available: boolean };
  scope: { type: "ENTITY" | "TENANT"; label: string };
  entity_code: string | null;
  format: ExportFormat;
  values_mode: ValuesMode;
  column_count: number;
  owner_name: string;
  is_owner: boolean;
  /** Both come off the wire and are deliberately not rendered: sharing is out
   *  of the MVP, so every export is the owner's own. Kept on the type because
   *  the API sends them and a type that lies is worse than an unused field. */
  sharing: "PRIVATE" | "SHARED";
  shared_with: number;
  is_draft: boolean;
  is_archived: boolean;
  email_recipients: boolean;
  last_run: { reference: string; status: ExportRunStatus; at: string } | null;
  updated_at: string;
}

export interface ExportDefinitionDetail extends ExportDefinitionListItem {
  columns: string[];
  filters: FilterSpec[];
  filters_readable: string[];
  sort: { field: string; direction: "asc" | "desc" }[];
  format_options: Record<string, unknown>;
  file_name_pattern: string;
  created_at: string;
}

/** Create/update payload. tenant, entity and owner come from the request. */
export interface DefinitionWrite {
  name: string;
  description?: string;
  dataset_key: string;
  columns: string[];
  filters: FilterSpec[];
  sort?: { field: string; direction: "asc" | "desc" }[];
  format: ExportFormat;
  format_options?: Record<string, unknown>;
  values_mode: ValuesMode;
  file_name_pattern?: string;
  sharing?: "PRIVATE" | "SHARED";
  is_draft?: boolean;
  email_recipients?: boolean;
}

export interface DefinitionListParams {
  module?: string;
  owner?: "me";
  q?: string;
  include_archived?: "true";
  page?: number;
}

// ── Requests ──────────────────────────────────────────────────────────────────

export interface RunListParams {
  status?: ExportRunStatus | "";
  trigger?: ExportTrigger | "";
  definition?: number;
  page?: number;
}

// ── Envelopes (platform convention: {success, message, data}) ────────────────

export interface ExportPagination {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
}

export interface ExportListResponse<T> {
  message?: string;
  data: T[];
  pagination: ExportPagination;
}

export interface ExportItemResponse<T> {
  message?: string;
  data: T;
}
