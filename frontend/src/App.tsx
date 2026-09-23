import { ThemeProvider } from "./context/ThemeContext";
import { InvestigationProvider } from "./context/InvestigationContext";
import { InvestigationCanvas } from "./components/InvestigationCanvas";
import "./styles/tokens.css";
import "./App.css";

function App() {
  return (
    <ThemeProvider>
      <InvestigationProvider>
        <InvestigationCanvas />
      </InvestigationProvider>
    </ThemeProvider>
  );
}

export default App;