// Types for the background-job queue (core.BackgroundJob, vs_user/views/jobs.py).
// Every async operation - imports, exports, emails, system/scheduled runs - is
// one row here; the View Queues page renders them. Mounted at /v1/user/me/tasks/.

export type JobStatus = "QUEUED" | "RUNNING" | "SUCCEEDED" | "FAILED" | "CANCELLED";

// `kind` is free-text server-side; these are the conventional categories.
export type JobKind = "import" | "export" | "email" | "system";

export interface BackgroundJob {
  id: number;
  kind: string;
  label: string;
  task_name: string;
  status: JobStatus;
  progress: number | null; // 0–100 when the task reports progress
  owner: number | null; // null = system/scheduled run
  owner_name: string | null;
  school: number | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  runtime_seconds: number | null; // null while running
  result: unknown; // task-specific JSON payload
  error: string;
}

export interface QueueSummary {
  by_status: Partial<Record<JobStatus, number>>;
  total: number;
  // Drives whether the My Queues / All Queues toggle renders at all.
  can_view_all: boolean;
}

// Filters shared by the list and the summary so the cards always match the
// visible table scope. All combinable; omit a key to skip the filter.
export interface QueueParams {
  scope?: "all"; // omit = mine; 403 if not permitted
  status?: JobStatus;
  kind?: string;
  since?: string; // YYYY-MM-DD
  page?: number;
  page_size?: number;
}

export interface QueuePagination {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
}

export interface QueueListResponse {
  message?: string;
  data: BackgroundJob[];
  pagination: QueuePagination;
}

export interface QueueSummaryResponse {
  message?: string;
  data: QueueSummary;
}
