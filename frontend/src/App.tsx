import { InvestigationProvider } from "./context/InvestigationContext";
import { InvestigationCanvas } from "./components/InvestigationCanvas";
import "./styles/tokens.css";
import "./App.css";

function App() {
  return (
    <InvestigationProvider>
      <InvestigationCanvas />
    </InvestigationProvider>
  );
}

export default App;