import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { QUEUE_QR_PARAM, QUEUE_QR_VALUE } from "@/lib/qr";
import { QueueModule } from "./queue-module";

export default async function WalkinQueuePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [QUEUE_QR_PARAM]?: string }>;
}) {
  const { id } = await params;
  const search = await searchParams;
  const startUnlocked = search[QUEUE_QR_PARAM] === QUEUE_QR_VALUE;

  const supabase = await createClient();

  const { data: business } = await supabase
    .from("businesses")
    .select("id, name, walkin_queue_open")
    .eq("id", id)
    .maybeSingle();

  if (!business) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center text-sm text-ink-400">
        Cet établissement n&apos;existe pas ou plus.
      </div>
    );
  }

  const [{ data: services }, { data: queueRows }] = await Promise.all([
    supabase
      .from("services")
      .select("id, name")
      .eq("business_id", id)
      .order("created_at"),
    supabase
      .from("walkin_queue_public")
      .select("first_name, position")
      .eq("business_id", id)
      .order("position"),
  ]);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <Link
        href={`/etablissements/${id}`}
        className="mb-4 inline-block text-xs font-bold text-ink-400 hover:underline"
      >
        ← Retour à la fiche établissement
      </Link>

      <h1 className="mb-6 font-serif text-2xl text-ink-900 dark:text-paper">
        {business.name} — File d&apos;attente
      </h1>

      {!business.walkin_queue_open ? (
        <p className="rounded-2xl border border-ink-900/10 bg-white p-6 text-center text-sm text-ink-400 dark:border-paper/10 dark:bg-ink-800">
          La file d&apos;attente sans rendez-vous est fermée pour le moment.
        </p>
      ) : (
        <QueueModule
          businessId={id}
          services={services ?? []}
          initialQueue={queueRows ?? []}
          startUnlocked={startUnlocked}
        />
      )}
    </div>
  );
}
