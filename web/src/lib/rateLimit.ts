import { createClient } from "@/lib/supabase/server";

/**
 * Vérifie et enregistre une requête vis-à-vis d'une limite de débit, via la
 * fonction Postgres `check_rate_limit` (supabase/migrations/0001_init_schema.sql).
 *
 * Voir docs/functioneel-ontwerp-kinobooking.md, section 13.6.1 : indispensable
 * sur les endpoints publics sans authentification (soumettre une réservation,
 * prendre un ticket walk-in) pour empêcher qu'on sature artificiellement la
 * capacité limitée de l'agenda d'un établissement.
 *
 * @param key Identifiant de la limite, ex. `booking:${ip}` ou `login:${ip}`.
 * @param maxHits Nombre de requêtes autorisées dans la fenêtre de temps.
 * @param windowSeconds Durée de la fenêtre glissante, en secondes.
 * @returns `true` si la requête est autorisée, `false` si la limite est dépassée.
 */
export async function checkRateLimit(
  key: string,
  maxHits: number,
  windowSeconds: number
): Promise<boolean> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("check_rate_limit", {
    p_key: key,
    p_max_hits: maxHits,
    p_window_seconds: windowSeconds,
  });

  if (error) {
    // En cas de doute (ex. la fonction est indisponible), on choisit de
    // bloquer plutôt que de laisser passer une écriture publique non limitée.
    console.error("checkRateLimit error:", error);
    return false;
  }

  return data === true;
}

/**
 * Extrait une adresse IP raisonnable de la requête entrante, pour l'utiliser
 * comme clé de rate limiting. Netlify (comme la plupart des plateformes)
 * transmet l'IP réelle du visiteur via `x-nf-client-connection-ip`, avec
 * `x-forwarded-for` en repli plus générique.
 */
export function getClientIp(request: Request): string {
  const headers = request.headers;
  return (
    headers.get("x-nf-client-connection-ip") ??
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}
