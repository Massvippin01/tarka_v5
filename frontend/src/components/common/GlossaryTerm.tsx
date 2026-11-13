import React from "react";

export interface GlossaryTermProps {
  term: string;
  explanation?: string;
  children?: React.ReactNode;
}

export const GLOSSARY: Record<string, string> = {
  CGNAT: "Carrier-Grade NAT: Thousands of subscribers share 1 public IP. Port and timestamp matching isolate the exact phone.",
  JA4: "JA4 TLS Fingerprint: Cryptographic signature of an app's SSL handshake. Proves accounts were accessed by the same client.",
  TAC: "Type Allocation Code: The first 8 digits of an IMEI identifying the exact phone model (e.g., Poco X5 5G).",
  "Z3 SMT": "Z3 Satisfiability Modulo Theories solver: Mathematically proves timestamps across disparate bank and telecom servers cannot be coincidence.",
  LIBR: "Lowest Intermediate Balance Rule: Statutory banking principle (Clayton's Case) establishing that victim funds remain recoverable even after layering.",
  BSSID: "Basic Service Set Identifier: The hardware MAC address of a Wi-Fi hotspot, placing suspects at the exact same router.",
  "Dinic Min-Cut": "Network flow algorithm: Identifies the absolute minimum number of accounts to freeze to block 100% of the theft outflow.",
  "BSA §63(4)": "Bharatiya Sakshya Adhiniyam, 2023: Indian legal certification required to admit electronic device records into court.",
  "BNSS §106": "Bharatiya Nagarik Suraksha Sanhita, 2023: Police power to issue summons and seize evidence in ongoing investigations.",
  "BNSS §107": "Bharatiya Nagarik Suraksha Sanhita, 2023: Police and judicial power to attach and freeze crime proceeds and bank balances.",
  "Golden Hour": "The first 2–4 hours post-theft where rapid bank freezing achieves >80% victim fund recovery before ATM cashout.",
};

export const GlossaryTerm: React.FC<GlossaryTermProps> = ({ term, explanation, children }) => {
  const tooltipText = explanation || GLOSSARY[term] || term;

  return (
    <span
      className="glossary-term inline-flex items-center gap-0.5 cursor-help"
      title={`${term}: ${tooltipText}`}
      style={{
        textDecoration: "underline dotted #94A3B8",
        textUnderlineOffset: "3px",
      }}
    >
      <span>{children || term}</span>
      <span
        style={{
          fontSize: "9px",
          color: "#64748B",
          fontWeight: 700,
          background: "#F1F5F9",
          borderRadius: "50%",
          width: "12px",
          height: "12px",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          marginLeft: "2px",
        }}
      >
        ?
      </span>
    </span>
  );
};
