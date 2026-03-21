import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { ThemeToggle } from "@/components/theme-toggle";

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/headmates", label: "Headmates" },
  { href: "/front-history", label: "Front History" },
  { href: "/journal", label: "Journal" },
];

export async function AppShell({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div>
            <p className="text-lg font-semibold tracking-tight text-foreground">SysFlow</p>
            <p className="text-xs text-muted-foreground">Plural system management MVP</p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <ThemeToggle />
            <nav className="flex flex-wrap items-center justify-end gap-1 text-sm">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-md px-3 py-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            {session?.user ? (
              <>
                <span className="hidden max-w-[10rem] truncate px-1 text-xs text-muted-foreground sm:inline">
                  {session.user.email}
                </span>
                <Link
                  href="/api/auth/signout"
                  className="rounded-md border border-border bg-card px-3 py-1.5 text-sm text-foreground hover:bg-muted"
                >
                  Sign out
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-md border border-border bg-card px-3 py-1.5 text-sm text-foreground hover:bg-muted"
                >
                  Login
                </Link>
                <Link
                  href="/signup"
                  className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
