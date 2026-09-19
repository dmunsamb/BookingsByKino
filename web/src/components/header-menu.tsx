"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { CATEGORIES } from "@/lib/categories";

/**
 * Le menu ☰ du header. En <details>/<summary> pur CSS pour rester léger,
 * mais ça ne se ferme pas tout seul au clic ailleurs sur la page — un
 * comportement JS minimal comble ce manque, sans transformer tout le
 * menu en composant contrôlé.
 */
export function HeaderMenu({
  faqHref,
  faqSectionLabel,
}: {
  faqHref: string;
  faqSectionLabel: string;
}) {
  const detailsRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const details = detailsRef.current;
      if (details?.open && !details.contains(event.target as Node)) {
        details.open = false;
      }
    }
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  return (
    <details ref={detailsRef} className="group relative">
      <summary
        aria-label="Menu"
        title="Menu"
        className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-full text-paper/80 transition hover:bg-paper/10 hover:text-paper"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          className="h-5 w-5"
        >
          <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </summary>
      <div className="absolute right-0 z-20 mt-2 w-56 rounded-2xl border border-ink-900/10 bg-white p-2 shadow-lg dark:border-paper/10 dark:bg-ink-800">
        <p className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-widest text-ink-400">
          Catégories
        </p>
        <Link
          href="/"
          className="block rounded-xl px-3 py-2 text-sm font-bold text-ink-900 hover:bg-ink-900/5 dark:text-paper dark:hover:bg-paper/10"
        >
          Toutes les catégories
        </Link>
        {CATEGORIES.map((c) => (
          <Link
            key={c.value}
            href={{ pathname: "/", query: { category: c.value } }}
            className="block rounded-xl px-3 py-2 text-sm text-ink-900 hover:bg-ink-900/5 dark:text-paper dark:hover:bg-paper/10"
          >
            {c.value}
          </Link>
        ))}
        <hr className="my-2 border-ink-900/10 dark:border-paper/10" />
        <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-ink-400">
          {faqSectionLabel}
        </p>
        <Link
          href={faqHref}
          className="block rounded-xl px-3 py-2 text-sm font-bold text-ink-900 hover:bg-ink-900/5 dark:text-paper dark:hover:bg-paper/10"
        >
          FAQ — Questions fréquentes
        </Link>
      </div>
    </details>
  );
}
