import type { ElementType } from "react";
import {
  BellRing,
  BadgeCheck,
  Briefcase,
  CalendarRange,
  ClipboardList,
  GraduationCap,
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
  type ConsoleSettingsGroup,
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
import { AdmissionsSection } from "./sections/admissions-section";
import { PromotionSection } from "./sections/promotion-section";
import { AcademicsSection } from "./sections/academics-section";
import { MoreSection } from "./sections/more-section";
import { useSettingsDoors } from "./use-settings-doors";
import { NotificationsSection } from "./sections/notifications-section";
import { PayrollSection } from "./sections/payroll-section";
import { ProfileSection } from "./sections/profile-section";
import { SecuritySection } from "./sections/security-section";
import { StaffProfilesSection } from "./sections/staff-profiles-section";
import { StaffSection } from "./sections/staff-section";
import { StaffNumbersSection } from "./sections/staff-numbers-section";

const BASE = routesPath.PROTECTED.SETTINGS.INDEX;

/**
 * The rail's groups. Related sections sit under one heading, so the rail reads
 * as a handful of areas rather than a dozen peers; each section keeps its own
 * address, so links and guides into it are unaffected.
 */
const GROUPS: ConsoleSettingsGroup[] = [
  { key: "school", title: "Your school", icon: School },
  { key: "students", title: "Students", icon: GraduationCap },
  { key: "staff", title: "Staff", icon: Briefcase },
];

/** Every section, in rail order; a section's `group` places it under that heading. */
const SECTION_META: Record<
  SchoolSettingsSection,
  Omit<ConsoleSettingsSection, "key"> & { icon: ElementType }
> = {
  overview: { title: "Overview", description: "Everything in one place", icon: LayoutGrid },
  profile: { title: "School profile", description: "Crest, address and details", icon: School, group: "school" },
  security: { title: "Sign-in and security", description: "Lockouts and link lifetimes", icon: ShieldCheck, group: "school" },
  notifications: { title: "Notifications", description: "Which events send email", icon: BellRing, group: "school" },
  enrolment: { title: "Enrolment", description: "Ages, documents, classes", icon: UserPlus, group: "students" },
  admissions: { title: "Admissions", description: "Steps and offers", icon: ClipboardList, group: "students" },
  "admission-numbers": { title: "Admission numbers", description: "The rule for new numbers", icon: Hash, group: "students" },
  guardians: { title: "Guardians", description: "Contacts and siblings", icon: Users, group: "students" },
  promotion: { title: "Promotion", description: "Arms, holds and full classes", icon: GraduationCap, group: "students" },
  academics: { title: "Academic structure", description: "The school year and arms", icon: CalendarRange },
  staff: { title: "Staff rules", description: "Starting role, leave, hiring", icon: Briefcase, group: "staff" },
  "staff-ids": { title: "Staff IDs", description: "The rule for staff numbers", icon: BadgeCheck, group: "staff" },
  "staff-profiles": { title: "Staff profiles", description: "Who sees what of a colleague", icon: UserRoundCog, group: "staff" },
  payroll: { title: "Payroll", description: "One run or one per branch", icon: Landmark, group: "staff" },
  more: { title: "More settings", description: "Roles, approvals, finance", icon: ListChecks },
};

const PANELS: Record<Exclude<SchoolSettingsSection, "overview">, () => React.JSX.Element> = {
  profile: ProfileSection,
  security: SecuritySection,
  notifications: NotificationsSection,
  enrolment: EnrolmentSection,
  guardians: GuardiansSection,
  admissions: AdmissionsSection,
  promotion: PromotionSection,
  academics: AcademicsSection,
  "admission-numbers": AdmissionNumbersSection,
  payroll: PayrollSection,
  staff: StaffSection,
  "staff-ids": StaffNumbersSection,
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
      groups={GROUPS}
      fitScreen
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
      {overviewGroups(sections).map(({ title, keys }) => (
        <section key={title} className="space-y-2.5">
          <h3 className="font-mont text-xs font-semibold uppercase tracking-wide text-gray-05">{title}</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-3">
            {keys.map((key) => (
              <SettingsOverviewCard
                key={key}
                icon={SECTION_META[key].icon}
                title={SECTION_META[key].title}
                description={OVERVIEW_TEXT[key]}
                to={`${BASE}/${key}`}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

/** The overview's cards under the rail's group headings, ungrouped ones last. */
function overviewGroups(sections: SchoolSettingsSection[]) {
  const grouped = GROUPS.map((group) => ({
    title: group.title,
    keys: sections.filter((key) => SECTION_META[key].group === group.key),
  }));
  const rest = sections.filter((key) => !SECTION_META[key].group);
  return [...grouped, { title: "Everything else", keys: rest }].filter((g) => g.keys.length > 0);
}

const OVERVIEW_TEXT: Record<SchoolSettingsSection, string> = {
  overview: "",
  profile: "Your crest, address, website and motto, and the details XVS set up for you.",
  security: "How many wrong passwords lock an account, and how long reset links and invitations last.",
  notifications: "Which events also send an email to the people they concern.",
  enrolment: "How old a new pupil may be, which documents and details are required, and how full a class may get.",
  guardians: "How many guardians a child needs, whether their email is required, how siblings are recognised, and your own relationship words.",
  admissions: "Your school's own admission steps, how long an offer stays open, and the documents needed before an applicant is enrolled.",
  promotion: "Who moves up at the end of the year, whether a year group keeps its arms or is spread across classes, and what a full class does.",
  academics: "Whether your school says Term or Semester, the ones every new year starts with, and the arms offered for new classes.",
  "admission-numbers": "Whether every child needs an admission number, and what a valid one looks like.",
  payroll: "Whether the whole school is paid in one run, or each branch runs its own.",
  staff: "The role new staff start with, the documents kept on file, what staff change themselves, hire approval, and leave allowances.",
  "staff-ids": "Whether everybody on the staff needs a staff ID, and what a valid one looks like.",
  "staff-profiles": "How much of a colleague's profile their line managers and other colleagues see.",
  more: "Roles, field access, approval paths, and the Finance and Procurement settings.",
};
