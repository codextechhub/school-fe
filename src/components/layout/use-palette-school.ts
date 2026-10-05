import { useMemo } from "react";
import { mayReadCustody, useCustodyReading } from "@/components/finance-ui/held-custody";
import { resolveActiveEntityCode } from "@/components/finance-ui/use-entity";
import { useBranchLens } from "@/hooks/use-branch-lens";
import { useReaderReach } from "@/hooks/use-reader-reach";
import { usePermissions } from "@/hooks/use-permissions";
import type { PaletteSchool } from "@/lib/action-palette";
import { selectEntityCode } from "@/redux/features/finance/entity-slice";
import { useGetEntitiesQuery } from "@/redux/services/finance/entity-api";
import { useAppSelector } from "@/redux/store";

/**
 * The school's shape as the finance sidebar reads it, for the header search.
 *
 * Both answers come from the same sources the sidebar uses, so the two cannot
 * disagree about whether a screen exists here:
 *
 *   - `multiBranch` is the branch lens's `applies`. This app's `useBranchLens`
 *     is the lens it hands the finance package, so it is the very value the
 *     sidebar reads through `useReaderBranchLens`.
 *   - `custody` is the package's `useCustodyReading`, which answers UNKNOWN to
 *     a reader who may not read the setting and while the read is in flight.
 *
 * The search box sits on every page, so the books are looked up only for a
 * reader who may read custody at all. A class teacher holding no payments key
 * sends no finance request by opening the header, and gets UNKNOWN, which
 * hides Payouts and Batches exactly as their own keys already would.
 *
 *   - `wholeSchool` is `useReaderReach`, the reach the finance screens gate
 *     their whole-school actions on, so the box offers "Add a ledger account"
 *     exactly where the Accounts screen offers New account.
 */
export function usePaletteSchool(): PaletteSchool {
  const { applies } = useBranchLens();
  const { wholeSchool } = useReaderReach();
  const { hasPermission } = usePermissions();
  const readsCustody = mayReadCustody(hasPermission);

  const selected = useAppSelector(selectEntityCode);
  const { data } = useGetEntitiesQuery({ is_active: true }, { skip: !readsCustody });
  const entity = resolveActiveEntityCode(
    selected,
    null,
    Array.isArray(data?.data) ? data.data : [],
  );
  const custody = useCustodyReading(entity, readsCustody);

  return useMemo(() => ({ multiBranch: applies, custody, wholeSchool }), [applies, custody, wholeSchool]);
}
