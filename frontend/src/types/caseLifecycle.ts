import { z } from "zod";

export type CaseLifecycleStatus =
  | "DRAFT"
  | "INTAKE"
  | "INVESTIGATING"
  | "ACTION_PENDING"
  | "FROZEN"
  | "PARTIALLY_RECOVERED"
  | "COURT_READY"
  | "CLOSED"
  | "ARCHIVED";

export const ALLOWED_TRANSITIONS: Record<string, CaseLifecycleStatus[]> = {
  DRAFT: ["INTAKE", "ARCHIVED"],
  INTAKE: ["INVESTIGATING", "ACTION_PENDING", "ARCHIVED"],
  INVESTIGATING: ["ACTION_PENDING", "INTAKE", "FROZEN", "PARTIALLY_RECOVERED", "COURT_READY", "ARCHIVED"],
  INVESTIGATION_ACTIVE: ["ACTION_PENDING", "INTAKE", "FROZEN", "PARTIALLY_RECOVERED", "COURT_READY", "ARCHIVED"],
  ACTION_PENDING: ["FROZEN", "PARTIALLY_RECOVERED", "INVESTIGATING", "ARCHIVED"],
  FROZEN: ["COURT_READY", "PARTIALLY_RECOVERED", "INVESTIGATING", "ARCHIVED"],
  PARTIALLY_RECOVERED: ["COURT_READY", "FROZEN", "INVESTIGATING", "ARCHIVED"],
  COURT_READY: ["CLOSED", "INVESTIGATING", "ARCHIVED"],
  CLOSED: ["ARCHIVED", "INVESTIGATING"],
  ARCHIVED: ["INTAKE", "INVESTIGATING", "CLOSED"],
};

export const STATUS_LABELS: Record<string, { label: string; bg: string; text: string; border: string }> = {
  DRAFT: { label: "Draft", bg: "#F1F5F9", text: "#475569", border: "#CBD5E1" },
  INTAKE: { label: "Intake", bg: "#EFF6FF", text: "#1D4ED8", border: "#BFDBFE" },
  INVESTIGATING: { label: "Investigating", bg: "#FEF3C7", text: "#B45309", border: "#FDE68A" },
  INVESTIGATION_ACTIVE: { label: "Investigating", bg: "#FEF3C7", text: "#B45309", border: "#FDE68A" },
  ACTION_PENDING: { label: "Action Pending", bg: "#FFF7ED", text: "#C2410C", border: "#FFEDD5" },
  FROZEN: { label: "Frozen", bg: "#ECFEFF", text: "#0E7490", border: "#A5F3FC" },
  PARTIALLY_RECOVERED: { label: "Partially Recovered", bg: "#F0FDF4", text: "#15803D", border: "#BBF7D0" },
  COURT_READY: { label: "Court Ready", bg: "#FAF5FF", text: "#7E22CE", border: "#E9D5FF" },
  CLOSED: { label: "Closed", bg: "#F3F4F6", text: "#374151", border: "#E5E7EB" },
  ARCHIVED: { label: "Archived", bg: "#E2E8F0", text: "#334155", border: "#94A3B8" },
};

export const TYPOLOGY_OPTIONS = [
  { value: "DIGITAL_ARREST", label: "Digital Arrest & Extortion" },
  { value: "TELEGRAM_INVESTMENT", label: "Investment & Stock Trading Scam" },
  { value: "APK_SIM_SWAP", label: "SIM Swap / Malicious APK" },
  { value: "CORPORATE_BEC", label: "Corporate BEC / RTGS Divert" },
  { value: "TASK_FRAUD", label: "Part-Time Job / Task Scam" },
  { value: "UPI_QR_SCAM", label: "UPI QR Code Collect Request" },
  { value: "LOAN_APP_EXTORTION", label: "Instant Loan App Harassment" },
];

export const caseWizardSchema = z.object({
  // Step 1: Complaint Information
  firNumber: z.string().min(3, "FIR number is required (e.g. FIR #149/2026)"),
  ncrpAckNo: z.string().min(5, "NCRP Acknowledgement Number is required"),
  complainantName: z.string().min(2, "Complainant name is required"),
  contactPhone: z.string().optional(),
  incidentDateTime: z.string().optional(),
  title: z.string().min(5, "Case title must be at least 5 characters"),
  typology: z.string().min(1, "Typology is required"),
  description: z.string().optional(),

  // Step 2: Financial Particulars
  victimBank: z.string().min(2, "Victim bank is required (e.g. SBI, HDFC)"),
  victimAccount: z.string().min(4, "Account number or UPI VPA is required"),
  bookedLossInr: z.number().min(100, "Booked loss amount must be at least ₹100"),
  claimedLossInr: z.number().min(0, "Claimed loss amount must be non-negative"),
  utrOrRrn: z.string().optional(),

  // Step 3: Assignment & Priority
  leadInvestigator: z.string().min(2, "Assigned Investigating Officer is required"),
  priority: z.enum(["CRITICAL_GOLDEN_HOUR", "HIGH_SYNDICATE", "MEDIUM", "LOW"]),
  policeStation: z.string(),
  tags: z.array(z.string()),
});

export type CaseWizardFormValues = z.infer<typeof caseWizardSchema>;
