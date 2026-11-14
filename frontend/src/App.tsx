import { ThemeProvider } from "./context/ThemeContext";
import { InvestigationProvider } from "./context/InvestigationContext";
import { TarkaGlobalProvider } from "./context/TarkaGlobalContext";
import { TarkaGlobalShell } from "./components/shell/TarkaGlobalShell";
import { V6AppShell } from "./v6/shell/V6AppShell";
import "./styles/tokens.css";
import "./styles/liquid-glass.css";
import "./styles/bento-executive.css";
import "./v6/styles/v6-tokens.css";
import "./App.css";

function App() {
  const isLegacy =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("legacy") === "1";

  return (
    <ThemeProvider>
      <InvestigationProvider>
        <TarkaGlobalProvider>
          {isLegacy ? <TarkaGlobalShell /> : <V6AppShell />}
        </TarkaGlobalProvider>
      </InvestigationProvider>
    </ThemeProvider>
  );
}

export default App;
