import type { Config } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";

/**
 * Rapport mensuel envoyé aux platform_admin ayant activé les
 * notifications (profiles.notify_by_email, migration 0045) — le 1er de
 * chaque mois, résumé des chiffres du mois civil précédent.
 *
 * Fonction Netlify indépendante (pas une Server Action Next.js) :
 * auto-suffisante, n'importe PAS lib/supabase/admin.ts ni lib/mailer.ts
 * (tous deux commencent par `import "server-only"`, qui suppose la
 * résolution de conditions spécifique à Next.js — non garantie dans le
 * bundle esbuild d'une fonction Netlify classique). Le client Supabase
 * et l'envoi SMTP sont donc réimplémentés ici, volontairement.
 *
 * 06:00 UTC = 07:00 à Kinshasa (UTC+1, sans heure d'été) et 08:00 à
 * Lubumbashi (UTC+2) — un matin raisonnable pour les deux villes.
 */
export const config: Config = {
  schedule: "0 6 1 * *",
};

function monthRange(monthsAgo: number) {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - monthsAgo, 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - monthsAgo + 1, 1));
  return { start, end };
}

function formatMonthLabel(date: Date): string {
  return date.toLocaleDateString("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" });
}

const handler = async () => {
  const supabaseUrl = Netlify.env.get("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = Netlify.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const smtpHost = Netlify.env.get("SMTP_HOST");
  const smtpUser = Netlify.env.get("SMTP_USER");
  const smtpPassword = Netlify.env.get("SMTP_PASSWORD");

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("monthly-report: Supabase non configuré, abandon.");
    return new Response("Supabase env vars missing", { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { start, end } = monthRange(1); // mois civil précédent
  const startIso = start.toISOString();
  const endIso = end.toISOString();

  const [
    { count: newSignups },
    { count: activeBusinesses },
    { data: payments },
    { count: bookingsCreated },
    { data: bookingStatuses },
    { data: newBusinessCategories },
  ] = await Promise.all([
    supabase
      .from("businesses")
      .select("id", { count: "exact", head: true })
      .gte("created_at", startIso)
      .lt("created_at", endIso),
    supabase
      .from("businesses")
      .select("id", { count: "exact", head: true })
      .eq("signup_status", "approved")
      .or(`subscription_paid_until.is.null,subscription_paid_until.gte.${new Date().toISOString()}`),
    supabase
      .from("subscription_payments")
      .select("amount_usd, duration_months")
      .gte("recorded_at", startIso)
      .lt("recorded_at", endIso),
    supabase
      .from("agenda_entries")
      .select("id", { count: "exact", head: true })
      .eq("source", "klant_app")
      .gte("created_at", startIso)
      .lt("created_at", endIso),
    supabase
      .from("agenda_entries")
      .select("status")
      .eq("source", "klant_app")
      .gte("created_at", startIso)
      .lt("created_at", endIso),
    supabase
      .from("businesses")
      .select("main_category")
      .gte("created_at", startIso)
      .lt("created_at", endIso),
  ]);

  const revenueUsd = (payments ?? []).reduce((sum, p) => sum + Number(p.amount_usd), 0);
  const paymentsByDuration = new Map<number, number>();
  for (const p of payments ?? []) {
    paymentsByDuration.set(p.duration_months, (paymentsByDuration.get(p.duration_months) ?? 0) + 1);
  }

  const statusCounts = new Map<string, number>();
  for (const b of bookingStatuses ?? []) {
    if (!b.status) continue;
    statusCounts.set(b.status, (statusCounts.get(b.status) ?? 0) + 1);
  }
  const confirmed = (statusCounts.get("confirmed") ?? 0) + (statusCounts.get("termine") ?? 0);
  const rejected = statusCounts.get("geannuleerd") ?? 0;
  const noShow = statusCounts.get("no_show") ?? 0;
  const decided = confirmed + rejected;
  const validationRate = decided > 0 ? Math.round((confirmed / decided) * 100) : null;
  const noShowRate = confirmed + noShow > 0 ? Math.round((noShow / (confirmed + noShow)) * 100) : null;

  const categoryCounts = new Map<string, number>();
  for (const b of newBusinessCategories ?? []) {
    const cat = b.main_category ?? "Non catégorisé";
    categoryCounts.set(cat, (categoryCounts.get(cat) ?? 0) + 1);
  }
  const topCategories = [...categoryCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([cat, n]) => `  - ${cat} : ${n}`)
    .join("\n");

  const monthLabel = formatMonthLabel(start);

  const lines = [
    `Rapport KinoBooking — ${monthLabel}`,
    "",
    "CROISSANCE",
    `  Nouvelles inscriptions : ${newSignups ?? 0}`,
    `  Établissements actifs (abonnement à jour, à la date d'envoi) : ${activeBusinesses ?? 0}`,
    "",
    "REVENUS",
    `  Encaissé ce mois : $${revenueUsd.toFixed(2)}`,
    `  Paiements par durée : ${
      [...paymentsByDuration.entries()].map(([d, n]) => `${d} mois × ${n}`).join(", ") || "aucun"
    }`,
    "",
    "USAGE RÉEL",
    `  Demandes de réservation reçues (clients) : ${bookingsCreated ?? 0}`,
    `  Taux de validation (confirmées vs refusées) : ${validationRate !== null ? `${validationRate}%` : "n/a (pas assez de données)"}`,
    `  Taux de no-show : ${noShowRate !== null ? `${noShowRate}%` : "n/a (pas assez de données)"}`,
    "",
    "NOUVEAUX ÉTABLISSEMENTS PAR CATÉGORIE",
    topCategories || "  Aucune nouvelle inscription ce mois.",
  ];
  const reportText = lines.join("\n");

  const { data: admins } = await supabase
    .from("profiles")
    .select("id")
    .eq("role", "platform_admin")
    .eq("notify_by_email", true);

  if (!admins || admins.length === 0) {
    console.log("monthly-report: aucun platform_admin abonné, rapport non envoyé.");
    return new Response("No subscribed admin", { status: 200 });
  }

  if (!smtpHost || !smtpUser || !smtpPassword) {
    console.error("monthly-report: SMTP non configuré, rapport calculé mais non envoyé.");
    return new Response("SMTP env vars missing", { status: 500 });
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: Number(Netlify.env.get("SMTP_PORT") ?? 465),
    secure: true,
    auth: { user: smtpUser, pass: smtpPassword },
  });

  for (const admin of admins) {
    const { data } = await supabase.auth.admin.getUserById(admin.id);
    const email = data.user?.email;
    if (!email) continue;

    try {
      await transporter.sendMail({
        from: `"KinoBooking" <${smtpUser}>`,
        to: email,
        subject: `Rapport mensuel KinoBooking — ${monthLabel}`,
        text: reportText,
      });
    } catch (error) {
      console.error(`monthly-report: échec d'envoi à ${email}`, error);
    }
  }

  return new Response("Report sent", { status: 200 });
};

export default handler;
