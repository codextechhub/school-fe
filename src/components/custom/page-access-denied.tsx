import { ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  message?: string;
  /**
   * Optional in-content "Go Back" button. The header's own back affordance
   * comes from the route handle - this is only the extra button some denial
   * screens render inside the panel.
   */
  onBack?: () => void;
}

// Content-only: the surrounding chrome (sidebar, header, title, back) is
// supplied by the DashboardLayout route above every protected page, so this
// must NOT render a layout of its own or the shell would be nested twice.
export default function PageAccessDenied({
  message = "You don't have permission to view this page. Contact your administrator if you think this is a mistake.",
  onBack,
}: Props) {
  return (
    <div className="flex h-[60vh] flex-col items-center justify-center gap-4 text-center px-4">
      <div className="rounded-full bg-gray-100 p-4">
        <ShieldOff className="size-8 text-gray-400" />
      </div>
      <div className="space-y-1.5">
        <p className="text-base font-semibold font-mont text-black-01">Access Denied</p>
        <p className="text-sm text-gray-01 max-w-xs mx-auto">{message}</p>
      </div>
      {onBack && (
        <Button variant="white" size="sm" onClick={onBack}>
          Go Back
        </Button>
      )}
    </div>
  );
}
