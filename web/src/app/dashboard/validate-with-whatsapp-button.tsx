"use client";

import { updateBookingStatus } from "./actions";

/**
 * "Valider" + ouverture de WhatsApp (lien wa.me, message prérempli) dans le
 * même clic. window.open() est appelé de façon synchrone dans le
 * gestionnaire onSubmit, avant toute attente réseau, pour rester dans le
 * geste utilisateur et éviter le blocage de pop-up.
 */
export function ValidateWithWhatsAppButton({
  bookingId,
  whatsAppLink,
}: {
  bookingId: string;
  whatsAppLink: string | null;
}) {
  return (
    <form
      action={updateBookingStatus}
      onSubmit={() => {
        if (whatsAppLink) {
          window.open(whatsAppLink, "_blank", "noopener,noreferrer");
        }
      }}
    >
      <input type="hidden" name="id" value={bookingId} />
      <input
        type="hidden"
        name="status"
        value="approved_waiting_payment"
      />
      <button
        type="submit"
        className="rounded-xl bg-kino-500 px-4 py-2 text-xs font-extrabold text-slate-950 transition hover:bg-kino-600"
      >
        {whatsAppLink ? "Valider (WhatsApp)" : "Valider"}
      </button>
    </form>
  );
}
