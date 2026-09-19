"use client";

import { updateBookingStatus } from "./actions";

/**
 * "Marquer payé" + ouverture de WhatsApp (lien wa.me, message prérempli) dans
 * le même clic — même principe que ValidateWithWhatsAppButton :
 * window.open() synchrone dans onSubmit, avant toute attente réseau, pour
 * rester dans le geste utilisateur et éviter le blocage de pop-up.
 */
export function ConfirmPaymentWithWhatsAppButton({
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
      <input type="hidden" name="status" value="confirmed" />
      <button
        type="submit"
        className="rounded-xl bg-kino-400 px-4 py-2 text-xs font-bold text-ink-900 transition hover:bg-kino-500"
      >
        {whatsAppLink ? "Marquer payé (WhatsApp)" : "Marquer payé"}
      </button>
    </form>
  );
}
