import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Check, Search, UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useAssignRoleMutation } from "@/redux/services/roles/roles-api";
import { useGetStaffListQuery } from "@/redux/services/staff/staff-api";
import { writeErrorMessage } from "@/utils/api-error";

/**
 * Giving a role to somebody, from the role's own screen.
 *
 * Roles and the people holding them were readable together and writable apart:
 * the drawer's People tab answered "who holds this" and offered no way to add
 * the fifth person, so a head teacher who had just built an Assistant Bursar
 * role had to leave, find the member of staff in the directory, and grant it
 * from their profile. That is the same act approached from the other end, and
 * the end somebody is already standing at is this one.
 *
 * **The account id, not the staff record's.** They are two numbers on one
 * person, and the assignment endpoint wants the account. Staff rows carry
 * `user_id` for this, which is why the picker is built from the directory list
 * rather than from the search endpoint - that one returns neither.
 *
 * **Whole-school, not per branch.** A branch-pinned grant is a real thing the
 * API supports and a rarer decision than this panel should force: somebody
 * adding a person to a role here means "they do this job", and the school-wide
 * answer is the one that stays right when a branch opens. Pinning stays on the
 * staff profile, where the branch is already in view.
 */
export function AssignRolePanel({
  roleId,
  roleName,
  heldBy,
  onAssigned,
}: {
  /** Numeric role id, which is what the assignment endpoint takes. */
  roleId: number;
  roleName: string;
  /**
   * Account ids already holding it, so the list can say so instead of failing.
   *
   * Strings, because the two endpoints disagree on the type: role assignments
   * return `user_id` as a string and the staff directory returns it as a
   * number. Comparing them as they arrive silently matches nothing, and the
   * panel would offer "Give" to somebody who already holds the role.
   */
  heldBy: string[];
  onAssigned: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [assign, { isLoading: assigning }] = useAssignRoleMutation();
  // Only once the panel is open: the drawer's People tab is read first and
  // most of the time only read, and the directory is the larger request.
  const staff = useGetStaffListQuery({ page: 1 }, { skip: !open });

  const held = useMemo(() => new Set(heldBy.map(String)), [heldBy]);

  const people = useMemo(() => {
    const rows = staff.data?.data ?? [];
    const needle = search.trim().toLowerCase();
    return rows
      // Somebody who has left keeps their history and takes no new roles.
      .filter((row) => row.on_roll)
      .filter(
        (row) =>
          !needle ||
          row.full_name.toLowerCase().includes(needle) ||
          row.email.toLowerCase().includes(needle) ||
          row.job_title.toLowerCase().includes(needle),
      );
  }, [staff.data, search]);

  const give = async (userId: number, name: string) => {
    try {
      await assign({ user: userId, role: roleId, branch: null }).unwrap();
      toast.success(`${name} now holds ${roleName}.`);
      onAssigned();
    } catch (error) {
      toast.error(
        writeErrorMessage(error, `We could not give ${roleName} to ${name}.`),
      );
    }
  };

  if (!open) {
    return (
      <Button variant="outline" className="w-full" onClick={() => setOpen(true)}>
        <UserPlus />
        Give this role to somebody
      </Button>
    );
  }

  return (
    <div className="rounded-md border border-border">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
        <div className="relative flex-1 min-w-0">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-gray-05" />
          <Input
            autoFocus
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search staff by name, email or job"
            aria-label="Search staff"
            className="h-9 pl-8 text-[13px]"
          />
        </div>
        <Button
          variant="ghost"
          size="sm"
          aria-label="Close"
          onClick={() => {
            setOpen(false);
            setSearch("");
          }}
        >
          <X />
        </Button>
      </div>

      {staff.isLoading && (
        <div className="space-y-2 p-3">
          {[0, 1, 2].map((row) => (
            <Skeleton key={row} className="h-9 w-full" />
          ))}
        </div>
      )}

      {!staff.isLoading && people.length === 0 && (
        <p className="px-3 py-6 text-center text-[13px] text-gray-06">
          {search.trim()
            ? `Nobody on the roll matches "${search.trim()}".`
            : "There is nobody on the roll to give this to yet."}
        </p>
      )}

      {!staff.isLoading && people.length > 0 && (
        <ScrollArea className="max-h-64">
          <ul className="divide-y divide-border">
            {people.map((person) => {
              const already = held.has(String(person.user_id));
              return (
                <li
                  key={person.id}
                  className="flex items-center justify-between gap-3 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium text-black-01">
                      {person.full_name}
                    </p>
                    <p className="truncate text-xs text-gray-06">
                      {person.job_title || person.email}
                    </p>
                  </div>
                  {already ? (
                    // Said rather than hidden: a name missing from the list
                    // reads as a person who is not on the roll.
                    <span className="flex shrink-0 items-center gap-1 text-xs text-gray-05">
                      <Check className="size-3.5" />
                      Holds it
                    </span>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={assigning}
                      onClick={() => give(person.user_id, person.full_name)}
                    >
                      Give
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        </ScrollArea>
      )}
    </div>
  );
}
