import { KeyRound, UsersRound } from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { INFORMATION_CARD_SURFACE } from "@/components/ui/card-surface";
import { OutlinedNotice } from "@/pages/protected/onboarding/components/outlined-notice";
import { selectImpersonation, selectUser } from "@/redux/features/auth/auth-slice";
import { useAppSelector } from "@/redux/store";
import { cn } from "@/lib/utils";
import { formatRelativeDate } from "@/utils/helpers";
import { ChangePasswordForm } from "./change-password-form";

/**
 * `/account/security`: the signed-in person's own sign-in account.
 *
 * It is its own page rather than a section of `/staff/me` for two reasons.
 * `/staff/me` only redirects to `/staff/:id`, the staff profile an
 * administrator with the directory key also opens for anybody, so a password
 * box there would sit on other people's records too. And a password belongs to
 * the account, not to a staff record: a school owner who signs in but is not
 * on the staff list has an account and no record.
 *
 * While proxying, the session acts as the person being proxied, so a change
 * here would change their password, not the actor's. The form is withheld and
 * the page says how to reach the actor's own.
 */
export default function AccountSecurity() {
  const user = useAppSelector(selectUser);
  const impersonation = useAppSelector(selectImpersonation);

  return (
    <PageShell className="max-w-3xl space-y-4">
      <PageHeader
        title="Account security"
        description={
          user?.email
            ? `You sign in as ${user.email}.`
            : "The password you sign in with."
        }
      />

      {impersonation ? (
        <OutlinedNotice
          icon={UsersRound}
          title="Exit proxy to change your password"
          body={`You are proxying as ${impersonation.target.full_name}, and only they can change their password. Exit proxy from the account menu, then come back here to change yours.`}
        />
      ) : (
        <section
          aria-labelledby="password-heading"
          className={cn(INFORMATION_CARD_SURFACE, "rounded-md p-4 sm:p-5 space-y-4")}
        >
          <div className="flex items-start gap-3">
            <KeyRound className="mt-0.5 size-5 shrink-0 text-primary" />
            <div className="min-w-0">
              <h2 id="password-heading" className="text-sm font-semibold text-black-01">
                Password
              </h2>
              <p className="mt-0.5 text-xs text-gray-01">
                {user?.password_changed_at
                  ? `Last changed: ${formatRelativeDate(user.password_changed_at)}. `
                  : ""}
                Choose one you do not use anywhere else.
              </p>
            </div>
          </div>
          <ChangePasswordForm />
        </section>
      )}
    </PageShell>
  );
}
