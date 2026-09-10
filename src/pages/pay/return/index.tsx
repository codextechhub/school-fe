import { useState } from "react";
import { useSearchParams } from "react-router";
import { CheckCircle2 } from "lucide-react";

import SignInMark from "@/components/auth/sign-in-mark";
import { useBrandFavicon } from "@/hooks/use-brand-favicon";
import { currentSchoolSlug } from "@/utils/school-host";
import { schoolLogoUrl } from "@/utils/school-brand";

/**
 * Where the payment provider returns a payer once they are done.
 *
 * It deliberately does NOT say the payment succeeded. Landing here only means
 * the provider finished with the payer's browser; it is not proof that money
 * moved, and the browser is the one participant in a payment that can be closed,
 * refreshed or navigated away at any moment. The receipt is booked when the
 * provider's webhook confirms the collection, which may arrive before this page
 * renders or a minute after it. Telling somebody "payment successful" on the
 * strength of a redirect is how a failed card ends up believed.
 *
 * So it acknowledges, names the reference they can quote, and promises the
 * receipt by email - all three of which are true whatever the outcome.
 */
export default function PaymentReturn() {
  const [params] = useSearchParams();
  // The gateway returns the payer to the host they paid from, so the school is
  // in the address. It cannot come from the invoice here: all that survives the
  // round trip is a reference.
  const [slug] = useState(() => currentSchoolSlug());
  useBrandFavicon(schoolLogoUrl(slug));
  // Paystack sends both; other providers send one or the other.
  const reference = params.get("reference") || params.get("trxref") || "";

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-10">
      <div className="w-full max-w-md rounded-xl border bg-background p-6 text-center shadow-sm sm:p-8">
        <SignInMark size={36} className="mb-4" />
        <CheckCircle2 className="mx-auto size-10 text-muted-foreground" />
        <h1 className="mt-4 text-lg font-semibold">Thank you</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          We are confirming your payment with the payment provider. Your receipt
          will be emailed to you as soon as it clears. You can close this page.
        </p>
        {reference ? (
          <div className="mt-6 rounded-lg bg-muted/50 p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Payment reference
            </p>
            <p className="mt-1 font-mono text-sm break-all">{reference}</p>
          </div>
        ) : null}
        <p className="mt-4 text-xs text-muted-foreground">
          If anything looks wrong, reply to the invoice email and quote that
          reference.
        </p>
      </div>
    </div>
  );
}
