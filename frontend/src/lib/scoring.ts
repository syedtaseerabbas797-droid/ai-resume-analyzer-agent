// Score → label/color mapping. Confirmed thresholds:
// >=80 Strong, 60-79 Medium, <60 Weak, null Not Scored.

export type ScoreTier = "strong" | "medium" | "weak" | "none";

export interface ScoreInfo {
  tier: ScoreTier;
  label: string;
  /** Tailwind classes for badge background/text */
  badgeClass: string;
  /** Tailwind text color */
  textClass: string;
  /** Stroke color for ring (CSS var) */
  ringStroke: string;
}

export function getScoreInfo(score: number | null | undefined): ScoreInfo {
  if (score == null || isNaN(score)) {
    return {
      tier: "none",
      label: "Not Scored",
      badgeClass: "bg-muted text-muted-foreground border-border",
      textClass: "text-muted-foreground",
      ringStroke: "var(--muted-foreground)",
    };
  }
  if (score >= 80) {
    return {
      tier: "strong",
      label: "Strong Match",
      badgeClass: "bg-success/10 text-success border-success/30",
      textClass: "text-success",
      ringStroke: "var(--success)",
    };
  }
  if (score >= 60) {
    return {
      tier: "medium",
      label: "Medium Match",
      badgeClass: "bg-warning/10 text-warning border-warning/30",
      textClass: "text-warning",
      ringStroke: "var(--warning)",
    };
  }
  return {
    tier: "weak",
    label: "Weak Match",
    badgeClass: "bg-destructive/10 text-destructive border-destructive/30",
    textClass: "text-destructive",
    ringStroke: "var(--destructive)",
  };
}

export function getStatusColor(status: string | null | undefined): {
  badgeClass: string;
  dotClass: string;
} {
  const s = (status || "").toLowerCase();
  if (s === "completed" || s === "success") {
    return {
      badgeClass: "bg-success/10 text-success border-success/30",
      dotClass: "bg-success",
    };
  }
  if (s === "partial_success") {
    return {
      badgeClass: "bg-warning/10 text-warning border-warning/30",
      dotClass: "bg-warning",
    };
  }
  if (s === "failed" || s === "error") {
    return {
      badgeClass: "bg-destructive/10 text-destructive border-destructive/30",
      dotClass: "bg-destructive",
    };
  }
  if (s === "running" || s === "started" || s === "in_progress") {
    return {
      badgeClass: "bg-primary/10 text-primary border-primary/30",
      dotClass: "bg-primary",
    };
  }
  return {
    badgeClass: "bg-muted text-muted-foreground border-border",
    dotClass: "bg-muted-foreground",
  };
}
