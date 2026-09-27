import { Link } from "react-router";
import { ArrowRight, ListChecks } from "lucide-react";
import {
  SettingsPanel,
  SettingsSectionHeader,
} from "@/components/settings/settings-layout";
import { useSettingsDoors } from "../use-settings-doors";

export function MoreSection() {
  const doors = useSettingsDoors();

  return (
    <div className="space-y-5">
      <SettingsSectionHeader
        title="More settings"
        description="Settings that have screens of their own. Only the ones your role can open are listed."
      />
      <SettingsPanel>
        {doors.length === 0 ? (
          <p className="flex items-center gap-2 px-4 py-4 font-mont text-xs text-gray-05 sm:px-5">
            <ListChecks className="size-4" />
            None of the other settings screens are open to your role.
          </p>
        ) : (
          doors.map((door) => {
            const Icon = door.icon;
            return (
              <Link
                key={door.to}
                to={door.to}
                className="group flex items-center gap-3 px-4 py-4 transition-colors hover:bg-gray-02/40 sm:px-5"
              >
                <span className="grid size-8 shrink-0 place-content-center rounded-md bg-gray-02 text-gray-05">
                  <Icon className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-mont text-sm font-medium text-gray-01">{door.title}</span>
                  <span className="mt-0.5 block font-mont text-xs leading-5 text-gray-05">{door.description}</span>
                </span>
                <ArrowRight className="size-4 shrink-0 text-gray-05 transition-transform group-hover:translate-x-0.5" />
              </Link>
            );
          })
        )}
      </SettingsPanel>
    </div>
  );
}
