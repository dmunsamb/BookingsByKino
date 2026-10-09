import "server-only";
import nodemailer from "nodemailer";

/**
 * Envoi d'emails applicatifs (notifications) — indépendant du SMTP
 * configuré côté Supabase Auth (Dashboard → Authentication → Emails),
 * qui ne s'applique qu'aux emails générés par Supabase lui-même
 * (réinitialisation de mot de passe...). Ici on réutilise les mêmes
 * identifiants OVH (voir .env.local.example) via nodemailer, pour nos
 * propres notifications (nouvelle réservation, nouvelle inscription).
 *
 * Variables d'env requises : SMTP_HOST, SMTP_PORT, SMTP_USER,
 * SMTP_PASSWORD. Transporteur mis en cache (module-level) plutôt que
 * recréé à chaque envoi.
 */

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 465),
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  }
  return transporter;
}

/**
 * Best-effort : une notification est utile mais jamais bloquante — un
 * envoi qui échoue (SMTP non configuré, indisponible...) ne doit jamais
 * faire échouer l'action métier qui l'a déclenché (réservation,
 * inscription). Les erreurs sont journalisées, jamais levées.
 */
export async function sendEmail({
  to,
  subject,
  text,
}: {
  to: string;
  subject: string;
  text: string;
}): Promise<void> {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
    console.error("sendEmail: SMTP non configuré, notification ignorée", {
      to,
      subject,
    });
    return;
  }

  try {
    await getTransporter().sendMail({
      from: `"KinoBooking" <${process.env.SMTP_USER}>`,
      to,
      subject,
      text,
    });
  } catch (error) {
    console.error("sendEmail: échec de l'envoi", error);
  }
}
