import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/headmates", label: "Headmates" },
  { href: "/front-history", label: "Front History" },
  { href: "/journal", label: "Journal" },
];

export async function AppShell({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <div>
            <p className="text-lg font-semibold">SysFlow</p>
            <p className="text-xs text-zinc-500">Plural system management MVP</p>
          </div>
          <nav className="flex flex-wrap items-center justify-end gap-2 text-sm">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-3 py-1.5 text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900"
              >
                {item.label}
              </Link>
            ))}
            {session?.user ? (
              <>
                <span className="px-2 text-xs text-zinc-500">{session.user.email}</span>
                <Link
                  href="/api/auth/signout"
                  className="rounded-md border border-zinc-300 px-3 py-1.5 text-zinc-700 hover:bg-zinc-100"
                >
                  Sign out
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-md border border-zinc-300 px-3 py-1.5 text-zinc-700 hover:bg-zinc-100"
                >
                  Login
                </Link>
                <Link
                  href="/signup"
                  className="rounded-md bg-violet-600 px-3 py-1.5 text-white hover:bg-violet-700"
                >
                  Sign up
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
