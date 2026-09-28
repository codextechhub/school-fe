import type { ElementType } from "react";
import {
  BellRing,
  Hash,
  LayoutGrid,
  Landmark,
  ListChecks,
  School,
  ShieldCheck,
  UserPlus,
  Users,
  UserRoundCog,
} from "lucide-react";
import {
  ConsoleSettingsLayout,
  SettingsOverviewCard,
  SettingsSectionHeader,
  type ConsoleSettingsSection,
} from "@/components/settings/settings-layout";
import PageAccessDenied from "@/components/custom/page-access-denied";
import { useCapabilities } from "@/hooks/use-capabilities";
import { usePermissions } from "@/hooks/use-permissions";
import { selectSchool } from "@/redux/features/auth/auth-slice";
import { useAppSelector } from "@/redux/store";
import { routesPath } from "@/routes/routesPath";
import {
  DEFAULT_SCHOOL_SETTINGS_SECTION,
  openSettingsSections,
  type SchoolSettingsSection,
} from "./sections";
import { AdmissionNumbersSection } from "./sections/admission-numbers-section";
import { EnrolmentSection } from "./sections/enrolment-section";
import { GuardiansSection } from "./sections/guardians-section";
import { MoreSection } from "./sections/more-section";
import { useSettingsDoors } from "./use-settings-doors";
import { NotificationsSection } from "./sections/notifications-section";
import { PayrollSection } from "./sections/payroll-section";
import { ProfileSection } from "./sections/profile-section";
import { SecuritySection } from "./sections/security-section";
import { StaffProfilesSection } from "./sections/staff-profiles-section";

const BASE = routesPath.PROTECTED.SETTINGS.INDEX;

const SECTION_META: Record<
  SchoolSettingsSection,
  Omit<ConsoleSettingsSection, "key"> & { icon: ElementType }
> = {
  overview: { title: "Overview", description: "Everything in one place", icon: LayoutGrid },
  profile: { title: "School profile", description: "Crest, address and details", icon: School },
  security: { title: "Sign-in and security", description: "Lockouts and link lifetimes", icon: ShieldCheck },
  notifications: { title: "Notifications", description: "Which events send email", icon: BellRing },
  enrolment: { title: "Enrolment", description: "Ages, documents, classes", icon: UserPlus },
  guardians: { title: "Guardians", description: "Contacts and siblings", icon: Users },
  "admission-numbers": { title: "Admission numbers", description: "The rule for new numbers", icon: Hash },
  payroll: { title: "Payroll", description: "One run or one per branch", icon: Landmark },
  "staff-profiles": { title: "Staff profiles", description: "Who sees what of a colleague", icon: UserRoundCog },
  more: { title: "More settings", description: "Roles, approvals, finance", icon: ListChecks },
};

const PANELS: Record<Exclude<SchoolSettingsSection, "overview">, () => React.JSX.Element> = {
  profile: ProfileSection,
  security: SecuritySection,
  notifications: NotificationsSection,
  enrolment: EnrolmentSection,
  guardians: GuardiansSection,
  "admission-numbers": AdmissionNumbersSection,
  payroll: PayrollSection,
  "staff-profiles": StaffProfilesSection,
  more: MoreSection,
};

/**
 * The school's Settings console.
 *
 * One address per section, and each section is offered only to a reader who
 * holds the key its endpoint checks (see `sections.ts`), and only when the
 * school's plan includes the module it configures. A section the reader may
 * not open falls back to the overview rather than refusing, because the
 * address is right and the page is simply not theirs.
 *
 * Platform settings (integrations, what a plan includes, the runtime values
 * XVS operates) are not here: they belong to XVS, and the server refuses
 * every school role the keys for them.
 */
export default function SchoolSettings({
  section = DEFAULT_SCHOOL_SETTINGS_SECTION,
}: {
  section?: SchoolSettingsSection;
}) {
  const { hasAnyPermission } = usePermissions();
  const { hasCapability } = useCapabilities();
  const doors = useSettingsDoors();
  const school = useAppSelector(selectSchool);

  const ownSections: SchoolSettingsSection[] = openSettingsSections({ hasAnyPermission, hasCapability });
  const visible = (Object.keys(SECTION_META) as SchoolSettingsSection[]).filter(
    (key) => key === "overview" || (key === "more" ? doors.length > 0 : ownSections.includes(key)),
  );

  if (ownSections.length === 0) {
    return <PageAccessDenied message="Your role does not carry access to any of your school's settings. Ask your school administrator if you need it." />;
  }

  const active = visible.includes(section) ? section : DEFAULT_SCHOOL_SETTINGS_SECTION;
  const Panel = active === "overview" ? null : PANELS[active];

  return (
    <ConsoleSettingsLayout
      title="Settings"
      description="How your school runs in XVS: its profile, sign-in rules, notifications, and the rules its records follow."
      basePath={BASE}
      activeSection={active}
      sections={visible.map((key) => ({ key, ...SECTION_META[key] }))}
      scopeLabel={school?.name ?? null}
    >
      {Panel ? <Panel /> : <Overview sections={visible.filter((key) => key !== "overview")} />}
    </ConsoleSettingsLayout>
  );
}

function Overview({ sections }: { sections: SchoolSettingsSection[] }) {
  return (
    <div className="space-y-5">
      <SettingsSectionHeader
        title="Overview"
        description="Pick an area to change. Only the areas your role can open are shown."
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-3">
        {sections.map((key) => (
          <SettingsOverviewCard
            key={key}
            icon={SECTION_META[key].icon}
            title={SECTION_META[key].title}
            description={OVERVIEW_TEXT[key]}
            to={`${BASE}/${key}`}
          />
        ))}
      </div>
    </div>
  );
}

const OVERVIEW_TEXT: Record<SchoolSettingsSection, string> = {
  overview: "",
  profile: "Your crest, address, website and motto, and the details XVS set up for you.",
  security: "How many wrong passwords lock an account, and how long reset links and invitations last.",
  notifications: "Which events also send an email to the people they concern.",
  enrolment: "How old a new pupil may be, which documents and details are required, and how full a class may get.",
  guardians: "How many guardians a child needs, whether their email is required, how siblings are recognised, and your own relationship words.",
  "admission-numbers": "Whether every child needs an admission number, and what a valid one looks like.",
  payroll: "Whether the whole school is paid in one run, or each branch runs its own.",
  "staff-profiles": "How much of a colleague's profile their line managers and other colleagues see.",
  more: "Roles, field access, approval paths, and the Finance and Procurement settings.",
};
