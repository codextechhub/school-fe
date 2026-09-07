import type { VariantProps } from "class-variance-authority";
import { Info, Lock, MailWarning, ShieldOff } from "lucide-react";

import { Badge, badgeVariants } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type {
  AccountStatus,
  EmploymentStatus,
  StaffAccountFlag,
} from "@/redux/services/staff/staff-types";

type BadgeVariant = VariantProps<typeof badgeVariants>["variant"];

/**
 * The two status chips, and the rule that keeps them apart.
 *
 * Employment answers whether somebody still works here. The account answers
 * whether their login may be used. They are separate columns, set by separate
 * rules, and a school that reads one as the other believes its teacher was
 * disciplined for mistyping a password: Mrs. Okafor is locked out on Tuesday
 * morning, and she is employed, at work, and in front of JSS1 B at nine
 * o'clock.
 *
 * So there is no merged chip in this file and there must never be one. Where
 * both facts matter, the two chips sit side by side, and where they AGREE the
 * account one is silent - see `AccountFlagChip`.
 *
 * Both are keyed on the CODE and never on the label, so a wording change on the
 * server cannot drop a status into the fallback.
 */

/** Does this person still work here. LOCKED is deliberately not one of these. */
const EMPLOYMENT: Record<EmploymentStatus, BadgeVariant> = {
  INVITED: "amber",
  ACTIVE: "active",
  // Amber rather than red. Being on leave is a planned, reversible absence, and
  // drawing it like a suspension flattens a maternity leave into a discipline.
  ON_LEAVE: "amber",
  SUSPENDED: "rejected",
  // Grey, not red. Somebody who resigned left on their own terms, and the
  // school's record of them should not read like a punishment.
  RESIGNED: "inactive",
  TERMINATED: "rejected",
};

export function EmploymentBadge({
  status,
  label,
  note,
  className,
}: {
  status: EmploymentStatus;
  /** The server's wording. Falls back to the code so a new status still shows. */
  label?: string;
  /**
   * Why the badge says what it says, on hover.
   *
   * Only On Leave has one today, and only because it is the one status nobody
   * set: a reader seeing it wants to know until when, and the answer is
   * otherwise two clicks away on the Leave tab. Never the ONLY place a fact
   * lives - a tooltip is awkward to reach on a phone, so anything here is a
   * shortcut to something the record already shows.
   */
  note?: string;
  className?: string;
}) {
  const badge = (
    <Badge
      variant={EMPLOYMENT[status] ?? "inactive"}
      className={cn("rounded-full px-2 py-0.5 text-[11px]", className)}
    >
      {label || status}
    </Badge>
  );
  if (!note) return badge;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex">{badge}</span>
      </TooltipTrigger>
      <TooltipContent className="max-w-64">{note}</TooltipContent>
    </Tooltip>
  );
}

/** May this login be used. The identity layer's vocabulary, not this module's. */
const ACCOUNT: Record<AccountStatus, BadgeVariant> = {
  DRAFT: "inactive",
  PENDING_APPROVAL: "amber",
  PENDING: "amber",
  ACTIVE: "active",
  SUSPENDED: "rejected",
  LOCKED: "rejected",
  DEACTIVATED: "inactive",
  REJECTED: "rejected",
};

export function AccountBadge({
  status,
  label,
  className,
}: {
  status: AccountStatus;
  label?: string;
  className?: string;
}) {
  return (
    <Badge
      variant={ACCOUNT[status] ?? "inactive"}
      className={cn("rounded-full px-2 py-0.5 text-[11px]", className)}
    >
      {label || status}
    </Badge>
  );
}

const FLAG_ICON = {
  LOCKED: Lock,
  ACCOUNT_SUSPENDED: ShieldOff,
  NOT_ACTIVATED: MailWarning,
} as const;

/**
 * The chip that appears only where the account disagrees with the record.
 *
 * The server decides when there is something to say and sends `null` the rest
 * of the time, which is most of the time. That silence is the point: a column
 * showing Active twice on fifty rows buries the one row that needs reading.
 *
 * The server's own sentence is carried through verbatim in the tooltip rather
 * than reworded here. It is what stops a reader taking a lockout for discipline
 * ("Locked out after failed sign-in attempts. Their employment is
 * unaffected."), and a second wording of it on this side is a second thing that
 * can drift out of step with the rule it describes.
 */
export function AccountFlagChip({
  flag,
  className,
}: {
  flag: StaffAccountFlag | null;
  className?: string;
}) {
  if (!flag) return null;
  const Icon = FLAG_ICON[flag.code] ?? Info;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-medium text-error-text",
            className,
          )}
        >
          <Icon className="size-3" aria-hidden />
          {flag.label}
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-64">{flag.note}</TooltipContent>
    </Tooltip>
  );
}
