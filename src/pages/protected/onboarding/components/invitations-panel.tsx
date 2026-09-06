import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Info, Mail, ShieldOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import CustomTable from "@/components/custom/custom-table";
import { CustomInput } from "@/components/custom/custom-input";
import { CustomNativeSelect } from "@/components/custom/custom-native-select";
import PermissionGate from "@/components/custom/permission-gate";
import { P } from "@/permissions";
import {
  useCreateStaffMutation,
  useGetStaffListQuery,
  useResendStaffInvitationMutation,
} from "@/redux/services/staff/staff-api";
import type { StaffListRow } from "@/redux/services/staff/staff-types";
import { apiErrorMessage, fieldErrors, parseApiError } from "@/utils/api-error";
import { OutlinedNotice } from "./outlined-notice";
import { humanDate } from "../onboarding-format";

/**
 * The Invitations half of "Confirm Default Roles & RBAC".
 *
 * The design draws one screen with two tabs, and the checklist opens it from
 * two different cards: "Confirm Default Roles & RBAC" lands on Roles, "Add
 * Staff & Invitations" lands here. So this is a panel rather than a page - the
 * page around it owns the header, the tab strip and the step it completes.
 */

const COLUMNS = ["Name", "Email", "Role", "Status", "Action"];

/** A blank form, and what "reset" means after a successful invitation. */
const EMPTY = { first_name: "", last_name: "", email: "", role: "" };

/**
 * The ACCOUNT's state, in the words a school uses.
 *
 * The account and not the employment record, because the question this panel
 * answers is whether an invitation has landed. `PENDING` is the only state it
 * creates, and it reads "Invited" rather than "Pending activation": from the
 * school's side the fact is that the invitation went out, not that the platform
 * is waiting.
 *
 * Total over its input, including an absent one. A chip is a label on a row and
 * must never be the reason a table fails to render: a status this function has
 * not heard of is a sentence a reader can act on, and a crash is not.
 */
function StatusChip({ status }: { status?: string }) {
  if (!status) {
    return (
      <Badge variant="inactive" className="text-xs">
        Unknown
      </Badge>
    );
  }
  if (status === "ACTIVE") {
    return (
      <Badge variant="success" className="text-xs">
        Active
      </Badge>
    );
  }
  if (status === "PENDING") {
    return (
      <Badge variant="pending" className="text-xs">
        Invited
      </Badge>
    );
  }
  if (status === "SUSPENDED" || status === "LOCKED") {
    return (
      <Badge variant="rejected" className="text-xs">
        {status === "LOCKED" ? "Locked" : "Suspended"}
      </Badge>
    );
  }
  return (
    <Badge variant="inactive" className="text-xs">
      {status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, " ")}
    </Badge>
  );
}

export function InvitationsPanel() {
  const [page, setPage] = useState(1);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const list = useGetStaffListQuery({ page });
  const [invite, { isLoading: inviting }] = useCreateStaffMutation();
  const [resend, { isLoading: resending }] = useResendStaffInvitationMutation();

  const people = useMemo(() => list.data?.data ?? [], [list.data]);
  const roleOptions = useMemo(
    () => list.data?.role_options ?? [],
    [list.data],
  );

  // A 403 here is not an empty list. A branch admin can read this screen and a
  // reader who cannot hold `school.administrators.view` must be told why the
  // table is missing rather than shown one that is merely empty.
  const refusal = list.error ? parseApiError(list.error) : null;
  const forbidden = refusal?.status === 403;

  const set = (field: keyof typeof EMPTY) => (value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    // Clearing as they type: an error that survives the correction reads as a
    // second, different complaint about a field that is now right.
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  /** What this form can decide on its own, before the server is asked. */
  const validate = () => {
    const found: Record<string, string> = {};
    if (!form.first_name.trim()) found.first_name = "Enter their first name.";
    if (!form.last_name.trim()) found.last_name = "Enter their last name.";
    if (!form.email.trim()) found.email = "Enter an email address.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      found.email = "That does not look like an email address.";
    }
    if (!form.role) found.role = "Choose the role they will hold.";
    setErrors(found);
    return Object.keys(found).length === 0;
  };

  const send = async () => {
    if (!validate()) return;
    try {
      await invite({
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim(),
        role: form.role,
      }).unwrap();
      toast.success(`Invitation sent to ${form.email.trim()}.`);
      setForm(EMPTY);
      setErrors({});
      setPage(1);
    } catch (error) {
      // The server's per-field refusals belong under the fields that caused
      // them: "A user with this email already exists" is unreadable as a toast
      // on a form with four inputs.
      const perField = fieldErrors(error);
      if (Object.keys(perField).length) {
        setErrors(perField);
        return;
      }
      toast.error(
        apiErrorMessage(error, "We could not send that invitation. Try again."),
      );
    }
  };

  const resendTo = async (person: StaffListRow) => {
    try {
      await resend(person.id).unwrap();
      toast.success(
        `Invitation resent to ${person.email}. No duplicate account was created.`,
      );
    } catch (error) {
      toast.error(
        apiErrorMessage(error, "We could not resend that invitation. Try again."),
      );
    }
  };

  const rows = people.map((person) => ({
    _slug: person.id,
    name: (
      <span className="block">
        <span className="block whitespace-nowrap">{person.full_name}</span>
        <span className="block text-xs font-normal text-gray-05 whitespace-nowrap">
          {person.invited_at ? `Sent ${humanDate(person.invited_at)}` : "–"}
        </span>
      </span>
    ),
    email: (
      <span className="block max-w-60 truncate text-gray-01" title={person.email}>
        {person.email}
      </span>
    ),
    // Plural on the record, because one person may hold the same role at two
    // branches or two different roles. Joined rather than truncated to the
    // first: a bursar who is also a branch admin is both, and showing one of
    // them is how a reader concludes the other grant never landed.
    role: (
      <span className="whitespace-nowrap text-gray-01">
        {person.roles.length ? person.roles.join(", ") : "–"}
      </span>
    ),
    status: <StatusChip status={person.account_status} />,
  }));

  if (forbidden) {
    return (
      <OutlinedNotice
        icon={ShieldOff}
        title="You cannot manage this school's staff"
        body="Your account can read the onboarding checklist but not the staff list. A school administrator can invite people and see who has accepted."
      />
    );
  }

  return (
    <div className="space-y-5">
    <PermissionGate
      permission={P.INVITE_ADMINISTRATOR}
      fallback={
        <p className="rounded-md border border-border bg-white px-4 py-3 text-[13px] text-gray-06">
          You can see who has been invited, but only a school administrator
          can send invitations.
        </p>
      }
    >
      <section className="bg-white rounded-md px-4 py-5 sm:px-5">
        <p className="text-sm font-semibold font-mont text-black-01">
          Invite a user
        </p>
        {/* The rule is real, not decoration. `/v1/i/me/staff/` narrows
            `role_options` to School Admin and Branch Admin while the school
            is pending, and refuses any other role on the POST as well - so
            this line describes what the platform actually does, and the
            dropdown below cannot offer something the server would reject. */}
        <p className="mt-1.5 text-[13px] text-gray-06">
          Only admins can be invited during onboarding.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <CustomInput
            id="invite-first-name"
            label="First name"
            isRequired
            value={form.first_name}
            error={errors.first_name}
            onChange={(event) => set("first_name")(event.target.value)}
            placeholder="Adaeze"
          />
          <CustomInput
            id="invite-last-name"
            label="Last name"
            isRequired
            value={form.last_name}
            error={errors.last_name}
            onChange={(event) => set("last_name")(event.target.value)}
            placeholder="Okonkwo"
          />
          <CustomInput
            id="invite-email"
            label="Email address"
            type="email"
            isRequired
            value={form.email}
            error={errors.email}
            onChange={(event) => set("email")(event.target.value)}
            placeholder="name@yourschool.edu.ng"
          />
          <CustomNativeSelect
            id="invite-role"
            label="Role"
            isRequired
            value={form.role}
            error={errors.role}
            onChange={(event) => set("role")(event.target.value)}
            placeholder="Select a role"
            loading={list.isLoading}
            options={roleOptions}
          />
        </div>

        <div className="mt-4 flex items-center gap-3 flex-wrap">
          <Button onClick={send} disabled={inviting}>
            {inviting ? "Sending…" : "Send invitation"}
          </Button>
          <span className="inline-flex items-center gap-1.5 text-xs text-gray-05">
            <Mail className="size-3.5" />
            Invitations go out by email and appear in-app. No SMS.
          </span>
        </div>
      </section>
    </PermissionGate>

    <section className="bg-white rounded-md px-3 py-4 sm:px-5">
      <p className="mb-3 text-sm font-semibold font-mont text-black-01">
        Invitations sent
      </p>
      <div className="overflow-x-auto">
        <CustomTable
          tableHeaderList={COLUMNS}
          tableBodyList={rows}
          loading={list.isLoading}
          loadingText="Loading your staff…"
          emptyText="Nobody has been invited yet."
          dropDown
          disabledDropdown={resending}
          dropDownList={[
            {
              label: "Resend invitation",
              onActionClick: (row: { _slug: number }) => {
                const person = people.find((entry) => entry.id === row._slug);
                if (!person) return;
                if (!person.can_resend) {
                  toast.info(
                    `${person.full_name} has already activated their account, so there is nothing to resend.`,
                  );
                  return;
                }
                void resendTo(person);
              },
            },
          ]}
          currentPage={list.data?.pagination?.currentPage ?? page}
          totalPage={list.data?.pagination?.totalPages ?? 0}
          onPageChange={(next) => setPage(Number(next) || 1)}
          hidePagination={(list.data?.pagination?.totalPages ?? 0) < 2}
        />
      </div>
      <p className="mt-2.5 flex items-start gap-1.5 text-xs text-gray-05">
        <Info className="size-3.5 shrink-0 mt-px text-gray-05" />
        Resending reuses the account that is already there, so chasing
        somebody never creates a second record for them.
      </p>
    </section>
    </div>
  );
}
