import { ThemeProvider } from "./context/ThemeContext";
import { InvestigationProvider } from "./context/InvestigationContext";
import { TarkaGlobalProvider } from "./context/TarkaGlobalContext";
import { TarkaGlobalShell } from "./components/shell/TarkaGlobalShell";
import "./styles/tokens.css";
import "./styles/liquid-glass.css";
import "./styles/bento-executive.css";
import "./App.css";

function App() {
  return (
    <ThemeProvider>
      <InvestigationProvider>
        <TarkaGlobalProvider>
          <TarkaGlobalShell />
        </TarkaGlobalProvider>
      </InvestigationProvider>
    </ThemeProvider>
  );
}

export default App;
