import packageJson from "../../package.json";

/**
 * Pied de page persistant (numéro de version + copyright) — demandé
 * explicitement, absent jusqu'ici. La version vient de package.json
 * plutôt que d'être recopiée en dur, pour rester juste sans y repenser
 * à chaque publication.
 */
export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto bg-ink-900">
      <div className="mx-auto max-w-5xl px-4 py-4 text-center text-xs text-muted-on-ink">
        KinoBooking v{packageJson.version} · © {year} kinshasa.io
      </div>
    </footer>
  );
}
