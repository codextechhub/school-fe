/**
 * Finance and Procurement palette actions, derived from their sidebars.
 *
 * ── Why derived rather than typed out ────────────────────────────────────────
 *
 * These two areas are fifty-odd screens, and none of them are this app's to
 * name: they ship inside @xvs/finance and move on a version bump. A typed copy
 * is a second list to keep in step with the first, and the drift is silent in
 * both directions. When the package renames "Customers / Payers" to "Payers"
 * and adds a Write-offs screen, a typed registry goes on offering a name that
 * no longer exists and never offers the one that does - and nobody finds out
 * until a bursar types "write off", gets nothing, and concludes the search box
 * does not know about finance.
 *
 * `schoolFinanceNav` / `schoolProcurementNav` are the right source rather than
 * the package's raw `financeNav` / `procurementNav`: they are already filtered
 * through the router's mounted paths (see console-nav-for-school.ts), so an
 * action cannot exist for a screen this app does not serve. That is the same
 * guarantee registry.test.ts checks by hand for the typed entries, except here
 * it holds by construction.
 *
 * ── What the nav does not carry ──────────────────────────────────────────────
 *
 * A nav item is read in place, under its group heading, by somebody who is
 * already looking at it. A palette row is read on its own, by somebody who
 * typed a guess and is deciding whether this is the thing they meant. So two
 * things are added on the way through:
 *
 *   - a verb in front of the title, because the matcher expands a leading verb
 *     through its synonym groups (VERB_GROUPS in match.ts). "View Payroll" is
 *     reached by "open payroll", "show payroll" and "list payroll"; a bare
 *     "Payroll" is reached by none of them.
 *   - aliases for the words a school types that the package's own title does
 *     not contain. Nobody at Corona Secondary types "goods receipt note" as
 *     "Goods Receipts", and half of them type "suppliers" for Vendors.
 */

import { P } from "@/permissions";
import type { ConsoleNavGroup } from "@/components/finance-ui/console-nav";
import type { ActionDef, ActionGate, ActionSection } from "./types";

export interface ConsoleSource {
  /** Already narrowed to what this app mounts. */
  nav: ConsoleNavGroup[];
  section: ActionSection;
  /** The console's own name, used to tell two "Dashboard"s apart. */
  name: string;
  /**
   * Backend key prefix gating the console as a whole, for the handful of items
   * that declare no prefixes of their own (the dashboards, and Approvals).
   *
   * `null` would be wrong for those: the sidebar only draws the door to an area
   * when the reader holds SOME key inside it (`hasModuleAccess("finance.")` in
   * app-sidebar.tsx), and a palette that ignored that would offer a finance
   * dashboard to a class teacher who holds not one finance key.
   */
  modulePrefix: string;
}

/**
 * Words a school types that the package's titles do not contain.
 *
 * Keyed by url, not by title. A title is the package's wording and can be
 * reworded upstream at any time; the url only changes when the screen actually
 * moves, which is the one case where an alias SHOULD be re-examined.
 *
 * These are match keys and are never rendered, which is why plain-English
 * guesses ("who we owe", "chase unpaid fees") belong here and not on screen.
 */
export const EXTRA_ALIASES: Record<string, string[]> = {
  "/finance": ["money", "bursary", "accounts"],
  "/finance/setup/accounts": ["coa", "ledger accounts", "account codes"],
  "/finance/ledger": ["journals", "postings", "double entry"],
  "/finance/setup/periods": ["open period", "close period", "financial year"],
  "/finance/setup/tax-codes": ["vat", "wht"],
  "/finance/setup/cost-centers": ["cost centres"],
  "/finance/receivables/customers": ["payers", "who owes us"],
  "/finance/receivables/invoices": ["bills", "school fees", "fee invoices"],
  "/finance/receivables/receipts": ["record payment", "allocate payment", "money received"],
  "/finance/receivables/credit-notes": ["debit notes", "adjustments"],
  "/finance/receivables/refunds": ["write off", "write-offs"],
  "/finance/receivables/payment-plans": ["instalments", "installments", "pay in parts"],
  "/finance/receivables/concessions": ["discounts", "waivers", "scholarships", "bursaries"],
  "/finance/receivables/dunning": ["reminders", "chase unpaid fees", "overdue"],
  "/finance/receivables/fee-structures": ["fees", "tuition", "fee schedule"],
  "/finance/banking": ["banks", "cash accounts"],
  "/finance/bank-reconciliation": ["reconcile", "bank statement"],
  "/finance/expenses/claims": ["reimbursements", "staff expenses"],
  "/finance/expenses/petty-cash": ["float", "cash box"],
  "/finance/payroll": ["salaries", "wages", "staff pay", "payslips"],
  "/finance/budgets/budgets": ["forecast", "planning"],
  "/finance/budgets/assets": ["depreciation", "equipment register"],
  "/finance/budgets/tax": ["remittance", "paye"],
  "/finance/collections": ["gateway", "online payments", "card payments"],
  "/finance/collections/virtual-accounts": ["dedicated accounts", "transfer accounts"],
  "/finance/reports/trial-balance": ["tb"],
  "/finance/reports/income-statement": ["profit and loss", "p&l", "surplus"],
  "/finance/reports/balance-sheet": ["financial position"],
  "/finance/audit": ["who changed what", "finance history"],
  "/procurement": ["purchasing", "buying", "supply"],
  "/procurement/requisitions": ["purchase requests", "ask to buy"],
  "/procurement/purchase-orders": ["po", "pos", "orders"],
  "/procurement/goods-receipts": ["grn", "deliveries", "received goods"],
  "/procurement/vendor-invoices": ["supplier bills", "what we owe"],
  "/procurement/vendor-payments": ["pay a supplier", "supplier payments"],
  "/procurement/approvals": ["awaiting me", "sign off", "authorise"],
  "/procurement/vendors/vendors": ["suppliers"],
  "/procurement/vendors/catalog": ["price list", "catalogue"],
  "/procurement/sourcing/rfqs": ["request for quote", "tender"],
  "/procurement/sourcing/quotations": ["quotes", "bids"],
  "/procurement/contracts": ["agreements"],
  "/procurement/inventory/items": ["stock", "store", "supplies"],
  "/procurement/inventory/movements": ["stock in", "stock out", "issues"],
  "/procurement/inventory/locations": ["stores", "warehouses"],
  "/procurement/analytics/ap-aging": ["ageing", "how old are our bills"],
  "/procurement/analytics/grir": ["goods received not invoiced"],
  "/procurement/analytics/spend": ["what we spend", "spend analysis"],
  "/procurement/analytics/performance": ["supplier performance", "vendor scorecard"],
};

/**
 * The jobs, as opposed to the screens: every console list that answers
 * `?action=new` by opening its create drawer.
 *
 * Typed out rather than derived, and the reason is that there is nothing to
 * derive from. The nav publishes screens; nothing published says which of them
 * can create, what the job is called in plain words, or which key permits it -
 * that lives in a `<Can>` wrapped round a button inside a lazy-loaded page.
 *
 * Three things could not be borrowed from the view action and so are written
 * here:
 *
 *   - the LABEL. "Add Receipts & Allocation" is not a thing anybody does;
 *     "Record a payment" is, and it is the phrase on the button.
 *   - the GATE. Reading invoices and raising one are different keys, and the
 *     view action's gate is the read prefix. Offering "Raise an invoice" to
 *     somebody who may only read them puts a form in front of a person the
 *     product decided should not have it. Each gate below is the same
 *     expression that wraps that screen's own Add button - including the two
 *     compound ones, payment plans (both keys) and refunds (any of three).
 *   - whether the screen can create AT ALL. Most can; Bank Reconciliation,
 *     Dunning and every report cannot.
 *
 * The codes are @xvs/finance's own, which this app's permission registry
 * spreads into `P` (see src/permissions/index.ts), so they resolve here exactly
 * as they do inside the package.
 */
export const CONSOLE_CREATE_ACTIONS: {
  url: string;
  label: string;
  aliases: string[];
  gate: ActionGate;
}[] = [
  // ── Finance ────────────────────────────────────────────────────────────────
  {
    url: "/finance/receivables/invoices",
    label: "Raise an invoice",
    aliases: ["bill a parent", "new invoice", "charge fees"],
    gate: { perm: P.FIN_CREATE_INVOICE },
  },
  {
    url: "/finance/receivables/receipts",
    label: "Record a payment",
    aliases: ["receipt a payment", "money came in", "allocate a receipt"],
    gate: { perm: P.FIN_RECORD_PAYMENT },
  },
  {
    url: "/finance/receivables/customers",
    label: "Add a payer",
    aliases: ["new customer", "add a parent to billing"],
    gate: { perm: P.FIN_CREATE_CUSTOMER },
  },
  {
    url: "/finance/receivables/credit-notes",
    label: "Issue a credit note",
    aliases: ["debit note", "credit a parent"],
    gate: { perm: P.FIN_CREATE_CREDIT_NOTE },
  },
  {
    url: "/finance/receivables/refunds",
    label: "Start a refund or write-off",
    // Any of three, exactly as the button's own condition reads.
    aliases: ["refund a parent", "write off a debt"],
    gate: {
      any: [P.FIN_CREATE_REFUND, P.FIN_CREATE_WRITE_OFF, P.FIN_WRITE_OFF_INVOICE],
    },
  },
  {
    url: "/finance/receivables/payment-plans",
    label: "Set up a payment plan",
    aliases: ["instalments", "let a parent pay in parts"],
    // Both keys: the button is `mode="all"`, because a plan nobody may activate
    // is a draft that cannot become anything.
    gate: { all: [P.FIN_CREATE_PAYMENT_PLAN, P.FIN_ACTIVATE_PAYMENT_PLAN] },
  },
  {
    url: "/finance/receivables/concessions",
    label: "Grant a concession",
    aliases: ["give a discount", "scholarship", "fee waiver"],
    gate: { perm: P.FIN_CREATE_CONCESSION },
  },
  {
    url: "/finance/ledger",
    label: "Post a journal entry",
    aliases: ["manual journal", "double entry", "new journal"],
    gate: { perm: P.FIN_POST_DIRECT_ENTRY },
  },
  {
    url: "/finance/setup/accounts",
    label: "Add a ledger account",
    aliases: ["new account code", "chart of accounts entry"],
    gate: { perm: P.FIN_CREATE_ACCOUNT },
  },
  {
    url: "/finance/setup/cost-centers",
    label: "Add a cost centre",
    aliases: ["new cost centre"],
    gate: { perm: P.FIN_CREATE_COST_CENTER },
  },
  {
    url: "/finance/setup/tax-codes",
    label: "Add a tax code",
    aliases: ["vat rate", "wht rate"],
    gate: { perm: P.FIN_CREATE_TAX_CODE },
  },
  {
    url: "/finance/banking",
    label: "Add a bank account",
    aliases: ["new bank account", "school account"],
    gate: { perm: P.FIN_CREATE_BANK_ACCOUNT },
  },
  {
    url: "/finance/expenses/claims",
    label: "Make an expense claim",
    aliases: ["reimbursement", "staff expense", "claim money back"],
    gate: { perm: P.FIN_CREATE_EXPENSE_CLAIM },
  },
  {
    url: "/finance/payroll",
    label: "Start a payroll run",
    aliases: ["pay staff", "run salaries", "new payroll"],
    gate: { perm: P.FIN_CREATE_PAYROLL },
  },
  {
    url: "/finance/budgets/budgets",
    label: "Create a budget",
    aliases: ["new budget", "plan spending"],
    gate: { perm: P.FIN_CREATE_BUDGET },
  },
  {
    url: "/finance/budgets/assets",
    label: "Add a fixed asset",
    aliases: ["new asset", "equipment register entry"],
    gate: { perm: P.FIN_CREATE_FIXED_ASSET },
  },
  {
    url: "/finance/collections",
    label: "Create a checkout",
    aliases: ["payment link", "collect online"],
    gate: { perm: P.PAY_CREATE_COLLECTION },
  },
  {
    url: "/finance/collections/virtual-accounts",
    label: "Create a virtual account",
    aliases: ["dedicated account", "transfer account"],
    gate: { perm: P.PAY_CREATE_VIRTUAL_ACCOUNT },
  },

  // ── Procurement ────────────────────────────────────────────────────────────
  {
    url: "/procurement/requisitions",
    label: "Raise a requisition",
    aliases: ["ask to buy something", "purchase request", "new requisition"],
    gate: { perm: P.PROC_CREATE_REQUISITION },
  },
  {
    url: "/procurement/purchase-orders",
    label: "Raise a purchase order",
    aliases: ["new po", "order from a supplier"],
    gate: { perm: P.PROC_CREATE_PURCHASE_ORDER },
  },
  {
    url: "/procurement/goods-receipts",
    label: "Record a delivery",
    aliases: ["goods received", "new grn", "book in a delivery"],
    gate: { perm: P.PROC_CREATE_GOODS_RECEIPT },
  },
  {
    url: "/procurement/vendor-invoices",
    label: "Record a supplier invoice",
    aliases: ["supplier bill", "new vendor invoice"],
    gate: { perm: P.PROC_CREATE_VENDOR_INVOICE },
  },
  {
    url: "/procurement/vendor-payments",
    label: "Pay a supplier",
    aliases: ["new vendor payment", "settle a supplier"],
    gate: { perm: P.PROC_CREATE_VENDOR_PAYMENT },
  },
  {
    url: "/procurement/vendors/vendors",
    label: "Add a supplier",
    aliases: ["new vendor", "register a supplier"],
    gate: { perm: P.PROC_CREATE_VENDOR },
  },
  {
    url: "/procurement/vendors/categories",
    label: "Add a supplier category",
    aliases: ["new vendor category"],
    gate: { perm: P.PROC_CREATE_CATEGORY },
  },
  {
    url: "/procurement/vendors/catalog",
    label: "Add a catalogue item",
    aliases: ["new price list entry"],
    gate: { perm: P.PROC_CREATE_CATALOG_ITEM },
  },
  {
    url: "/procurement/sourcing/rfqs",
    label: "Send an RFQ",
    aliases: ["request a quote", "go to tender", "new rfq"],
    gate: { perm: P.PROC_CREATE_RFQ },
  },
  {
    url: "/procurement/sourcing/quotations",
    label: "Record a quotation",
    aliases: ["supplier quote", "new bid"],
    gate: { perm: P.PROC_CREATE_QUOTATION },
  },
  {
    url: "/procurement/contracts",
    label: "Add a contract",
    aliases: ["new agreement", "supplier contract"],
    gate: { perm: P.PROC_CREATE_CONTRACT },
  },
  {
    url: "/procurement/inventory/items",
    label: "Add a stock item",
    aliases: ["new store item", "add supplies"],
    gate: { perm: P.PROC_CREATE_STOCK },
  },
  {
    url: "/procurement/inventory/locations",
    label: "Add a store location",
    aliases: ["new store", "new warehouse"],
    gate: { perm: P.PROC_CREATE_STOCK },
  },
  {
    url: "/procurement/analytics/performance",
    label: "Record a supplier assessment",
    aliases: ["score a supplier", "vendor scorecard entry"],
    gate: { perm: P.PROC_CREATE_VENDOR_ASSESSMENT },
  },
];

/**
 * A url as a palette id: "/finance/receivables/invoices" ->
 * "finance-receivables-invoices".
 *
 * Off the url rather than the title because an id is popularity storage's key
 * and must survive a rewording upstream - see the note on ActionDef.id. A
 * title changes when somebody prefers a different word; a url changes only when
 * the screen genuinely moves, and a moved screen has earned a fresh ranking.
 */
export const consoleActionId = (url: string): string =>
  url.split("?")[0].split("/").filter(Boolean).join("-");

interface FlatItem {
  title: string;
  url: string;
  prefixes?: string[];
  group: string;
  source: ConsoleSource;
}

function flatten(sources: ConsoleSource[]): FlatItem[] {
  const out: FlatItem[] = [];
  for (const source of sources) {
    for (const group of source.nav) {
      for (const item of group.items) {
        // A parent with children does not navigate - you click a child. Neither
        // console uses that shape today, but the type allows it and a palette
        // row that goes nowhere is worse than a missing one.
        if (item.children?.length) {
          for (const child of item.children) {
            out.push({ ...child, group: group.label ?? source.name, source });
          }
          continue;
        }
        out.push({
          title: item.title,
          url: item.url,
          prefixes: item.prefixes,
          group: group.label ?? source.name,
          source,
        });
      }
    }
  }
  return out;
}

/**
 * Build palette actions for every screen the given consoles offer.
 *
 * Both consoles are built in one call so a title that appears in both can be
 * told apart. Finance and Procurement each have a "Dashboard" and a "Settings",
 * and two rows reading "View Settings" are two rows nobody can choose between -
 * so those, and only those, are prefixed with the console's name.
 */
export function consoleActions(sources: ConsoleSource[]): ActionDef[] {
  const items = flatten(sources);

  const titleCounts = new Map<string, number>();
  for (const item of items) {
    const key = item.title.toLowerCase();
    titleCounts.set(key, (titleCounts.get(key) ?? 0) + 1);
  }

  return items.map((item) => {
    const ambiguous = (titleCounts.get(item.title.toLowerCase()) ?? 0) > 1;
    const name = ambiguous ? `${item.source.name} ${item.title}` : item.title;
    const label = `View ${name}`;
    const aliases = (EXTRA_ALIASES[item.url] ?? []).filter(
      (alias) => alias.toLowerCase() !== label.toLowerCase(),
    );

    return {
      id: consoleActionId(item.url),
      label,
      // A duplicated title is ambiguous in the label, so the bare title becomes
      // an alias: somebody typing "settings" still reaches both rows, and the
      // console name in each label is what tells them apart.
      aliases: ambiguous ? [item.title, ...aliases] : aliases,
      section: item.source.section,
      group: item.group,
      kind: "view",
      gate: {
        module: item.prefixes?.length ? item.prefixes : [item.source.modulePrefix],
      },
      run: { to: item.url },
    } satisfies ActionDef;
  });
}

/**
 * The create actions for whichever of those screens these consoles offer.
 *
 * Filtered through the same nav the view actions come from, so a job cannot be
 * offered for a screen this app does not mount - if Collections is unmounted
 * for a school, "Create a checkout" goes with it, without a second list saying
 * so. The section and group are taken from that screen's own nav entry, so a
 * create row files itself under the same heading as the screen it opens.
 */
export function consoleCreateActions(sources: ConsoleSource[]): ActionDef[] {
  const byUrl = new Map(flatten(sources).map((item) => [item.url, item]));

  return CONSOLE_CREATE_ACTIONS.flatMap((entry) => {
    const item = byUrl.get(entry.url);
    if (!item) return [];
    return [
      {
        id: `create-${consoleActionId(entry.url)}`,
        label: entry.label,
        aliases: entry.aliases,
        section: item.source.section,
        group: item.group,
        kind: "do",
        gate: entry.gate,
        // The screen answers this on arrival - see useActionParam in
        // @xvs/finance, which re-checks the same key rather than trusting the
        // address.
        run: { to: `${entry.url}?action=new` },
      } satisfies ActionDef,
    ];
  });
}
