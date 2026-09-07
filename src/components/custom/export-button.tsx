import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import PromptModal from "@/components/modal/prompt-modal";
import { parseApiError } from "@/utils/api-error";
import { useAppSelector } from "@/redux/store";
import { selectTenantIsPending } from "@/redux/features/auth/auth-slice";
import { usePermissions } from "@/hooks/use-permissions";
import { P } from "@/permissions";
import {
  useLazyExportFromScreenQuery,
  useRunQuickExportMutation,
} from "@/redux/services/exports/exports-api";
import type { FromScreen } from "@/redux/services/exports/exports-types";

/**
 * "Export what this table is showing", on any list screen that has a binding.
 *
 * Shared rather than academics-only: calendar and classes already imported it
 * from that folder, and the student directory makes seven callers across four
 * modules. Nothing in it is module-specific - it takes a binding key and the
 * screen's own params.
 *
 * Two calls, and the gap between them is the whole feature. `from-screen`
 * translates the filters currently on the screen and names the ones it could
 * not carry; only then is anything run. A one-click download would have to
 * guess, and the guess that matters is the branch lens: a school asks for one
 * branch's classes, receives every branch's, and has nothing on screen to say
 * so.
 *
 * So when a filter cannot be carried, this stops and says which - in the
 * school's own words rather than the parameter's - and lets the person decide.
 * When everything IS carried it does not interrupt: a confirmation nobody needs
 * is a confirmation nobody reads.
 *
 * **Absent while the school is still being set up.** Academic structure is open
 * to a PENDING tenant because building it is a required onboarding task; the
 * Export Centre is not, and declares no `pending_tenant_surface`, so it refuses
 * every call. Rendering the button anyway would put a control on the screen
 * that answers "this school is still being set up" - a door drawn on a wall,
 * which is the same rule the sidebar follows for surfaces a pending school
 * cannot reach. (Student Management is closed to a pending school outright, so
 * there the question never arises.)
 *
 * **And absent until a school actually holds the export keys.** The Export
 * Centre is granted to PLATFORM roles only today - seed_exports_permissions
 * attaches its keys to the codex tenant's roles and to no school role - so a
 * school admin pressing this would be refused by RBAC, not by anything they
 * could act on. Gated rather than removed, so the day a school is granted
 * `exports.catalogue.view` and `exports.run.create` these six buttons appear
 * with no further work.
 */

export function ExportButton({
  screen,
  params,
  label = "Export",
}: {
  /** The binding key, e.g. "academics.subjects". */
  screen: string;
  /** The screen's live filters, exactly as its own query sends them. */
  params: Record<string, string | number | undefined>;
  label?: string;
}) {
  const tenantIsPending = useAppSelector(selectTenantIsPending);
  const { hasAllPermissions } = usePermissions();
  const canExport = hasAllPermissions(P.VIEW_EXPORT_CATALOGUE, P.RUN_EXPORT);
  const [prepare, { isFetching: preparing }] = useLazyExportFromScreenQuery();
  const [run, { isLoading: running }] = useRunQuickExportMutation();
  const [pending, setPending] = useState<FromScreen | null>(null);

  const start = async () => {
    try {
      const prepared = await prepare({ screen, params }).unwrap();
      const data = prepared.data;
      // Nothing lost: run it rather than asking a question with one answer.
      if (!data.unmapped?.length) return execute(data);
      setPending(data);
    } catch (error) {
      toast.error(
        parseApiError(error).message || "That export could not be prepared.",
      );
    }
  };

  const execute = async (data: FromScreen) => {
    try {
      const result = await run({ ...data.config, sync: true }).unwrap();
      toast.success(result.message);
    } catch (error) {
      toast.error(parseApiError(error).message || "That export could not be run.");
    }
    setPending(null);
  };

  if (tenantIsPending || !canExport) return null;

  // The server's own sentences: only the module owning the binding knows why
  // a filter could not be carried, and a copy here would drift from it.
  const why = (pending?.unmapped ?? []).map((u) => u.reason).join(" ");

  return (
    <>
      <Button
        variant="outline"
        className="shrink-0 border-primary text-sm text-primary"
        onClick={start}
        disabled={preparing || running}
      >
        {preparing || running ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Download className="size-4" />
        )}
        {label}
      </Button>

      <PromptModal
        isOpen={!!pending}
        onClose={() => setPending(null)}
        onConfirm={() => pending && execute(pending)}
        loading={running}
        canCancel
        title="This file will show more than the screen"
        description={`${why} Everything else you have filtered by is carried.`}
        onConfirmText="Export anyway"
        containerClass="min-h-[320px] lg:w-[430px]"
        srcClass="size-25"
        src="/image/caution.png"
      />
    </>
  );
}
