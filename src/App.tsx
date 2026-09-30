import { RouterProvider } from "react-router";
import { router } from "./routes";
import { FilePreviewHost } from "@xvs/finance/components/finance-ui/file-preview-dialog";

// No app-wide <Toaster/> here: toasts are mounted per shell so they can sit
// over the work area. DashboardLayout mounts the sidebar-aware WorkspaceToaster;
// AuthLayout mounts the AuthToaster. See components/ui/sonner.tsx.
function App() {
  return <><RouterProvider router={router} /><FilePreviewHost /></>;
}

export default App;
