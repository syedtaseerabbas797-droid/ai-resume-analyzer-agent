import {
  createFileRoute,
  Link,
  useParams,
} from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Briefcase,
  Calendar,
  ExternalLink,
  Info,
  MapPin,
} from "lucide-react";

import { PageHeader } from "@/components/common/PageHeader";
import { ErrorState } from "@/components/common/ErrorState";
import { CardSkeleton, MatchPanelSkeleton } from "@/components/common/LoadingSkeleton";
import { MatchPanel } from "@/components/jobs/MatchPanel";
import { Button } from "@/components/ui/button";
import { ApiError, getJobDetail } from "@/lib/api";
import type { JobDetail } from "@/types/api";
import { formatDateTime, safe } from "@/lib/format";

export const Route = createFileRoute("/job/$jobId")({
  head: () => ({
    meta: [{ title: "Job Details — JobScout AI" }],
  }),
  component: JobDetailPage,
});

function JobDetailPage() {
  const { jobId } = useParams({ from: "/job/$jobId" });

  const query = useQuery<JobDetail, ApiError>({
    queryKey: ["job-detail", jobId],
    queryFn: () => getJobDetail(jobId),
    refetchOnWindowFocus: false,
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:space-y-8 sm:py-10 md:px-8 md:py-14">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2">
          <Link to="/agent">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
        </Button>
        <PageHeader
          eyebrow="Job"
          title={query.data?.title ? query.data.title : "Job details"}
          description="Full description and AI match analysis."
        />
      </div>

      {query.isLoading ? (
        <div className="space-y-6">
          <CardSkeleton />
          <CardSkeleton />
          <MatchPanelSkeleton />
        </div>
      ) : null}

      {query.isError ? (
        <ErrorState
          title="Could not load job"
          message={query.error?.status === 404 ? "Job not found." : query.error?.message}
          onRetry={() => query.refetch()}
        />
      ) : null}

      {query.data ? <JobView job={query.data} /> : null}
    </div>
  );
}

function JobView({ job }: { job: JobDetail }) {
  return (
    <div className="js-fade-up space-y-6">
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Briefcase className="h-3.5 w-3.5" />
                {safe(job.company, "Unknown company")}
              </span>
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {safe(job.location, "Remote / Unknown")}
              </span>
              {job.source ? (
                <span className="rounded-full border border-border bg-secondary px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider">
                  {job.source}
                </span>
              ) : null}
            </div>
            <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              Collected {formatDateTime(job.collected_at)}
            </p>
          </div>
          <a
            href={job.url}
            target="_blank"
            rel="noopener noreferrer"
            className="js-hover-lift inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 sm:w-auto sm:py-2"
          >
            Apply now <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6">
        <h3 className="text-sm font-semibold text-foreground">Description</h3>
        {job.full_description ? (
          <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-foreground">
            {job.full_description}
          </p>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            No description available.
          </p>
        )}
      </div>

      {job.match ? (
        <MatchPanel match={job.match} />
      ) : (
        <div className="flex items-start gap-3 rounded-2xl border border-info bg-info/40 p-4 text-sm text-info-foreground">
          <Info className="mt-0.5 h-5 w-5 shrink-0" />
          <p>This job has not been scored yet.</p>
        </div>
      )}
    </div>
  );
}
