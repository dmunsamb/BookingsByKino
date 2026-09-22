import Link from "next/link";
import packageJson from "../../package.json";

/**
 * Pied de page persistant (numéro de version + copyright) — demandé
 * explicitement, absent jusqu'ici. La version vient de package.json
 * plutôt que d'être recopiée en dur, pour rester juste sans y repenser
 * à chaque publication.
 *
 * Le lien vers les CGV vit ici plutôt que dans le menu ☰ : c'est
 * l'emplacement conventionnel pour ce type de page, toujours visible
 * sans encombrer un menu déjà consacré à la navigation/FAQ.
 */
export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto bg-ink-900">
      <div className="mx-auto max-w-5xl px-4 py-4 text-center text-xs text-muted-on-ink">
        <Link href="/conditions-generales" className="hover:underline">
          Conditions générales de vente
        </Link>
        <span className="mx-2">·</span>
        KinoBooking v{packageJson.version} · © {year} kinshasa.io
      </div>
    </footer>
  );
}
