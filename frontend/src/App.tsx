import { useState } from "react";
import { ThemeProvider } from "./context/ThemeContext";
import { InvestigationProvider } from "./context/InvestigationContext";
import { InvestigationCanvas } from "./components/InvestigationCanvas";
import { TarkaForensicWorkstation } from "./components/tarka/TarkaForensicWorkstation";
import "./styles/tokens.css";
import "./styles/liquid-glass.css";
import "./App.css";

function App() {
  const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const [viewMode] = useState<"tarka" | "canvas">(
    params.get("view") === "canvas" ? "canvas" : "tarka"
  );

  return (
    <ThemeProvider>
      <InvestigationProvider>
        {viewMode === "tarka" ? (
          <TarkaForensicWorkstation />
        ) : (
          <InvestigationCanvas />
        )}
      </InvestigationProvider>
    </ThemeProvider>
  );
}

export default App;