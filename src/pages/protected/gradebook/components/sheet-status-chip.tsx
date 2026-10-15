import { Badge } from "@/components/ui/badge";
import type { SheetStatus } from "@/redux/services/gradebook/gradebook-types";

import { SHEET_STATUS } from "./sheet-status";

export function SheetStatusChip({ status }: { status: SheetStatus }) {
  const chip = SHEET_STATUS[status];
  return (
    <Badge variant={chip.variant} className="rounded-full">
      {chip.text}
    </Badge>
  );
}
