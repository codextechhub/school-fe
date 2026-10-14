/**
 * Shapes returned by the public invoice pay routes. Deliberately narrow: the
 * payer holds no account, so the backend sends only what somebody deciding
 * whether to pay actually needs. There is no customer email, phone or address
 * here, and there should never be.
 */

/** What the pay page shows before the payer commits to anything. */
export interface InvoicePaySummary {
  issuer_name: string;
  /**
   * True when CodeX itself is the one billing, rather than a school billing
   * its own customer. Decides whether the page heads with the XVS mark or with
   * the school's name; the issuer name cannot be matched on, because the
   * platform's display name is configurable.
   */
  issuer_is_platform: boolean;
  /**
   * The school's own crest, as an ABSOLUTE url on the API host. Empty when the
   * school has not uploaded one, and always empty for the platform issuer,
   * whose logo is a configured string rather than a file this system holds.
   *
   * Absolute because the app and the API are different origins: a school sits
   * at <slug>.xvs.codexng.com and the API at api.codexng.com, so a bare path
   * would be fetched from the app's own origin and find nothing.
   */
  logo_url: string;
  customer_name: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  currency: string;
  /** Display strings, already formatted by the backend at the display edge. */
  total: string;
  amount_due: string;
  /** Minor units. Present so the UI can test "is anything owed" without parsing. */
  amount_due_kobo: number;
  /** False for a settled, cancelled or unposted invoice. */
  payable: boolean;
  /** Why it cannot be paid, in words meant for the payer. Empty when payable. */
  message: string;
}

/** The hosted checkout the backend created for this click. */
export interface InvoiceCheckout {
  /** The provider's hosted payment page. The browser is sent here. */
  checkout_url: string;
  reference: string;
  amount: string;
  amount_kobo: number;
  currency: string;
  invoice_number: string;
}

/**
 * How a payer's collection went, as the public status route words it.
 *
 * PENDING covers every state short of an answer from the provider. The other
 * three are final: the page stops asking once it holds one.
 */
export type CollectionStatus = "PENDING" | "CONFIRMED" | "FAILED" | "ABANDONED";

/**
 * The little the backend tells a payer about their own payment. The reference
 * is the only credential, so nothing about the customer, pupil, invoice or
 * branch is in it, and there should never be.
 */
export interface PublicCollectionStatus {
  status: CollectionStatus;
  /** Kobo. */
  amount: number;
  /** The amount as the school prints it, symbol included. */
  amount_naira: string;
  currency: string;
  /** Whoever is being paid: the school, or the platform for its own invoice. */
  payee_name: string;
  /** ISO 8601 UTC instant the payment was booked, else null. */
  paid_at: string | null;
}
