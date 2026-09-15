import { describe, expect, it, vi } from "vitest";

import { fetchAllPages, type PageResult } from "./fetch-all-pages";

type Role = { key: string };

/** A fake list endpoint holding `total` roles, served `size` at a time. */
function rolesEndpoint(total: number, size: number) {
  const roles = Array.from({ length: total }, (_, index) => ({ key: `role-${index + 1}` }));
  const totalPages = Math.max(1, Math.ceil(total / size));
  return vi.fn(async (page: number): Promise<PageResult<Role, string>> => ({
    data: {
      data: roles.slice((page - 1) * size, page * size),
      pagination: { currentPage: page, totalPages },
    },
  }));
}

describe("fetchAllPages", () => {
  it("returns every role when they span more than one page", async () => {
    const fetchPage = rolesEndpoint(226, 100);

    const result = await fetchAllPages(fetchPage);

    expect(fetchPage.mock.calls.map(([page]) => page)).toEqual([1, 2, 3]);
    expect("data" in result && result.data).toHaveLength(226);
    expect("data" in result && result.data.at(-1)).toEqual({ key: "role-226" });
  });

  it("asks for one page when every role fits on it", async () => {
    const fetchPage = rolesEndpoint(26, 100);

    const result = await fetchAllPages(fetchPage);

    expect(fetchPage).toHaveBeenCalledTimes(1);
    expect("data" in result && result.data).toHaveLength(26);
  });

  it("stops at a response without a pagination block", async () => {
    const fetchPage = vi.fn(async (): Promise<PageResult<Role, string>> => ({ data: { data: [{ key: "only" }] } }));

    expect(await fetchAllPages(fetchPage)).toEqual({ data: [{ key: "only" }] });
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });

  it("stops at an empty page even when the block claims more", async () => {
    const fetchPage = vi.fn(async (page: number): Promise<PageResult<Role, string>> => ({
      data: { data: page === 1 ? [{ key: "a" }] : [], pagination: { currentPage: page, totalPages: 9 } },
    }));

    expect(await fetchAllPages(fetchPage)).toEqual({ data: [{ key: "a" }] });
    expect(fetchPage).toHaveBeenCalledTimes(2);
  });

  it("returns the first error and requests no later page", async () => {
    const fetchPage = vi.fn(async (page: number): Promise<PageResult<Role, string>> => (
      page === 2
        ? { error: "server error" }
        : { data: { data: [{ key: `p${page}` }], pagination: { currentPage: page, totalPages: 3 } } }
    ));

    expect(await fetchAllPages(fetchPage)).toEqual({ error: "server error" });
    expect(fetchPage).toHaveBeenCalledTimes(2);
  });

  it("never requests more than maxPages", async () => {
    const fetchPage = rolesEndpoint(1000, 1);

    const result = await fetchAllPages(fetchPage, 5);

    expect(fetchPage).toHaveBeenCalledTimes(5);
    expect("data" in result && result.data).toHaveLength(5);
  });
});
