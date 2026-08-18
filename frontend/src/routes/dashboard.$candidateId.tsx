import * as React from "react";
import {
  createFileRoute,
  Link,
  useNavigate,
  useParams,
} from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Bot, Briefcase } from "lucide-react";

import { PageHeader } from "@/components/common/PageHeader";
import { JobCard } from "@/components/jobs/JobCard";
import { JobCardSkeleton } from "@/components/common/LoadingSkeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { PaginationControls } from "@/components/common/PaginationControls";
import { Button } from "@/components/ui/button";
import { ApiError, getDashboardJobs } from "@/lib/api";
import { useCandidate } from "@/context/CandidateContext";
import type { DashboardJobsResponse } from "@/types/api";

export const Route = createFileRoute("/dashboard/$candidateId")({
  head: () => ({
    meta: [
      { title: "Ranked Jobs — JobScout AI" },
      {
        name: "description",
        content: "AI-ranked job matches scored against your resume.",
      },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { candidateId } = useParams({ from: "/dashboard/$candidateId" });
  const { setCandidateId, lastRunId } = useCandidate();
  const navigate = useNavigate();
  const [page, setPage] = React.useState(1);

  // Sync url candidate into context.
  React.useEffect(() => {
    if (candidateId) setCandidateId(candidateId);
  }, [candidateId, setCandidateId]);

  const query = useQuery<DashboardJobsResponse, ApiError>({
    queryKey: ["dashboard-jobs", candidateId, page],
    queryFn: () => getDashboardJobs(candidateId, page, 10),
    enabled: !!candidateId,
    refetchOnWindowFocus: false,
  });

  React.useEffect(() => {
    if (!candidateId) navigate({ to: "/setup" });
  }, [candidateId, navigate]);

  if (!candidateId) return null;

  const data = query.data;
  const jobs = data?.jobs ?? [];
  const scoredOnPage = jobs.filter((j) => j.match !== null).length;

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-10 md:px-8 md:py-14">
      <PageHeader
        eyebrow="Dashboard"
        title="Ranked Job Matches"
        description="Jobs collected by the agent and scored against your resume."
        actions={
          lastRunId ? (
            <Button asChild variant="outline" size="sm">
              <Link to="/agent/detail/$runId" params={{ runId: lastRunId }}>
                Last run details
              </Link>
            </Button>
          ) : null
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SummaryStat
          label="Total jobs"
          value={data ? String(data.total_jobs) : "—"}
          icon={<Briefcase className="h-4 w-4 text-primary" />}
        />
        <SummaryStat
          label="Scored on this page"
          value={data ? `${scoredOnPage} / ${jobs.length}` : "—"}
          icon={<Bot className="h-4 w-4 text-agentic" />}
        />
        <SummaryStat
          label="Page"
          value={
            data
              ? `${data.page} / ${Math.max(1, data.total_pages)}`
              : "—"
          }
          icon={<ArrowRight className="h-4 w-4 text-ai" />}
        />
      </div>

      {query.isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <JobCardSkeleton key={i} />
          ))}
        </div>
      ) : null}

      {query.isError ? (
        <ErrorState
          title="Could not load jobs"
          message={query.error?.message}
          onRetry={() => query.refetch()}
        />
      ) : null}

      {data && jobs.length === 0 ? (
        <EmptyState
          title="No jobs yet"
          description="Run the agent to collect job listings for this candidate."
          action={
            <Button asChild>
              <Link to="/agent">
                Run the agent <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          }
        />
      ) : null}

      {data && jobs.length > 0 ? (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {jobs.map((job) => (
              <JobCard key={job.job_id} job={job} />
            ))}
          </div>
          <PaginationControls
            page={data.page}
            totalPages={data.total_pages}
            onChange={setPage}
            disabled={query.isFetching}
          />
        </>
      ) : null}
    </div>
  );
}

function SummaryStat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="js-fade-up flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-secondary">
        {icon}
      </span>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p className="text-lg font-semibold text-foreground">{value}</p>
      </div>
    </div>
  );
}
