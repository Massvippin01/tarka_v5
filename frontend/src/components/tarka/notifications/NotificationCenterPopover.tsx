import React, { useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import {
  Bell,
  Clock,
  CheckCircle2,
  Lock,
  ArrowRight,
  ExternalLink,
  Check,
} from "lucide-react";
import type { ActiveRoute } from "../../../context/TarkaGlobalContext";

export interface SystemNotification {
  id: string;
  type: "GOLDEN_HOUR" | "BANK_ACK" | "PIPELINE_DONE" | "ASSIGNMENT";
  caseId: string;
  firNumber: string;
  title: string;
  message: string;
  timestamp: string;
  targetRoute: ActiveRoute;
  isRead: boolean;
}

interface NotificationCenterPopoverProps {
  onNavigateToCase: (caseId: string, route: ActiveRoute) => void;
  onOpenAuditTrail: () => void;
}

export const NotificationCenterPopover: React.FC<NotificationCenterPopoverProps> = ({
  onNavigateToCase,
  onOpenAuditTrail,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const [notifications, setNotifications] = useState<SystemNotification[]>([
    {
      id: "notif-001",
      type: "GOLDEN_HOUR",
      caseId: "CASE-2026-002",
      firNumber: "FIR #882/2026",
      title: "Golden Hour Urgency: 38m Remaining",
      message: "Dr. Meera Nair extortion case approaching 180m statutory SLA limit. 3 suspect accounts pending freeze directives.",
      timestamp: "5m ago",
      targetRoute: "report",
      isRead: false,
    },
    {
      id: "notif-002",
      type: "BANK_ACK",
      caseId: "CASE-2026-001",
      firNumber: "FIR #149/2026",
      title: "Bank Freeze Confirmed: ₹1,80,000",
      message: "Axis Bank nodal officer acknowledged §106/§107 BNSS freeze directive on Vikram Shah mule account.",
      timestamp: "12m ago",
      targetRoute: "report",
      isRead: false,
    },
    {
      id: "notif-003",
      type: "PIPELINE_DONE",
      caseId: "CASE-2026-001",
      firNumber: "FIR #149/2026",
      title: "Evidence Ingestion & Graph Attested",
      message: "5-File forensic package (Finacle, NPCI Switch, KYC, Airtel CGNAT, 1930) successfully joined with Z3 verification.",
      timestamp: "28m ago",
      targetRoute: "network",
      isRead: true,
    },
    {
      id: "notif-004",
      type: "ASSIGNMENT",
      caseId: "CASE-2026-004",
      firNumber: "FIR #405/2026",
      title: "Case Assigned: Lead IO",
      message: "You have been assigned as Lead Investigating Officer for DCP Impersonation syndicate case.",
      timestamp: "1h ago",
      targetRoute: "intake",
      isRead: true,
    },
  ]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const handleItemClick = (notif: SystemNotification) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
    );
    setIsOpen(false);
    onNavigateToCase(notif.caseId, notif.targetRoute);
  };

  return (
    <Popover.Root open={isOpen} onOpenChange={setIsOpen}>
      {/* Bell Trigger Button */}
      <Popover.Trigger asChild>
        <button
          type="button"
          data-testid="notification-bell-button"
          style={{
            position: "relative",
            width: "28px",
            height: "28px",
            borderRadius: "6px",
            background: isOpen ? "#EEF2FF" : "#F8FAFC",
            border: `1px solid ${isOpen ? "#818CF8" : "#CBD5E1"}`,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: "#334155",
            transition: "all 0.15s ease",
            flexShrink: 0,
          }}
          title="Operational Notifications & Alerts"
        >
          <Bell size={15} color={unreadCount > 0 ? "var(--flow)" : "var(--fg-3)"} />
          {unreadCount > 0 && (
            <span
              style={{
                position: "absolute",
                top: "3px",
                right: "3px",
                width: "7px",
                height: "7px",
                borderRadius: "50%",
                background: "var(--risk)",
                boxShadow: "0 0 8px var(--risk)",
              }}
            />
          )}
        </button>
      </Popover.Trigger>

      {/* Popover Portal & Content */}
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          data-testid="notification-popover"
          style={{
            width: "360px",
            maxHeight: "440px",
            background: "#FFFFFF",
            borderRadius: "10px",
            border: "1px solid #E2E8F0",
            boxShadow: "0 12px 32px -4px rgba(0, 0, 0, 0.25)",
            zIndex: 9999,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            fontFamily: "var(--font-sans, 'Plus Jakarta Sans', sans-serif)",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "10px 14px",
              background: "#F8FAFC",
              borderBottom: "1px solid #E2E8F0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "12px", fontWeight: 800, color: "#0F172A" }}>
                Operational Alerts
              </span>
              <span
                style={{
                  fontSize: "9.5px",
                  fontWeight: 800,
                  padding: "1px 5px",
                  borderRadius: "10px",
                  background: unreadCount > 0 ? "#FEE2E2" : "#F1F5F9",
                  color: unreadCount > 0 ? "#B91C1C" : "#64748B",
                }}
              >
                {unreadCount} New
              </span>
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                style={{
                  background: "transparent",
                  border: "none",
                  fontSize: "10.5px",
                  color: "#4F46E5",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "3px",
                }}
              >
                <Check size={11} />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* Notification List */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {notifications.map((notif) => {
              const isUrgent = notif.type === "GOLDEN_HOUR";
              return (
                <div
                  key={notif.id}
                  onClick={() => handleItemClick(notif)}
                  style={{
                    padding: "10px 14px",
                    borderBottom: "1px solid #F1F5F9",
                    background: notif.isRead ? "#FFFFFF" : isUrgent ? "#FFFBEB" : "#F8FAFC",
                    cursor: "pointer",
                    display: "flex",
                    gap: "10px",
                    transition: "background 0.15s ease",
                  }}
                >
                  {/* Icon */}
                  <div
                    style={{
                      width: "24px",
                      height: "24px",
                      borderRadius: "6px",
                      background: isUrgent ? "#FEF3C7" : notif.type === "BANK_ACK" ? "#ECFDF5" : "#EEF2FF",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      marginTop: "2px",
                    }}
                  >
                    {isUrgent ? (
                      <Clock size={12} color="#D97706" />
                    ) : notif.type === "BANK_ACK" ? (
                      <Lock size={12} color="#059669" />
                    ) : (
                      <CheckCircle2 size={12} color="#4F46E5" />
                    )}
                  </div>

                  {/* Body */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: notif.isRead ? 600 : 800,
                          color: "#0F172A",
                        }}
                      >
                        {notif.title}
                      </span>
                      <span style={{ fontSize: "9.5px", color: "#94A3B8" }}>
                        {notif.timestamp}
                      </span>
                    </div>

                    <p
                      style={{
                        margin: "3px 0 0",
                        fontSize: "10.5px",
                        color: "#475569",
                        lineHeight: "1.35",
                      }}
                    >
                      {notif.message}
                    </p>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        marginTop: "4px",
                        fontSize: "9.5px",
                        fontWeight: 700,
                        color: "#2563EB",
                      }}
                    >
                      <span>{notif.firNumber}</span>
                      <span>·</span>
                      <span>Open {notif.targetRoute}</span>
                      <ArrowRight size={9} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer: Open Audit Trail Link */}
          <div
            style={{
              padding: "8px 14px",
              background: "#F8FAFC",
              borderTop: "1px solid #E2E8F0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: "10px", color: "#64748B" }}>
              Immutable Transaction Ledger
            </span>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onOpenAuditTrail();
              }}
              style={{
                background: "transparent",
                border: "none",
                fontSize: "10.5px",
                color: "#4F46E5",
                fontWeight: 700,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "3px",
              }}
            >
              <span>View Audit Trail</span>
              <ExternalLink size={10} />
            </button>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};
