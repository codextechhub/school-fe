import { RouterProvider } from "react-router";
import { router } from "./routes";

// No app-wide <Toaster/> here: toasts are mounted per shell so they can sit
// over the work area. DashboardLayout mounts the sidebar-aware WorkspaceToaster;
// AuthLayout mounts the AuthToaster. See components/ui/sonner.tsx.
function App() {
  return <RouterProvider router={router} />;
}

export default App;
