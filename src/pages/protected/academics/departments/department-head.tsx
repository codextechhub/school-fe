import { useState } from "react";
import { UserRoundCheck } from "lucide-react";
import { toast } from "sonner";

import { Panel } from "@/components/custom/surface";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFieldAccess } from "@/components/finance-ui";
import { useDebounce } from "@/hooks/use-debounce";
import { usePermissions } from "@/hooks/use-permissions";
import { FIELD_RESOURCE } from "@/lib/field-resources";
import { cn } from "@/lib/utils";
import { P } from "@/permissions";
import { useUpdateDepartmentMutation } from "@/redux/services/academics/academics-api";
import type { Department } from "@/redux/services/academics/academics-types";
import { useGetStaffListQuery } from "@/redux/services/staff/staff-api";
import { DrawerShell } from "@/pages/protected/students/drawers/drawer-shell";

/**
 * Who heads a department, in the department's detail panel.
 *
 * The head is what gradebook moderation turns on: a moderated programme's
 * sheets go to the head of the subject's department to approve or send back,
 * and a department with no head sends its sheets straight on. So the panel
 * says that, rather than showing an empty name and leaving the reader to guess
 * why it matters.
 *
 * Changing the head needs the department edit key and Write on the head field;
 * choosing somebody needs the staff directory. The head follows its own Field
 * Access switch, and a role that may not read it does not see the panel.
 */
export function DepartmentHeadPanel({ department, canEdit }: { department: Department; canEdit: boolean }) {
  const access = useFieldAccess(FIELD_RESOURCE.ACADEMICS_DEPARTMENT);
  const { hasPermission } = usePermissions();
  const [choosing, setChoosing] = useState(false);
  const [update, updating] = useUpdateDepartmentMutation();
  if (access.isHidden("head") || department.head === undefined) return null;
  const mayChange = canEdit && !access.isReadOnly("head") && hasPermission(P.BROWSE_TEACHERS);

  const clear = async () => {
    try {
      await update({ id: department.id, head: null }).unwrap();
      toast.success(`${department.name} has no head now`, {
        description: "Its sheets in a moderated programme go straight to the class teacher.",
      });
    } catch {
      // The base query has already said why.
    }
  };

  return (
    <Panel className="px-4 py-3">
      <p className="text-xs text-gray-05">Head of department</p>
      <div className="mt-1.5 flex flex-wrap items-center gap-2">
        <UserRoundCheck className="size-4 shrink-0 text-primary" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-black-01">
          {department.head?.name ?? "No head"}
        </span>
        {mayChange && (
          <>
            <Button size="sm" variant="outline" onClick={() => setChoosing(true)}>
              {department.head ? "Change" : "Name a head"}
            </Button>
            {department.head && (
              <Button size="sm" variant="outline" disabled={updating.isLoading} onClick={() => void clear()}>
                Clear
              </Button>
            )}
          </>
        )}
      </div>
      <p className="mt-1.5 text-xs leading-5 text-gray-05">
        {department.head
          ? "Moderates this department's score sheets in every programme the Gradebook moderates."
          : "With no head, this department's score sheets are never moderated, even in a moderated programme."}
      </p>
      {choosing && <HeadDrawer department={department} onClose={() => setChoosing(false)} />}
    </Panel>
  );
}

/** A searchable list of the staff still working at the school, one to pick. */
function HeadDrawer({ department, onClose }: { department: Department; onClose: () => void }) {
  const [search, setSearch] = useState("");
  const query = useDebounce(search, 300);
  const [picked, setPicked] = useState<number | null>(department.head?.id ?? null);
  const { data, isFetching } = useGetStaffListQuery({ search: query || undefined, employment_status: "ACTIVE" });
  const [update, updating] = useUpdateDepartmentMutation();
  const staff = data?.data ?? [];

  const onSave = async () => {
    if (picked === null) return;
    try {
      const saved = await update({ id: department.id, head: picked }).unwrap();
      toast.success(`${saved.data.head?.name ?? "The head"} heads ${department.name}`, {
        description: "They moderate its score sheets in every moderated programme.",
      });
      onClose();
    } catch {
      // The base query has already said why.
    }
  };

  return (
    <DrawerShell
      open
      onClose={onClose}
      title={`Head of ${department.name}`}
      subtitle="Somebody on the staff who still works here."
      saveLabel="Save head"
      onSave={() => void onSave()}
      canSave={picked !== null && picked !== (department.head?.id ?? null)}
      saving={updating.isLoading}
    >
      <div className="space-y-3">
        <Input
          aria-label="Search staff"
          placeholder="Search by name"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <ul className="divide-y divide-border rounded-md border border-border" aria-busy={isFetching}>
          {staff.length === 0 && (
            <li className="px-3 py-3 text-sm text-gray-05">{isFetching ? "Searching…" : "Nobody matches."}</li>
          )}
          {staff.map((person) => (
            <li key={person.id}>
              <button
                type="button"
                aria-pressed={picked === person.id}
                onClick={() => setPicked(person.id)}
                className={cn(
                  "flex w-full min-w-0 items-center justify-between gap-3 px-3 py-2.5 text-left text-sm",
                  picked === person.id ? "bg-primary/10 text-primary" : "hover:bg-gray-50",
                )}
              >
                <span className="min-w-0 truncate font-medium">{person.full_name}</span>
                {person.job_title && <span className="shrink-0 text-xs text-gray-05">{person.job_title}</span>}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </DrawerShell>
  );
}
