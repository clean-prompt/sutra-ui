import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ShortcutProvider, TooltipProvider } from "@sutra/ui";
import { App } from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ShortcutProvider>
      <TooltipProvider>
        <App />
      </TooltipProvider>
    </ShortcutProvider>
  </StrictMode>
);
