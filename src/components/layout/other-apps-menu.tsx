import { Smartphone } from "lucide-react";

import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { authApi } from "@/redux/services/auth/auth-api";
import type { OtherApp } from "@/redux/services/auth/auth-types";
import { useAppSelector } from "@/redux/store";

/** What each app the server can name is called in the menu. */
const LABELS: Record<string, string> = {
  parent_app: "Open the parent app",
};

/**
 * The account menu's way into the other apps this account can open, such as
 * the parent app for a teacher whose own child attends the school.
 *
 * The list is the server's (`other_apps` on `me/`), read from the copy the
 * session already holds rather than asked for again. An app the menu has no
 * label for is left out. Nothing shows while proxying: the other app runs on
 * the signed-in person's own session, so it would open as them and not as the
 * person being viewed. Each opens in a new tab, so the staff app stays where
 * it was.
 */
export function OtherAppsMenuItems() {
  const { data } = authApi.endpoints.getMe.useQueryState(undefined);
  const proxying = useAppSelector((state) => !!state.auth.impersonation);
  const apps: OtherApp[] = proxying
    ? []
    : (data?.data.other_apps ?? []).filter((app) => LABELS[app.key]);
  if (apps.length === 0) return null;

  return (
    <>
      <DropdownMenuSeparator />
      {apps.map((app) => (
        <DropdownMenuItem key={app.key} asChild>
          <a href={app.path} target="_blank" rel="noopener">
            <Smartphone className="size-4" />
            {LABELS[app.key]}
          </a>
        </DropdownMenuItem>
      ))}
    </>
  );
}
