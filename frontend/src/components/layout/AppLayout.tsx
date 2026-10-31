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
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-5 text-xs text-muted-foreground sm:flex-row md:px-8">
          <span>&copy; {new Date().getFullYear()} JobScout AI &mdash; Autonomous Career Intelligence Platform.</span>
          <span className="text-muted-foreground/80">Built with precision for modern job seekers</span>
        </div>
      </footer>
    </div>
  );
}
