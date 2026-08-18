// API response types for the FastAPI backend. All optional fields are typed
// defensively so the UI never renders "null" or "undefined".

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface AuthTokenResponse {
  access_token: string;
  token_type: string;
  candidate_id: string;
  user_id: string;
  full_name: string | null;
  email: string;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  candidate_id: string;
  is_active: boolean;
}

// ─── General ─────────────────────────────────────────────────────────────────

export interface ApiErrorShape {
  status: number;
  message: string;
}

export interface HealthResponse {
  status: string;
  service: string;
}

export interface DbHealthResponse {
  database: string;
}

export interface SeedResponse {
  candidate_id: string;
  message: string;
}

export interface ResumeUpload {
  upload_id: string;
  filename: string;
  candidate_id: string;
  upload_timestamp: string;
  status: string;
  file_type: string;
}

export interface ResumeAnalysis {
  analysis_id: string;
  upload_id: string;
  candidate_id: string;
  status: string;
  ats_score: number | null;
  technical_skills: string[];
  soft_skills: string[];
  strengths: string[];
  weaknesses: string[];
  recommended_job_roles: string[];
  experience_summary: string | null;
  hiring_recommendation: string | null;
  improvement_suggestions: string[];
  analysis_provider: string | null;
  analysis_model: string | null;
}

export interface ResumeListItem {
  upload_id: string;
  filename: string;
  candidate_id: string;
  upload_timestamp: string;
  status: string;
  file_type: string;
}

export interface ResumeListResponse {
  resumes: ResumeListItem[];
}

export interface ResumeDetail extends ResumeListItem {
  extracted_text: string | null;
  analysis: ResumeAnalysis | null;
}

export type AgentStatus =
  | "pending"
  | "started"
  | "running"
  | "completed"
  | "partial_success"
  | "failed"
  | string;

export interface AgentStep {
  step_name: string;
  status: string;
  message: string | null;
  started_at: string | null;
  completed_at: string | null;
}

export interface AgentRunStart {
  run_id: string;
  candidate_id: string;
  status: AgentStatus;
}

export interface AgentRunStatus {
  run_id: string;
  candidate_id: string;
  status: AgentStatus;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  steps: AgentStep[];
  search_queries: string[];
}

export interface AgentJob {
  job_id: string;
  title: string;
  company: string | null;
  location: string | null;
  url: string;
  source: string | null;
  snippet: string | null;
  search_query_id: string | null;
  collected_at: string | null;
}

export interface AgentResults {
  run_id: string;
  candidate_id: string;
  status: AgentStatus;
  total_jobs: number;
  jobs: AgentJob[];
}

export interface JobMatch {
  match_id: string;
  overall_score: number;
  match_label: string | null;
  skills_score: number | null;
  experience_score: number | null;
  role_score: number | null;
  matched_skills: string[];
  missing_skills: string[];
  reasoning: string | null;
  improvement_tips: string[];
}

export interface DashboardJob {
  job_id: string;
  title: string;
  company: string | null;
  location: string | null;
  url: string;
  source: string | null;
  snippet: string | null;
  collected_at: string | null;
  match: JobMatch | null;
}

export interface DashboardJobsResponse {
  candidate_id: string;
  total_jobs: number;
  page: number;
  page_size: number;
  total_pages: number;
  jobs: DashboardJob[];
}

export interface JobDetail {
  job_id: string;
  agent_run_id: string | null;
  title: string;
  company: string | null;
  location: string | null;
  url: string;
  source: string | null;
  full_description: string | null;
  collected_at: string | null;
  match: JobMatch | null;
}

export interface AgentRunSummary {
  total_jobs_collected: number;
  jobs_scored: number;
  strong_matches: number;
  medium_matches: number;
  weak_matches: number;
  unscored: number;
}

export interface AgentRunSearchQuery {
  query: string;
  source: string | null;
}

export interface AgentRunDetail {
  run_id: string;
  candidate_id: string;
  status: AgentStatus;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  steps: AgentStep[];
  search_queries: AgentRunSearchQuery[];
  summary: AgentRunSummary;
}
