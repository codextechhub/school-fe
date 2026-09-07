import {
  GraduationCap,
  School,
  ShieldCheck,
  Upload,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import type { TaskKey } from "@/redux/services/onboarding/onboarding-types";
import { P, type PermissionCode } from "@/permissions";
import { routesPath } from "@/routes/routesPath";

/**
 * The presentation half of a checklist step.
 *
 * The step itself - whether it exists for this school, what it is called and
 * whether it is required - comes from the server and is never decided here. What
 * lives here is only what the API has no field for: an icon, a sentence of
 * explanation, and where the work actually happens when it does not happen on
 * this screen.
 */
export interface TaskMeta {
  icon: LucideIcon;
  /** One line under the title, in the school's own terms. */
  description: string;
  /**
   * True when no backend can check this step, so it completes on the school's
   * word. Says so on the card rather than dressing it up as verified.
   */
  attested?: boolean;
  /**
   * Where this work is really done, for the steps whose surface is closed to a
   * school that has not gone live. This is not a nicety: the module a card
   * would link to answers 403 TENANT_NOT_LIVE until go-live, so a button would
   * be a promise the platform breaks.
   */
  closedNote?: string;
  /**
   * A screen in this app that actually does the step's work.
   *
   * Only set where the surface is genuinely open to a pending school. A route
   * here and a `closedNote` are mutually exclusive by construction: one says
   * "here is the form", the other says "there is no form yet".
   */
  route?: string;
  /** Label for the button that opens `route`. */
  openLabel?: string;
  /**
   * The key a reader needs before the link is worth offering.
   *
   * Without it the button is hidden rather than shown and refused: a branch
   * admin can read the school profile but a reader who cannot is better served
   * by no button than by a 403.
   */
  openPermission?: PermissionCode;
}

const CATALOG: Record<string, TaskMeta> = {
  DEFAULT_ROLES: {
    icon: ShieldCheck,
    description:
      "Baseline role templates, custom roles and the people who can operate the system.",
    route: routesPath.PROTECTED.ONBOARDING.ROLES,
    openLabel: "Review",
    // Only school_admin holds this. A branch admin holds NONE of the
    // school.roles.* keys, so for them the button is hidden rather than shown
    // and refused - the card still explains the step, which is all they can
    // act on anyway.
    openPermission: P.VIEW_ROLES,
  },
  SCHOOL_METADATA: {
    icon: School,
    description:
      "Official identity details used across every module: ownership, term structure and currency.",
    route: routesPath.PROTECTED.ONBOARDING.PROFILE,
    openLabel: "Open profile",
    openPermission: P.VIEW_SCHOOL_PROFILE,
  },
  ACADEMIC_STRUCTURE: {
    icon: GraduationCap,
    description:
      "Sessions, terms, departments, programmes, levels and classes for your school year.",
    // Still attested: no backend can judge whether a school's structure is
    // FINISHED, so the tick is the school's word. But the work itself is open -
    // every academics view declares `pending_tenant_surface`, deliberately,
    // because a school that cannot build its structure can never go live. The
    // card used to say the module opened at go-live; that was true before the
    // module existed and would now send a school looking for a door that is
    // already unlocked.
    attested: true,
    route: routesPath.PROTECTED.ACADEMIC_STRUCTURE.INDEX,
    openLabel: "Open structure",
    openPermission: P.BROWSE_STRUCTURE,
  },
  INITIAL_DATA: {
    icon: Upload,
    // Names no dataset at all, deliberately. What a school may upload is the
    // server's answer and it changes - branches were offered here until it
    // turned out a school cannot create one through the API either. A card
    // naming a dataset is a promise this file cannot keep.
    description:
      "Load your school's own records from a spreadsheet, as each dataset opens.",
    route: routesPath.PROTECTED.ONBOARDING.IMPORT,
    openLabel: "Open import",
    openPermission: P.VIEW_IMPORT_TEMPLATES,
  },
  STAFF_INVITATIONS: {
    icon: UsersRound,
    description:
      "Invite the admin staff who will operate the system. Teachers can follow after go-live.",
    route: routesPath.PROTECTED.ONBOARDING.STAFF,
    openLabel: "Open invitations",
    openPermission: P.BROWSE_ADMINISTRATORS,
  },
};

/**
 * Copy for a step, falling back to something honest for a key this build has
 * never heard of.
 *
 * The catalog is a server constant: a step added there ships before this file
 * knows about it, and the school must still see a usable card rather than an
 * empty one or a crash.
 */
export function taskMeta(key: TaskKey): TaskMeta {
  return (
    CATALOG[key] ?? {
      icon: School,
      description: "One of the steps CodeX needs before your school can go live.",
    }
  );
}
