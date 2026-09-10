import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import AppProvider from "./redux/provider.tsx";
import { installStaleChunkReload } from "@/utils/stale-chunk";
// The sidebar mark writes the XVS wordmark in this on hover, the same face the
// CodeX console draws its own wordmark from; nothing else uses it, and it is
// one weight of one face.
import "@fontsource/grand-hotel/400.css";
// Geist is the app's typeface, the same one the CodeX console uses. Two
// variable files rather than ten static weights across two families, so this
// is fewer bytes as well as one voice across both products. Mono carries
// figures: money and codes line up in a column.
import "@fontsource-variable/geist/index.css";
import "@fontsource-variable/geist-mono/index.css";

// Recover from stale dynamic-import chunks after a redeploy (guarded reload).
installStaleChunkReload();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppProvider>
      <App />
    </AppProvider>
  </StrictMode>,
);
