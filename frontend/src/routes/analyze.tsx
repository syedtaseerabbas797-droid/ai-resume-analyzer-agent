import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import {
  ArrowRight,
  CheckCircle2,
  Lightbulb,
  Loader2,
  ShieldAlert,
  Sparkles,
  Target,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/PageHeader";
import { ScoreRing } from "@/components/common/ScoreRing";
import { SkillBadge } from "@/components/common/SkillBadge";
import { AnalysisSkeleton } from "@/components/common/LoadingSkeleton";
import { Button } from "@/components/ui/button";
import { useCandidateGuard } from "@/hooks/useCandidateGuard";
import { ApiError, analyzeResume } from "@/lib/api";
import { safe } from "@/lib/format";
import type { ResumeAnalysis } from "@/types/api";

export const Route = createFileRoute("/analyze")({
  head: () => ({
    meta: [
      { title: "Resume Analysis — JobScout AI" },
      {
        name: "description",
        content:
          "Run AI analysis on your uploaded resume to get an ATS score and detailed feedback.",
      },
    ],
  }),
  component: AnalyzePage,
});

function AnalyzePage() {
  const candidateId = useCandidateGuard();
  const [force, setForce] = React.useState(false);
  const [analysis, setAnalysis] = React.useState<ResumeAnalysis | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!candidateId) throw new Error("Missing candidate");
      return analyzeResume(candidateId, force);
    },
    onSuccess: (data) => {
      setAnalysis(data);
      toast.success("Analysis complete");
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof ApiError ? err.message : "Analysis failed";
      toast.error("Analysis failed", { description: msg });
    },
  });

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-10 md:px-8 md:py-14">
      <PageHeader
        eyebrow="Step 3"
        title="Resume Analysis"
        description="The AI evaluates your resume — ATS score, skills, strengths, and improvement areas."
        actions={
          <>
            <label className="inline-flex cursor-pointer select-none items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground">
              <input
                type="checkbox"
                checked={force}
                onChange={(e) => setForce(e.target.checked)}
                className="h-3.5 w-3.5 accent-[var(--primary)]"
              />
              Force re-analysis
            </label>
            <Button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending}
              className="js-hover-lift"
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Analyzing…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" /> Analyze resume
                </>
              )}
            </Button>
          </>
        }
      />


      {mutation.isPending ? <AnalysisSkeleton /> : null}

      {mutation.isError ? (
        <div className="js-fade-in flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
          <p className="text-sm text-destructive">
            {mutation.error instanceof ApiError
              ? `Analysis failed (${mutation.error.status || "network"}): ${mutation.error.message}`
              : "Analysis failed. Please try again."}
          </p>
          <Button size="sm" variant="outline" onClick={() => mutation.mutate()}>
            Retry analysis
          </Button>
        </div>
      ) : null}

      {!mutation.isPending && analysis ? (
        <AnalysisView analysis={analysis} />
      ) : null}

      {!mutation.isPending && !analysis ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/60 p-10 text-center">
          <p className="text-sm text-muted-foreground">
            Click <span className="font-medium text-foreground">Analyze resume</span>{" "}
            to evaluate your most recently uploaded resume for this candidate.
          </p>
        </div>
      ) : null}
    </div>
  );
}

function AnalysisView({ analysis }: { analysis: ResumeAnalysis }) {
  return (
    <div className="js-fade-up space-y-6">
      {/* Score + provider */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-card p-6 shadow-sm">
          <ScoreRing score={analysis.ats_score} label="ATS Score" />
        </div>
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm md:col-span-2">
          <h3 className="text-sm font-semibold text-foreground">
            Experience summary
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {safe(analysis.experience_summary, "No summary provided.")}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
            <Meta label="Hiring recommendation" value={analysis.hiring_recommendation} />
            <Meta label="Status" value={analysis.status} />
            <Meta label="Provider" value={analysis.analysis_provider} />
            <Meta label="Model" value={analysis.analysis_model} />
          </div>
        </div>
      </div>

      {/* Skills */}
      <SectionCard title="Technical skills" icon={<Target className="h-4 w-4" />}>
        <BadgeList items={analysis.technical_skills} tone="primary" />
      </SectionCard>

      <SectionCard title="Soft skills" icon={<Sparkles className="h-4 w-4" />}>
        <BadgeList items={analysis.soft_skills} tone="ai" />
      </SectionCard>

      {/* Strengths / Weaknesses */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <ListCard
          title="Strengths"
          icon={<CheckCircle2 className="h-4 w-4 text-success" />}
          items={analysis.strengths}
          accent="success"
        />
        <ListCard
          title="Weaknesses"
          icon={<ShieldAlert className="h-4 w-4 text-warning" />}
          items={analysis.weaknesses}
          accent="warning"
        />
      </div>

      {/* Recommended roles */}
      <SectionCard
        title="Recommended job roles"
        icon={<Target className="h-4 w-4" />}
      >
        {analysis.recommended_job_roles.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
            {analysis.recommended_job_roles.map((role) => (
              <div
                key={role}
                className="js-hover-lift rounded-xl border border-border bg-gradient-to-br from-primary-soft to-card p-4"
              >
                <p className="text-sm font-medium text-foreground">{role}</p>
              </div>
            ))}
          </div>
        ) : (
          <Empty />
        )}
      </SectionCard>

      {/* Improvement suggestions */}
      <SectionCard
        title="Improvement suggestions"
        icon={<Lightbulb className="h-4 w-4 text-agentic" />}
      >
        {analysis.improvement_suggestions.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {analysis.improvement_suggestions.map((tip, i) => (
              <div
                key={i}
                className="rounded-xl border border-agentic/20 bg-agentic/5 p-4 text-sm text-foreground"
              >
                {tip}
              </div>
            ))}
          </div>
        ) : (
          <Empty />
        )}
      </SectionCard>

      <div className="flex justify-end">
        <Button asChild size="lg" className="js-hover-lift">
          <Link to="/agent">
            Run Agent <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

function Meta({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="rounded-lg border border-border bg-secondary/40 p-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="truncate text-xs font-medium text-foreground">{safe(value)}</p>
    </div>
  );
}

function SectionCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
        {icon}
        {title}
      </h3>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function BadgeList({
  items,
  tone,
}: {
  items: string[];
  tone: "primary" | "ai" | "neutral";
}) {
  if (!items || items.length === 0) return <Empty />;
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((s) => (
        <SkillBadge key={s} tone={tone}>
          {s}
        </SkillBadge>
      ))}
    </div>
  );
}

function ListCard({
  title,
  icon,
  items,
  accent,
}: {
  title: string;
  icon: React.ReactNode;
  items: string[];
  accent: "success" | "warning";
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
        {icon}
        {title}
      </h3>
      {items.length === 0 ? (
        <div className="mt-4">
          <Empty />
        </div>
      ) : (
        <ul className="mt-4 space-y-2 text-sm">
          {items.map((it, i) => (
            <li
              key={i}
              className={
                accent === "success"
                  ? "rounded-lg border border-success/20 bg-success/5 p-3 text-foreground"
                  : "rounded-lg border border-warning/20 bg-warning/5 p-3 text-foreground"
              }
            >
              {it}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Empty() {
  return <p className="text-xs text-muted-foreground">Nothing to show.</p>;
}
