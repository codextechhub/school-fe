import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, Search, ShieldCheck, UserRound } from "lucide-react";
import { useNavigate } from "react-router";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  selectFieldAccess,
  selectImpersonation,
  selectPermissions,
  selectSchool,
  selectTenant,
  selectUser,
} from "@/redux/features/auth/auth-slice";
import type { AuthContextSnapshot } from "@/redux/features/auth/auth-types";
import { useAppDispatch, useAppSelector } from "@/redux/store";
import { useGetProxyTargetsQuery } from "@/redux/services/impersonation/impersonation-api";
import type { ProxyTarget } from "@/redux/services/impersonation/impersonation-types";
import { startProxySession } from "@/utils/proxy-session";

// The backend rejects anything shorter, so searching sooner would only produce
// a 400 toast.
const MIN_QUERY_LENGTH = 2;
const SEARCH_DEBOUNCE_MS = 350;

/**
 * Pick a user in this school and start viewing the app as them.
 *
 * Phone-first: the whole sheet is a single column, results are full-width rows
 * with truncating text (never a table), and the confirm button is thumb-height
 * and always on screen - starting/exiting a proxy is a "simple action" and must
 * work properly at 390px (CLAUDE.md §Responsive depth policy).
 */
export function ProxyUserDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const user = useAppSelector(selectUser);
  const school = useAppSelector(selectSchool);
  const tenant = useAppSelector(selectTenant);
  const permissions = useAppSelector(selectPermissions);
  const fieldAccess = useAppSelector(selectFieldAccess);
  const impersonation = useAppSelector(selectImpersonation);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedTarget, setSelectedTarget] = useState<ProxyTarget | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search]);

  // Closing the dialog discards the previous search so reopening it never shows
  // a stale result list. Done as a guarded render-phase adjustment rather than
  // in an effect: React's sanctioned pattern for deriving state from a changed
  // prop, and the one this repo's eslint config (react-hooks v7
  // `set-state-in-effect`) requires.
  const [wasOpen, setWasOpen] = useState(open);
  if (wasOpen !== open) {
    setWasOpen(open);
    if (!open) {
      setSearch("");
      setDebouncedSearch("");
      setSelectedTarget(null);
    }
  }

  const { data, isFetching, isError } = useGetProxyTargetsQuery(
    { search: debouncedSearch, page_size: 20 },
    { skip: !open || debouncedSearch.length < MIN_QUERY_LENGTH },
  );

  const results = Array.isArray(data?.data) ? data.data : [];

  const proxyUser = async (target: ProxyTarget) => {
    if (isStarting || target.id === impersonation?.target.id) return;
    setIsStarting(true);
    // Switching targets keeps the ORIGINAL actor snapshot: chaining proxies
    // would otherwise make the previous target look like the real admin.
    const actor: AuthContextSnapshot = impersonation?.actor ?? {
      user: user ?? null,
      school: school ?? null,
      tenant: tenant ?? null,
      permissions,
      field_access: fieldAccess,
    };
    onOpenChange(false);
    await startProxySession({ dispatch, navigate }, { target, actor });
    setIsStarting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] gap-0 overflow-hidden p-0 sm:max-w-xl">
        <DialogHeader className="border-b border-gray-100 px-4 py-4 sm:px-6 sm:py-5">
          <DialogTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="size-5 shrink-0 text-primary" />
            View as another user
          </DialogTitle>
          <DialogDescription className="text-left">
            Search an active user in your school by name or email. Everything you
            do while viewing as them is recorded against your account.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col p-4 sm:p-5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
            <input
              autoFocus
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setSelectedTarget(null);
              }}
              placeholder="Search name or email"
              aria-label="Search users to view as"
              className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50/70 pl-10 pr-10 text-sm outline-none transition focus:border-primary/40 focus:bg-white"
            />
            {isFetching && (
              <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-primary" />
            )}
          </div>

          <div
            role="listbox"
            aria-label="Matching users"
            className="mt-4 h-[45vh] max-h-[276px] min-h-[180px] overflow-y-auto rounded-xl border border-gray-100"
          >
            {search.trim().length < MIN_QUERY_LENGTH ? (
              <Empty icon={<Search className="size-5" />} text="Enter at least two characters to search." />
            ) : isFetching && !data ? (
              <Empty icon={<Loader2 className="size-5 animate-spin" />} text="Finding users…" />
            ) : isError ? (
              <Empty icon={<UserRound className="size-5" />} text="Users could not be loaded. Try again." />
            ) : results.length === 0 ? (
              <Empty icon={<UserRound className="size-5" />} text="No eligible users match your search." />
            ) : (
              <div className="divide-y divide-gray-100 p-1.5">
                {results.map((target) => {
                  const isCurrent = target.id === impersonation?.target.id;
                  const isSelected = selectedTarget?.id === target.id;
                  return (
                    <button
                      key={target.id}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      disabled={isStarting || isCurrent}
                      onClick={() => setSelectedTarget(target)}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition disabled:cursor-default disabled:opacity-60 ${
                        isSelected
                          ? "bg-primary/5 ring-1 ring-inset ring-primary/25"
                          : "hover:bg-gray-50"
                      }`}
                    >
                      <span className="grid size-9 shrink-0 place-content-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                        {initials(target.full_name)}
                      </span>
                      {/* min-w-0 is what lets the truncate below actually
                          truncate inside a flex row - without it long emails
                          push the row past a 390px viewport. */}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-black-01">
                          {target.full_name}
                        </span>
                        <span className="block truncate text-xs text-gray-500">{target.email}</span>
                        <span className="mt-0.5 block truncate text-[11px] text-gray-400">
                          {humanize(target.role) || "No role assigned"}
                        </span>
                      </span>
                      <span className="shrink-0 text-xs font-semibold text-primary">
                        {isCurrent ? "Current" : isSelected ? <CheckCircle2 className="size-5" /> : "Select"}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex-col-reverse gap-3 border-t border-gray-100 bg-gray-50/60 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <p className="min-w-0 truncate text-xs text-gray-500">
            {selectedTarget ? (
              <>
                Selected: <span className="font-semibold text-black-01">{selectedTarget.full_name}</span>
              </>
            ) : (
              "Select a user to continue."
            )}
          </p>
          <Button
            type="button"
            size="default"
            className="w-full shrink-0 gap-2 sm:w-auto"
            disabled={!selectedTarget || isStarting}
            onClick={() => selectedTarget && proxyUser(selectedTarget)}
          >
            {isStarting && <Loader2 className="size-4 animate-spin" />}
            View as user
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Empty({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="grid h-full place-content-center gap-2 px-6 text-center text-sm text-gray-400">
      <span className="mx-auto">{icon}</span>
      <span>{text}</span>
    </div>
  );
}

function initials(name?: string | null): string {
  if (!name) return "";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  const first = parts[0][0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] ?? "" : "";
  return (first + last).toUpperCase();
}

function humanize(value?: string | null): string {
  if (!value) return "";
  return value
    .replace(/[_-]+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
