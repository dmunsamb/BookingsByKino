import Link from "next/link";

/**
 * En-tête persistant sur toutes les pages : logo cliquable vers l'accueil.
 * Corrige l'absence de chemin de retour depuis le dashboard vers la
 * homepage.
 */
export function SiteHeader() {
  return (
    <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <div className="mx-auto flex max-w-5xl items-center px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-kino-500 to-amber-300 text-sm font-black text-slate-950">
            K
          </div>
          <span className="font-black text-slate-900 dark:text-white">
            Kino<span className="text-kino-500">Booking</span>
          </span>
        </Link>
      </div>
    </header>
  );
}
