import * as React from "react";
import * as ReactDOM from "react-dom";
import { Link, useNavigate } from "@tanstack/react-router";
import { Bot, LayoutDashboard, LogOut, Menu, UserCircle, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { useCandidate } from "@/context/CandidateContext";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const navItems: ReadonlyArray<{
  to: "/" | "/upload" | "/analyze" | "/agent";
  label: string;
  exact?: boolean;
}> = [
  { to: "/", label: "Home", exact: true },
  { to: "/upload", label: "Upload" },
  { to: "/analyze", label: "Analyze" },
  { to: "/agent", label: "Agent" },
];

export function Navbar() {
  const { candidateId } = useCandidate();
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = React.useState(false);

  // Lock body scroll when menu is open
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const handleLogout = () => {
    logout();
    setOpen(false);
    toast.success("Logged out successfully.");
    navigate({ to: "/login" });
  };

  const allNavItems = [
    ...navItems,
    ...(candidateId
      ? [{ to: "/dashboard" as const, label: "Dashboard", icon: LayoutDashboard }]
      : []),
  ];

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/70">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-2 px-4 sm:h-16 sm:gap-3 md:gap-6 md:px-8">
          {/* Brand */}
          <Link
            to="/"
            className="flex flex-shrink-0 items-center gap-2 text-sm font-semibold tracking-tight text-foreground sm:text-base"
          >
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-primary to-agentic text-primary-foreground shadow-sm sm:h-8 sm:w-8">
              <Bot className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </span>
            <span className="hidden xs:inline">JobScout AI</span>
            <span className="xs:hidden">JobScout</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden flex-1 items-center gap-0.5 md:flex lg:gap-1">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                activeOptions={{ exact: item.exact ?? false }}
                className={cn(
                  "rounded-md px-2.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground lg:px-3",
                  "data-[status=active]:bg-primary-soft data-[status=active]:text-primary",
                )}
              >
                {item.label}
              </Link>
            ))}
            {candidateId ? (
              <Link
                to="/dashboard"
                className={cn(
                  "ml-0.5 inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground lg:ml-1 lg:px-3",
                  "data-[status=active]:bg-primary-soft data-[status=active]:text-primary",
                )}
              >
                <LayoutDashboard className="h-3.5 w-3.5" />
                Dashboard
              </Link>
            ) : null}
          </nav>

          {/* Right-side auth area */}
          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            {isAuthenticated && user ? (
              <>
                {/* User name chip — hidden on very small screens */}
                <div className="hidden items-center gap-1.5 sm:flex">
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-primary-soft text-primary">
                    <UserCircle className="h-4 w-4" />
                  </span>
                  <span className="max-w-[100px] truncate text-sm font-medium text-foreground lg:max-w-[160px]">
                    {user.full_name ?? user.email.split("@")[0]}
                  </span>
                </div>
                {/* Logout — hidden on mobile (shown in drawer) */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                  className="hidden items-center gap-1.5 text-muted-foreground hover:text-destructive md:flex"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span className="hidden lg:inline">Log out</span>
                </Button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="hidden rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground sm:inline-block"
                >
                  Log in
                </Link>
                <Button asChild size="sm" className="hidden sm:flex">
                  <Link to="/signup">Sign up free</Link>
                </Button>
              </>
            )}

            {/* Hamburger button — visible on mobile/tablet */}
            <button
              onClick={() => setOpen(true)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground md:hidden"
              aria-label="Open navigation menu"
            >
              <Menu className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile / Tablet Fullscreen Drawer rendered in portal */}
      {typeof document !== "undefined"
        ? ReactDOM.createPortal(
            <>
              {/* Backdrop */}
              <div
                onClick={() => setOpen(false)}
                className={cn(
                  "fixed inset-0 z-50 bg-black/50 backdrop-blur-sm transition-opacity duration-300 md:hidden",
                  open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
                )}
                aria-hidden
              />

              {/* Drawer panel */}
              <div
                className={cn(
                  "fixed inset-y-0 right-0 z-50 flex w-72 max-w-[85vw] flex-col bg-card shadow-2xl transition-transform duration-300 ease-in-out md:hidden",
                  open ? "translate-x-0" : "translate-x-full",
                )}
                role="dialog"
                aria-modal="true"
                aria-label="Navigation menu"
              >
                {/* Drawer header */}
                <div className="flex items-center justify-between border-b border-border px-5 py-4">
                  <div className="flex items-center gap-2">
                    <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-primary to-agentic text-primary-foreground">
                      <Bot className="h-3.5 w-3.5" />
                    </span>
                    <span className="text-sm font-semibold text-foreground">JobScout AI</span>
                  </div>
                  <button
                    onClick={() => setOpen(false)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                    aria-label="Close menu"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Nav links */}
                <nav className="flex-1 overflow-y-auto px-3 py-4">
                  <div className="space-y-1">
                    {navItems.map((item) => (
                      <Link
                        key={item.to}
                        to={item.to}
                        activeOptions={{ exact: item.exact ?? false }}
                        onClick={() => setOpen(false)}
                        className={cn(
                          "flex items-center rounded-xl px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
                          "data-[status=active]:bg-primary-soft data-[status=active]:text-primary",
                        )}
                      >
                        {item.label}
                      </Link>
                    ))}
                    {candidateId ? (
                      <Link
                        to="/dashboard"
                        onClick={() => setOpen(false)}
                        className={cn(
                          "flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
                          "data-[status=active]:bg-primary-soft data-[status=active]:text-primary",
                        )}
                      >
                        <LayoutDashboard className="h-4 w-4" />
                        Dashboard
                      </Link>
                    ) : null}
                  </div>

                  {/* Divider */}
                  <div className="my-4 h-px bg-border" />

                  {/* Auth section */}
                  {isAuthenticated && user ? (
                    <div className="space-y-3 px-1">
                      <div className="flex items-center gap-3 rounded-xl bg-secondary/60 px-4 py-3">
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
                          <UserCircle className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">
                            {user.full_name ?? user.email.split("@")[0]}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                      <button
                        onClick={handleLogout}
                        className="flex w-full items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      >
                        <LogOut className="h-4 w-4" />
                        Log out
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2 px-1">
                      <Link
                        to="/login"
                        onClick={() => setOpen(false)}
                        className="flex w-full items-center justify-center rounded-xl border border-border px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
                      >
                        Log in
                      </Link>
                      <Link
                        to="/signup"
                        onClick={() => setOpen(false)}
                        className="flex w-full items-center justify-center rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                      >
                        Sign up free
                      </Link>
                    </div>
                  )}
                </nav>
              </div>
            </>,
            document.body,
          )
        : null}
    </>
  );
}
