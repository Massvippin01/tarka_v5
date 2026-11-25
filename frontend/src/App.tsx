import { useState, useEffect } from "react";
import { ThemeProvider } from "./context/ThemeContext";
import { InvestigationProvider } from "./context/InvestigationContext";
import { TarkaGlobalProvider } from "./context/TarkaGlobalContext";
import { TarkaGlobalShell } from "./components/shell/TarkaGlobalShell";
import { V6AppShell } from "./v6/shell/V6AppShell";
import { TarkaForensicWorkstation } from "./components/tarka/TarkaForensicWorkstation";
import { InvestigationCanvas } from "./components/InvestigationCanvas";
import "./styles/tokens.css";
import "./styles/liquid-glass.css";
import "./styles/bento-executive.css";
import "./v6/styles/v6-tokens.css";
import "./App.css";

function App() {
  const [params, setParams] = useState<URLSearchParams>(
    () => new URLSearchParams(typeof window !== "undefined" ? window.location.search : "")
  );

  useEffect(() => {
    const handlePopState = () => {
      setParams(new URLSearchParams(window.location.search));
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const isLegacy = params.get("legacy") === "1";
  const isCanvas = params.get("view") === "canvas";
  const isForensics = params.get("mode") === "forensics" || params.has("tab");

  return (
    <ThemeProvider>
      <InvestigationProvider>
        <TarkaGlobalProvider>
          {isCanvas ? (
            <InvestigationCanvas />
          ) : isForensics ? (
            <TarkaForensicWorkstation />
          ) : isLegacy ? (
            <TarkaGlobalShell />
          ) : (
            <V6AppShell />
          )}
        </TarkaGlobalProvider>
      </InvestigationProvider>
    </ThemeProvider>
  );
}

export default App;
