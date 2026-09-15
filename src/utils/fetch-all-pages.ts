/** One page as the paginated list endpoints return it. */
export interface PageEnvelope<T> {
  data: T[];
  pagination?: { currentPage: number; totalPages: number };
}

export type PageResult<T, E> = { data: PageEnvelope<T> } | { error: E };

/**
 * Every row of a paginated list, page by page, for a picker that must offer all
 * of them.
 *
 * Pages are requested in order until the pagination block reports the last page.
 * A response with no pagination block, or an empty page, also ends the walk, so
 * a malformed block cannot loop forever, and `maxPages` bounds it absolutely.
 * The first failing page ends the walk and its error is returned, so a caller
 * never shows a partial list as if it were complete.
 */
export async function fetchAllPages<T, E>(
  fetchPage: (page: number) => Promise<PageResult<T, E>>,
  maxPages = 100,
): Promise<{ data: T[] } | { error: E }> {
  const rows: T[] = [];
  for (let page = 1; page <= maxPages; page += 1) {
    const result = await fetchPage(page);
    if ("error" in result) return { error: result.error };
    const { data, pagination } = result.data;
    rows.push(...data);
    if (!pagination || data.length === 0 || pagination.currentPage >= pagination.totalPages) break;
  }
  return { data: rows };
}
