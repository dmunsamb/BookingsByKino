"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/dashboard", label: "Tableau de bord" },
  { href: "/dashboard/configuration", label: "Configuration" },
  { href: "/dashboard/rapports", label: "Rapport" },
] as const;

/**
 * Navigation entre les trois pages du gérant — avant, tout vivait sur
 * /dashboard (réservations + réglages + bilan + rapports mélangés) ; ce
 * découpage garde chaque page focalisée sur un seul usage.
 */
export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="mb-6 flex gap-2 border-b border-ink-900/10 pb-3 dark:border-paper/10">
      {TABS.map((tab) => {
        const active =
          tab.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
              active
                ? "bg-kino-400 text-ink-900"
                : "text-ink-400 hover:bg-ink-900/5 dark:hover:bg-paper/10"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
