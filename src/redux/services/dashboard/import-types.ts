import type { PaginatedResponse } from "./security-types";

// ── Enums (mirrored from backend) ────────────────────────────────────────────

/**
 * Every dataset the import engine can load.
 *
 * The whole of `vs_import_data.DatasetTypeChoices`, not the subset one product
 * happens to use. The engine is shared and a batch carries its dataset on the
 * wire, so a union narrower than the engine's is a type that lies about what
 * can arrive: the console reads batches across every tenant, and the school app
 * offers a template for each of the six a school may load.
 *
 * Which of them a given caller may actually import is a server decision, not a
 * shape - see `vs_import_data/datasets.py`, which withholds the platform ones
 * and refuses a caller that names one anyway.
 */
export type DatasetType =
  // CodeX loads these on a school's behalf.
  | "schools"
  | "branches"
  | "cx_users"
  | "bank_statements"
  // A school loads these itself.
  | "students"
  | "staff"
  | "guardians"
  | "academic_structure"
  | "subjects"
  | "calendar_events";

export type FileFormat = "csv" | "xlsx" | "xls";

export type TemplateStatus = "draft" | "active" | "retired";

export type TemplateColumnDataType =
  | "string"
  | "integer"
  | "decimal"
  | "date"
  | "datetime"
  | "email"
  | "boolean"
  | "choice";

export type BatchStatus =
  | "draft"
  | "uploaded"
  | "detecting"
  | "mapping_required"
  | "validating"
  | "validation_failed"
  | "ready_to_import"
  | "import_queued"
  | "import_running"
  | "import_partial"
  | "import_succeeded"
  | "import_failed"
  | "rolled_back"
  | "cancelled";

export type ValidationSeverity = "error" | "warning" | "info";

export type ValidationCode =
  | "file_type_invalid"
  | "file_empty"
  | "sheet_missing"
  | "column_missing"
  | "column_unknown"
  | "required_value_missing"
  | "invalid_format"
  | "invalid_choice"
  | "duplicate_record"
  | "cross_reference_missing"
  | "dataset_mismatch"
  | "duplicate_mapping"
  | "business_rule";

export type JobStatus =
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "cancelled"
  | "rolled_back";

export type RowAction = "create" | "update" | "skip" | "failed";

export type NotificationStatus = "pending" | "sent" | "failed";

// ── Nested mini types ────────────────────────────────────────────────────────

export interface UserMini {
  id: string;
  email?: string;
  full_name?: string;
}

export interface SchoolMini {
  id: string;
  name?: string;
  slug?: string;
}

// ── Templates ────────────────────────────────────────────────────────────────

export interface ImportTemplateColumn {
  id: number;
  column_name: string;
  target_field: string;
  display_name: string;
  help_text: string;
  data_type: TemplateColumnDataType;
  is_required: boolean;
  is_unique: boolean;
  max_length: number | null;
  allowed_values: string[];
  sample_value: string;
  default_value: string;
  column_order: number;
  reference_model: string;
  reference_lookup_field: string;
  created_at: string;
  updated_at: string;
}

export interface ImportTemplateListItem {
  id: number;
  code: string;
  name: string;
  dataset_type: DatasetType;
  description: string;
  status: TemplateStatus;
  default_file_format: FileFormat;
  is_download_enabled: boolean;
  total_columns: number;
  /** How many of the columns the file must carry. */
  required_columns: number;
  /**
   * Whether the CALLER's tenant may import this template.
   *
   * The catalogue lists every template, including the ones CodeX loads on a
   * school's behalf, so a screen greys the rest rather than hiding them. A
   * display hint only: the server asks the same question again on upload
   * (vs_import_data/datasets.py), and a caller naming a template it may not use
   * is refused there whatever this says.
   */
  can_import: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ImportTemplate extends ImportTemplateListItem {
  instructions: string;
  allow_sample_row: boolean;
  sample_row_data: Record<string, unknown>;
  validation_rules?: Record<string, unknown>;
  retired_at: string | null;
  columns: ImportTemplateColumn[];
}

export interface CreateTemplatePayload {
  code: string;
  name: string;
  dataset_type: DatasetType;
  description?: string;
  status?: TemplateStatus;
  default_file_format?: FileFormat;
  instructions?: string;
  allow_sample_row?: boolean;
  sample_row_data?: Record<string, unknown>;
  validation_rules?: Record<string, unknown>;
  is_download_enabled?: boolean;
  columns?: Array<Omit<Partial<ImportTemplateColumn>, "id" | "created_at" | "updated_at">>;
}

export interface UpdateTemplatePayload {
  name?: string;
  description?: string;
  status?: TemplateStatus;
  default_file_format?: FileFormat;
  instructions?: string;
  allow_sample_row?: boolean;
  sample_row_data?: Record<string, unknown>;
  validation_rules?: Record<string, unknown>;
  is_download_enabled?: boolean;
  columns?: Array<Omit<Partial<ImportTemplateColumn>, "id" | "created_at" | "updated_at">>;
}

// ── Batches ──────────────────────────────────────────────────────────────────

export interface ImportBatchListItem {
  id: number;
  /** Which dataset the batch loads. Read from the batch's template, so it is
   *  present whether or not the caller can see the template row itself. */
  dataset_type: DatasetType;
  template: number | null;
  template_name: string | null;
  template_code: string | null;
  original_filename: string;
  file_format: FileFormat;
  status: BatchStatus;
  file_size_bytes: number;
  total_rows: number;
  total_columns: number;
  structure_matches_template: boolean;
  has_critical_errors: boolean;
  is_ready_for_import: boolean;
  error_count: number;
  warning_count: number;
  imported_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ImportBatch {
  id: number;
  school: SchoolMini | null;
  branch: SchoolMini | null;
  uploaded_by: UserMini;
  template: ImportTemplate | null;
  domain_context?: {
    type: "bank_statement";
    bank_account_id: number;
    bank_account_name: string;
    entity_id: number;
    entity_code: string;
    statement_date: string;
    period_label: string;
    opening_balance: number;
    opening_balance_major: string;
    closing_balance: number;
    closing_balance_major: string;
    published_statement_id: number | null;
  } | null;
  original_filename: string;
  file: string | null;
  file_format: FileFormat;
  dataset_type: DatasetType;
  status: BatchStatus;
  file_size_bytes: number;
  total_rows: number;
  total_columns: number;
  header_row_index: number;
  sheet_name: string;
  uploaded_headers: string[];
  template_headers_snapshot: string[];
  preview_rows: Array<Record<string, unknown>>;
  validation_summary: Record<string, unknown> | null;
  structure_matches_template: boolean;
  has_critical_errors: boolean;
  is_ready_for_import: boolean;
  validation_started_at: string | null;
  validation_completed_at: string | null;
  imported_at: string | null;
  notes: string;
  error_count: number;
  warning_count: number;
  validation_issues: ValidationIssueListItem[];
  notifications: ImportNotification[];
  created_at: string;
  updated_at: string;
}

// ── Validation ───────────────────────────────────────────────────────────────

export interface ValidationIssueListItem {
  id: number;
  severity: ValidationSeverity;
  code: ValidationCode | string;
  message: string;
  row_number: number | null;
  column_name: string;
  field_name: string;
  is_resolved: boolean;
  created_at: string;
}

export interface ValidationIssueDetail extends ValidationIssueListItem {
  import_batch: number;
  help_text: string;
  raw_value: string;
  normalized_value: string;
  metadata: Record<string, unknown>;
  resolved_at: string | null;
  resolved_by: UserMini | null;
  updated_at: string;
}

// ── Jobs ─────────────────────────────────────────────────────────────────────

export interface ImportJobListItem {
  id: number;
  import_batch: number;
  status: JobStatus;
  progress_percent: number;
  total_rows: number;
  processed_rows: number;
  succeeded_rows: number;
  failed_rows: number;
  skipped_rows: number;
  retry_count: number;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface ImportJobRowResult {
  id: number;
  job: number;
  row_number: number;
  action: RowAction;
  target_model: string;
  target_object_pk: string;
  status_message: string;
  error_details: Record<string, unknown>;
  row_payload: Record<string, unknown>;
  normalized_payload: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ImportJob extends ImportJobListItem {
  queued_by: UserMini;
  task_id: string;
  last_error_code: string;
  last_error_message: string;
  rollback_started_at: string | null;
  rollback_completed_at: string | null;
  execution_summary: Record<string, unknown>;
  row_results: ImportJobRowResult[];
  updated_at: string;
}

// ── Rollback ─────────────────────────────────────────────────────────────────

export interface RollbackRecord {
  id: number;
  job: number;
  initiated_by: UserMini | null;
  reason: string;
  was_successful: boolean;
  reverted_rows_count: number;
  details: Record<string, unknown>;
  started_at: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

// ── Notifications ────────────────────────────────────────────────────────────

export interface ImportNotification {
  id: number;
  import_batch: number;
  recipient: UserMini;
  event_type: string;
  title: string;
  body: string;
  status: NotificationStatus;
  sent_at: string | null;
  error_message: string;
  created_at: string;
  updated_at: string;
}

// ── Action responses ─────────────────────────────────────────────────────────

export interface ValidationRunResponse {
  status: string;
  message: string;
  data: {
    summary: Record<string, unknown>;
    issues: Array<{
      severity: ValidationSeverity;
      code: string;
      row: number | null;
      column: string | null;
      message: string;
      raw_value: string | null;
      help_text: string;
    }>;
  };
}

export interface StartImportResponse {
  status: string;
  message: string;
  data: {
    batch_id?: string;
    job_id?: string;
    job_status: JobStatus;
  };
}

export interface CancelImportResponse {
  status: string;
  message: string;
  data: {
    batch_id: string;
    status: "cancelled";
  };
}

export interface RollbackResponse {
  status: string;
  message: string;
  data: {
    rollback_id: string;
    reverted_rows_count: number;
  };
}

// ── Audit log (re-uses vs_audit shape) ───────────────────────────────────────

export interface ImportAuditLogItem {
  id: number;
  module_key: string;
  action_type: string;
  severity: string;
  status: string;
  actor_user: UserMini | null;
  actor_label: string;
  entity_type: string;
  entity_id: string;
  entity_label: string;
  summary: string;
  ip_address: string | null;
  event_at: string;
}

// Re-export for callers
export type { PaginatedResponse };
