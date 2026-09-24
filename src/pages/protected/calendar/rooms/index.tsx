import { useMemo, useState } from "react";
import { DoorOpen, LayoutGrid, Plus, Rows3, Search } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import PermissionGate from "@/components/custom/permission-gate";
import PromptModal from "@/components/modal/prompt-modal";
import { SegmentedToggle } from "@/components/custom/segmented-toggle";
import { Panel } from "@/components/custom/surface";
import { OutlinedNotice } from "@/pages/protected/onboarding/components/outlined-notice";
import { P } from "@/permissions";
import { usePermissions } from "@/hooks/use-permissions";
import { useAcademicsLens } from "@/hooks/use-academics-lens";
import { parseApiError } from "@/utils/api-error";
import {
  useCreateRoomMutation,
  useDeleteRoomMutation,
  useGetRoomsQuery,
  useUpdateRoomMutation,
} from "@/redux/services/calendar/calendar-api";
import type { Room, RoomWrite } from "@/redux/services/calendar/calendar-types";
import { RoomDrawer } from "../components/room-drawer";
import { blankRoom, roomDraftFrom } from "../components/room-draft";
import { RoomFilters } from "./room-filters";
import { BLANK_ROOM_FACETS, type RoomFacets } from "./room-facets";
import { RoomDirectory } from "./room-directory";
import { PageShell } from "@/components/layout/page-shell";
import { useActionParam } from "@/hooks/use-action-param";

/**
 * The places lessons and examinations happen in.
 *
 * **Two controls that look like one, and are not.** Deactivate takes a room out
 * of use: it stops being offered when anyone picks a room, and every lesson and
 * paper already in it stays exactly where it is. Delete removes it outright,
 * and the server refuses that for any room holding anything, with a sentence
 * naming what is in it. Both are kept because the two cases are genuinely
 * different: a room typed by mistake on Monday morning should leave nothing
 * behind, and the Science Lab closed for a refit should leave everything.
 *
 * **Usage is the server's count, not ours.** Each row carries how many lessons
 * and papers sit in it, and the delete refusal is worded from the same numbers -
 * so the card and the refusal can never disagree.
 */
export default function Rooms() {
  const { lens, branch, multiBranch, readOnlyYear } = useAcademicsLens();
  const { hasPermission } = usePermissions();

  const [facets, setFacets] = useState<RoomFacets>(BLANK_ROOM_FACETS);
  const [view, setView] = useState<"cards" | "table">("cards");
  const [page, setPage] = useState(1);

  const [editing, setEditing] = useState<Room | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [confirm, setConfirm] = useState<Room | null>(null);

  // No session in the args: a room outlives the school year, and it is the one
  // thing in this module with no session column at all.
  const { data, isLoading, isError, refetch } = useGetRoomsQuery({
    branch: lens.branch,
    search: facets.search,
    type: facets.type === "all" ? undefined : facets.type,
    active: facets.active === "all" ? undefined : facets.active,
    page,
  });

  const [create, { isLoading: creating }] = useCreateRoomMutation();
  const [update, { isLoading: updating }] = useUpdateRoomMutation();
  const [remove, { isLoading: removing }] = useDeleteRoomMutation();

  const rooms = useMemo(() => data?.data ?? [], [data]);
  const pagination = data?.pagination;

  const canCreate = hasPermission(P.CREATE_TIMETABLE_ENTRY) && !readOnlyYear;
  const canEdit = hasPermission(P.MODIFY_TIMETABLE_ENTRY) && !readOnlyYear;
  const canDelete = hasPermission(P.DELETE_TIMETABLE) && !readOnlyYear;

  const filtered =
    !!facets.search || facets.type !== "all" || facets.active !== "all";

  const clearFilters = () => {
    setFacets(BLANK_ROOM_FACETS);
    setPage(1);
  };

  const open = (room: Room | null) => {
    setEditing(room);
    setDrawerOpen(true);
  };

  // "Add a room" from the search box, on the Add button's own gate.
  useActionParam("new", canCreate, () => open(null));

  const save = async (body: RoomWrite) => {
    const result = editing
      ? await update({ id: editing.id, ...body }).unwrap()
      : await create(body).unwrap();
    toast.success(result.message);
  };

  /** The toggle, which is the archive here. Never routed through the modal. */
  const toggleActive = async (room: Room) => {
    try {
      const result = await update({
        id: room.id,
        is_active: !room.is_active,
      }).unwrap();
      toast.success(result.message);
    } catch (error) {
      toast.error(
        parseApiError(error).message || "That room could not be changed.",
      );
    }
  };

  const runDelete = async () => {
    if (!confirm) return;
    try {
      const result = await remove(confirm.id).unwrap();
      toast.success(result.message || `${confirm.name} deleted.`);
    } catch (error) {
      // PROTECTED_REFERENCE, and its message names the lessons and papers in
      // the room and tells the school to deactivate instead. Shown as it
      // arrived: rewriting it would be a second version of the same count.
      toast.error(
        parseApiError(error).message || "That room could not be deleted.",
      );
    }
    setConfirm(null);
  };

  if (isError) {
    return (
      <PageShell>
        <OutlinedNotice
          icon={DoorOpen}
          title="We could not load your rooms"
          body="Something went wrong on our side. Try again in a moment."
          actionLabel="Try again"
          onAction={() => refetch()}
        />
      </PageShell>
    );
  }

  return (
    <PageShell className="content-start gap-5" grid>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-[-0.02em] text-black-01">
            Rooms
          </h1>
          <p className="mt-1 text-sm text-gray-01">
            Manage the spaces used for lessons and examinations.
          </p>
        </div>
        <PermissionGate
          permission={P.CREATE_TIMETABLE_ENTRY}
          disabled={readOnlyYear}
        >
          <Button
            className="shrink-0 text-sm"
            onClick={() => open(null)}
            disabled={!canCreate}
          >
            <Plus /> Add room
          </Button>
        </PermissionGate>
      </div>

      <Panel as="section" className="p-4 sm:p-5">
        <div className="flex min-w-0 flex-wrap items-center gap-2.5">
          <div className="relative min-w-0 flex-1 basis-60">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-05" />
            <input
              value={facets.search}
              onChange={(event) => {
                setFacets((current) => ({
                  ...current,
                  search: event.target.value,
                }));
                setPage(1);
              }}
              placeholder="Search rooms"
              aria-label="Search rooms"
              className="h-10 w-full rounded-lg border border-white-02 bg-white pl-9 pr-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
          </div>

          <RoomFilters
            facets={facets}
            onChange={(next) => {
              setFacets(next);
              setPage(1);
            }}
          />

          <SegmentedToggle
            ariaLabel="Room view"
            value={view}
            onChange={setView}
            options={[
              { value: "cards", label: "Cards", icon: LayoutGrid },
              { value: "table", label: "List", icon: Rows3 },
            ]}
          />
        </div>
      </Panel>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-72 w-full rounded-md" />
          ))}
        </div>
      ) : !rooms.length ? (
        <OutlinedNotice
          icon={DoorOpen}
          title={filtered ? "No rooms match these filters" : "No rooms yet"}
          body={
            filtered
              ? "Try a different search, or clear the type and status filters."
              : "A room is what makes a double-booking detectable: without them a timetable can put two classes in one place and nothing will notice."
          }
          actionLabel={
            filtered ? "Clear filters" : canCreate ? "Add room" : undefined
          }
          onAction={filtered ? clearFilters : () => open(null)}
        />
      ) : (
        <section className="min-w-0" aria-labelledby="room-list-heading">
          <div className="mb-3">
            <h2
              id="room-list-heading"
              className="text-[15px] font-semibold text-black-01"
            >
              {filtered ? "Matching rooms" : "All rooms"}
            </h2>
            <p className="mt-0.5 text-xs text-gray-05">
              {pagination?.totalItems ?? rooms.length}{" "}
              {(pagination?.totalItems ?? rooms.length) === 1 ? "room" : "rooms"}
              {filtered ? " match these filters" : ""}
            </p>
          </div>

          <RoomDirectory
            rooms={rooms}
            view={view}
            multiBranch={multiBranch}
            canEdit={canEdit}
            canDelete={canDelete}
            page={pagination?.currentPage ?? 1}
            totalPages={pagination?.totalPages ?? 1}
            onEdit={open}
            onToggle={toggleActive}
            onDelete={setConfirm}
            onPageChange={setPage}
          />
        </section>
      )}

      <RoomDrawer
        open={drawerOpen}
        editing={!!editing}
        saving={creating || updating}
        initial={editing ? roomDraftFrom(editing) : blankRoom(branch)}
        onClose={() => setDrawerOpen(false)}
        onSave={save}
      />

      <PromptModal
        isOpen={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={runDelete}
        loading={removing}
        canCancel
        title={`Delete ${confirm?.name}?`}
        description={deleteBody(confirm)}
        onConfirmText="Delete room"
        onConfirmClass="bg-error-text text-white hover:bg-error-text/90"
        containerClass="min-h-[320px] lg:w-[420px]"
        srcClass="size-25"
        src="/image/caution.png"
      />
    </PageShell>
  );
}

/**
 * What deleting a room does, and when it will not happen.
 *
 * The room's own usage count is read here rather than left to the refusal,
 * because saying so BEFORE the press is better than a 409 after it. The server
 * still refuses - this is a warning, not the gate.
 */
function deleteBody(room: Room | null): string {
  if (!room) return "";
  if (room.usage.lessons || room.usage.exam_papers) {
    return `${room.name} holds ${room.usage.label.toLowerCase()}, so this will be refused. Deactivate it instead: it stops being offered when anyone picks a room, and everything already scheduled here stays intact.`;
  }
  return `${room.name} has nothing scheduled in it, so it will be removed outright. To keep it on file but out of use, deactivate it instead.`;
}
