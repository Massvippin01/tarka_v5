import { useState, lazy, Suspense } from "react";
import { ThemeProvider } from "./context/ThemeContext";
import { InvestigationProvider } from "./context/InvestigationContext";
import { TarkaGlobalProvider } from "./context/TarkaGlobalContext";
import { TarkaGlobalShell } from "./components/shell/TarkaGlobalShell";
import "./styles/tokens.css";
import "./styles/liquid-glass.css";
import "./styles/bento-executive.css";
import "./App.css";

const InvestigationCanvas = lazy(() =>
  import("./components/InvestigationCanvas").then((m) => ({ default: m.InvestigationCanvas }))
);

function App() {
  const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const [viewMode] = useState<"v5-shell" | "canvas">(
    params.get("view") === "canvas" ? "canvas" : "v5-shell"
  );

  return (
    <ThemeProvider>
      <InvestigationProvider>
        <TarkaGlobalProvider>
          {viewMode === "canvas" ? (
            <Suspense fallback={<div className="p-4 text-cyan-400 font-mono text-xs">Loading Investigation Canvas...</div>}>
              <InvestigationCanvas />
            </Suspense>
          ) : (
            <TarkaGlobalShell />
          )}
        </TarkaGlobalProvider>
      </InvestigationProvider>
    </ThemeProvider>
  );
}

export default App;
