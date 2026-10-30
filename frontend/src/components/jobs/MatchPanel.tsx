import * as React from "react";
import { Lightbulb, ListChecks, MessageSquare, Sparkles } from "lucide-react";
import type { JobMatch } from "@/types/api";
import { ScoreRing } from "@/components/common/ScoreRing";
import { SkillBadge } from "@/components/common/SkillBadge";
import { getScoreInfo } from "@/lib/scoring";
import { cn } from "@/lib/utils";

export function MatchPanel({ match }: { match: JobMatch }) {
  const tier = getScoreInfo(match.overall_score);
  return (
    <div className="space-y-6 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6">
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
        <ScoreRing score={match.overall_score} label="Overall" />
        <div className="w-full flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium",
                tier.badgeClass,
              )}
            >
              <Sparkles className="h-3 w-3" />
              {tier.label}
            </span>
            {match.match_label ? (
              <span className="rounded-full border border-border bg-secondary px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                {match.match_label}
              </span>
            ) : null}
          </div>
          <ScoreBar label="Skills" value={match.skills_score} />
          <ScoreBar label="Experience" value={match.experience_score} />
          <ScoreBar label="Role fit" value={match.role_score} />
        </div>
      </div>

      <Section title="Matched skills" icon={<ListChecks className="h-4 w-4 text-success" />}>
        {match.matched_skills.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {match.matched_skills.map((s) => (
              <SkillBadge key={s} tone="matched">
                {s}
              </SkillBadge>
            ))}
          </div>
        ) : (
          <Empty />
        )}
      </Section>

      <Section title="Missing skills" icon={<ListChecks className="h-4 w-4 text-warning" />}>
        {match.missing_skills.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {match.missing_skills.map((s) => (
              <SkillBadge key={s} tone="missing">
                {s}
              </SkillBadge>
            ))}
          </div>
        ) : (
          <Empty />
        )}
      </Section>

      {match.reasoning ? (
        <Section title="Reasoning" icon={<MessageSquare className="h-4 w-4 text-primary" />}>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {match.reasoning}
          </p>
        </Section>
      ) : null}

      {match.improvement_tips.length > 0 ? (
        <Section
          title="Improvement tips"
          icon={<Lightbulb className="h-4 w-4 text-agentic" />}
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {match.improvement_tips.map((tip, i) => (
              <div
                key={i}
                className="rounded-xl border border-info bg-info/40 p-3 text-sm text-info-foreground"
              >
                {tip}
              </div>
            ))}
          </div>
        </Section>
      ) : null}
    </div>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
        {icon}
        {title}
      </h4>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function Empty() {
  return <p className="text-xs text-muted-foreground">Nothing to show.</p>;
}

function ScoreBar({
  label,
  value,
}: {
  label: string;
  value: number | null | undefined;
}) {
  const target = value == null || isNaN(value) ? 0 : Math.max(0, Math.min(100, value));
  const [v, setV] = React.useState(0);
  React.useEffect(() => {
    const id = window.requestAnimationFrame(() => setV(target));
    return () => window.cancelAnimationFrame(id);
  }, [target]);

  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-foreground">{label}</span>
        <span className="tabular-nums text-muted-foreground">
          {value == null || isNaN(value) ? "—" : Math.round(value)}
        </span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-secondary">
        <div
          className={cn(
            "h-full rounded-full bg-gradient-to-r from-primary via-agentic to-ai transition-[width] duration-700 ease-out",
          )}
          style={{ width: `${v}%` }}
        />
      </div>
    </div>
  );
}
