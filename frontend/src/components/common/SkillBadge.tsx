import { cn } from "@/lib/utils";

type Tone = "neutral" | "matched" | "missing" | "primary" | "ai";

const toneClass: Record<Tone, string> = {
  neutral: "bg-secondary text-secondary-foreground border-border",
  matched: "bg-success/10 text-success border-success/30",
  missing: "bg-warning/10 text-warning border-warning/30",
  primary: "bg-primary-soft text-primary border-primary/20",
  ai: "bg-ai/10 text-ai border-ai/30",
};

export function SkillBadge({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        toneClass[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
