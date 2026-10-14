import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { CheckCircle2, Clock, XCircle } from "lucide-react";

import SignInMark from "@/components/auth/sign-in-mark";
import { useBrandFavicon } from "@/hooks/use-brand-favicon";
import { formatDateTime } from "@/lib/dates";
import { activeDisplayPrefs } from "@/lib/school-display";
import { useCollectionStatusQuery } from "@/redux/services/pay/pay-api";
import { currentSchoolSlug } from "@/utils/school-host";
import { schoolLogoUrl } from "@/utils/school-brand";

/** How often the page asks while the payment is still pending. */
const POLL_EVERY_MS = 3_000;

/** How long the page keeps asking before it settles for a promise by email. */
const GIVE_UP_AFTER_MS = 3 * 60_000;

/**
 * Where the payment provider returns a payer once they are done.
 *
 * It shows what the server says about the payment, never what the redirect
 * implies. Landing here only means the provider finished with the payer's
 * browser; it is not proof that money moved, and the browser is the one
 * participant in a payment that can be closed, refreshed or navigated away at
 * any moment. Telling somebody "payment successful" on the strength of a
 * redirect is how a failed card ends up believed.
 *
 * So the page asks the public status route, with the reference as the only
 * credential, and words the answer:
 *
 * - confirmed: the amount, who was paid and when;
 * - failed or abandoned: plainly, and for a failure that the payer was not
 *   charged;
 * - pending: the neutral thank-you, asked again every few seconds until the
 *   webhook or the server's own check settles it. After three minutes it stops
 *   asking and promises the receipt by email, which is true whatever happens;
 * - unknown reference or none at all: the same neutral thank-you, which claims
 *   nothing.
 *
 * The receipt itself is booked when the provider's webhook confirms the
 * collection, which may arrive before this page renders or a minute after it.
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

  const [gaveUp, setGaveUp] = useState(false);
  useEffect(() => {
    if (!reference) return;
    const timer = setTimeout(() => setGaveUp(true), GIVE_UP_AFTER_MS);
    return () => clearTimeout(timer);
  }, [reference]);

  const [settled, setSettled] = useState(false);
  const { data, error } = useCollectionStatusQuery(reference, {
    skip: !reference,
    // Stopped by a final answer, a reference the server does not know, or the
    // three-minute limit. A transient failure keeps asking: the next answer
    // may be the one that matters.
    pollingInterval: settled || gaveUp ? 0 : POLL_EVERY_MS,
    refetchOnMountOrArgChange: true,
  });

  const result = data?.data;
  const unknown = (error as { status?: number } | undefined)?.status === 404;
  const final = !!result && result.status !== "PENDING";
  // Latched during render, so one answer is enough to stop the polling for good.
  if ((final || unknown) && !settled) setSettled(true);

  let tone: "neutral" | "good" | "bad" | "wait" = "neutral";
  let title = "Thank you";
  let body: React.ReactNode = (
    <>
      We are confirming your payment with the payment provider. Your receipt
      will be emailed to you as soon as it clears. You can close this page.
    </>
  );

  if (result?.status === "CONFIRMED") {
    tone = "good";
    title = "Payment confirmed";
    body = (
      <>
        <span className="block text-base font-medium text-foreground">
          {result.amount_naira}
        </span>
        <span className="block">paid to {result.payee_name}</span>
        {result.paid_at ? (
          <span className="block">{formatDateTime(result.paid_at, activeDisplayPrefs())}</span>
        ) : null}
        <span className="mt-2 block">Your receipt will be emailed to you.</span>
      </>
    );
  } else if (result?.status === "FAILED") {
    tone = "bad";
    title = "Payment not completed";
    body = <>This payment did not go through. You have not been charged.</>;
  } else if (result?.status === "ABANDONED") {
    tone = "bad";
    title = "Payment not completed";
    body = <>This payment was not completed.</>;
  } else if (gaveUp && !unknown && reference) {
    tone = "wait";
    body = <>Still confirming: your receipt will be emailed when it clears.</>;
  }

  const Icon = tone === "good" ? CheckCircle2 : tone === "bad" ? XCircle : tone === "wait" ? Clock : CheckCircle2;
  const iconColour =
    tone === "good" ? "text-green-600" : tone === "bad" ? "text-destructive" : "text-muted-foreground";

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-10">
      <div className="w-full max-w-md rounded-xl border bg-background p-6 text-center shadow-sm sm:p-8">
        <SignInMark size={36} className="mb-4" />
        <Icon className={`mx-auto size-10 ${iconColour}`} />
        <h1 className="mt-4 text-lg font-semibold">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground" role="status" aria-live="polite">
          {body}
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
