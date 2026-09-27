import { useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { ArrowRight, BellRing, Mail } from "lucide-react";
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
import { routesPath } from "@/routes/routesPath";
import { parseApiError, writeErrorMessage } from "@/utils/api-error";
import { SectionLoadError, SectionLoading } from "./shared";

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

/**
 * Which events email this school's people.
 *
 * Email is the only channel offered as a choice. The bell in the app always
 * carries every event, because it is the one place a person can never miss a
 * thing; and a transactional event (a receipt, a password reset) always
 * emails, because the person it is addressed to is owed it. Both are shown as
 * facts rather than switches, since the server refuses to turn either off.
 *
 * Each switch saves on its own, so a change is never lost by leaving the page.
 *
 * The school's other notification choice, whether approvers are emailed when
 * a document waits on them, lives with the approval paths it belongs to. It is
 * linked from here, gated as its own screen is, so the reader finds every
 * notification setting they may change from this one section.
 */
export function NotificationsSection() {
  const { hasPermission } = usePermissions();
  const query = useGetNotificationSettingsQuery();
  const [save] = useUpdateNotificationSettingsMutation();
  const [pending, setPending] = useState<string | null>(null);

  if (query.isLoading) return <SectionLoading label="Loading notification settings…" />;
  if (query.isError) {
    return (
      <SectionLoadError
        forbidden={parseApiError(query.error).status === 403}
        retry={query.refetch}
      />
    );
  }

  const groups = new Map<string, Map<string, EventLine>>();
  for (const row of settingRows(query.data?.data)) {
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

  const toggle = async (row: NotificationSettingRow, next: boolean) => {
    setPending(row.event_type_key);
    try {
      await save([{ event_type_key: row.event_type_key, channel: "email", is_enabled: next }]).unwrap();
      toast.success(next ? `${row.event_type_label} will be emailed.` : `${row.event_type_label} will no longer be emailed.`);
    } catch (error) {
      toast.error(writeErrorMessage(error, "We could not change that. Try again."));
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="space-y-5">
      <SettingsSectionHeader
        title="Notifications"
        description="Choose which events also send an email. Everything always appears in the bell inside XVS, whatever you choose here."
      />

      {groups.size === 0 ? (
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
            {[...events.values()].map((line) => (
              <SettingsRow
                key={line.key}
                icon={Mail}
                label={line.label}
                description={
                  line.transactional
                    ? "Always emailed, because the person it concerns is owed it."
                    : line.email
                      ? line.email.source === "tenant"
                        ? "Your school's choice."
                        : "The XVS default. Change it to make it your school's choice."
                      : "Shown in the bell only. This event has no email."
                }
                badge={
                  line.transactional ? (
                    <PolicyBadge kind="enforced">Always sent</PolicyBadge>
                  ) : line.email ? (
                    <label className="flex items-center gap-2 font-mont text-xs font-normal text-gray-05">
                      Email
                      <Switch
                        aria-label={`Email: ${line.label}`}
                        checked={line.email.is_enabled}
                        disabled={pending !== null}
                        onCheckedChange={(next) => line.email && toggle(line.email, next)}
                      />
                    </label>
                  ) : null
                }
              />
            ))}
          </SettingsPanel>
        ))
      )}

      {hasPermission(P.UPDATE_WORKFLOW_TEMPLATE) ? (
        <SettingsPanel title="Other notification settings">
          <Link
            to={routesPath.PROTECTED.WORKFLOW.NOTIFICATIONS}
            className="group flex items-center gap-3 px-4 py-4 transition-colors hover:bg-gray-02/40 sm:px-5"
          >
            <span className="grid size-8 shrink-0 place-content-center rounded-md bg-gray-02 text-gray-05">
              <BellRing className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-mont text-sm font-medium text-gray-01">Approval emails</span>
              <span className="mt-0.5 block font-mont text-xs leading-5 text-gray-05">
                Whether approvers are emailed when a document waits on them.
              </span>
            </span>
            <ArrowRight className="size-4 shrink-0 text-gray-05 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </SettingsPanel>
      ) : null}
    </div>
  );
}
