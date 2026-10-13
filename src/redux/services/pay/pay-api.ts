import { baseApi } from "../base-api";
import type { Envelope } from "../onboarding/onboarding-types";
import type { InvoiceCheckout, InvoicePaySummary, PublicCollectionStatus } from "./pay-types";

/**
 * Paying an invoice from the link in its email.
 *
 * Both routes are public: the payer is a parent or a customer with no account
 * here and never will have one, and the signed token in the path is the whole
 * of their authority. That is why these two names are registered in
 * ../api-endpoints as auth (never send a Bearer token) and tenant-exempt
 * (never append ?tenant=): a stale token from a staff session on the same
 * browser must not change what this page does, and there is no tenant context
 * to assert because nobody is signed in.
 *
 * The amount is NOT held here and is never sent. The backend reads the
 * invoice's outstanding balance at the moment of the call, which is the reason
 * the email carries a link to this page rather than a checkout URL minted when
 * the invoice was posted: a payment made in between has to count.
 */
export const payApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /** What is owed on this invoice right now, and whether it can be paid. */
    invoicePaySummary: builder.query<Envelope<InvoicePaySummary>, string>({
      query: (token) => `/finance/public/invoices/${encodeURIComponent(token)}/`,
      // The page renders its own states, including the refusals, so the global
      // error toast would be a second, worse telling of the same thing.
      extraOptions: { silent: true },
    }),

    /**
     * Create the hosted checkout and hand back its URL.
     *
     * A mutation rather than a query because it is not safe to repeat freely:
     * it writes a collection intent and calls the payment provider. The backend
     * hands back a checkout started in the last fifteen minutes for the same
     * balance rather than opening a second one, so an impatient second click
     * costs nothing, but that is its guarantee to make, not ours to assume.
     */
    startInvoiceCheckout: builder.mutation<Envelope<InvoiceCheckout>, string>({
      query: (token) => ({
        url: `/finance/public/invoices/${encodeURIComponent(token)}/checkout/`,
        method: "POST",
      }),
      extraOptions: { silent: true },
    }),

    /**
     * How the payer's payment went, asked by its reference alone.
     *
     * Public like the two above: the reference is the payer's whole authority,
     * so it carries no Bearer token and no ?tenant=, and the interceptor never
     * runs session recovery for it. Silent because the page words every outcome
     * itself, including a reference the server does not know (404).
     */
    collectionStatus: builder.query<Envelope<PublicCollectionStatus>, string>({
      query: (reference) =>
        `/payments/public/collections/${encodeURIComponent(reference)}/status/`,
      extraOptions: { silent: true },
    }),
  }),
});

export const {
  useInvoicePaySummaryQuery,
  useStartInvoiceCheckoutMutation,
  useCollectionStatusQuery,
} = payApi;
