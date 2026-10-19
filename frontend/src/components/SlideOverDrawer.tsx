import React from "react";

interface SlideOverDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  width?: string;
  children: React.ReactNode;
}

export const SlideOverDrawer: React.FC<SlideOverDrawerProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  width = "480px",
  children,
}) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        bottom: 0,
        width: width,
        maxWidth: "90vw",
        background: "var(--surface-primary)",
        borderLeft: "1px solid var(--border-subtle)",
        boxShadow: "-8px 0 24px rgba(0, 0, 0, 0.6)",
        display: "flex",
        flexDirection: "column",
        zIndex: 50,
        animation: "slideInRight 0.15s ease-out",
      }}
    >
      {/* Drawer Header */}
      <div
        style={{
          height: "48px",
          background: "var(--surface-secondary)",
          borderBottom: "1px solid var(--border-subtle)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 16px",
        }}
      >
        <div>
          <div style={{ fontWeight: 800, fontSize: "0.85rem", color: "var(--text-primary)" }}>{title}</div>
          {subtitle && <div style={{ fontSize: "0.62rem", color: "var(--text-muted)" }}>{subtitle}</div>}
        </div>
        <button
          onClick={onClose}
          style={{
            background: "transparent",
            border: "1px solid var(--border-subtle)",
            color: "var(--text-secondary)",
            padding: "4px 8px",
            borderRadius: "4px",
            fontSize: "0.75rem",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
           CLOSE
        </button>
      </div>

      {/* Drawer Body */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>{children}</div>
    </div>
  );
};
