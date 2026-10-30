import { useEffect, useRef, useState } from "react";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { QRCodeSVG } from "qrcode.react";
import { Check, Copy, Download, KeyRound, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { CustomInput } from "@/components/custom/custom-input";
import { useAppDispatch } from "@/redux/store";
import {
  adoptSignIn,
  useTwoStepConfirmMutation,
  useTwoStepSetUpMutation,
  useTwoStepVerifyMutation,
} from "@/redux/services/auth/auth-api";
import type {
  LoginResponse,
  TwoStepChallenge,
  TwoStepSetUpResponse,
} from "@/redux/services/auth/auth-types";
import { humanizeAuthError } from "@/utils/auth-errors";

/** The code of an RTK error, for the one refusal that ends the second step. */
function codeOf(error: unknown): string {
  return String((error as { data?: { error?: { code?: unknown } } })?.data?.error?.code ?? "");
}

type StepProps = {
  challenge: TwoStepChallenge;
  /** The sign-in is finished and adopted: route as after a password. */
  onSignedIn: (response: LoginResponse) => void;
  /** Back to the password, with a sentence to show there, if any. */
  onStartAgain: (message?: string) => void;
};

/**
 * The second step of a sign-in, for administrators and finance staff.
 *
 * The password was right, and the server answered with a challenge instead
 * of a session: nothing is signed in, and a reload of this page starts again
 * at the password. The challenge lives in this component's state only.
 *
 * Somebody who has never set up an authenticator scans a QR code, types back
 * the first code, and saves ten backup codes before the app opens. Everyone
 * else types the code the app shows, or one backup code.
 */
export function TwoStepStep(props: StepProps) {
  return props.challenge.code === "TWO_STEP_SET_UP_REQUIRED" ? (
    <SetUp {...props} />
  ) : (
    <EnterCode {...props} />
  );
}

function Heading({ title, text }: { title: string; text: string }) {
  return (
    <div className="space-y-1.5 text-center">
      <div className="mx-auto mb-3 grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
        <ShieldCheck className="size-5" aria-hidden="true" />
      </div>
      <h4 className="text-2xl font-semibold text-black-01">{title}</h4>
      <p className="mx-auto max-w-84.5 font-mont text-sm font-medium text-gray-01">{text}</p>
    </div>
  );
}

function CodeBoxes({
  value,
  onChange,
  onComplete,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  onComplete: () => void;
  label: string;
}) {
  return (
    <div className="flex justify-center">
      <InputOTP
        maxLength={6}
        pattern={REGEXP_ONLY_DIGITS}
        inputMode="numeric"
        autoComplete="one-time-code"
        autoFocus
        aria-label={label}
        value={value}
        onChange={onChange}
        onComplete={onComplete}
      >
        <InputOTPGroup className="gap-2">
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <InputOTPSlot key={index} index={index} className="size-11 rounded-lg border bg-gray-03 text-lg" />
          ))}
        </InputOTPGroup>
      </InputOTP>
    </div>
  );
}

function ErrorLine({ message }: { message: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-center text-xs font-medium text-error-text">
      {message}
    </p>
  );
}

function EnterCode({ challenge, onSignedIn, onStartAgain }: StepProps) {
  const [verify, { isLoading }] = useTwoStepVerifyMutation();
  const [backup, setBackup] = useState(false);
  const [code, setCode] = useState("");
  const [backupCode, setBackupCode] = useState("");
  const [error, setError] = useState("");

  const submit = () => {
    if (isLoading) return;
    setError("");
    const body = backup
      ? { challenge: challenge.challenge, recovery_code: backupCode.trim() }
      : { challenge: challenge.challenge, code };
    verify(body)
      .unwrap()
      .then(onSignedIn)
      .catch((err) => {
        const message = humanizeAuthError(err, "That code could not be checked. Please try again.");
        if (codeOf(err) === "TWO_STEP_CHALLENGE_INVALID") return onStartAgain(message);
        setCode("");
        setError(message);
      });
  };

  const ready = backup ? backupCode.trim().length >= 10 : code.length === 6;

  return (
    <form
      className="w-full space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <Heading
        title={backup ? "Enter a backup code" : "Enter your code"}
        text={
          backup
            ? "Type one of the backup codes you saved when you set up two-step sign-in. Each one works once."
            : "Open your authenticator app and type the 6-digit code it shows for this school."
        }
      />

      {backup ? (
        <CustomInput
          id="backup-code"
          label="Backup code"
          autoComplete="one-time-code"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="For example 3f9a2-7c1e0"
          className="h-11 bg-gray-03 font-mono"
          value={backupCode}
          onChange={(event) => {
            setError("");
            setBackupCode(event.target.value);
          }}
        />
      ) : (
        <CodeBoxes
          label="6-digit code"
          value={code}
          onChange={(value) => {
            setError("");
            setCode(value);
          }}
          onComplete={submit}
        />
      )}

      <ErrorLine message={error} />

      <Button type="submit" className="h-11 w-full" disabled={!ready || isLoading} loading={isLoading}>
        Verify
      </Button>

      <div className="flex flex-col items-center gap-2 font-mont text-sm font-medium">
        <button
          type="button"
          className="text-primary"
          onClick={() => {
            setError("");
            setBackup((was) => !was);
          }}
        >
          {backup ? "Use the authenticator app instead" : "Lost your phone? Use a backup code"}
        </button>
        <button type="button" className="text-gray-01" onClick={() => onStartAgain()}>
          Sign in as someone else
        </button>
      </div>
    </form>
  );
}

/** The secret in fours, the way people copy it into an app by hand. */
function grouped(secret: string): string {
  return secret.replace(/(.{4})/g, "$1 ").trim();
}

function SetUp({ challenge, onSignedIn, onStartAgain }: StepProps) {
  const dispatch = useAppDispatch();
  const [start, started] = useTwoStepSetUpMutation();
  const [confirm, { isLoading: confirming }] = useTwoStepConfirmMutation();
  const [authenticator, setAuthenticator] = useState<TwoStepSetUpResponse["data"] | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [signedIn, setSignedIn] = useState<(LoginResponse & { data: { recovery_codes: string[] } }) | null>(null);
  const asked = useRef(false);

  useEffect(() => {
    // Once per challenge: asking again would replace the secret just scanned.
    if (asked.current) return;
    asked.current = true;
    start({ challenge: challenge.challenge })
      .unwrap()
      .then((response) => setAuthenticator(response.data))
      .catch((err) => onStartAgain(humanizeAuthError(err, "Two-step sign-in could not be started. Please try again.")));
  }, [challenge.challenge, onStartAgain, start]);

  const submit = () => {
    if (confirming || code.length !== 6) return;
    setError("");
    confirm({ challenge: challenge.challenge, code })
      .unwrap()
      .then(setSignedIn)
      .catch((err) => {
        const message = humanizeAuthError(err, "That code could not be checked. Please try again.");
        if (codeOf(err) === "TWO_STEP_CHALLENGE_INVALID") return onStartAgain(message);
        setCode("");
        setError(message);
      });
  };

  if (signedIn) {
    return (
      <BackupCodes
        codes={signedIn.data.recovery_codes}
        issuer={authenticator?.issuer ?? ""}
        onContinue={async () => {
          await adoptSignIn(signedIn, dispatch);
          onSignedIn(signedIn);
        }}
      />
    );
  }

  if (!authenticator) {
    return (
      <div className="w-full space-y-5">
        <Heading title="Set up two-step sign-in" text="Getting your code ready…" />
        {started.isLoading ? null : <ErrorLine message={error} />}
      </div>
    );
  }

  return (
    <form
      className="w-full space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <Heading
        title="Set up two-step sign-in"
        text="Your school asks administrators and finance staff for a code from an authenticator app after their password. Scan this with Google Authenticator, Microsoft Authenticator or any app like them."
      />

      <div className="flex flex-col items-center gap-3">
        <div className="rounded-xl border bg-white p-3">
          <QRCodeSVG value={authenticator.otpauth_uri} size={168} title="QR code for your authenticator app" />
        </div>
        <SecretKey secret={authenticator.secret} />
      </div>

      <div className="space-y-2">
        <p className="text-center font-mont text-sm font-medium text-black-01">
          Then type the 6-digit code the app shows
        </p>
        <CodeBoxes
          label="6-digit code from the app"
          value={code}
          onChange={(value) => {
            setError("");
            setCode(value);
          }}
          onComplete={submit}
        />
      </div>

      <ErrorLine message={error} />

      <Button type="submit" className="h-11 w-full" disabled={code.length !== 6 || confirming} loading={confirming}>
        Turn on two-step sign-in
      </Button>
      <button
        type="button"
        className="block w-full text-center font-mont text-sm font-medium text-gray-01"
        onClick={() => onStartAgain()}
      >
        Sign in as someone else
      </button>
    </form>
  );
}

function SecretKey({ secret }: { secret: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="w-full rounded-lg bg-gray-03 px-3 py-2 text-center">
      <p className="font-mont text-xs text-gray-01">Can&apos;t scan? Type this key into the app instead</p>
      <div className="mt-1 flex items-center justify-center gap-2">
        <code className="break-all font-mono text-sm font-semibold tracking-wide text-black-01">{grouped(secret)}</code>
        <button
          type="button"
          aria-label="Copy the key"
          className="shrink-0 text-gray-01 hover:text-black-01"
          onClick={() => {
            void navigator.clipboard?.writeText(secret).then(() => setCopied(true));
          }}
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
        </button>
      </div>
    </div>
  );
}

function BackupCodes({
  codes,
  issuer,
  onContinue,
}: {
  codes: string[];
  issuer: string;
  onContinue: () => Promise<void>;
}) {
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [opening, setOpening] = useState(false);
  const text = codes.join("\n");

  const download = () => {
    const heading = `Backup codes for two-step sign-in${issuer ? ` at ${issuer}` : ""}.\nEach code signs you in once.\n\n`;
    const url = URL.createObjectURL(new Blob([heading + text + "\n"], { type: "text/plain" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "backup-codes.txt";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full space-y-5">
      <Heading
        title="Save your backup codes"
        text="If you lose your phone, each of these signs you in once. Keep them somewhere safe, away from this device. You will not see them again."
      />
      <ul className="grid grid-cols-2 gap-2 rounded-xl border bg-gray-03 p-3" aria-label="Backup codes">
        {codes.map((code) => (
          <li key={code} className="text-center font-mono text-sm font-semibold tracking-wide text-black-01">
            {code}
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={() => {
            void navigator.clipboard?.writeText(text).then(() => setCopied(true));
          }}
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? "Copied" : "Copy"}
        </Button>
        <Button type="button" variant="outline" className="flex-1" onClick={download}>
          <Download className="size-4" />
          Download
        </Button>
      </div>
      <label className="flex items-center gap-2 font-mont text-sm font-medium text-black-01">
        <Checkbox checked={saved} onCheckedChange={(value) => setSaved(value === true)} />
        I have saved my backup codes
      </label>
      <Button
        type="button"
        className="h-11 w-full"
        disabled={!saved || opening}
        loading={opening}
        onClick={() => {
          setOpening(true);
          void onContinue().finally(() => setOpening(false));
        }}
      >
        <KeyRound className="size-4" />
        Continue
      </Button>
    </div>
  );
}
