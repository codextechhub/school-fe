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

import { P, type PermissionCode } from "@/permissions";
import { WHOLE_SCHOOL_KEYS } from "@xvs/finance/components/finance-ui/whole-school-access";
import type { ConsoleNavGroup } from "@/components/finance-ui/console-nav";
import type { ActionDef, ActionGate, ActionSchoolShape, ActionSection } from "./types";

export interface ConsoleSource {
  /** Already narrowed to what this app mounts. */
  nav: ConsoleNavGroup[];
  section: ActionSection;
  /** The console's own name, used to tell two "Dashboard"s apart. */
  name: string;
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
  "/finance/setup/periods": [
    "open period",
    "close period",
    "financial year",
    "reopen year",
    "force close",
    "archive year",
    "branch close",
  ],
  "/finance/setup/tax-codes": ["vat", "wht"],
  "/finance/setup/cost-centers": ["cost centres"],
  "/finance/receivables/customers": [
    "payers",
    "who owes us",
    "import opening balances",
    "arrears",
    "payer links",
  ],
  "/finance/receivables/invoices": ["bills", "school fees", "fee invoices", "ar invoices", "accounts receivable"],
  "/finance/receivables/receipts": ["record payment", "allocate payment", "money received"],
  "/finance/receivables/credit-notes": ["debit notes", "adjustments"],
  "/finance/receivables/refunds": ["write off", "write-offs"],
  "/finance/receivables/payment-plans": ["instalments", "installments", "pay in parts"],
  "/finance/receivables/concessions": ["discounts", "waivers", "scholarships", "bursaries"],
  "/finance/receivables/dunning": ["reminders", "chase unpaid fees", "overdue"],
  "/finance/receivables/fee-structures": ["fees", "tuition", "fee schedule"],
  "/finance/receivables/payer-payments": [
    "sponsor payment",
    "one payment for several children",
    "split a payment",
  ],
  "/finance/receivables/credit-transfers": [
    "move credit",
    "sibling credit",
    "transfer an overpayment",
  ],
  "/finance/receivables/deferred-income": [
    "unearned fees",
    "fees billed ahead",
    "release income",
  ],
  "/finance/receivables/provisions": ["bad debt allowance", "provision"],
  "/finance/receivables/deposits": ["caution deposit", "refundable deposit"],
  "/finance/banking": [
    "banks",
    "cash accounts",
    "split bank account by branch",
    "owner capital",
    "loan received",
    "transfer between accounts",
  ],
  "/finance/bank-reconciliation": ["reconcile", "bank statement"],
  "/finance/expenses/claims": ["reimbursements", "staff expenses"],
  "/finance/expenses/petty-cash": [
    "float",
    "cash box",
    "reduce float",
    "close petty cash",
    "bank petty cash",
  ],
  "/finance/payroll": ["salaries", "wages", "staff pay", "payslips"],
  "/finance/budgets/budgets": ["forecast", "planning"],
  "/finance/budgets/assets": ["depreciation", "equipment register"],
  "/finance/budgets/tax": ["remittance", "paye", "annual paye return", "branch share of tax"],
  "/finance/inter-branch/transfers": [
    "send money to a branch",
    "ask a branch for money",
    "move a pupil's balance",
    "inter-branch",
  ],
  "/finance/inter-branch/balances": ["who owes whom", "branch balances"],
  "/finance/inter-branch/held-receipts": [
    "money collected for another branch",
    "forward a receipt",
  ],
  "/finance/inter-branch/recharges": ["share a cost", "recharge"],
  "/finance/inter-branch/cost-rules": ["cost split rules"],
  "/finance/payments/settlement": ["book settlement", "paystack settlement"],
  "/finance/payments/held-settlements": ["settlements to branches"],
  "/finance/payments/transactions": ["money in and out", "money movements"],
  "/finance/payments/provider-activity": ["paystack log", "provider log", "payment attempts", "failed payment", "refused payment", "paystack activity"],
  "/finance/collections": ["gateway", "online payments", "card payments"],
  "/finance/collections/virtual-accounts": ["dedicated accounts", "transfer accounts"],
  "/finance/reports/trial-balance": ["tb"],
  "/finance/reports/income-statement": ["profit and loss", "p&l", "surplus"],
  "/finance/reports/balance-sheet": ["financial position"],
  "/finance/reports/statutory-pack": ["IFRS", "filing", "annual accounts"],
  "/finance/reports/seals": ["verify seals", "sealed figures"],
  "/finance/audit": ["who changed what", "finance history"],
  "/procurement": ["purchasing", "buying", "supply"],
  "/procurement/requisitions": ["purchase requests", "ask to buy"],
  "/procurement/purchase-orders": ["po", "pos", "orders"],
  "/procurement/goods-receipts": ["grn", "deliveries", "received goods", "return goods"],
  "/procurement/vendor-invoices": [
    "supplier bills",
    "what we owe",
    "supplier credit note",
    "void a bill",
    "opening supplier bills",
  ],
  "/procurement/vendor-payments": ["pay a supplier", "supplier payments"],
  "/procurement/approvals": ["awaiting me", "sign off", "authorise"],
  "/procurement/vendors/vendors": ["suppliers"],
  "/procurement/vendors/catalog": ["price list", "catalogue"],
  "/procurement/sourcing/rfqs": ["request for quote", "tender", "buy together", "shared rfq"],
  "/procurement/sourcing/quotations": ["quotes", "bids"],
  "/procurement/contracts": ["agreements"],
  "/procurement/inventory/items": [
    "stock",
    "store",
    "supplies",
    "transfer stock",
    "move stock between stores",
  ],
  "/procurement/inventory/movements": ["stock in", "stock out", "issues"],
  "/procurement/inventory/locations": ["stores", "warehouses"],
  "/procurement/analytics/ap-aging": ["ageing", "how old are our bills", "ap aging", "ap ageing", "accounts payable aging"],
  "/procurement/analytics/grir": ["goods received not invoiced", "gr/ir", "grir", "gr/ir control"],
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
 *     view action's gate is the read key. Offering "Raise an invoice" to
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
 * Screens the consoles serve that their sidebars do not list.
 *
 * Each settings section, the close workbench and the supplier credit notes list
 * opens at an address of its own, but the sidebar names only the page that
 * holds them ("Settings", "Vendor Invoices"). Derived from the nav alone, the
 * box could reach none of them: a bursar typing "provision bands" or "close the
 * month" was offered nothing, because no sidebar title contains those words.
 *
 * Typed out, because nothing published says these sections exist under these
 * names. Three things each entry fixes:
 *
 *   - the ID, written rather than built from the url: the credit notes list
 *     shares its path with Vendor Invoices, and the url would give both rows
 *     one id and so one popularity record.
 *   - the GATE, the key the section itself checks before it reads anything.
 *     Online payment settings takes both keys: the page opens on the finance
 *     settings key and its panel reads under the payments settings key, so
 *     either one alone lands on a page with nothing of the reader's on it.
 *   - `beside`, the sidebar screen whose heading the row files under. An entry
 *     whose `beside` screen this app does not offer, or whose own path the
 *     router does not mount, is dropped (see consoleSectionActions).
 */
export const CONSOLE_SECTION_VIEWS: {
  id: string;
  url: string;
  beside: string;
  label: string;
  aliases: string[];
  gate: ActionGate;
}[] = [
  // ── Finance ────────────────────────────────────────────────────────────────
  {
    id: "finance-settings-receivables",
    url: "/finance/settings/receivables",
    beside: "/finance/settings",
    label: "View receivables settings",
    aliases: [
      "credit on new bills",
      "concession limit",
      "provision bands",
      "deposit rules",
      "payer payment split",
    ],
    gate: { perm: P.FIN_VIEW_SETTINGS },
  },
  {
    id: "finance-settings-payroll",
    url: "/finance/settings/payroll",
    beside: "/finance/settings",
    // "finance" in the label: "View payroll settings" is the school's own
    // payroll settings page, a different screen.
    label: "View finance payroll settings",
    aliases: [
      "paye method",
      "pension rates",
      "earlier pay required",
      "voluntary deductions",
    ],
    gate: { perm: P.FIN_VIEW_SETTINGS },
  },
  {
    id: "finance-settings-fiscal-calendar",
    url: "/finance/settings/fiscal-calendar",
    beside: "/finance/settings",
    label: "View record keeping",
    aliases: ["retention", "archive age", "how the next year opens"],
    gate: { perm: P.FIN_VIEW_SETTINGS },
  },
  {
    id: "finance-settings-banking-cash",
    url: "/finance/settings/banking-cash",
    beside: "/finance/settings",
    label: "View online payment settings",
    aliases: ["custody", "held or direct", "collection accounts", "subaccount"],
    gate: { all: [P.FIN_VIEW_SETTINGS, P.PAY_VIEW_PAYMENT_SETTINGS] },
  },
  {
    id: "finance-reports-periods",
    url: "/finance/reports/periods",
    beside: "/finance/reports/seals",
    label: "View periods and close",
    aliases: ["month end", "close the month"],
    gate: { perm: P.FIN_VIEW_PERIODS },
  },

  // ── Procurement ────────────────────────────────────────────────────────────
  {
    id: "procurement-vendor-credit-notes",
    url: "/procurement/vendor-invoices?view=credit-notes",
    beside: "/procurement/vendor-invoices",
    label: "View supplier credit notes",
    aliases: ["vendor credit note"],
    // The key the Vendor Invoices screen checks before it opens this list.
    gate: { perm: P.PROC_VIEW_VENDOR_CREDIT_NOTES },
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
  permissions?: PermissionCode[];
  multiBranch?: boolean;
  heldCustody?: boolean;
  wholeSchool?: boolean;
  group: string;
  source: ConsoleSource;
}

/**
 * The `schoolShape` field for an action opening this item: the school shape
 * its nav entry needs, so the palette can ask the sidebar's own question of it
 * (see fitsSchoolShape in gate.ts). Nothing when the entry needs nothing.
 */
function shapeField(item: FlatItem, wholeSchool = false): Pick<ActionDef, "schoolShape"> {
  const needsWholeSchool = item.wholeSchool || wholeSchool;
  if (!item.multiBranch && !item.heldCustody && !needsWholeSchool) return {};
  const shape: ActionSchoolShape = {
    ...(item.multiBranch ? { multiBranch: true } : {}),
    ...(item.heldCustody ? { heldCustody: true } : {}),
    ...(needsWholeSchool ? { wholeSchool: true } : {}),
  };
  return { schoolShape: shape };
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
          permissions: item.permissions,
          multiBranch: item.multiBranch,
          heldCustody: item.heldCustody,
          wholeSchool: item.wholeSchool,
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
      // The screen's own gate where it has one. A screen with none (the
      // dashboards, Approvals) is offered when the console is.
      gate: item.permissions?.length
        ? { any: item.permissions }
        : { console: item.source.nav },
      run: { to: item.url },
      ...shapeField(item),
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
        // A job on a screen the school's shape closes is closed with it.
        ...shapeField(item, needsWholeSchool(entry.gate)),
      } satisfies ActionDef,
    ];
  });
}

const WHOLE_SCHOOL_CODES: ReadonlySet<string> = new Set(WHOLE_SCHOOL_KEYS.map((key) => key.code));

/**
 * Whether a job's gate asks for a key the server keeps for whole-school reach
 * (`WHOLE_SCHOOL_KEYS` in @xvs/finance, the list its screens gate on).
 *
 * A single key, or a key every holder must have (`all`, `required`), carries
 * the need over; an `any` gate needs whole-school reach only when every one of
 * its keys does, since the others still open the job to a branch reader.
 */
export function needsWholeSchool(gate: ActionGate): boolean {
  if (gate === null) return false;
  const whole = (code: PermissionCode) => WHOLE_SCHOOL_CODES.has(code);
  if ("perm" in gate) return whole(gate.perm);
  if ("required" in gate) return gate.required.some(whole) || gate.any.every(whole);
  if ("all" in gate) return gate.all.some(whole);
  if ("any" in gate) return gate.any.length > 0 && gate.any.every(whole);
  return false;
}

/**
 * The view actions for CONSOLE_SECTION_VIEWS this app serves.
 *
 * `mounted` is the router's own list of console paths (FINANCE_MOUNTED_PATHS
 * and PROCUREMENT_MOUNTED_PATHS), because these screens are not in the nav and
 * so cannot be narrowed by it the way the view and create actions are. The
 * `beside` screen must still be in the nav: that is where the row takes its
 * section and heading from, and a section of a page this app does not offer is
 * not one to offer either.
 */
export function consoleSectionActions(
  sources: ConsoleSource[],
  mounted: ReadonlySet<string>,
): ActionDef[] {
  const byUrl = new Map(flatten(sources).map((item) => [item.url, item]));

  return CONSOLE_SECTION_VIEWS.flatMap((entry) => {
    const beside = byUrl.get(entry.beside);
    if (!beside || !mounted.has(entry.url.split("?")[0])) return [];
    return [
      {
        id: entry.id,
        label: entry.label,
        aliases: entry.aliases,
        section: beside.source.section,
        group: beside.group,
        kind: "view",
        gate: entry.gate,
        run: { to: entry.url },
      } satisfies ActionDef,
    ];
  });
}
