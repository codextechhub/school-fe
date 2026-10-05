import { describe, expect, it } from "vitest";
import { schoolFinanceNav } from "@/components/layout/console-nav-for-school";
import { financeNav } from "@/pages/protected/finance/finance-nav";
import { FINANCE_MOUNTED_PATHS } from "@/routes/protected/finance-routes";
import { routesPath } from "@/routes/routesPath";

/**
 * The screens this app deliberately does not mount, so the sidebar deliberately
 * does not offer them: a school keeps one set of books, bills in naira, uses no
 * analytical tagging, and leaves the platform's own held-money checks and tax
 * tables to the operator console. Payouts and batches are mounted; the sidebar
 * offers them only where the platform holds the school's money.
 *
 * Written out in full, and asserted to be the WHOLE of what gets dropped. The
 * filter cannot tell "we chose not to mount this" from "the nav is pointing at
 * the wrong address", and the second one is silent: Receipts & Allocation
 * vanished from the sidebar for exactly that reason, while its screen sat
 * mounted at /finance/receivables/receipts the whole time.
 */
const INTENTIONALLY_UNMOUNTED = [
  "/finance/setup/entities",
  "/finance/setup/currencies",
  "/finance/setup/dimensions",
  "/finance/setup/tax-tables",
  "/finance/payments/held-reconciliations",
];

describe("the school's finance sidebar", () => {
  const urls = (g: typeof financeNav) => g.flatMap((x) => x.items).map((i) => i.url);

  it("drops what this app does not mount", () => {
    const shown = urls(schoolFinanceNav);
    for (const gone of ["/finance/setup/entities", "/finance/setup/currencies",
                        "/finance/setup/dimensions", "/finance/payments/held-reconciliations"]) {
      expect(shown, `${gone} should not be offered`).not.toContain(gone);
    }
  });

  it("keeps what it does mount", () => {
    const shown = urls(schoolFinanceNav);
    for (const kept of ["/finance", "/finance/setup/accounts",
                        "/finance/receivables/fee-structures", "/finance/payroll",
                        "/finance/payments/held-settlements", "/finance/payments/settlement"]) {
      expect(shown, `${kept} should be offered`).toContain(kept);
    }
  });

  it("actually narrows the package's nav", () => {
    expect(urls(schoolFinanceNav).length).toBeLessThan(urls(financeNav).length);
  });

  it("drops nothing beyond the screens this app chose not to mount", () => {
    const shown = new Set(urls(schoolFinanceNav));
    const dropped = urls(financeNav).filter((url) => !shown.has(url));
    expect(dropped.sort()).toEqual([...INTENTIONALLY_UNMOUNTED].sort());
  });

  it("offers the receipts screen the finance dashboard sends people to", () => {
    // Record payment on /finance is a primary button. It navigates to
    // RECEIPTS_ALLOCATION, so an address the router does not serve is a 404 on
    // the busiest action in the module.
    const receipts = routesPath.PROTECTED.FINANCE.RECEIPTS_ALLOCATION;
    expect(FINANCE_MOUNTED_PATHS.has(receipts)).toBe(true);
    expect(urls(schoolFinanceNav)).toContain(receipts);
    expect(routesPath.PROTECTED.FINANCE.RECORD_PAYMENT.split("?")[0]).toBe(receipts);
  });
});
