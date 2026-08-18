import { Link } from "@tanstack/react-router";
import { Briefcase, ExternalLink, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScoreBadge } from "@/components/common/ScoreBadge";
import type { DashboardJob } from "@/types/api";
import { safe, truncate } from "@/lib/format";

export function JobCard({ job }: { job: DashboardJob }) {
  const overall = job.match?.overall_score ?? null;
  return (
    <article className="js-hover-lift js-fade-up flex h-full flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h3 className="line-clamp-2 text-base font-semibold text-foreground">
            {safe(job.title, "Untitled role")}
          </h3>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Briefcase className="h-3 w-3" />
              {safe(job.company, "Unknown company")}
            </span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {safe(job.location, "Remote / Unknown")}
            </span>
            {job.source ? (
              <span className="rounded-full border border-border bg-secondary px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                {job.source}
              </span>
            ) : null}
          </div>
        </div>
        <ScoreBadge score={overall} />
      </header>

      {job.snippet ? (
        <p className="text-sm leading-relaxed text-muted-foreground">
          {truncate(job.snippet, 200)}
        </p>
      ) : null}

      <footer className="mt-auto flex items-center justify-between gap-2 pt-2">
        <Button asChild size="sm" variant="outline">
          <Link to="/job/$jobId" params={{ jobId: job.job_id }}>
            View details
          </Link>
        </Button>
        <a
          href={job.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
        >
          Apply <ExternalLink className="h-3 w-3" />
        </a>
      </footer>
    </article>
  );
}
