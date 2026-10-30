import {
  createFileRoute,
  Link,
  useParams,
} from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, ArrowRight } from "lucide-react";

import { PageHeader } from "@/components/common/PageHeader";
import { StatusBadge } from "@/components/common/StatusBadge";
import { StepTimeline } from "@/components/agent/StepTimeline";
import { SearchQueriesList } from "@/components/agent/SearchQueriesList";
import { ErrorState } from "@/components/common/ErrorState";
import { CardSkeleton } from "@/components/common/LoadingSkeleton";
import { Button } from "@/components/ui/button";
import { ApiError, getAgentRunDetail } from "@/lib/api";
import type { AgentRunDetail } from "@/types/api";
import { formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/agent/detail/$runId")({
  head: () => ({
    meta: [{ title: "Agent Run Details — JobScout AI" }],
  }),
  component: AgentDetailPage,
});

function AgentDetailPage() {
  const { runId } = useParams({ from: "/agent/detail/$runId" });
  const query = useQuery<AgentRunDetail, ApiError>({
    queryKey: ["agent-run-detail", runId],
    queryFn: () => getAgentRunDetail(runId),
    refetchOnWindowFocus: false,
  });

  const data = query.data;

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:space-y-8 sm:py-10 md:px-8 md:py-14">
      <PageHeader
        eyebrow="Agent run"
        title="Run Details"
        description="Full breakdown of the agent's execution, queries, and match summary."
        actions={
          data?.candidate_id ? (
            <Button asChild className="js-hover-lift w-full sm:w-auto">
              <Link to="/dashboard">
                View Jobs <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          ) : null
        }
      />

      {query.isLoading ? (
        <div className="grid gap-4 md:grid-cols-3">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : null}

      {query.isError ? (
        <ErrorState
          title="Could not load run details"
          message={query.error?.message}
          onRetry={() => query.refetch()}
        />
      ) : null}

      {data ? (
        <AgentDetailBody data={data} />
      ) : null}
    </div>
  );
}

function AgentDetailBody({ data }: { data: AgentRunDetail }) {
  const status = (data.status || "").toLowerCase();

  return (
    <div className="js-fade-up space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4">
        <div className="space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Run ID
          </p>
          <p className="font-mono text-sm text-foreground">{data.run_id}</p>
        </div>
        <StatusBadge status={data.status} />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat label="Started" value={formatDateTime(data.started_at)} />
        <Stat label="Completed" value={formatDateTime(data.completed_at)} />
        <Stat label="Candidate ID" value={data.candidate_id} mono />
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
            </div>
          </div>
        )
      ) : null}

      <SummaryGrid summary={data.summary} />

      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6">
        <h3 className="mb-4 text-sm font-semibold text-foreground">Workflow steps</h3>
        <StepTimeline steps={data.steps ?? []} />
      </div>

      <SearchQueriesList queries={data.search_queries ?? []} />
    </div>
  );
}

function Stat({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p
        className={
          "mt-1 truncate text-sm font-medium text-foreground" +
          (mono ? " font-mono" : "")
        }
      >
        {value || "—"}
      </p>
    </div>
  );
}

function SummaryGrid({
  summary,
}: {
  summary: AgentRunDetail["summary"];
}) {
  const items = [
    { label: "Total collected", value: summary.total_jobs_collected, tone: "primary" },
    { label: "Scored", value: summary.jobs_scored, tone: "ai" },
    { label: "Strong matches", value: summary.strong_matches, tone: "success" },
    { label: "Medium matches", value: summary.medium_matches, tone: "warning" },
    { label: "Weak matches", value: summary.weak_matches, tone: "destructive" },
    { label: "Unscored", value: summary.unscored, tone: "muted" },
  ] as const;

  const toneClass = (t: (typeof items)[number]["tone"]) => {
    switch (t) {
      case "primary":
        return "bg-primary-soft text-primary";
      case "ai":
        return "bg-ai/10 text-ai";
      case "success":
        return "bg-success/10 text-success";
      case "warning":
        return "bg-warning/10 text-warning";
      case "destructive":
        return "bg-destructive/10 text-destructive";
      default:
        return "bg-secondary text-muted-foreground";
    }
  };

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
      {items.map((it) => (
        <div
          key={it.label}
          className="js-fade-up rounded-2xl border border-border bg-card p-4 text-center shadow-sm"
        >
          <span
            className={
              "mx-auto mb-2 grid h-8 w-8 place-items-center rounded-lg text-xs font-semibold " +
              toneClass(it.tone)
            }
          >
            {it.value}
          </span>
          <p className="text-[11px] font-medium text-muted-foreground">
            {it.label}
          </p>
        </div>
      ))}
    </div>
  );
}
