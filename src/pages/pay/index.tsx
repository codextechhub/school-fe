import { useState } from "react";
import { useParams } from "react-router";
import { LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  useInvoicePaySummaryQuery,
  useStartInvoiceCheckoutMutation,
} from "@/redux/services/pay/pay-api";
import { useBrandFavicon } from "@/hooks/use-brand-favicon";
import { formatDate } from "@/lib/dates";
import { activeDisplayPrefs } from "@/lib/school-display";

/**
 * Paying an invoice from the link in its email.
 *
 * The person on this page is a parent or a customer. They have no account here,
 * they did not sign in, and they will not: the signed token in the address is
 * the whole of their authority. So the page sits outside every layout the rest
 * of the app uses - no sidebar, no auth chrome, nothing that assumes a session.
 *
 * It shows what is owed before it sends anybody to a card form. That is the
 * point of the page existing at all rather than the email linking straight to
 * the provider: a parent who paid part of the bill by transfer last week should
 * see the smaller number and be able to check it is right before committing.
 * The number comes from the backend, read off the invoice when this page loads,
 * never from the link.
 */

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-10">
      <div className="w-full max-w-md rounded-xl border bg-background p-6 shadow-sm sm:p-8">
        {children}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-medium">{value}</span>
    </div>
  );
}

export default function PayInvoice() {
  const { token } = useParams<{ token: string }>();
  const {
    data,
    isLoading,
    isError,
  } = useInvoicePaySummaryQuery(token!, { skip: !token });
  const [startCheckout, { isLoading: starting }] = useStartInvoiceCheckoutMutation();
  // The issuer's own crest, taken from the invoice rather than the address: a
  // platform invoice is opened on pay.<host>, which names no school, so the
  // host cannot answer this one and the invoice can.
  useBrandFavicon(data?.data?.logo_url);
  const [error, setError] = useState("");

  // Held separately from `starting` so the button stays disabled through the
  // redirect. Without it the button re-enables the instant the request settles
  // and invites a second click while the browser is still navigating away.
  const [leaving, setLeaving] = useState(false);

  if (isLoading) {
    return (
      <Shell>
        <div className="flex items-center justify-center py-10">
          <LoaderCircle className="size-5 animate-spin text-muted-foreground" />
        </div>
      </Shell>
    );
  }

  // A forged, altered or withdrawn link, and a link for an invoice that no
  // longer exists, all land here and all say the same thing. Telling them apart
  // would answer questions about other people's invoices to anyone holding a
  // guess.
  if (isError || !data?.data) {
    return (
      <Shell>
        <h1 className="text-lg font-semibold">This payment link is not valid</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          It may have been mistyped, or replaced by a newer one. Please use the
          link in the most recent invoice you were sent, or reply to that email
          and ask for a new one.
        </p>
      </Shell>
    );
  }

  const invoice = data.data;

  const pay = () => {
    setError("");
    startCheckout(token!)
      .unwrap()
      .then((res) => {
        const url = res.data?.checkout_url;
        if (!url) {
          setError("We could not open the payment page. Please try again.");
          return;
        }
        setLeaving(true);
        // A full navigation, not a new tab: a popup blocker would swallow a new
        // tab opened this far from the click, and the payer would be left
        // looking at a page that appeared to do nothing.
        window.location.assign(url);
      })
      .catch((err) => {
        // The backend refuses a settled, cancelled or unposted invoice with a
        // sentence written for the payer, so prefer it to anything invented
        // here. It also means a bill settled between this page loading and the
        // button being pressed says so instead of charging twice.
        setError(
          err?.data?.message ||
            "We could not start the payment. Please try again in a moment.",
        );
      });
  };

  return (
    <Shell>
      {/* Who is billing, in the order the payer recognises.

          A school billing a parent leads with the school's own crest: that
          badge is why a parent believes the page and is willing to put a card
          into it. Its name in words is the fallback, because a school that has
          not uploaded a crest still has to be named - an unnamed page asking
          for ₦546,000 is one nobody should pay.

          CodeX billing a school is XVS itself, so that case heads with the
          transparent blue product mark instead. */}
      {invoice.issuer_is_platform ? (
        <img src="/svg/logo-blue.svg" alt="XVS" className="h-10 w-auto" />
      ) : invoice.logo_url ? (
        <img
          src={invoice.logo_url}
          alt={invoice.issuer_name}
          className="h-10 w-auto"
        />
      ) : (
        <p className="text-sm text-muted-foreground">{invoice.issuer_name}</p>
      )}
      <h1 className="mt-1 text-lg font-semibold">
        Invoice {invoice.invoice_number}
      </h1>

      <div className="mt-6 rounded-lg bg-muted/50 p-4 text-center">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {invoice.payable ? "Amount due" : "Balance"}
        </p>
        <p className="mt-1 text-3xl font-semibold">{invoice.amount_due}</p>
      </div>

      <div className="mt-4 divide-y">
        <Row label="Billed to" value={invoice.customer_name} />
        <Row label="Invoice total" value={invoice.total} />
        <Row label="Due" value={formatDate(invoice.due_date, activeDisplayPrefs())} />
      </div>

      {invoice.payable ? (
        <>
          <Button
            className="mt-6 w-full"
            onClick={pay}
            disabled={starting || leaving}
          >
            {starting || leaving ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              `Pay ${invoice.amount_due}`
            )}
          </Button>
          {error ? (
            <p className="mt-3 text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          {/* No list of accepted methods here. The provider's own page shows
              exactly what it will take, and a second list on this side is a
              promise we do not control and would have to keep in step. */}
          <p className="mt-4 text-center text-xs text-muted-foreground">
            You will be taken to our payment provider to finish.
          </p>
        </>
      ) : (
        // Not an error, and deliberately not styled as one: somebody who has
        // already paid should be reassured, not alarmed.
        <p className="mt-6 rounded-lg border bg-muted/30 p-4 text-sm">
          {invoice.message}
        </p>
      )}
    </Shell>
  );
}
