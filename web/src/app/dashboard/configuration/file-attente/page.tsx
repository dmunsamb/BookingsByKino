import QRCode from "qrcode";
import { getCurrentProfile, canManageBusiness } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { buildQueueJoinUrl } from "@/lib/qr";
import { getSiteOrigin } from "@/lib/site-url";
import { DashboardNav } from "../../dashboard-nav";
import { CapacityForm } from "./capacity-form";

export default async function FileAttenteConfigurationPage() {
  const profile = await getCurrentProfile();

  if (!profile?.business_id) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center text-sm text-ink-400">
        Aucun établissement associé à votre compte.
      </div>
    );
  }

  if (!canManageBusiness(profile)) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center text-sm text-ink-400">
        Réservé au gérant de l&apos;établissement.
      </div>
    );
  }

  const supabase = await createClient();
  const { data: business } = await supabase
    .from("businesses")
    .select("walkin_queue_capacity")
    .eq("id", profile.business_id)
    .maybeSingle();

  const origin = await getSiteOrigin();
  const joinUrl = buildQueueJoinUrl(origin, profile.business_id);
  const qrDataUrl = await QRCode.toDataURL(joinUrl, { margin: 1, width: 320 });

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <DashboardNav />

      <h1 className="mb-6 font-serif text-2xl text-ink-900 dark:text-paper">
        File d&apos;attente sans rendez-vous
      </h1>

      <section className="mb-8 rounded-2xl border border-ink-900/10 bg-white p-6 dark:border-paper/10 dark:bg-ink-800">
        <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-ink-400">
          Capacité
        </h2>
        <p className="mb-4 text-sm text-ink-400">
          Nombre maximum de personnes dans la file en même temps. Laissez
          vide pour une capacité illimitée — ouvrir/fermer complètement la
          file se fait depuis Configuration.
        </p>
        <CapacityForm
          currentCapacity={business?.walkin_queue_capacity ?? null}
        />
      </section>

      <section className="rounded-2xl border border-ink-900/10 bg-white p-6 text-center dark:border-paper/10 dark:bg-ink-800">
        <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-ink-400">
          Code QR à imprimer
        </h2>
        <p className="mb-4 text-sm text-ink-400">
          Affichez ce code dans votre salon : les clientes le scannent sur
          place pour rejoindre la file d&apos;attente — impossible de le
          faire depuis chez elles.
        </p>
        {/* eslint-disable-next-line @next/next/no-img-element -- image générée côté serveur (data URL) */}
        <img
          src={qrDataUrl}
          alt="Code QR de la file d'attente"
          className="mx-auto h-64 w-64"
        />
        <a
          href={qrDataUrl}
          download="file-attente-kinobooking.png"
          className="mt-4 inline-block rounded-xl bg-kino-400 px-4 py-2 text-xs font-bold text-ink-900 transition hover:bg-kino-500"
        >
          Télécharger
        </a>
      </section>
    </div>
  );
}
