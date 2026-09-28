import { CircleAlert, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { readOnlySentence, type ReadOnlyReason, type ReadOnlyWording } from "../use-settings-write";

/** A section's placeholder while its first request is in flight. */
export function SectionLoading({ label }: { label: string }) {
  return (
    <div className="space-y-4" aria-busy>
      <span className="sr-only">{label}</span>
      <Skeleton className="h-6 w-48" aria-hidden />
      <Skeleton className="h-64 w-full rounded-xl" aria-hidden />
    </div>
  );
}

/**
 * A section whose read failed.
 *
 * A 403 is said as what it is, not as a fault to retry: the reader's role
 * changed under them, or the school's plan did.
 */
export function SectionLoadError({
  forbidden,
  retry,
}: {
  forbidden?: boolean;
  retry: () => void;
}) {
  const Icon = forbidden ? ShieldOff : CircleAlert;
  return (
    <div className="rounded-xl border border-white-02 bg-white px-4 py-8 text-center sm:px-6">
      <Icon className="mx-auto size-6 text-gray-05" />
      <p className="mt-3 font-mont text-sm font-semibold text-gray-01">
        {forbidden ? "This section is not open to your account" : "We could not load this section"}
      </p>
      <p className="mx-auto mt-1 max-w-md font-mont text-xs leading-5 text-gray-05">
        {forbidden
          ? "Your role does not carry access to it. Ask your school administrator if you need it."
          : "Something went wrong on the way to the server. Nothing has changed."}
      </p>
      {!forbidden && (
        <Button variant="outline" size="sm" className="mt-4" onClick={retry}>
          Try again
        </Button>
      )}
    </div>
  );
}

/** {@link readOnlySentence} as the line under a form, or nothing when the reader may change it. */
export function ReadOnlyNote({
  reason,
  ...wording
}: ReadOnlyWording & { reason: ReadOnlyReason | null }) {
  if (!reason) return null;
  return (
    <p className="font-mont text-xs leading-5 text-gray-05">{readOnlySentence(reason, wording)}</p>
  );
}
