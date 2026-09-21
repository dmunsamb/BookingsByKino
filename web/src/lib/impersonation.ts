import "server-only";
import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";

/**
 * Mode "voir en tant que" (impersonation) pour platform_admin/sales — voir
 * discussion produit : un admin/commercial doit pouvoir administrer un
 * salon exactement comme son gérant, sans muter profiles.business_id (ce
 * que fait déjà switchActiveBusiness pour un vrai propriétaire multi-salon,
 * mais de façon permanente — inadapté ici : on veut un aller-retour propre,
 * borné dans le temps, jamais un changement de compte durable).
 *
 * Implémenté en cookie signé (HMAC) plutôt qu'en ligne de base : durée de
 * vie courte (1h), pas de nettoyage à prévoir, et la vérité reste "qui a le
 * droit d'agir sur ce salon MAINTENANT" (relu à chaque page, voir
 * lib/auth/dal.ts) plutôt que mémorisée au moment de la création du cookie.
 * Signé avec la clé service-role (déjà un secret serveur uniquement,
 * jamais exposé) — pas de nouvelle variable d'environnement à configurer.
 */

const COOKIE_NAME = "kb_impersonation";
const DURATION_MS = 60 * 60 * 1000;

export type ActingRole = "owner" | "staff";

export type ImpersonationPayload = {
  adminId: string;
  businessId: string;
  actingRole: ActingRole;
  expiresAt: number;
};

function secret(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY manquant.");
  return key;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

function encode(payload: ImpersonationPayload): string {
  const json = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${json}.${sign(json)}`;
}

function decode(token: string): ImpersonationPayload | null {
  const [json, sig] = token.split(".");
  if (!json || !sig) return null;

  const expectedSig = sign(json);
  const provided = Buffer.from(sig);
  const expected = Buffer.from(expectedSig);
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(json, "base64url").toString("utf8"));
    if (
      typeof payload?.adminId !== "string" ||
      typeof payload?.businessId !== "string" ||
      (payload?.actingRole !== "owner" && payload?.actingRole !== "staff") ||
      typeof payload?.expiresAt !== "number"
    ) {
      return null;
    }
    return payload as ImpersonationPayload;
  } catch {
    return null;
  }
}

export async function startImpersonation(params: {
  adminId: string;
  businessId: string;
  actingRole: ActingRole;
}): Promise<void> {
  const payload: ImpersonationPayload = {
    ...params,
    expiresAt: Date.now() + DURATION_MS,
  };
  const jar = await cookies();
  jar.set(COOKIE_NAME, encode(payload), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: DURATION_MS / 1000,
  });
}

export async function endImpersonation(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

/** `realProfileId` évite qu'un cookie recyclé sur un autre compte connecté sur le même navigateur soit accepté. */
export async function readImpersonation(
  realProfileId: string
): Promise<ImpersonationPayload | null> {
  const jar = await cookies();
  const raw = jar.get(COOKIE_NAME)?.value;
  if (!raw) return null;

  const payload = decode(raw);
  if (!payload) return null;
  if (payload.adminId !== realProfileId) return null;
  if (Date.now() > payload.expiresAt) return null;

  return payload;
}
