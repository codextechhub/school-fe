/** Small presentational pieces shared by the chart, the detail drawer and Manage. */

import { skipToken } from "@reduxjs/toolkit/query";
import { Ban, Sparkles, Users } from "lucide-react";
import type { StaffHolder } from "@/redux/services/staff/organogram-types";
import { useFetchAuthMediaQuery } from "@/redux/services/media-api";
import { cn } from "@/lib/utils";
import { avatarColor, initialsOf } from "../lib/org-helpers";

/**
 * A holder's face, or their initials.
 *
 * The photo is a media path that needs the session's token, so it is fetched
 * through the media query and drawn from a local blob; an `<img>` pointed at
 * the path directly would be refused.
 */
export function OrgAvatar({
  user,
  size = 36,
  ring = false,
}: {
  user?: Pick<StaffHolder, "id" | "full_name" | "photo"> & Partial<Pick<StaffHolder, "is_suspended">> | null;
  size?: number;
  ring?: boolean;
}) {
  const { data: blobUrl } = useFetchAuthMediaQuery(user?.photo || skipToken);
  const src = user?.photo ? blobUrl : undefined;
  const initials = user ? initialsOf(user.full_name) || "-" : "-";
  const color = user ? avatarColor(user.id) : "bg-slate-100 text-slate-400";
  return (
    <span
      className={cn("relative inline-flex shrink-0", user?.is_suspended && "opacity-50 grayscale")}
      style={{ width: size, height: size }}
    >
      {src ? (
        <img
          src={src}
          alt={user?.full_name ?? ""}
          className={cn("rounded-full object-cover border border-pry-01", ring && "ring-2 ring-white")}
          style={{ width: size, height: size }}
        />
      ) : (
        <span
          className={cn(
            "inline-flex items-center justify-center rounded-full font-semibold",
            color,
            ring && "ring-2 ring-white",
          )}
          style={{ width: size, height: size, fontSize: size * 0.38 }}
        >
          {initials}
        </span>
      )}
    </span>
  );
}

export function ActingBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-200">
      <Sparkles className="size-2.5" />
      Acting
    </span>
  );
}

/** A holder whose employment or account is suspended; they keep the post. */
export function SuspendedBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-600 ring-1 ring-rose-200">
      <Ban className="size-2.5" />
      Suspended
    </span>
  );
}

export function DeptChip({ name, onClick }: { name?: string | null; onClick?: (e: React.MouseEvent) => void }) {
  if (!name) return null;
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600 hover:bg-slate-200 transition-colors"
    >
      <span className="h-1.5 w-1.5 rounded-sm bg-indigo-400" />
      {name}
    </button>
  );
}

/** Which branch a unit or post belongs to; "School-wide" when none. */
export function BranchChip({ name }: { name?: string | null }) {
  return (
    <span className="inline-flex items-center rounded-md bg-white-03 px-1.5 py-0.5 text-[11px] font-medium text-gray-01 ring-1 ring-white-02">
      {name || "School-wide"}
    </span>
  );
}

export function ReportsBadge({ direct, total }: { direct: number; total?: number }) {
  if (!direct) return null;
  const showTotal = total !== undefined && total > direct;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-600 ring-1 ring-indigo-100"
      title={showTotal ? `${direct} | ${total} (incl. indirect) reports` : `${direct} direct report${direct === 1 ? "" : "s"}`}
    >
      <Users className="size-2.5" />
      {showTotal ? (
        <span>{direct}<span className="text-indigo-300"> | </span>{total}</span>
      ) : (
        direct
      )}
    </span>
  );
}

export function HolderStack({ users, onPick }: { users: StaffHolder[]; onPick: (u: StaffHolder) => void }) {
  const shown = users.slice(0, 4);
  return (
    <div className="flex items-center">
      <div className="flex -space-x-2">
        {shown.map((u) => (
          <button
            type="button"
            key={u.id}
            onClick={(e) => {
              e.stopPropagation();
              onPick(u);
            }}
            title={u.is_suspended ? `${u.full_name} (suspended)` : u.full_name}
            className="transform rounded-full transition-transform hover:z-10 hover:-translate-y-0.5"
          >
            <OrgAvatar user={u} size={28} ring />
          </button>
        ))}
      </div>
      {users.length > shown.length && <span className="ml-1.5 text-xs font-medium text-slate-400">+{users.length - shown.length}</span>}
    </div>
  );
}
