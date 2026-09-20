"use client";

import { useActionState, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { queueJoinPath } from "@/lib/qr";
import { formatBookingReference } from "@/lib/booking-reference";
import { QrScanner } from "./qr-scanner";
import { joinWalkinQueue, type JoinQueueFormState } from "./actions";

type Service = { id: string; name: string };
type QueueRow = { first_name: string; position: number };

type ViewMode = "menu" | "queue" | "scanner" | "form";

const initialState: JoinQueueFormState = {};

export function QueueModule({
  businessId,
  services,
  initialQueue,
  startUnlocked,
}: {
  businessId: string;
  services: Service[];
  initialQueue: QueueRow[];
  startUnlocked: boolean;
}) {
  const [mode, setMode] = useState<ViewMode>("menu");
  const [unlocked, setUnlocked] = useState(startUnlocked);
  const [queue, setQueue] = useState(initialQueue);
  const [isRefreshing, startRefresh] = useTransition();
  const [state, formAction, pending] = useActionState(
    joinWalkinQueue,
    initialState
  );

  const expectedMatch = queueJoinPath(businessId);

  function refreshQueue() {
    startRefresh(async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("walkin_queue_public")
        .select("first_name, position")
        .eq("business_id", businessId)
        .order("position");
      setQueue((data ?? []) as QueueRow[]);
    });
  }

  if (state.success) {
    return (
      <div className="rounded-2xl border border-success/30 bg-success/10 p-6 text-center text-sm text-ink-900 dark:text-paper">
        <p className="font-bold">Vous êtes dans la file d&apos;attente !</p>
        {state.position != null && (
          <>
            <p className="mt-3 text-xs font-bold uppercase tracking-widest text-kino-600 dark:text-kino-300">
              Votre position actuelle
            </p>
            <p className="font-serif text-3xl text-ink-900 dark:text-paper">
              {state.position}
            </p>
          </>
        )}
        <p className="mt-3 text-xs text-ink-400">
          Présentez-vous sur place, votre tour viendra dans l&apos;ordre
          d&apos;arrivée — sans acompte à payer.
        </p>
        {state.referenceNumber != null && (
          <p className="mt-2 text-xs text-ink-400">
            Référence : {formatBookingReference(state.referenceNumber)}
          </p>
        )}
      </div>
    );
  }

  if (mode === "scanner") {
    return (
      <QrScanner
        expectedMatch={expectedMatch}
        onScanned={() => {
          setUnlocked(true);
          setMode("form");
        }}
        onCancel={() => setMode("menu")}
      />
    );
  }

  if (mode === "queue") {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-widest text-ink-400">
            File d&apos;attente actuelle
          </h2>
          <button
            type="button"
            onClick={refreshQueue}
            disabled={isRefreshing}
            className="text-xs font-bold text-kino-600 hover:underline disabled:opacity-60 dark:text-kino-300"
          >
            {isRefreshing ? "Actualisation..." : "Actualiser"}
          </button>
        </div>
        {queue.length === 0 ? (
          <p className="rounded-xl border border-ink-900/10 bg-white p-6 text-center text-sm text-ink-400 dark:border-paper/10 dark:bg-ink-800">
            Personne dans la file pour l&apos;instant.
          </p>
        ) : (
          <ol className="space-y-2">
            {queue.map((row) => (
              <li
                key={row.position}
                className="flex items-center gap-3 rounded-xl border border-ink-900/10 bg-white p-3 text-sm dark:border-paper/10 dark:bg-ink-800"
              >
                <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-kino-100 text-xs font-bold text-kino-700 dark:bg-kino-900 dark:text-kino-300">
                  {row.position}
                </span>
                <span className="font-bold text-ink-900 dark:text-paper">
                  {row.first_name || "Client"}
                </span>
              </li>
            ))}
          </ol>
        )}
        <button
          type="button"
          onClick={() => setMode("menu")}
          className="text-xs font-bold text-ink-400 hover:underline"
        >
          ← Retour
        </button>
      </div>
    );
  }

  if (mode === "form") {
    return (
      <form
        action={formAction}
        className="space-y-5 rounded-2xl border border-ink-900/10 bg-white p-6 dark:border-paper/10 dark:bg-ink-800"
      >
        <input type="hidden" name="business_id" value={businessId} />

        <p className="rounded-xl border border-kino-200 bg-kino-50 p-3 text-xs text-ink-900 dark:border-kino-800 dark:bg-ink-900 dark:text-paper">
          Vous rejoignez la file d&apos;attente immédiatement, sans créneau ni
          acompte — présentez-vous sur place, votre tour viendra dans
          l&apos;ordre d&apos;arrivée.
        </p>

        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-ink-400">
            Service souhaité
          </label>
          <select
            name="service_id"
            required
            defaultValue=""
            className="w-full rounded-xl border border-ink-900/16 bg-white p-3 text-sm text-ink-900 focus:border-2 focus:border-kino-400 focus:outline-none dark:border-paper/16 dark:bg-ink-900 dark:text-paper"
          >
            <option value="" disabled>
              Choisissez un service
            </option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-ink-400">
              Prénom
            </label>
            <input
              type="text"
              name="client_name"
              required
              placeholder="ex: Vanessa"
              className="w-full rounded-xl border border-ink-900/16 bg-white p-3 text-sm text-ink-900 focus:border-2 focus:border-kino-400 focus:outline-none dark:border-paper/16 dark:bg-ink-900 dark:text-paper"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-ink-400">
              Numéro WhatsApp
            </label>
            <input
              type="tel"
              name="client_phone"
              required
              placeholder="081 000 0000"
              className="w-full rounded-xl border border-ink-900/16 bg-white p-3 text-sm text-ink-900 focus:border-2 focus:border-kino-400 focus:outline-none dark:border-paper/16 dark:bg-ink-900 dark:text-paper"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-ink-400">
            Note (facultatif)
          </label>
          <textarea
            name="client_note"
            rows={2}
            placeholder="ex: préférence pour une coiffeuse en particulier"
            className="w-full rounded-xl border border-ink-900/16 bg-white p-3 text-sm text-ink-900 focus:border-2 focus:border-kino-400 focus:outline-none dark:border-paper/16 dark:bg-ink-900 dark:text-paper"
          />
        </div>

        {state.error && (
          <p className="rounded-xl bg-danger/10 p-3 text-xs text-danger">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-xl bg-kino-400 py-3.5 text-sm font-bold text-ink-900 transition hover:bg-kino-500 disabled:opacity-60"
        >
          {pending ? "Envoi..." : "Rejoindre la file d'attente"}
        </button>
        <button
          type="button"
          onClick={() => setMode("menu")}
          className="w-full text-center text-xs font-bold text-ink-400 hover:underline"
        >
          ← Retour
        </button>
      </form>
    );
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setMode("queue")}
        className="w-full rounded-xl border border-ink-900/16 px-4 py-3.5 text-sm font-bold text-ink-900 transition hover:bg-ink-900/5 dark:border-paper/16 dark:text-paper dark:hover:bg-paper/5"
      >
        Voir la file d&apos;attente
      </button>
      <button
        type="button"
        onClick={() => setMode(unlocked ? "form" : "scanner")}
        className="w-full rounded-xl bg-kino-400 px-4 py-3.5 text-sm font-bold text-ink-900 transition hover:bg-kino-500"
      >
        Prendre un ticket
      </button>
      {!unlocked && (
        <p className="text-center text-xs text-ink-400">
          Vous devez être sur place pour scanner le code QR affiché dans le
          salon.
        </p>
      )}
    </div>
  );
}
