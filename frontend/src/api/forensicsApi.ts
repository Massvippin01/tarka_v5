import axios from "axios";
import type {
  ArtifactIntake,
  ProvenanceDAG,
  LocalModelStatus,
} from "../types/forensics";

const api = axios.create({
  baseURL: "/api/v1/forensics",
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem("sentinelx_auth_token") || localStorage.getItem("sentinelx_auth_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config;
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("/auth/session")
    ) {
      originalRequest._retry = true;
      try {
        const loginRes = await forensicsApi.login("INVESTIGATOR_DELHI");
        if (loginRes?.access_token) {
          originalRequest.headers["Authorization"] = `Bearer ${loginRes.access_token}`;
          return api(originalRequest);
        }
      } catch (e) {
        console.warn("Silent re-auth failed:", e);
      }
    }
    return Promise.reject(error);
  }
);

export const forensicsApi = {
  login: async (username: string = "INVESTIGATOR_DELHI") => {
    const res = await api.post("/auth/session", { username });
    if (res.data?.access_token) {
      sessionStorage.setItem("sentinelx_auth_token", res.data.access_token);
      localStorage.setItem("sentinelx_auth_token", res.data.access_token);
      api.defaults.headers.common["Authorization"] = `Bearer ${res.data.access_token}`;
    }
    return res.data;
  },

  getHealth: async () => {
    const res = await api.get("/health");
    return res.data;
  },

  listCases: async () => {
    const res = await api.get("/cases");
    return res.data;
  },

  getCase: async (caseId: string) => {
    const res = await api.get(`/cases/${caseId}`);
    return res.data;
  },

  seedSyntheticCase: async (caseId: string = "upi_payment_discrepancy") => {
    const res = await api.post(`/cases/${caseId}/seed-synthetic`);
    return res.data;
  },

  resetCaseClean: async (caseId: string) => {
    const res = await api.post(`/cases/${caseId}/reset-clean`);
    return res.data;
  },

  loadDemoPack: async (caseId: string, packageName?: string) => {
    const res = await api.post(`/cases/${caseId}/load-demo-pack`, null, {
      params: { package_name: packageName || "auto" },
    });
    return res.data;
  },

  listArtifacts: async (caseId: string): Promise<ArtifactIntake[]> => {
    const res = await api.get(`/cases/${caseId}/artifacts`);
    return res.data;
  },

  verifyArtifact: async (caseId: string, artifactId: string) => {
    const res = await api.get(`/cases/${caseId}/artifacts/${artifactId}/verify`);
    return res.data;
  },

  getTimeline: async (caseId: string, runId?: string) => {
    const params = runId ? { run_id: runId } : {};
    const res = await api.get(`/cases/${caseId}/timeline`, { params });
    return res.data;
  },

  getContradictions: async (caseId: string, runId?: string) => {
    const params = runId ? { run_id: runId } : {};
    const res = await api.get(`/cases/${caseId}/contradictions`, { params });
    return res.data;
  },

  getInvestigationGraph: async (caseId: string, runId?: string) => {
    const params = runId ? { run_id: runId } : {};
    const res = await api.get(`/cases/${caseId}/investigation-graph`, { params });
    return res.data;
  },

  getProvenanceDag: async (caseId: string, runId?: string): Promise<ProvenanceDAG> => {
    const params = runId ? { run_id: runId } : {};
    const res = await api.get(`/cases/${caseId}/provenance-dag`, { params });
    return res.data;
  },

  runChallenge: async (
    caseId: string,
    baselineRunId: string,
    excludedArtifactIds: string[],
    note?: string
  ) => {
    const res = await api.post(`/cases/${caseId}/challenge`, {
      baseline_run_id: baselineRunId,
      excluded_artifact_ids: excludedArtifactIds,
      investigator_note: note || "Evidence Robustness Lab artifact challenge",
    });
    return res.data;
  },

  generateReport: async (caseId: string, runId?: string, examiner?: string, purpose?: string) => {
    const res = await api.post(`/cases/${caseId}/reports`, {
      run_id: runId,
      examiner_name: examiner || "Forensic Officer",
      investigation_purpose: purpose || "Statutory Digital Evidence Inspection",
    });
    return res.data;
  },

  getReport: async (caseId: string, reportId: string) => {
    const res = await api.get(`/cases/${caseId}/reports/${reportId}`);
    return res.data;
  },

  listReports: async (caseId: string) => {
    const res = await api.get(`/cases/${caseId}/reports`);
    return res.data;
  },

  exportReport: async (caseId: string, reportId: string, format: "pdf" | "html" | "json" = "pdf") => {
    const res = await api.get(`/cases/${caseId}/reports/${reportId}/export`, {
      params: { format },
      responseType: "blob",
    });
    return res.data;
  },


  getAssistantRuntime: async (): Promise<LocalModelStatus> => {
    const res = await api.get("/assistant/runtime");
    return res.data;
  },

  queryAssistant: async (
    caseId: string,
    query: string,
    history?: { sender: string; text: string }[]
  ) => {
    const res = await api.post(`/cases/${caseId}/assistant/query`, {
      query,
      conversation_history: history,
    });
    return res.data;
  },

  getFindingExplanation: async (caseId: string, findingId: string, runId?: string) => {
    const params = runId ? { run_id: runId } : {};
    const res = await api.get(`/cases/${caseId}/findings/${findingId}/explanation`, { params });
    return res.data;
  },

  getFindingProvenance: async (caseId: string, findingId: string, runId?: string, direction?: string) => {
    const params: Record<string, string> = {};
    if (runId) params.run_id = runId;
    if (direction) params.direction = direction;
    const res = await api.get(`/cases/${caseId}/findings/${findingId}/provenance`, { params });
    return res.data;
  },

  recordReview: async (
    caseId: string,
    req: {
      target_id: string;
      decision: string;
      reviewed_by?: string;
      notes?: string;
      scope?: string;
      target_type?: string;
    }
  ) => {
    const res = await api.post(`/cases/${caseId}/reviews`, req);
    return res.data;
  },

  listReviews: async (caseId: string) => {
    const res = await api.get(`/cases/${caseId}/reviews`);
    return res.data;
  },

  ingestEvidenceFiles: async (caseId: string, files: File[], tz = "Asia/Kolkata") => {
    const formData = new FormData();
    files.forEach((f) => formData.append("files", f));
    formData.append("tz", tz);
    formData.append("append_to_custody", "true");
    const res = await api.post(`/cases/${caseId}/ingest`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },

  getSarvamStatus: async () => {
    const res = await api.get("/sarvam/status");
    return res.data;
  },

  transcribeSarvamAudio: async (audioBlob: Blob, languageCode = "en-IN", mode = "codemix") => {
    const formData = new FormData();
    formData.append("file", audioBlob, "speech.wav");
    formData.append("language_code", languageCode);
    formData.append("mode", mode);
    const res = await api.post("/sarvam/transcribe", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },

  synthesizeSarvamSpeech: async (text: string, languageCode = "en-IN", speaker?: string) => {
    const res = await api.post("/sarvam/synthesize", {
      text,
      target_language_code: languageCode,
      speaker,
    });
    return res.data;
  },

  getArtifactContent: async (caseId: string, artifactId: string) => {
    const res = await api.get(`/cases/${caseId}/artifacts/${artifactId}/content`);
    return res.data;
  },

  downloadArtifactUrl: (caseId: string, artifactId: string) => {
    return `/api/v1/forensics/cases/${caseId}/artifacts/${artifactId}/download`;
  },

  orchestrateAgentAction: async (
    caseId: string,
    query: string,
    confirmed = false,
    toolOverride?: string,
    sessionId?: string,
    languageCode: string = "en-IN",
    speaker?: string
  ) => {
    const res = await api.post(`/cases/${caseId}/agent/orchestrate`, {
      query,
      confirmed,
      tool_override: toolOverride,
      session_id: sessionId,
      language_code: languageCode,
      speaker,
    });
    return res.data;
  },

  searchPermittedFiles: async (caseId: string, query: string = "case 1", directoryAlias: string = "Downloads") => {
    const res = await api.get(`/cases/${caseId}/files/search`, {
      params: { query, directory_alias: directoryAlias },
    });
    return res.data;
  },

  previewPermittedFile: async (caseId: string, filename: string, directoryAlias: string = "Downloads") => {
    const res = await api.get(`/cases/${caseId}/files/preview`, {
      params: { filename, directory_alias: directoryAlias },
    });
    return res.data;
  },

  ingestPermittedFiles: async (caseId: string, filenames: string[], directoryAlias: string = "Downloads") => {
    const res = await api.post(`/cases/${caseId}/files/ingest`, {
      filenames,
      directory_alias: directoryAlias,
    });
    return res.data;
  },

  verifyStatutoryReport: async (caseId: string, reportId: string) => {
    const res = await api.get(`/cases/${caseId}/reports/${reportId}/verify`);
    return res.data;
  },

  getSystemStatus: async () => {
    const res = await api.get("/system/status");
    return res.data;
  },
};


export default forensicsApi;
