import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallback?: ReactNode | ((error: Error, reset: () => void) => ReactNode);
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[TARKA ErrorBoundary Caught]:", error, errorInfo);
    this.setState({ errorInfo });
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      if (typeof this.props.fallback === "function") {
        return this.props.fallback(this.state.error || new Error("Unknown error"), this.handleReset);
      }
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          role="alert"
          style={{
            margin: "16px",
            padding: "24px",
            background: "#0F172A",
            border: "1px solid rgba(239, 68, 68, 0.4)",
            borderRadius: "12px",
            color: "#F8FAFC",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            maxWidth: "720px",
            boxShadow: "0 8px 30px rgba(0, 0, 0, 0.35)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "8px",
                background: "rgba(239, 68, 68, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#EF4444",
                flexShrink: 0,
              }}
            >
              <AlertTriangle size={20} />
            </div>
            <div>
              <div style={{ fontSize: "14px", fontWeight: 700, color: "#F8FAFC" }}>
                {this.props.fallbackTitle || "Component Temporarily Unavailable"}
              </div>
              <div style={{ fontSize: "12px", color: "#94A3B8", marginTop: "2px" }}>
                TARKA isolated a component render error. The main application remains active.
              </div>
            </div>
          </div>

          {this.state.error && (
            <div
              style={{
                padding: "10px 12px",
                background: "rgba(0, 0, 0, 0.4)",
                borderRadius: "6px",
                fontSize: "11.5px",
                fontFamily: "var(--font-mono, monospace)",
                color: "#FCA5A5",
                whiteSpace: "pre-wrap",
                wordBreak: "break-all",
                maxHeight: "120px",
                overflowY: "auto",
              }}
            >
              {this.state.error.message || String(this.state.error)}
            </div>
          )}

          <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
            <button
              type="button"
              onClick={this.handleReset}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 14px",
                borderRadius: "6px",
                background: "#3B82F6",
                color: "#FFFFFF",
                fontSize: "12px",
                fontWeight: 600,
                border: "none",
                cursor: "pointer",
              }}
            >
              <RefreshCw size={14} />
              <span>Retry Component</span>
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 14px",
                borderRadius: "6px",
                background: "rgba(255, 255, 255, 0.08)",
                color: "#E2E8F0",
                fontSize: "12px",
                fontWeight: 600,
                border: "1px solid rgba(255, 255, 255, 0.15)",
                cursor: "pointer",
              }}
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
