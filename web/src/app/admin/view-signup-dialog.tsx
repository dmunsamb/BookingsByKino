"use client";

import { useState } from "react";
import { buildWhatsAppLink } from "@/lib/whatsapp";

export type SignupDetails = {
  businessName: string;
  categories: string[];
  ownerName: string | null;
  ownerEmail: string | null;
  ownerWhatsapp: string | null;
  address: string | null;
  commune: string | null;
  city: string | null;
  imageUrl: string | null;
  createdAt: string;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", {
    timeZone: "Africa/Kinshasa",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Détail de ce qu'une gérante a rempli à l'inscription — pour décider
 * d'approuver/refuser sans deviner à partir du seul résumé de la carte.
 * "Appeler" ouvre directement le chat WhatsApp (pas de lien d'appel
 * direct fiable multiplateforme, voir CallButton sur /dashboard).
 */
export function ViewSignupDialog({ details }: { details: SignupDetails }) {
  const [open, setOpen] = useState(false);
  const callLink = details.ownerWhatsapp
    ? buildWhatsAppLink(details.ownerWhatsapp, "")
    : null;
  const address = [details.address, details.commune, details.city]
    .filter(Boolean)
    .join(", ");

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-xl border border-ink-900/16 px-4 py-2 text-xs font-bold text-ink-900 transition hover:bg-ink-900/5 dark:border-paper/16 dark:text-paper dark:hover:bg-paper/5"
      >
        Voir l&apos;inscription
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-lg dark:bg-ink-800"
            onClick={(e) => e.stopPropagation()}
          >
            {details.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- URL de stockage externe
              <img
                src={details.imageUrl}
                alt=""
                className="mb-3 h-24 w-24 rounded-xl object-cover"
              />
            )}
            <h3 className="mb-3 font-bold text-ink-900 dark:text-paper">
              {details.businessName}
            </h3>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-xs font-bold uppercase tracking-widest text-ink-400">
                  Catégories
                </dt>
                <dd className="text-ink-900 dark:text-paper">
                  {details.categories.length > 0
                    ? details.categories.join(", ")
                    : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-widest text-ink-400">
                  Gérant
                </dt>
                <dd className="text-ink-900 dark:text-paper">
                  {details.ownerName ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-widest text-ink-400">
                  Email
                </dt>
                <dd className="text-ink-900 dark:text-paper">
                  {details.ownerEmail ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-widest text-ink-400">
                  WhatsApp
                </dt>
                <dd className="text-ink-900 dark:text-paper">
                  {details.ownerWhatsapp ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-widest text-ink-400">
                  Adresse
                </dt>
                <dd className="text-ink-900 dark:text-paper">
                  {address || "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-widest text-ink-400">
                  Inscrit le
                </dt>
                <dd className="text-ink-900 dark:text-paper">
                  {formatDate(details.createdAt)}
                </dd>
              </div>
            </dl>

            <div className="mt-5 flex justify-end gap-2">
              {callLink && (
                <a
                  href={callLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl border border-ink-900/16 px-4 py-2 text-xs font-bold text-ink-900 transition hover:bg-ink-900/5 dark:border-paper/16 dark:text-paper dark:hover:bg-paper/5"
                >
                  Appeler
                </a>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xl bg-kino-400 px-4 py-2 text-xs font-bold text-ink-900 transition hover:bg-kino-500"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
