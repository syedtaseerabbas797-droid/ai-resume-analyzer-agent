import { Outlet } from "@tanstack/react-router";
import { Navbar } from "./Navbar";

export function AppLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Navbar />
      <main className="flex-1 w-full overflow-x-hidden">
        <Outlet />
      </main>
      <footer className="border-t border-border bg-card/40">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-1 px-4 py-5 text-xs text-muted-foreground sm:flex-row sm:justify-between md:px-8">
          <span>JobScout AI — your AI-powered career agent.</span>
          <span className="font-mono">Frontend · TanStack Start</span>
        </div>
      </footer>
    </div>
  );
}
