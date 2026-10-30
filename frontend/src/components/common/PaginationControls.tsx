import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PaginationControls({
  page,
  totalPages,
  onChange,
  disabled = false,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  disabled?: boolean;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between gap-2 rounded-2xl border border-border bg-card p-3 sm:gap-3">
      <Button
        variant="outline"
        size="sm"
        disabled={disabled || page <= 1}
        onClick={() => onChange(page - 1)}
        className="px-2.5 sm:px-3"
        aria-label="Previous page"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        <span className="hidden xs:inline">Previous</span>
      </Button>
      <span className="whitespace-nowrap text-xs font-medium text-muted-foreground">
        Page <span className="font-semibold text-foreground">{page}</span> of {totalPages}
      </span>
      <Button
        variant="outline"
        size="sm"
        disabled={disabled || page >= totalPages}
        onClick={() => onChange(page + 1)}
        className="px-2.5 sm:px-3"
        aria-label="Next page"
      >
        <span className="hidden xs:inline">Next</span>
        <ChevronRight className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
