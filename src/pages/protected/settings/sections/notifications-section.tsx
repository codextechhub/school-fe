import { useState } from "react";
import { toast } from "sonner";
import { BellRing, Mail, RotateCcw, Workflow } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import {
  PolicyBadge,
  SettingsPanel,
  SettingsRow,
  SettingsSectionHeader,
} from "@/components/settings/settings-layout";
import {
  settingRows,
  useGetNotificationSettingsQuery,
  useUpdateNotificationSettingsMutation,
  type NotificationSettingRow,
} from "@/redux/services/notifications/notification-settings-api";
import { usePermissions } from "@/hooks/use-permissions";
import { P } from "@/permissions";
import { useCapabilities } from "@/hooks/use-capabilities";
import {
  useGetWorkflowNotificationSettingQuery,
  useSetWorkflowNotificationSettingMutation,
} from "@/redux/services/dashboard/workflow-api";
import { parseApiError, writeErrorMessage } from "@/utils/api-error";
import { SectionLoadError, SectionLoading } from "./shared";
import { useSettingsBranches } from "../use-settings-branches";

/** "vs_finance" reads as "Finance"; an unknown module still reads as words. */
function moduleName(sourceModule: string) {
  const words = sourceModule.replace(/^vs_/, "").replaceAll("_", " ").trim();
  return words ? words[0].toUpperCase() + words.slice(1) : "Other";
}

interface EventLine {
  key: string;
  label: string;
  transactional: boolean;
  email?: NotificationSettingRow;
}

/** The line under an event: what decides it, at the scope being read. */
function describe(line: EventLine, atBranch: boolean): string {
  if (line.transactional) return "Always emailed, because the person it concerns is owed it.";
  const email = line.email;
  if (!email) return "Shown in the bell only. This event has no email.";
  if (atBranch && email.branch_scoped === false) {
    return "Set for the whole school only, because this email is not about one branch.";
  }
  if (email.source === "branch") return "Set for this branch.";
  if (email.source === "tenant") return atBranch ? "Follows your school's choice." : "Your school's choice.";
  return atBranch ? "Follows the XVS default." : "The XVS default. Change it to make it your school's choice.";
}

/**
 * Which events email this school's people, for the whole school or one branch.
 *
 * The whole school sets the rule and a branch may differ from it, for the
 * emails that belong to a branch: an invoice is the child's branch's, an
 * approval is the document's branch's. An export or a ticket reply belongs to
 * no branch and is set for the whole school only. A branch administrator
 * changes their own branches and reads the whole school's; the server says so
 * per row (`can_edit`), and a switch the reader may not move is shown still.
 *
 * Email is the only channel offered as a choice. The bell carries every event,
 * and a transactional event (a receipt, a password reset) always emails; both
 * are shown as facts, since the server refuses to turn either off.
 *
 * Each switch saves on its own, so a change is never lost by leaving the page.
 *
 * The school's other notification choice is whether its approvals notify
 * anybody at all: one switch for the whole school, above the per-event list,
 * because switching it off silences every approval email in that list. It is
 * gated on the approval-path keys its endpoint checks, and the event list on
 * the notification key and the email alerts module, so a reader who holds
 * only one of the two sees only that part.
 */
export function NotificationsSection() {
  const { hasPermission } = usePermissions();
  const { hasCapability } = useCapabilities();
  const showsEvents =
    hasPermission(P.MANAGE_NOTIFICATION_SETTINGS) && hasCapability("email_alerts");
  const showsApprovals = hasPermission(P.UPDATE_WORKFLOW_TEMPLATE);
  const branches = useSettingsBranches();
  // A reader who cannot act for the whole school opens on their own branch.
  const [picked, setPicked] = useState<string | null>(null);
  const branch =
    picked ?? (!branches.wholeSchool && branches.choices[0] ? String(branches.choices[0].id) : "");
  const branchName = branches.choices.find((b) => String(b.id) === branch)?.name;
  const scopeName = branchName ?? "the whole school";

  // Wait for the branch list, so a branch administrator's first read is their
  // own branch rather than a whole-school read that is thrown away.
  const query = useGetNotificationSettingsQuery(
    { branch: branch || undefined },
    { skip: branches.isLoading || !showsEvents },
  );
  const [save] = useUpdateNotificationSettingsMutation();
  const [pending, setPending] = useState<string | null>(null);
  // currentData: while another scope loads, `data` still holds the last one's.
  const rows = query.currentData ? settingRows(query.currentData.data) : null;

  const groups = new Map<string, Map<string, EventLine>>();
  for (const row of rows ?? []) {
    const group = moduleName(row.source_module);
    const events = groups.get(group) ?? new Map<string, EventLine>();
    const line = events.get(row.event_type_key) ?? {
      key: row.event_type_key,
      label: row.event_type_label,
      transactional: row.is_transactional,
    };
    if (row.channel === "email") line.email = row;
    events.set(row.event_type_key, line);
    groups.set(group, events);
  }

  const change = async (row: NotificationSettingRow, next: boolean | null, done: string) => {
    setPending(row.event_type_key);
    try {
      await save({
        updates: [{ event_type_key: row.event_type_key, channel: "email", is_enabled: next }],
        branch: branch || undefined,
      }).unwrap();
      toast.success(done);
    } catch (error) {
      toast.error(writeErrorMessage(error, "We could not change that. Try again."));
    } finally {
      setPending(null);
    }
  };

  const atBranch = branch !== "";
  const readOnlyHere =
    !atBranch && !branches.wholeSchool && branches.choices.length > 0;

  return (
    <div className="space-y-5">
      <SettingsSectionHeader
        title="Notifications"
        description="Choose which events also send an email. Everything always appears in the bell inside XVS, whatever you choose here."
      />

      {showsApprovals ? <ApprovalEmails /> : null}

      {showsEvents && branches.applies && branches.choices.length > 0 ? (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-white-02 bg-white p-4">
          <div className="w-full sm:w-60">
            <NativeSelect
              aria-label="Which settings to edit"
              value={branch}
              disabled={branches.isLoading}
              onChange={(event) => setPicked(event.target.value)}
            >
              <option value="">Whole school</option>
              {branches.choices.map((item) => (
                <option key={item.id} value={String(item.id)}>{item.name}</option>
              ))}
            </NativeSelect>
          </div>
          <p className="min-w-0 flex-1 font-mont text-xs leading-5 text-gray-05">
            {atBranch
              ? `Changes here apply to ${scopeName} only. Emails that belong to no branch follow the whole school.`
              : readOnlyHere
                ? "You can read the whole school's choices. To change them for your branch, pick it above."
                : "Changes here apply to every branch, unless a branch has made its own choice."}
          </p>
        </div>
      ) : null}

      {!showsEvents ? null : rows === null ? (
        query.isError ? (
          <SectionLoadError
            forbidden={parseApiError(query.error).status === 403}
            retry={query.refetch}
          />
        ) : (
          <SectionLoading label="Loading notification settings…" />
        )
      ) : groups.size === 0 ? (
        <SettingsPanel>
          <SettingsRow
            icon={BellRing}
            label="Nothing to configure yet"
            description="No events that send notifications are set up for your school."
          />
        </SettingsPanel>
      ) : (
        [...groups.entries()].map(([group, events]) => (
          <SettingsPanel key={group} title={group}>
            {[...events.values()].map((line) => {
              const email = line.email;
              const editable = !!email && (email.can_edit ?? true);
              return (
                <SettingsRow
                  key={line.key}
                  icon={Mail}
                  label={line.label}
                  description={describe(line, atBranch)}
                  badge={
                    line.transactional ? (
                      <PolicyBadge kind="enforced">Always sent</PolicyBadge>
                    ) : email ? (
                      <span className="flex flex-wrap items-center justify-end gap-2">
                        {atBranch && email.source === "branch" && editable ? (
                          <Button
                            variant="outline"
                            size="xs"
                            disabled={pending !== null}
                            onClick={() => change(email, null, `${line.label} now follows the whole school at ${scopeName}.`)}
                          >
                            <RotateCcw className="size-3" />
                            Use the school&apos;s choice
                          </Button>
                        ) : null}
                        <label className="flex items-center gap-2 font-mont text-xs font-normal text-gray-05">
                          Email
                          <Switch
                            aria-label={`Email: ${line.label}`}
                            checked={email.is_enabled}
                            disabled={!editable || pending !== null}
                            onCheckedChange={(next) =>
                              change(
                                email,
                                next,
                                next
                                  ? `${line.label} will be emailed for ${scopeName}.`
                                  : `${line.label} will no longer be emailed for ${scopeName}.`,
                              )
                            }
                          />
                        </label>
                      </span>
                    ) : null
                  }
                />
              );
            })}
          </SettingsPanel>
        ))
      )}

    </div>
  );
}

/**
 * Whether this school's approvals notify anybody: one answer for the school.
 *
 * Off silences every approval email, whatever the event list below says for
 * each one, and changes nothing about the approvals themselves: a request
 * still waits for the same people, who find it in their own queue.
 */
function ApprovalEmails() {
  const { data, isLoading } = useGetWorkflowNotificationSettingQuery();
  const [save, { isLoading: saving }] = useSetWorkflowNotificationSettingMutation();
  // Notifying is what the engine does when a school has chosen nothing.
  const enabled = data?.enabled ?? true;

  const choose = (next: boolean) => {
    save(next)
      .unwrap()
      .then(() =>
        toast.success(next ? "Approvals will email people again." : "Approvals will not email anybody."),
      )
      .catch((error) => toast.error(writeErrorMessage(error, "That could not be changed.")));
  };

  return (
    <SettingsPanel title="Approvals" description="Applies to the whole school, every branch.">
      <SettingsRow
        icon={Workflow}
        label="Approval emails"
        description={
          enabled
            ? "On. Approvers are told when something waits on them, and whoever raised a request is told how it ended."
            : "Off. Nobody is emailed about approvals. They still run, and approvers find what is waiting in their own queue."
        }
        badge={
          <label className="flex items-center gap-2 font-mont text-xs font-normal text-gray-05">
            Email
            <Switch
              aria-label="Approval emails"
              checked={enabled}
              disabled={isLoading || saving}
              onCheckedChange={choose}
            />
          </label>
        }
      />
    </SettingsPanel>
  );
}
