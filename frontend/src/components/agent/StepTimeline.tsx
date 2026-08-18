import * as React from "react";
import {
  CheckCircle2,
  Circle,
  Clock,
  Loader2,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AgentStep } from "@/types/api";
import { StatusBadge } from "@/components/common/StatusBadge";
import { formatDateTime, formatDuration, safe } from "@/lib/format";

const STEP_LABELS: Record<string, string> = {
  query_generation: "Generating Search Queries",
  job_search: "Searching Jobs",
  jina_extraction: "Extracting Job Details",
  job_matching: "AI Matching & Scoring",
};

function labelFor(name: string): string {
  return STEP_LABELS[name] ?? name.replace(/_/g, " ");
}

function iconFor(status: string) {
  const s = status.toLowerCase();
  if (s === "completed" || s === "success")
    return <CheckCircle2 className="h-4 w-4 text-success" />;
  if (s === "failed" || s === "error")
    return <XCircle className="h-4 w-4 text-destructive" />;
  if (s === "running" || s === "started" || s === "in_progress")
    return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
  if (s === "pending" || s === "queued")
    return <Clock className="h-4 w-4 text-muted-foreground" />;
  return <Circle className="h-4 w-4 text-muted-foreground" />;
}

function isRunning(s: string) {
  const v = s.toLowerCase();
  return v === "running" || v === "started" || v === "in_progress";
}

export function StepTimeline({ steps }: { steps: AgentStep[] }) {
  if (!steps || steps.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Steps will appear here once the agent starts.
      </p>
    );
  }
  return (
    <ol className="relative space-y-4">
      {steps.map((step, idx) => {
        const running = isRunning(step.status);
        return (
          <li
            key={`${step.step_name}-${idx}`}
            className={cn(
              "flex gap-4 rounded-2xl border bg-card p-4 transition-colors",
              running
                ? "border-primary/40 bg-primary-soft/40"
                : "border-border",
            )}
          >
            <div
              className={cn(
                "grid h-9 w-9 shrink-0 place-items-center rounded-full border bg-background",
                running ? "border-primary js-pulse-soft" : "border-border",
              )}
            >
              {iconFor(step.status)}
            </div>
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-foreground">
                  {labelFor(step.step_name)}
                </p>
                <StatusBadge status={step.status} pulse={running} />
              </div>
              {step.message ? (
                <p className="text-xs text-muted-foreground">{step.message}</p>
              ) : null}
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                <span>Started: {formatDateTime(step.started_at)}</span>
                <span>Completed: {formatDateTime(step.completed_at)}</span>
                {step.started_at && step.completed_at ? (
                  <span className="text-foreground">
                    {formatDuration(step.started_at, step.completed_at)}
                  </span>
                ) : null}
              </div>
              {!step.message && !step.started_at ? (
                <p className="text-[11px] text-muted-foreground">{safe(null, "Pending")}</p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
