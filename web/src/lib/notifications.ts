import "server-only";
import { createAdminClient } from "./supabase/admin";
import { sendEmail } from "./mailer";

/**
 * Notifications par email, opt-in (profiles.notify_by_email, migration
 * 0045) : jamais envoyées à un compte qui a décoché la case dans
 * /dashboard/compte. Toujours best-effort (voir mailer.ts) — ne doivent
 * jamais faire échouer la réservation ou l'inscription qui les déclenche.
 *
 * Client admin requis : il faut lire l'email réel (auth.users), auquel
 * ni l'anon ni l'authenticated n'ont directement accès.
 */

/** Prévient le(s) gérant(s) d'un établissement qu'une nouvelle demande de réservation vient d'arriver. */
export async function notifyBusinessOwnersOfNewBooking(
  businessId: string,
  clientName: string,
  referenceNumber: number
): Promise<void> {
  try {
    const admin = createAdminClient();
    const { data: owners } = await admin
      .from("profiles")
      .select("id")
      .eq("business_id", businessId)
      .eq("role", "owner")
      .eq("notify_by_email", true);

    for (const owner of owners ?? []) {
      const { data } = await admin.auth.admin.getUserById(owner.id);
      const email = data.user?.email;
      if (!email) continue;

      await sendEmail({
        to: email,
        subject: "Nouvelle demande de réservation — KinoBooking",
        text: `${clientName} vient d'envoyer une demande de réservation (n°${referenceNumber}).\n\nConnectez-vous à votre tableau de bord KinoBooking pour la valider ou la refuser, dans les 2 heures si possible.`,
      });
    }
  } catch (error) {
    console.error("notifyBusinessOwnersOfNewBooking error:", error);
  }
}

/** Prévient les platform_admin qu'un nouvel établissement vient de s'inscrire et attend validation. */
export async function notifyPlatformAdminsOfNewSignup(
  businessName: string
): Promise<void> {
  try {
    const admin = createAdminClient();
    const { data: admins } = await admin
      .from("profiles")
      .select("id")
      .eq("role", "platform_admin")
      .eq("notify_by_email", true);

    for (const a of admins ?? []) {
      const { data } = await admin.auth.admin.getUserById(a.id);
      const email = data.user?.email;
      if (!email) continue;

      await sendEmail({
        to: email,
        subject: "Nouvelle inscription en attente — KinoBooking",
        text: `${businessName} vient de s'inscrire sur KinoBooking et attend votre validation.\n\nConnectez-vous sur /admin pour la traiter.`,
      });
    }
  } catch (error) {
    console.error("notifyPlatformAdminsOfNewSignup error:", error);
  }
}
