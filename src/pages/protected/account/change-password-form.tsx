import { useState, type FormEvent } from "react";
import { CircleCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CustomInput } from "@/components/custom/custom-input";
import {
  PasswordRules,
  passwordFieldErrors,
  type PasswordFieldErrors,
} from "@/components/auth/set-password";
import {
  useChangeMyPasswordMutation,
  useGetPasswordPolicyQuery,
} from "@/redux/services/auth/auth-api";
import { useLogout } from "@/hooks/use-logout";
import { parseApiError } from "@/utils/api-error";

export const MISMATCH_MESSAGE = "Passwords do not match.";

/**
 * What the server does on a successful change, said in plain words.
 *
 * `PasswordService.change` blacklists every refresh token the account holds,
 * this device's included, so no sign-in survives it. Each device keeps its
 * current access token, which lives for up to 15 minutes, and is then asked
 * to sign in again. Saying "other devices" alone would leave the reader
 * surprised when this one signs them out too.
 */
export const SIGNED_OUT_EVERYWHERE_MESSAGE =
  "Every device signed in to your account has been signed out, this one included. " +
  "Each will ask for your new password within 15 minutes. " +
  "Sign in again now so nothing you are doing here is cut off.";

const FALLBACK_REFUSAL = "Your password could not be changed. Try again.";

type Field = keyof PasswordFieldErrors;

/**
 * The signed-in person changes their own password, knowing the current one.
 *
 * Every refusal lands under the box it is about: a wrong current password
 * under Current password, a policy refusal under New password, a mismatch
 * under Confirm. The request is marked silent, so the base query raises no
 * toast and anything that names no box (offline, a closed account) shows in
 * the form itself. A mismatch is caught here before anything is sent, and
 * Save stays off until all three boxes are filled and the new two agree. The
 * policy is the server's own list; while it loads, or if it cannot be read,
 * the shared sentence states the same rules.
 */
export function ChangePasswordForm() {
  const [values, setValues] = useState({
    current_password: "",
    password: "",
    confirm_password: "",
  });
  const [errors, setErrors] = useState<PasswordFieldErrors>({});
  const [formError, setFormError] = useState("");
  const [changed, setChanged] = useState(false);

  const { data: policy } = useGetPasswordPolicyQuery();
  const [changePassword, { isLoading }] = useChangeMyPasswordMutation();
  const { handleLogout, isLoggingOut } = useLogout();

  const mismatch =
    values.confirm_password.length > 0 && values.confirm_password !== values.password;
  const canSave =
    values.current_password.length > 0 &&
    values.password.length > 0 &&
    values.confirm_password.length > 0 &&
    !mismatch &&
    !isLoading;

  const edit = (field: Field) => (value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    setFormError("");
    setChanged(false);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canSave) return;
    setErrors({});
    setFormError("");
    try {
      await changePassword(values).unwrap();
      setValues({ current_password: "", password: "", confirm_password: "" });
      setChanged(true);
    } catch (err) {
      const perField = passwordFieldErrors(err);
      if (Object.keys(perField).length > 0) setErrors(perField);
      else setFormError(parseApiError(err).message || FALLBACK_REFUSAL);
    }
  };

  const requirements = policy?.data?.requirements ?? [];

  return (
    <form noValidate onSubmit={submit} className="space-y-4">
      <CustomInput
        id="current_password"
        label="Current password"
        type="password"
        autoComplete="current-password"
        value={values.current_password}
        onChange={(e) => edit("current_password")(e.target.value)}
        error={errors.current_password}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="min-w-0 space-y-2">
          <CustomInput
            id="new_password"
            label="New password"
            type="password"
            autoComplete="new-password"
            value={values.password}
            onChange={(e) => edit("password")(e.target.value)}
            error={errors.password}
          />
          <CustomInput
            id="confirm_password"
            label="Confirm new password"
            type="password"
            autoComplete="new-password"
            value={values.confirm_password}
            onChange={(e) => edit("confirm_password")(e.target.value)}
            error={errors.confirm_password || (mismatch ? MISMATCH_MESSAGE : undefined)}
          />
        </div>

        <div
          aria-label="Password rules"
          className="min-w-0 rounded-md bg-gray-04 p-3 text-xs text-gray-01 font-mont"
        >
          <p className="mb-1.5 font-medium text-black-01">Your new password needs</p>
          {requirements.length > 0 ? (
            <ul className="list-disc space-y-1 pl-4">
              {requirements.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ul>
          ) : (
            <div className="mt-2">
              <PasswordRules />
            </div>
          )}
          <p className="mt-2">It must also differ from your current password.</p>
        </div>
      </div>

      {formError && (
        <p role="alert" className="text-xs font-medium text-error-text">
          {formError}
        </p>
      )}

      {changed && (
        <div
          role="status"
          className="flex items-start gap-2 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-900"
        >
          <CircleCheck className="mt-0.5 size-4 shrink-0" />
          <div className="min-w-0 space-y-2">
            <p>
              <strong>Password changed.</strong> {SIGNED_OUT_EVERYWHERE_MESSAGE}
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={isLoggingOut}
              onClick={handleLogout}
            >
              Sign in again now
            </Button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <p className="text-xs text-gray-01">
          Saving signs you out on every device, this one included.
        </p>
        <Button type="submit" size="sm" disabled={!canSave} className="shrink-0">
          {isLoading ? "Saving…" : "Save password"}
        </Button>
      </div>
    </form>
  );
}
