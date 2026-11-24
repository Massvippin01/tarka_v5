/**
 * TARKA × SentinelX — Validation Lab Frontend API Client
 * Connects to /api/v1/validation-lab endpoints.
 */

import axios from "axios";

const API_BASE = "/api/v1/validation-lab";

export interface ValidationSessionDto {
  session_id: string;
  session_name: string;
  mode: "REAL_EVIDENCE" | "CONTROLLED_EVALUATION" | "SYNTHETIC_LAB";
  examiner_id: string;
  notes: string;
  evidence_ids: string[];
  test_ids: string[];
  total_tests: number;
  passed_tests: number;
  failed_tests: number;
  inconclusive_tests: number;
  created_at: string;
}

export interface ScenarioDefinitionDto {
  scenario_id: string;
  title: string;
  category: "TRACE" | "AEGIS" | "PLATFORM";
  engine: string;
  objective: string;
  expected_behaviour: string;
  failure_conditions: string[];
}

export interface TestCaseDto {
  test_id: string;
  session_id: string;
  case_id: string;
  test_category: "TRACE" | "AEGIS" | "PLATFORM";
  scenario_id: string;
  scenario_description: string;
  engine: string;
  execution_status: "NOT_RUN" | "RUNNING" | "PASSED" | "FAILED" | "INCONCLUSIVE" | "BLOCKED";
  processing_duration_ms: number;
  confusion_classification: "TP" | "TN" | "FP" | "FN" | "INCONCLUSIVE" | "NOT_APPLICABLE";
  actual_output?: Record<string, unknown>;
  intermediate_observations?: Array<Record<string, unknown>>;
  expected_behaviour?: string;
  examiner_notes: string;
  executed_at?: string;
  created_at: string;
}

export interface RealEvidenceIntakeRecordDto {
  evidence_id: string;
  session_id: string;
  case_id: string;
  filename: string;
  sha256: string;
  size_bytes: number;
  mime_type: string;
  source_name: string;
  acquisition_method: string;
  transmission_channel: string;
  redaction_notes: string;
  disk_readback_verified: boolean;
  intake_timestamp: string;
}

export interface ValidationDashboardDto {
  total_validation_sessions: number;
  total_cases: number;
  total_evidence_files: number;
  real_evidence_count: number;
  synthetic_evidence_count: number;
  completed_tests: number;
  failed_tests: number;
  inconclusive_tests: number;
  classification_metrics: {
    labelled_denominator: number;
    accuracy: number;
    precision: number;
    recall: number;
    f1_score: number;
    false_discovery_rate: number;
    false_positive_rate: number;
    confusion_matrix: { TP: number; TN: number; FP: number; FN: number };
    calibration_status: string;
  };
  operational_metrics: {
    count: number;
    mean_ms: number;
    p50_ms: number;
    p95_ms: number;
    p99_ms: number;
    min_ms: number;
    max_ms: number;
  };
  active_sessions: ValidationSessionDto[];
  recent_tests: TestCaseDto[];
}

export const validationLabApi = {
  async getDashboard(): Promise<ValidationDashboardDto> {
    const res = await axios.get<ValidationDashboardDto>(`${API_BASE}/dashboard`);
    return res.data;
  },

  async listScenarios(category?: string): Promise<ScenarioDefinitionDto[]> {
    const params = category ? { category } : {};
    const res = await axios.get<ScenarioDefinitionDto[]>(`${API_BASE}/scenarios`, { params });
    return res.data;
  },

  async listSessions(): Promise<ValidationSessionDto[]> {
    const res = await axios.get<ValidationSessionDto[]>(`${API_BASE}/sessions`);
    return res.data;
  },

  async createSession(name: string, mode: string = "REAL_EVIDENCE", notes: string = ""): Promise<ValidationSessionDto> {
    const res = await axios.post<ValidationSessionDto>(`${API_BASE}/sessions`, {
      session_name: name,
      mode,
      notes,
      examiner_id: "FOUNDER_VALIDATOR",
    });
    return res.data;
  },

  async createTestCase(sessionId: string, payload: Partial<TestCaseDto>): Promise<TestCaseDto> {
    const res = await axios.post<TestCaseDto>(`${API_BASE}/sessions/${sessionId}/tests`, payload);
    return res.data;
  },

  async executeTestCase(testId: string): Promise<TestCaseDto> {
    const res = await axios.post<TestCaseDto>(`${API_BASE}/tests/${testId}/execute`);
    return res.data;
  },

  async uploadRealEvidence(sessionId: string, formData: FormData): Promise<RealEvidenceIntakeRecordDto> {
    const res = await axios.post<RealEvidenceIntakeRecordDto>(`${API_BASE}/sessions/${sessionId}/evidence`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },

  async listSessionEvidence(sessionId: string): Promise<RealEvidenceIntakeRecordDto[]> {
    const res = await axios.get<RealEvidenceIntakeRecordDto[]>(`${API_BASE}/sessions/${sessionId}/evidence`);
    return res.data;
  },

  async listSessionTests(sessionId: string): Promise<TestCaseDto[]> {
    const res = await axios.get<TestCaseDto[]>(`${API_BASE}/sessions/${sessionId}/tests`);
    return res.data;
  },

  async exportReport(sessionId: string): Promise<Record<string, unknown>> {
    const res = await axios.get<Record<string, unknown>>(`${API_BASE}/sessions/${sessionId}/report`);
    return res.data;
  },
};
