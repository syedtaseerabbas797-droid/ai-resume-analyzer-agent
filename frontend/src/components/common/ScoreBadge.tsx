import { cn } from "@/lib/utils";
import { getScoreInfo } from "@/lib/scoring";

export function ScoreBadge({
  score,
  className,
}: {
  score: number | null | undefined;
  className?: string;
}) {
  const info = getScoreInfo(score);
  const display =
    score == null || isNaN(score) ? info.label : `${Math.round(score)} · ${info.label}`;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        info.badgeClass,
        className,
      )}
    >
      {display}
    </span>
  );
}
