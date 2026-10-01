"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Menu, X, LogOut } from "lucide-react";
import { useAuthStore, isSubscribed } from "@/store/authStore";

const candidateLinks = [
  { href: "/jobs", label: "Jobs" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/resumes", label: "Resumes" },
  { href: "/applications", label: "Applications" },
  { href: "/assistant", label: "Assistant" },
];

const employerLinks = [
  { href: "/employer", label: "Dashboard" },
  { href: "/employer/jobs", label: "My jobs" },
  { href: "/employer/company", label: "Company" },
];

const adminLinks = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/companies", label: "Companies" },
  { href: "/admin/jobs", label: "Jobs" },
  { href: "/admin/applications", label: "Applications" },
  { href: "/admin/activity", label: "Activity" },
];

export default function Navbar() {
  const { user, logout } = useAuthStore();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const links =
    user?.role === "ADMIN"
      ? adminLinks
      : user?.role === "EMPLOYER"
        ? employerLinks
        : user
          ? candidateLinks
          : [];

  async function handleLogout() {
    await logout();
    setOpen(false);
    router.push("/");
  }

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4">
        <Link
          href={user ? links[0]?.href ?? "/" : "/"}
          className="font-display text-[15px] font-700 tracking-tight text-brand"
        >
          Job Assist
        </Link>

        <nav className="hidden flex-1 items-center gap-1 md:flex">
          {links.map((link) => {
            // "/admin" would otherwise light up on every admin sub-route.
            const active =
              link.href === "/admin"
                ? pathname === "/admin"
                : pathname === link.href || pathname.startsWith(`${link.href}/`);

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded px-3 py-1.5 text-sm ${
                  active
                    ? "bg-shell font-medium text-ink"
                    : "text-ink-soft hover:text-ink"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto hidden items-center gap-3 md:flex">
          {user ? (
            <>
              {user.role === "CANDIDATE" && !isSubscribed(user) && (
                <Link
                  href="/pricing"
                  className="rounded bg-locked-soft px-3 py-1.5 text-sm font-medium text-locked"
                >
                  Upgrade
                </Link>
              )}
              <span className="text-sm text-ink-soft">{user.fullName}</span>
              <button
                onClick={handleLogout}
                className="rounded p-1.5 text-ink-faint hover:bg-shell hover:text-ink"
                aria-label="Log out"
              >
                <LogOut size={16} />
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm text-ink-soft hover:text-ink">
                Log in
              </Link>
              <Link
                href="/signup"
                className="rounded bg-brand px-3.5 py-1.5 text-sm font-medium text-paper hover:bg-brand-deep"
              >
                Create account
              </Link>
            </>
          )}
        </div>

        <button
          onClick={() => setOpen(!open)}
          className="ml-auto p-1.5 text-ink md:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {open && (
        <div className="border-t border-line bg-paper px-4 py-3 md:hidden">
          <nav className="flex flex-col gap-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded px-3 py-2 text-sm text-ink-soft hover:bg-shell hover:text-ink"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="mt-3 flex flex-col gap-2 border-t border-line pt-3">
            {user ? (
              <>
                {user.role === "CANDIDATE" && !isSubscribed(user) && (
                  <Link
                    href="/pricing"
                    onClick={() => setOpen(false)}
                    className="rounded bg-locked-soft px-3 py-2 text-sm font-medium text-locked"
                  >
                    Upgrade your plan
                  </Link>
                )}
                <button
                  onClick={handleLogout}
                  className="rounded px-3 py-2 text-left text-sm text-ink-soft hover:bg-shell"
                >
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="rounded px-3 py-2 text-sm text-ink-soft hover:bg-shell"
                >
                  Log in
                </Link>
                <Link
                  href="/signup"
                  onClick={() => setOpen(false)}
                  className="rounded bg-brand px-3 py-2 text-center text-sm font-medium text-paper"
                >
                  Create account
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}