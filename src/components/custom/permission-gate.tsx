/**
 * PermissionGate - conditionally renders UI based on the user's permissions.
 * Import permission codes from @/permissions and use P.* constants.
 *
 * Hide entirely (default):
 *   <PermissionGate permission={P.ENROLL_STUDENT}>
 *     <Button>Enroll Student</Button>
 *   </PermissionGate>
 *
 * Render a fallback instead:
 *   <PermissionGate permission={P.MODIFY_STUDENT} fallback={<p>Read-only</p>}>
 *     <Button>Edit Student</Button>
 *   </PermissionGate>
 *
 * Array - any one (default):
 *   <PermissionGate permission={[P.ENROLL_STUDENT, P.MODIFY_STUDENT]}>
 *     <Button>Save</Button>
 *   </PermissionGate>
 *
 * Withhold for a reason other than permission (e.g. the year being read is
 * archived and the server refuses every write into it):
 *   <PermissionGate permission={P.CREATE_CLASS} disabled={readOnlyYear}>
 *     <Button>Add class</Button>
 *   </PermissionGate>
 *
 * Array - must have all:
 *   <PermissionGate permission={[P.BROWSE_STUDENTS, P.MODIFY_STUDENT]} mode="all">
 *     <Button>Edit</Button>
 *   </PermissionGate>
 *
 * Withhold what the school has not bought, as well as what the reader may not
 * do. The two are different questions and both have to pass:
 *   <PermissionGate permission={P.UPLOAD_IMPORT_BATCH} capability="bulk_import">
 *     <Button>Upload a file</Button>
 *   </PermissionGate>
 */
import { type PermissionCode } from "@/permissions";
import { usePermissions } from "@/hooks/use-permissions";
import { useCapabilities } from "@/hooks/use-capabilities";

interface Props {
  permission: PermissionCode | PermissionCode[];
  mode?: "any" | "all";
  /**
   * The plan capability this control needs, if it is sold rather than core.
   *
   * A module key (`finance`) asks whether the school has the product at all; a
   * band key (`finance_plus`) asks how far into it they reach. Omit it for
   * anything every plan includes, which is most things.
   *
   * Withheld rather than dimmed, and with no explanation offered. A bursar
   * refused mid-task has no use for our pricing vocabulary; the place a plan is
   * discussed is the proprietor's conversation with CodeX, not a tooltip on a
   * button she cannot press.
   */
  capability?: string;
  /**
   * Withhold the children even when the permission is held.
   *
   * For state, not for rights: the caller MAY do this, but not right now and
   * not here. Same treatment as a missing permission, because the reader does
   * not need to know which of the two stopped it.
   */
  disabled?: boolean;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * The plan half of the gate, in its own component so the hook is not always run.
 *
 * `useCapabilities` reads an RTK Query endpoint, which needs the store in
 * context. Most gates ask only the permission question and are rendered in
 * tests and in packages that supply no store, so calling it unconditionally in
 * PermissionGate would make every one of those a store-dependent component for
 * a question they never ask. Rendering this child only when a capability is
 * declared keeps the cost where the feature is used, and keeps the hook
 * unconditional inside the component that owns it.
 */
function PlanScoped({ capability, fallback, children }: {
  capability: string;
  fallback: React.ReactNode;
  children: React.ReactNode;
}) {
  const { hasCapability } = useCapabilities();
  return hasCapability(capability) ? <>{children}</> : <>{fallback}</>;
}

export default function PermissionGate({ permission, mode = "any", capability, disabled = false, fallback = null, children }: Props) {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = usePermissions();

  const codes = Array.isArray(permission) ? permission : [permission];

  const allowed =
    disabled
      ? false
      : codes.length === 1
        ? hasPermission(codes[0])
        : mode === "all"
          ? hasAllPermissions(...codes)
          : hasAnyPermission(...codes);

  if (!allowed) return <>{fallback}</>;
  if (!capability) return <>{children}</>;
  return (
    <PlanScoped capability={capability} fallback={fallback}>
      {children}
    </PlanScoped>
  );
}
