import { Navigate, useSearchParams } from "react-router";
import { UserRound } from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { OutlinedNotice } from "@/pages/protected/onboarding/components/outlined-notice";
import { routesPath } from "@/routes/routesPath";
import { useGetMyStaffRecordQuery } from "@/redux/services/staff/staff-api";

/**
 * `/staff/me`: the signed-in person's own staff record, whatever its id.
 *
 * Every member of staff reaches their own record, and it is where they apply
 * for leave and correct their details, but a teacher holds no directory key
 * and so has no list to find themselves in. The account menu and the search
 * box link here; this asks the server which record is theirs and moves on to
 * it, keeping any `?tab=` so "Apply for leave" lands on the Leave tab.
 */
export default function MyStaffRecord() {
  const [params] = useSearchParams();
  const { data, isLoading, isError } = useGetMyStaffRecordQuery();

  if (data?.data?.id) {
    const query = params.toString();
    const to = routesPath.PROTECTED.STAFF.PROFILE_ID(data.data.id);
    return <Navigate replace to={query ? `${to}?${query}` : to} />;
  }

  return (
    <PageShell>
      {isLoading || !isError ? (
        <Skeleton className="h-36 w-full rounded-xl" />
      ) : (
        <OutlinedNotice
          icon={UserRound}
          title="You have no staff record here"
          body="Your account is not on this school's staff list. Ask a school administrator to add you if you work here."
        />
      )}
    </PageShell>
  );
}
