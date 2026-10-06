/**
 * The Export Centre, as a list screen uses it.
 *
 * Exporting "what this table is showing" is TWO calls, not one, and the split is
 * the point: `from-screen` translates the screen's own filters and reports what
 * it could not carry, and only then does `quick` run anything. A single call
 * would have to either refuse or guess, and guessing is how somebody asks for
 * one branch's classes and silently receives every branch's.
 */

export interface ExportConfig {
  dataset_key: string;
  columns: string[];
  filters: { id: string; value: unknown }[];
  sort: unknown[];
  format: string;
  values_mode: string;
}

export interface FromScreen {
  screen: { key: string; label: string; dataset: string };
  config: ExportConfig;
  supported_formats: string[];
  /**
   * Screen filters that could not be carried into the file.
   *
   * Not an error - it is the honest answer for a filter the dataset cannot
   * express, and each entry carries its own `reason`, WRITTEN BY THE SERVER for
   * this reader. The screen shows those sentences rather than composing its
   * own: only the module that owns the binding knows why a filter could not be
   * carried, and a second copy of that explanation here would drift from it.
   */
  unmapped?: { param: string; value?: unknown; reason: string }[];
  /** Screen filters that DID make it into the file. */
  carried?: string[];
  /**
   * Filters the export added that the screen did not ask for - in practice a
   * required date window. These make the file NARROWER, which is safe, but the
   * reader is still told.
   */
  added?: { id: string; label: string; reason: string }[];
  /**
   * The dates the file covers when the dataset needs a date range and the
   * screen sent none; null when the screen sent its own. `whole_list` false
   * means the file holds only the recent part of the list (the ledger's last
   * 31 days), which `sentence` says in the server's words.
   */
  date_window?: {
    id: string; label: string; start: string; end: string; whole_list: boolean; sentence: string;
  } | null;
  /** False when anything was dropped: the file will not match the table. */
  exact?: boolean;
  matching_rows?: number;
  estimated_bytes?: number;
}

export interface QuickExportResult {
  /** Present when the server ran it inline; otherwise it queued. */
  file?: { id: number; name?: string } | null;
  run?: { id: number; status: string } | null;
  status?: string;
}
