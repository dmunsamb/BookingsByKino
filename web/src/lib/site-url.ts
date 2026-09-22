import "server-only";
import { headers } from "next/headers";

/**
 * Origine absolue de la requête en cours ("https://kinobooking.netlify.app"),
 * pour construire un lien partageable (QR file d'attente, lien d'avis
 * WhatsApp...) — le nom de domaine réel dépend de l'environnement
 * (preview Netlify, domaine de production...), jamais codé en dur.
 */
export async function getSiteOrigin(): Promise<string> {
  const headersList = await headers();
  const host = headersList.get("host") ?? "kinobooking.netlify.app";
  const proto = headersList.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}
