/**
 * A colleague's staff profile as a line manager or another colleague reads it.
 *
 * The school decides how much of a profile each relationship sees (Settings,
 * Staff profiles), and the server sends only that: the contact card always,
 * and employment, personal details and the tabs only where the reader's
 * relationship to this person is given them. Nothing here is editable: a
 * restricted reader changes nothing on somebody else's record.
 */

import type { ReactNode } from "react";
import { Link } from "react-router";
import { BriefcaseBusiness, Contact, UserRound } from "lucide-react";
import { Panel as Surface } from "@/components/custom/surface";
import Tabs from "@/components/custom/tab";
import { routesPath } from "@/routes/routesPath";
import type { StaffRestrictedDetail } from "@/redux/services/staff/staff-types";
import { EmploymentBadge } from "../badges";
import { PersonAvatar } from "../../students/person-avatar";
import { formatDate } from "../../students/format";
import { tabsFor } from "./profile-sections";

type Row = { label: string; value: string | undefined | null };

function Panel({ title, icon: Icon, rows }: { title: string; icon: typeof Contact; rows: Row[] }) {
  const shown = rows.filter((row) => row.value != null && row.value !== "");
  if (!shown.length) return null;
  return (
    <Surface as="section" className="rounded-xl p-4 sm:p-5">
      <div className="mb-4 flex items-center gap-2">
        <Icon className="size-4.5 text-primary" />
        <h3 className="text-sm font-semibold text-black-01">{title}</h3>
      </div>
      <dl className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
        {shown.map((row) => (
          <div key={row.label} className="min-w-0">
            <dt className="text-xs text-gray-05">{row.label}</dt>
            <dd className="mt-1 min-w-0 break-words text-sm text-black-01">{row.value}</dd>
          </div>
        ))}
      </dl>
    </Surface>
  );
}

const titleCase = (value?: string | null) =>
  value ? value.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : undefined;

export function RestrictedStaffProfile({
  person,
  tab,
  canSeeChart,
  renderTab,
}: {
  person: StaffRestrictedDetail;
  tab: string;
  canSeeChart: boolean;
  /** Draws one of the profile's tabs, the same as the full profile does. */
  renderTab: (tab: string) => ReactNode;
}) {
  const sections = person.visible_sections;
  const has = (section: StaffRestrictedDetail["visible_sections"][number]) =>
    sections.includes(section);
  const tabs = tabsFor(sections);
  const post = person.organogram;
  const branch = person.posted_school_wide ? "School-wide" : person.branch_name;

  return (
    <>
      <Surface as="section" className="overflow-hidden rounded-xl px-4 py-5 sm:px-6">
        <div className="flex flex-wrap items-start gap-4.5">
          <PersonAvatar
            name={person.full_name}
            photoUrl={person.photo_url ?? undefined}
            className="size-16"
            textClassName="text-lg"
          />
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-semibold tracking-[-0.02em] text-black-01">
              {person.full_name}
            </h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[13px] text-gray-01">
              {person.job_title && <span>{person.job_title}</span>}
              {branch && <span className="text-gray-05">{branch}</span>}
            </div>
            {post && (
              <p className="mt-1.5 text-[13px] text-gray-01">
                {post.is_acting ? "Acting " : ""}
                {post.position.title}
                {post.line_manager && (
                  <>
                    <span className="text-gray-05"> · reports to </span>
                    {post.line_manager.full_name}
                  </>
                )}
                {canSeeChart && (
                  <>
                    {" "}
                    <Link to={routesPath.PROTECTED.STAFF.ORGANOGRAM} className="font-medium text-primary hover:underline">
                      View on organogram
                    </Link>
                  </>
                )}
              </p>
            )}
            {person.display_employment_status && person.display_employment_status_label && (
              <div className="mt-3">
                <EmploymentBadge
                  status={person.display_employment_status}
                  label={person.display_employment_status_label}
                />
              </div>
            )}
          </div>
        </div>
      </Surface>

      {tabs.length > 1 && (
        <div className="max-w-full overflow-x-auto">
          <Tabs tabKey="tab" tabs={tabs} />
        </div>
      )}

      {tab === "overview" || !tabs.some((t) => t.value === tab) ? (
        <div className="grid min-w-0 gap-4">
          <Panel
            title="Contact"
            icon={Contact}
            rows={[
              { label: "Email", value: person.email },
              { label: "Phone", value: person.phone },
              { label: "Post", value: post?.position.title },
              { label: "Branch", value: branch },
            ]}
          />
          {has("employment") && (
            <Panel
              title="Employment"
              icon={BriefcaseBusiness}
              rows={[
                { label: "Staff ID", value: person.staff_number },
                { label: "Job title", value: person.job_title },
                { label: "Employment type", value: titleCase(person.employment_type) },
                { label: "Hire date", value: person.hire_date ? formatDate(person.hire_date) : undefined },
              ]}
            />
          )}
          {has("personal") && (
            <Panel
              title="Personal"
              icon={UserRound}
              rows={[
                { label: "Middle name", value: person.middle_name },
                { label: "Gender", value: titleCase(person.gender) },
                { label: "Date of birth", value: person.date_of_birth ? formatDate(person.date_of_birth) : undefined },
              ]}
            />
          )}
        </div>
      ) : (
        <Surface as="section" className="rounded-xl px-4 py-5 sm:px-6">
          {renderTab(tab)}
        </Surface>
      )}
    </>
  );
}
