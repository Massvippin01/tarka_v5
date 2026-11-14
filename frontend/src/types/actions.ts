export type CaseActionStatus =
  | "NOT_REQUESTED"
  | "REQUESTED"
  | "ACKNOWLEDGED"
  | "FROZEN"
  | "PARTIAL"
  | "REJECTED"
  | "RELEASED";

export type StatutoryNoticeStatus =
  | "DRAFT"
  | "SENT"
  | "COMPLIED"
  | "OVERDUE";

export interface CaseActionRecord {
  id: string;
  caseId: string;
  accountId: string;
  accountMasked: string;
  accountHolder: string;
  bank: string;
  ifsc: string;
  layer: "LAYER_1_MULE" | "LAYER_2_CONDUIT" | "LAYER_3_SINK" | string;
  urgency: "CRITICAL_GOLDEN_HOUR" | "ELEVATED" | "STANDARD";
  status: CaseActionStatus;
  targetAmount: number;
  frozenAmount: number;
  referenceNo: string;
  requestedAt?: string | null;
  acknowledgedAt?: string | null;
  frozenAt?: string | null;
  documentType?: string;
  notes?: string;
}

export interface StatutoryNoticeRecord {
  id: string;
  caseId: string;
  noticeType: "BNSS_94_TELECOM" | "BSA_63_NPCI" | "I4C_ESCALATION" | string;
  title: string;
  recipient: string;
  subject: string;
  referenceNo: string;
  status: StatutoryNoticeStatus;
  sentAt?: string | null;
  compliedAt?: string | null;
  contentHash: string;
}

export interface CaseActionsSummary {
  totalRecoverable: number;
  totalFrozen: number;
  totalPending: number;
  frozenAccountsCount: number;
  totalAccountsCount: number;
  goldenHourRemainingMins: number;
  isFullyFrozen: boolean;
  caseStatus: string;
}

export interface CaseActionsResponse {
  caseId: string;
  actions: CaseActionRecord[];
  notices: StatutoryNoticeRecord[];
  summary: CaseActionsSummary;
}
