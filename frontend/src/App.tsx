import { useState } from "react";
import { ThemeProvider } from "./context/ThemeContext";
import { InvestigationProvider } from "./context/InvestigationContext";
import { TarkaGlobalProvider } from "./context/TarkaGlobalContext";
import { TarkaGlobalShell } from "./components/shell/TarkaGlobalShell";
import { InvestigationCanvas } from "./components/InvestigationCanvas";
import "./styles/tokens.css";
import "./styles/liquid-glass.css";
import "./styles/bento-executive.css";
import "./App.css";

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
            <InvestigationCanvas />
          ) : (
            <TarkaGlobalShell />
          )}
        </TarkaGlobalProvider>
      </InvestigationProvider>
    </ThemeProvider>
  );
}

export default App;
