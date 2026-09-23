import React, { useState } from "react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [email, setEmail] = useState("investigator@sentinelx.gov.in");
  const [password, setPassword] = useState("••••••••••••");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSuccess();
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.card} onClick={(e) => e.stopPropagation()}>
        {/* Header Eyebrow & Close button */}
        <div style={styles.eyebrowRow}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={styles.redDot}></span>
            <span style={styles.eyebrow}>SECURE ACCESS</span>
          </div>
          <button type="button" onClick={onClose} style={styles.closeBtn}></button>
        </div>

        {/* Title & Subtitle */}
        <h2 style={styles.title}>Sign in</h2>
        <p style={styles.subtitle}>Continue to your investigation workspace.</p>

        {/* Sign In Form */}
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>EMAIL</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
              required
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>PASSWORD</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              required
            />
          </div>

          <button type="submit" style={styles.primaryBtn}>
            Sign in
          </button>
        </form>

        {/* Divider */}
        <div style={styles.dividerRow}>
          <div style={styles.line}></div>
          <span style={styles.orText}>OR</span>
          <div style={styles.line}></div>
        </div>

        {/* Google Auth Button */}
        <button
          type="button"
          onClick={onSuccess}
          style={styles.googleBtn}
        >
          Continue with Google
        </button>

        {/* Sign Up Link */}
        <div style={styles.footerLinkRow}>
          <span style={styles.newText}>New to SentinelX? </span>
          <button type="button" onClick={onSuccess} style={styles.createAccountBtn}>
            Create an account
          </button>
        </div>

        {/* Disclaimer Footer */}
        <div style={styles.disclaimerBox}>
          <p style={styles.disclaimerText}>
            SentinelX assists investigation and evidence analysis. It does not determine guilt, criminality, or legal responsibility.
          </p>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed",
    top: 0, left: 0, right: 0, bottom: 0,
    background: "rgba(28, 25, 23, 0.55)",
    backdropFilter: "blur(6px)",
    zIndex: 999999,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
  },
  card: {
    width: "100%",
    maxWidth: "460px",
    background: "#f5f2eb",
    border: "1px solid #d1c9bd",
    borderRadius: "12px",
    padding: "36px 32px 28px",
    boxShadow: "0 20px 40px rgba(0, 0, 0, 0.12), 0 2px 6px rgba(0, 0, 0, 0.05)",
    fontFamily: '"IBM Plex Sans", Inter, sans-serif',
    color: "#1c1917",
  },
  eyebrowRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "12px",
  },
  closeBtn: {
    background: "transparent",
    border: "none",
    color: "#78716c",
    fontSize: "1rem",
    fontWeight: 700,
    cursor: "pointer",
    padding: "2px 6px",
  },
  redDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    background: "#9e2a2b",
    display: "inline-block",
  },
  eyebrow: {
    fontFamily: '"Courier Prime", "IBM Plex Mono", monospace',
    fontSize: "0.68rem",
    fontWeight: 700,
    color: "#9e2a2b",
    letterSpacing: "0.12em",
  },
  title: {
    fontFamily: '"Courier Prime", "IBM Plex Mono", Georgia, serif',
    fontSize: "2.1rem",
    fontWeight: 600,
    margin: "0 0 6px 0",
    color: "#1c1917",
    letterSpacing: "-0.02em",
  },
  subtitle: {
    fontSize: "0.9rem",
    color: "#57534e",
    margin: "0 0 24px 0",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  label: {
    fontFamily: '"Courier Prime", "IBM Plex Mono", monospace',
    fontSize: "0.68rem",
    fontWeight: 700,
    color: "#57534e",
    letterSpacing: "0.1em",
  },
  input: {
    background: "#efece6",
    border: "1px solid #d1c9bd",
    borderRadius: "6px",
    padding: "11px 14px",
    fontSize: "0.92rem",
    color: "#1c1917",
    outline: "none",
    fontFamily: "inherit",
    width: "100%",
  },
  primaryBtn: {
    background: "#9e2a2b",
    color: "#ffffff",
    border: "none",
    borderRadius: "6px",
    padding: "12px 20px",
    fontSize: "0.95rem",
    fontWeight: 600,
    cursor: "pointer",
    marginTop: "8px",
    boxShadow: "0 2px 4px rgba(158, 42, 43, 0.2)",
    transition: "background 0.15s ease",
  },
  dividerRow: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    margin: "20px 0",
  },
  line: {
    flex: 1,
    height: "1px",
    background: "#e2ddd5",
  },
  orText: {
    fontFamily: '"Courier Prime", "IBM Plex Mono", monospace',
    fontSize: "0.68rem",
    fontWeight: 700,
    color: "#78716c",
  },
  googleBtn: {
    background: "#efece6",
    color: "#1c1917",
    border: "1px solid #d1c9bd",
    borderRadius: "6px",
    padding: "11px 20px",
    fontSize: "0.88rem",
    fontWeight: 600,
    cursor: "pointer",
    width: "100%",
  },
  footerLinkRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "4px",
    marginTop: "18px",
    fontSize: "0.82rem",
  },
  newText: {
    color: "#57534e",
  },
  createAccountBtn: {
    background: "transparent",
    border: "none",
    color: "#9e2a2b",
    fontWeight: 600,
    cursor: "pointer",
    textDecoration: "underline",
    fontSize: "0.82rem",
    padding: 0,
  },
  disclaimerBox: {
    marginTop: "24px",
    paddingTop: "16px",
    borderTop: "1px solid #e2ddd5",
  },
  disclaimerText: {
    fontFamily: '"Courier Prime", "IBM Plex Mono", monospace',
    fontSize: "0.68rem",
    color: "#78716c",
    lineHeight: "1.45",
    margin: 0,
    textAlign: "center",
  },
};
