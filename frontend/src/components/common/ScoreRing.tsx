import * as React from "react";
import { getScoreInfo } from "@/lib/scoring";
import { cn } from "@/lib/utils";

interface ScoreRingProps {
  score: number | null | undefined;
  size?: number;
  stroke?: number;
  label?: string;
  className?: string;
}

export function ScoreRing({
  score,
  size = 132,
  stroke = 12,
  label,
  className,
}: ScoreRingProps) {
  const info = getScoreInfo(score);
  const target = score == null || isNaN(score) ? 0 : Math.max(0, Math.min(100, score));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  const [animated, setAnimated] = React.useState(0);
  React.useEffect(() => {
    const id = window.requestAnimationFrame(() => setAnimated(target));
    return () => window.cancelAnimationFrame(id);
  }, [target]);

  const offset = circumference - (animated / 100) * circumference;

  return (
    <div className={cn("inline-flex flex-col items-center gap-1.5", className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="var(--border)"
            strokeWidth={stroke}
            fill="none"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={info.ringStroke}
            strokeWidth={stroke}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 900ms ease-out" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn("text-3xl font-semibold tabular-nums", info.textClass)}>
            {score == null || isNaN(score) ? "—" : Math.round(score)}
          </span>
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            {label ?? "Score"}
          </span>
        </div>
      </div>
      <span className={cn("text-xs font-medium", info.textClass)}>{info.label}</span>
    </div>
  );
}
