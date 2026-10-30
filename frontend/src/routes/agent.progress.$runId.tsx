import * as React from "react";
import {
  createFileRoute,
  Link,
  useNavigate,
  useParams,
} from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, ArrowRight, CheckCircle2, FileSearch, Loader2, XCircle } from "lucide-react";

import { PageHeader } from "@/components/common/PageHeader";
import { StatusBadge } from "@/components/common/StatusBadge";
import { StepTimeline } from "@/components/agent/StepTimeline";
import { SearchQueriesList } from "@/components/agent/SearchQueriesList";
import { TimelineSkeleton } from "@/components/common/LoadingSkeleton";
import { ErrorState } from "@/components/common/ErrorState";
import { Button } from "@/components/ui/button";
import { ApiError, getAgentStatus } from "@/lib/api";
import { useCandidate } from "@/context/CandidateContext";
import type { AgentRunStatus } from "@/types/api";
import { formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/agent/progress/$runId")({
  head: () => ({
    meta: [{ title: "Agent Progress — JobScout AI" }],
  }),
  component: AgentProgressPage,
});

const TERMINAL = new Set(["completed", "partial_success", "failed"]);

function AgentProgressPage() {
  const { runId } = useParams({ from: "/agent/progress/$runId" });
  const { candidateId, setLastRunId } = useCandidate();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (runId) setLastRunId(runId);
  }, [runId, setLastRunId]);

  const query = useQuery<AgentRunStatus, ApiError>({
    queryKey: ["agent-status", runId],
    queryFn: () => getAgentStatus(runId),
    refetchInterval: (q) => {
      const data = q.state.data;
      if (!data) return 3000;
      return TERMINAL.has((data.status || "").toLowerCase()) ? false : 3000;
    },
    refetchOnWindowFocus: false,
  });

  const data = query.data;
  const status = (data?.status || "").toLowerCase();
  const isTerminal = TERMINAL.has(status);
  const targetCandidate = data?.candidate_id || candidateId;

  return (
    <div className="mx-auto max-w-4xl space-y-5 px-4 py-8 sm:space-y-8 sm:py-10 md:px-8 md:py-14">
      <PageHeader
        eyebrow="Live"
        title="Agent Progress"
        description="Tracking each step of the autonomous job-hunting agent in real time."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link to="/agent/detail/$runId" params={{ runId }}>
              Run details
            </Link>
          </Button>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">Run ID</p>
          <p className="truncate font-mono text-sm text-foreground">{runId}</p>
        </div>
        <div className="flex items-center gap-2">
          {data ? <StatusBadge status={data.status} pulse={!isTerminal} /> : null}
        </div>
      </div>

      {data ? <StatusBanner status={status} /> : null}

      {query.isLoading ? (
        <div className="rounded-2xl border border-border bg-card p-6">
          <TimelineSkeleton />
        </div>
      ) : null}

      {query.isError ? (
        <ErrorState
          title="Could not load agent status"
          message={query.error?.message}
          onRetry={() => query.refetch()}
        />
      ) : null}

      {data ? (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Stat label="Started" value={formatDateTime(data.started_at)} />
            <Stat label="Completed" value={formatDateTime(data.completed_at)} />
            <Stat label="Total steps" value={String(data.steps?.length ?? 0)} />
          </div>

          {data.error_message ? (
            status === "failed" ? (
              <div className="flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
                <div className="text-sm">
                  <p className="font-semibold text-destructive">Agent error</p>
                  <p className="text-muted-foreground">{data.error_message}</p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3 rounded-2xl border border-warning/40 bg-warning/10 p-4">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
                <div className="text-sm">
                  <p className="font-semibold text-foreground">Run notes (partial success)</p>
                  <p className="mt-1 text-muted-foreground">{data.error_message}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Workflow steps can all show &quot;Completed&quot; while individual URLs or AI
                    calls still had issues—your run still produced usable results where possible.
                  </p>
                </div>
              </div>
            )
          ) : null}

          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
              <FileSearch className="h-4 w-4 text-primary" />
              Workflow
            </h3>
            <StepTimeline steps={data.steps ?? []} />
          </div>

          <SearchQueriesList queries={data.search_queries ?? []} />

          {(status === "completed" || status === "partial_success") &&
          targetCandidate ? (
            <div className="flex justify-end">
              <Button
                size="lg"
                className="js-hover-lift w-full sm:w-auto"
                onClick={() => navigate({ to: "/dashboard" })}
              >
                View Results <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

function StatusBanner({ status }: { status: string }) {
  const map: Record<
    string,
    { tone: string; icon: React.ReactNode; title: string; desc: string }
  > = {
    pending: {
      tone: "border-border bg-card",
      icon: <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />,
      title: "Queued",
      desc: "Waiting for the agent to start.",
    },
    started: {
      tone: "border-primary/30 bg-primary-soft/40",
      icon: <Loader2 className="h-5 w-5 animate-spin text-primary" />,
      title: "Agent starting",
      desc: "Spinning up the workflow…",
    },
    running: {
      tone: "border-primary/30 bg-primary-soft/40",
      icon: <Loader2 className="h-5 w-5 animate-spin text-primary" />,
      title: "Agent running",
      desc: "Generating queries, searching, and scoring jobs.",
    },
    completed: {
      tone: "border-success/30 bg-success/5",
      icon: <CheckCircle2 className="h-5 w-5 text-success" />,
      title: "Run completed",
      desc: "All steps finished successfully. View your matches below.",
    },
    partial_success: {
      tone: "border-warning/30 bg-warning/10",
      icon: <AlertCircle className="h-5 w-5 text-warning" />,
      title: "Partial success",
      desc: "Some steps succeeded, others did not. Results may be incomplete.",
    },
    failed: {
      tone: "border-destructive/30 bg-destructive/5",
      icon: <XCircle className="h-5 w-5 text-destructive" />,
      title: "Run failed",
      desc: "The agent could not complete this run. See the error details below.",
    },
  };
  const info =
    map[status] ?? {
      tone: "border-border bg-card",
      icon: <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />,
      title: "Working…",
      desc: "Tracking agent progress.",
    };
  return (
    <div
      className={`js-fade-in flex items-start gap-3 rounded-2xl border p-4 ${info.tone}`}
    >
      <div className="mt-0.5 shrink-0">{info.icon}</div>
      <div>
        <p className="text-sm font-semibold text-foreground">{info.title}</p>
        <p className="text-xs text-muted-foreground">{info.desc}</p>
      </div>
    </div>
  );
}
