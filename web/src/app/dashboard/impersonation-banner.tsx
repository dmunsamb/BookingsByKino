import { endImpersonationAction } from "@/app/admin/impersonate/actions";
import type { ImpersonationBanner as ImpersonationBannerInfo } from "@/lib/auth/dal";

/**
 * Bandeau persistant affiché sur tout /dashboard pendant une session "voir
 * en tant que" — demandé explicitement pour qu'un admin/sales n'oublie
 * jamais dans quel salon il se trouve, ni qu'il agit à la place d'un tiers.
 */
export function ImpersonationBanner({
  businessName,
  actingRole,
  realRole,
}: ImpersonationBannerInfo) {
  return (
    <div className="sticky top-0 z-50 flex flex-wrap items-center justify-between gap-2 bg-ink-900 px-4 py-2 text-xs text-paper">
      <span>
        Vous consultez <strong>{businessName}</strong> en tant que{" "}
        {actingRole === "owner" ? "gérant" : "personnel"}
        {realRole === "sales" && " — actions sensibles désactivées"}
        {" · "}session limitée à 1h.
      </span>
      <form action={endImpersonationAction}>
        <button
          type="submit"
          className="rounded-lg bg-kino-400 px-3 py-1 font-bold text-ink-900 transition hover:bg-kino-500"
        >
          Quitter
        </button>
      </form>
    </div>
  );
}
