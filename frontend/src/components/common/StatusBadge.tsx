import { cn } from "@/lib/utils";
import { getStatusColor } from "@/lib/scoring";

export function StatusBadge({
  status,
  pulse = false,
  className,
}: {
  status: string | null | undefined;
  pulse?: boolean;
  className?: string;
}) {
  const { badgeClass, dotClass } = getStatusColor(status);
  const label = (status || "unknown").replace(/_/g, " ");
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize",
        badgeClass,
        className,
      )}
    >
      <span
        className={cn("h-1.5 w-1.5 rounded-full", dotClass, pulse && "js-pulse-soft")}
      />
      {label}
    </span>
  );
}
