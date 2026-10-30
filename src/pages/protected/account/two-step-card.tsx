import { useState } from "react";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { Check, Copy, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { INFORMATION_CARD_SURFACE } from "@/components/ui/card-surface";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { cn } from "@/lib/utils";
import {
  useGetMyTwoStepQuery,
  useRenewMyBackupCodesMutation,
} from "@/redux/services/auth/auth-api";
import { humanizeAuthError } from "@/utils/auth-errors";

/**
 * The signed-in person's two-step sign-in, beside their password.
 *
 * It says whether it is on and how many backup codes are left, and makes ten
 * new ones for a code from the app, which replaces every old one. Setting up
 * happens at sign-in, the first time someone whose role needs it signs in;
 * a lost phone is reset by another administrator from the staff profile.
 */
export function TwoStepCard() {
  const query = useGetMyTwoStepQuery();
  const data = query.data?.data;
  if (!data || (!data.set_up && !data.required)) return null;

  return (
    <section
      aria-labelledby="two-step-heading"
      className={cn(INFORMATION_CARD_SURFACE, "space-y-4 rounded-md p-4 sm:p-5")}
    >
      <div className="flex items-start gap-3">
        <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" />
        <div className="min-w-0">
          <h2 id="two-step-heading" className="text-sm font-semibold text-black-01">
            Two-step sign-in
          </h2>
          <p className="mt-0.5 text-xs text-gray-01">
            {data.set_up
              ? `On. You type a code from your authenticator app after your password. ${backupLine(data.recovery_codes_left)}`
              : "Your role needs it. You will set up an authenticator app the next time you sign in."}
          </p>
        </div>
      </div>
      {data.set_up ? <RenewBackupCodes /> : null}
    </section>
  );
}

function backupLine(left: number): string {
  if (left === 0) return "You have no backup codes left; make new ones below.";
  return left === 1 ? "1 backup code left." : `${left} backup codes left.`;
}

function RenewBackupCodes() {
  const [renew, { isLoading }] = useRenewMyBackupCodesMutation();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [codes, setCodes] = useState<string[] | null>(null);
  const [copied, setCopied] = useState(false);

  if (codes) {
    return (
      <div className="space-y-3">
        <p className="text-xs text-gray-01">
          Your new backup codes. The old ones no longer work. Keep these somewhere safe; you will not see them again.
        </p>
        <ul className="grid grid-cols-2 gap-2 rounded-lg border bg-gray-03 p-3 sm:grid-cols-5" aria-label="New backup codes">
          {codes.map((item) => (
            <li key={item} className="text-center font-mono text-sm font-semibold text-black-01">{item}</li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void navigator.clipboard?.writeText(codes.join("\n")).then(() => setCopied(true))}
          >
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copied ? "Copied" : "Copy"}
          </Button>
          <Button size="sm" onClick={() => setCodes(null)}>I have saved them</Button>
        </div>
      </div>
    );
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        Make new backup codes
      </Button>
    );
  }

  const submit = () => {
    if (isLoading || code.length !== 6) return;
    setError("");
    renew({ code })
      .unwrap()
      .then((response) => {
        setCodes(response.data.recovery_codes);
        setOpen(false);
        setCode("");
      })
      .catch((failure) => {
        setCode("");
        setError(humanizeAuthError(failure, "New backup codes could not be made. Please try again."));
      });
  };

  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <p className="text-xs text-gray-01">Type the code your authenticator app shows now. Every old backup code stops working.</p>
      <InputOTP
        maxLength={6}
        pattern={REGEXP_ONLY_DIGITS}
        inputMode="numeric"
        autoComplete="one-time-code"
        autoFocus
        aria-label="6-digit code from your app"
        value={code}
        onChange={(value) => {
          setError("");
          setCode(value);
        }}
        onComplete={submit}
      >
        <InputOTPGroup className="gap-2">
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <InputOTPSlot key={index} index={index} className="size-10 rounded-lg border bg-gray-03" />
          ))}
        </InputOTPGroup>
      </InputOTP>
      {error ? <p role="alert" className="text-xs font-medium text-error-text">{error}</p> : null}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={code.length !== 6 || isLoading} loading={isLoading}>
          Make new codes
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)} disabled={isLoading}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
