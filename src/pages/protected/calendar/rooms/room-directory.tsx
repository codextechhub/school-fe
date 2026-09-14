import { createElement } from "react";
import {
  ArrowRight,
  BookOpen,
  Building2,
  Pencil,
  Power,
  Trash2,
  UsersRound,
} from "lucide-react";

import CustomTable from "@/components/custom/custom-table";
import { CardActions, ClickableCard, Panel } from "@/components/custom/surface";
import { Badge } from "@/components/ui/badge";
import { Pager } from "@/pages/protected/students/pager";
import type { Room } from "@/redux/services/calendar/calendar-types";
import { RowActions } from "../components/row-actions";
import { roomIcon } from "../components/room-kind";

export function RoomDirectory({
  rooms,
  view,
  multiBranch,
  canEdit,
  canDelete,
  page,
  totalPages,
  onEdit,
  onToggle,
  onDelete,
  onPageChange,
}: {
  rooms: Room[];
  view: "cards" | "table";
  multiBranch: boolean;
  canEdit: boolean;
  canDelete: boolean;
  page: number;
  totalPages: number;
  onEdit: (room: Room) => void;
  onToggle: (room: Room) => void;
  onDelete: (room: Room) => void;
  onPageChange: (page: number) => void;
}) {
  if (view === "cards") {
    return (
      <>
        <ul className="grid min-w-0 items-start gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rooms.map((room) => (
            <li key={room.id}>
              <RoomCard
                room={room}
                multiBranch={multiBranch}
                canEdit={canEdit}
                canDelete={canDelete}
                onEdit={() => onEdit(room)}
                onToggle={() => onToggle(room)}
                onDelete={() => onDelete(room)}
              />
            </li>
          ))}
        </ul>
        <div className="mt-5">
          <Pager page={page} totalPages={totalPages} onGo={onPageChange} />
        </div>
      </>
    );
  }

  return (
    <CustomTable
      tableHeaderList={[
        "Room",
        "Type",
        "Capacity",
        ...(multiBranch ? ["Branch"] : []),
        "Usage",
        "Status",
        "Action",
      ]}
      defaultBodyList={rooms}
      tableBodyList={rooms.map((room) => ({
        Room: (
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="truncate font-medium text-black-01">{room.name}</span>
            <span className="text-xs text-gray-05">{room.code || "No code"}</span>
          </span>
        ),
        Type: <RoomTypeCell room={room} />,
        Capacity:
          room.capacity == null ? "Not recorded" : `${room.capacity} students`,
        ...(multiBranch ? { Branch: room.branch_name ?? "Not recorded" } : {}),
        Usage: room.usage.label,
        Status: (
          <Badge
            variant={room.is_active ? "active" : "inactive"}
            className="rounded-full py-0 text-[11px]"
          >
            {room.is_active ? "Active" : "Inactive"}
          </Badge>
        ),
        Action: (
          <RoomActions
            room={room}
            canEdit={canEdit}
            canDelete={canDelete}
            onEdit={() => onEdit(room)}
            onToggle={() => onToggle(room)}
            onDelete={() => onDelete(room)}
          />
        ),
      }))}
      onRowClick={(room: Room) => room && canEdit && onEdit(room)}
      currentPage={page}
      totalPage={totalPages}
      onPageChange={(next) => onPageChange(Number(next) || 1)}
      emptyText="No rooms"
    />
  );
}

/**
 * A room summary with the facts needed before it is selected for a lesson.
 * The card only opens for editors; independent actions remain available to
 * readers with narrower management permissions.
 */
export function RoomCard({
  room,
  multiBranch,
  canEdit,
  canDelete,
  onEdit,
  onToggle,
  onDelete,
}: {
  room: Room;
  multiBranch: boolean;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const content = (
    <>
      <div className="relative grid h-24 place-content-center border-b border-border bg-pry-01/40">
        <span
          className="grid size-14 place-content-center rounded-2xl border border-primary/10 bg-white text-primary shadow-sm"
          aria-label={room.type_label}
          role="img"
        >
          {createElement(roomIcon(room.room_type), { className: "size-6" })}
        </span>
        <Badge
          variant={room.is_active ? "active" : "inactive"}
          className="absolute right-3 top-3 rounded-full py-0 text-[10px]"
        >
          {room.is_active ? "Active" : "Inactive"}
        </Badge>
      </div>

      <div className="p-4">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate font-mont text-[15px] font-semibold text-black-01">
              {room.name}
            </h3>
            <p className="mt-0.5 text-xs text-gray-05">{room.code || "No code"}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {(canEdit || canDelete) && (
              <CardActions>
                <RoomActions
                  room={room}
                  canEdit={canEdit}
                  canDelete={canDelete}
                  onEdit={onEdit}
                  onToggle={onToggle}
                  onDelete={onDelete}
                />
              </CardActions>
            )}
            {canEdit && (
              <ArrowRight className="size-4 text-gray-02 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
            )}
          </div>
        </div>

        <dl className="mt-4 grid gap-2.5 text-xs">
          <RoomFact
            icon={roomIcon(room.room_type)}
            label="Room type"
            value={room.type_label}
          />
          <RoomFact
            icon={UsersRound}
            label="Capacity"
            value={
              room.capacity == null
                ? "Not recorded"
                : `${room.capacity} students`
            }
          />
          {multiBranch && (
            <RoomFact
              icon={Building2}
              label="Branch"
              value={room.branch_name ?? "Not recorded"}
            />
          )}
          <RoomFact icon={BookOpen} label="Scheduled use" value={room.usage.label} />
        </dl>
      </div>
    </>
  );

  if (!canEdit) {
    return <Panel className="h-fit overflow-hidden">{content}</Panel>;
  }

  return (
    <ClickableCard
      label={`Edit ${room.name}`}
      onOpen={onEdit}
      className="group h-fit overflow-hidden p-0"
    >
      {content}
    </ClickableCard>
  );
}

function RoomFact({
  icon,
  label,
  value,
}: {
  icon: typeof UsersRound;
  label: string;
  value: string;
}) {
  return (
    <div className="grid min-w-0 grid-cols-[1rem_5.5rem_minmax(0,1fr)] items-start gap-2">
      {createElement(icon, { className: "mt-0.5 size-3.5 text-primary" })}
      <dt className="font-semibold text-gray-06">{label}</dt>
      <dd className="min-w-0 text-gray-05 text-pretty">{value}</dd>
    </div>
  );
}

function RoomActions({
  room,
  canEdit,
  canDelete,
  onEdit,
  onToggle,
  onDelete,
}: {
  room: Room;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <RowActions
      label={`Actions for ${room.name}`}
      actions={[
        canEdit && { label: "Edit", icon: Pencil, onSelect: onEdit },
        canEdit && {
          label: room.is_active ? "Deactivate" : "Activate",
          icon: Power,
          onSelect: onToggle,
        },
        canDelete && {
          label: "Delete",
          icon: Trash2,
          destructive: true,
          onSelect: onDelete,
        },
      ]}
    />
  );
}

function RoomTypeCell({ room }: { room: Room }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {createElement(roomIcon(room.room_type), {
        className: "size-3.5 shrink-0 text-gray-05",
      })}
      {room.type_label}
    </span>
  );
}
