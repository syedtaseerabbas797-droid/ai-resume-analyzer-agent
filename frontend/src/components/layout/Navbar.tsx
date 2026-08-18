import * as React from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Bot, LayoutDashboard, LogOut, Menu, UserCircle } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { useCandidate } from "@/context/CandidateContext";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

const navItems: ReadonlyArray<{
  to: "/" | "/setup" | "/upload" | "/analyze" | "/agent";
  label: string;
  exact?: boolean;
}> = [
  { to: "/", label: "Home", exact: true },
  { to: "/setup", label: "Setup" },
  { to: "/upload", label: "Upload" },
  { to: "/analyze", label: "Analyze" },
  { to: "/agent", label: "Agent" },
];

export function Navbar() {
  const { candidateId } = useCandidate();
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = React.useState(false);

  const handleLogout = () => {
    logout();
    toast.success("Logged out successfully.");
    navigate({ to: "/login" });
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/70">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 md:gap-6 md:px-8">
        {/* Brand */}
        <Link
          to="/"
          className="flex items-center gap-2 text-base font-semibold tracking-tight text-foreground"
        >
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-primary to-agentic text-primary-foreground shadow-sm">
            <Bot className="h-4 w-4" />
          </span>
          JobScout AI
        </Link>

        {/* Desktop nav */}
        <nav className="hidden flex-1 items-center gap-1 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.exact ?? false }}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
                "data-[status=active]:bg-primary-soft data-[status=active]:text-primary",
              )}
            >
              {item.label}
            </Link>
          ))}
          {candidateId ? (
            <Link
              to="/dashboard/$candidateId"
              params={{ candidateId }}
              className={cn(
                "ml-1 inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
                "data-[status=active]:bg-primary-soft data-[status=active]:text-primary",
              )}
            >
              <LayoutDashboard className="h-3.5 w-3.5" />
              Dashboard
            </Link>
          ) : null}
        </nav>

        {/* Right-side: user chip + logout OR login/signup */}
        <div className="ml-auto flex items-center gap-2">
          {isAuthenticated && user ? (
            <>
              {/* User name chip */}
              <div className="hidden items-center gap-1.5 sm:flex">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-primary-soft text-primary">
                  <UserCircle className="h-4 w-4" />
                </span>
                <span className="max-w-[160px] truncate text-sm font-medium text-foreground">
                  {user.full_name ?? user.email.split("@")[0]}
                </span>
              </div>

              {/* Logout button */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="hidden items-center gap-1.5 text-muted-foreground hover:text-destructive sm:flex"
              >
                <LogOut className="h-3.5 w-3.5" />
                Log out
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

          {/* Mobile hamburger */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="md:hidden"
                aria-label="Open navigation menu"
              >
                <Menu className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[80%] max-w-xs">
              <SheetHeader>
                <SheetTitle>Navigation</SheetTitle>
              </SheetHeader>
              <nav className="mt-6 flex flex-col gap-1">
                {navItems.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    activeOptions={{ exact: item.exact ?? false }}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
                      "data-[status=active]:bg-primary-soft data-[status=active]:text-primary",
                    )}
                  >
                    {item.label}
                  </Link>
                ))}
                {candidateId ? (
                  <Link
                    to="/dashboard/$candidateId"
                    params={{ candidateId }}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
                      "data-[status=active]:bg-primary-soft data-[status=active]:text-primary",
                    )}
                  >
                    <LayoutDashboard className="h-3.5 w-3.5" />
                    Dashboard
                  </Link>
                ) : null}

                <div className="mt-3 border-t border-border pt-3">
                  {isAuthenticated && user ? (
                    <>
                      <p className="px-3 pb-2 text-xs font-medium text-muted-foreground">
                        {user.email}
                      </p>
                      <button
                        onClick={() => {
                          setOpen(false);
                          handleLogout();
                        }}
                        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      >
                        <LogOut className="h-4 w-4" />
                        Log out
                      </button>
                    </>
                  ) : (
                    <>
                      <Link
                        to="/login"
                        onClick={() => setOpen(false)}
                        className="block rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                      >
                        Log in
                      </Link>
                      <Link
                        to="/signup"
                        onClick={() => setOpen(false)}
                        className="mt-1 block rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                      >
                        Sign up free
                      </Link>
                    </>
                  )}
                </div>

                {candidateId ? (
                  <p
                    title={candidateId}
                    className="mt-2 truncate rounded-md border border-border bg-secondary px-3 py-2 font-mono text-[11px] text-muted-foreground"
                  >
                    ID: {candidateId}
                  </p>
                ) : null}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
