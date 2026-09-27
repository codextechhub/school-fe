import { useMemo } from "react";

import { useCapabilities } from "@/hooks/use-capabilities";
import { selectPermissions } from "@/redux/features/auth/auth-slice";
import { useAppSelector } from "@/redux/store";

import type { GuideReader } from "./discovery";

/** The signed-in reader, as every guide filter needs them: role and plan. */
export function useGuideReader(): GuideReader {
  const permissions = useAppSelector(selectPermissions);
  const { hasCapability } = useCapabilities();
  return useMemo(() => ({ permissions, hasCapability }), [permissions, hasCapability]);
}
