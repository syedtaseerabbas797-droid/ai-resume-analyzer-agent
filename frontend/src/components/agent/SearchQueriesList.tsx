import { ChevronDown, Search } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export function SearchQueriesList({
  queries,
}: {
  queries: Array<string | { query: string; source?: string | null }>;
}) {
  if (!queries || queries.length === 0) return null;

  return (
    <Collapsible className="rounded-2xl border border-border bg-card">
      <CollapsibleTrigger className="group flex w-full items-center justify-between gap-3 p-4 text-left">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-agentic/10 text-agentic">
            <Search className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">
              Search queries ({queries.length})
            </p>
            <p className="text-xs text-muted-foreground">
              Queries the agent generated to find jobs
            </p>
          </div>
        </div>
        <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ul className="space-y-2 border-t border-border px-4 py-4">
          {queries.map((q, i) => {
            const text = typeof q === "string" ? q : q.query;
            const source = typeof q === "string" ? null : q.source ?? null;
            return (
              <li
                key={i}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm"
              >
                <span className="truncate text-foreground">{text}</span>
                {source ? (
                  <span className="shrink-0 rounded-full border border-border bg-card px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    {source}
                  </span>
                ) : null}
              </li>
            );
          })}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
}
