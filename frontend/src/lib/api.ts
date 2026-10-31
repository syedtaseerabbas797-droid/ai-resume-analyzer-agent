// Single API client for the JobScout AI FastAPI backend.
// Frontend-only: do NOT add backend logic, mock routes, or invented endpoints.

import type {
  AgentResults,
  AgentRunDetail,
  AgentRunStart,
  AgentRunStatus,
  AuthTokenResponse,
  DashboardJobsResponse,
  DbHealthResponse,
  HealthResponse,
  JobDetail,
  ResumeAnalysis,
  ResumeDetail,
  ResumeListResponse,
  ResumeUpload,
  SeedResponse,
  UserProfile,
} from "@/types/api";

// Vite statically replaces import.meta.env.VITE_* at build time.
// Set VITE_API_BASE_URL in Cloudflare Workers → Settings → Variables for production.
const RAW_API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "https://ai-resume-analyzer-agent.fastapicloud.dev";
const API_BASE_URL = RAW_API_BASE_URL.replace(/\/+$/, "");

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  isFormData?: boolean;
  acceptStatuses?: number[];
}

const TOKEN_KEY = "jobscout.auth_token";

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (token == null) window.localStorage.removeItem(TOKEN_KEY);
    else window.localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* ignore */
  }
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, isFormData = false, acceptStatuses } = opts;

  const headers: Record<string, string> = { Accept: "application/json" };

  // Inject Bearer token if available
  const token = getStoredToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let payload: BodyInit | undefined;

  if (body !== undefined) {
    if (isFormData) {
      // Browser must set multipart boundary — do NOT set Content-Type.
      payload = body as FormData;
    } else {
      headers["Content-Type"] = "application/json";
      payload = JSON.stringify(body);
    }
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: payload,
    });
  } catch (err) {
    throw new ApiError(
      0,
      `Cannot reach backend at ${API_BASE_URL}. Is your FastAPI server running?`,
    );
  }

  const ok =
    response.ok || (acceptStatuses?.includes(response.status) ?? false);

  if (!ok) {
    let detail = response.statusText || "Request failed";
    try {
      const data = (await response.json()) as { detail?: string };
      if (data?.detail) detail = data.detail;
    } catch {
      // ignore JSON parse errors on error path
    }
    throw new ApiError(response.status, detail);
  }

  if (response.status === 204) return undefined as T;

  // Some endpoints (202) may have empty/JSON bodies — try to parse safely.
  const text = await response.text();
  if (!text) return undefined as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    return text as unknown as T;
  }
}

// -------- Health --------
export const getHealth = () => request<HealthResponse>("/health");
export const getDbHealth = () => request<DbHealthResponse>("/db/health");

// -------- Seed --------
export const seedCandidate = () =>
  request<SeedResponse>("/db/seed", { method: "POST" });

// -------- Resume --------
export const uploadResume = (file: File, candidateId: string) => {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("candidate_id", candidateId);
  return request<ResumeUpload>("/resume/upload", {
    method: "POST",
    body: fd,
    isFormData: true,
  });
};

/**
 * Same endpoint and FormData payload as uploadResume, but uses XHR so we can
 * surface real upload progress. Frontend-only enhancement — does NOT change
 * the backend contract.
 */
export const uploadResumeWithProgress = (
  file: File,
  candidateId: string,
  onProgress?: (percent: number) => void,
): Promise<ResumeUpload> => {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("candidate_id", candidateId);

  return new Promise<ResumeUpload>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_BASE_URL}/resume/upload`);
    xhr.setRequestHeader("Accept", "application/json");
    const token = getStoredToken();
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    // Do NOT set Content-Type — browser sets multipart boundary.

    xhr.upload.onprogress = (e) => {
      if (!onProgress) return;
      if (e.lengthComputable && e.total > 0) {
        onProgress(Math.min(100, Math.round((e.loaded / e.total) * 100)));
      }
    };

    xhr.onerror = () =>
      reject(
        new ApiError(
          0,
          `Cannot reach backend at ${API_BASE_URL}. Is your FastAPI server running?`,
        ),
      );
    xhr.onabort = () => reject(new ApiError(0, "Upload was cancelled"));

    xhr.onload = () => {
      const status = xhr.status;
      const text = xhr.responseText || "";
      if (status >= 200 && status < 300) {
        if (!text) return resolve(undefined as unknown as ResumeUpload);
        try {
          resolve(JSON.parse(text) as ResumeUpload);
        } catch {
          reject(new ApiError(status, "Invalid JSON in upload response"));
        }
        return;
      }
      let detail = xhr.statusText || "Upload failed";
      try {
        const parsed = JSON.parse(text) as { detail?: string };
        if (parsed?.detail) detail = parsed.detail;
      } catch {
        /* ignore */
      }
      reject(new ApiError(status, detail));
    };

    xhr.send(fd);
  });
};

export const analyzeResume = (candidateId: string, force = false) =>
  request<ResumeAnalysis>(
    `/resume/analyze/${encodeURIComponent(candidateId)}?force=${force ? "true" : "false"}`,
    { method: "POST" },
  );

export const listResumes = () => request<ResumeListResponse>("/resume/list");

export const getResume = (candidateId: string) =>
  request<ResumeDetail>(`/resume/${encodeURIComponent(candidateId)}`);

// -------- Agent --------
export const runAgent = (candidateId: string) =>
  request<AgentRunStart>(`/agent/run/${encodeURIComponent(candidateId)}`, {
    method: "POST",
    acceptStatuses: [202],
  });

export const getAgentStatus = (runId: string) =>
  request<AgentRunStatus>(`/agent/status/${encodeURIComponent(runId)}`);

export const getAgentResults = (runId: string) =>
  request<AgentResults>(`/agent/results/${encodeURIComponent(runId)}`);

// -------- Dashboard --------
export const getDashboardJobs = (
  candidateId: string,
  page = 1,
  pageSize = 10,
) =>
  request<DashboardJobsResponse>(
    `/dashboard/jobs/${encodeURIComponent(candidateId)}?page=${page}&page_size=${pageSize}`,
  );

export const getJobDetail = (jobId: string) =>
  request<JobDetail>(`/dashboard/job/${encodeURIComponent(jobId)}`);

export const getAgentRunDetail = (runId: string) =>
  request<AgentRunDetail>(`/dashboard/agent-run/${encodeURIComponent(runId)}`);

export { API_BASE_URL };

// -------- Auth --------
export const signup = (body: { email: string; password: string; full_name?: string }) =>
  request<AuthTokenResponse>("/auth/signup", { method: "POST", body });

export const login = (body: { email: string; password: string }) =>
  request<AuthTokenResponse>("/auth/login", { method: "POST", body });

export const getMe = () => request<UserProfile>("/auth/me");
