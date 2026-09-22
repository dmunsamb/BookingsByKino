"use client";

import { updateBookingStatus } from "./actions";

/**
 * "Service rendu" + ouverture de WhatsApp (message de remerciement avec le
 * lien d'avis à usage unique) dans le même clic — même principe que
 * ValidateWithWhatsAppButton : window.open() synchrone dans onSubmit, avant
 * toute attente réseau, pour rester dans le geste utilisateur.
 */
export function ThankYouWhatsAppButton({
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
      <input type="hidden" name="status" value="termine" />
      <button
        type="submit"
        className="rounded-xl bg-kino-400 px-4 py-2 text-xs font-bold text-ink-900 transition hover:bg-kino-500"
      >
        {whatsAppLink ? "Service rendu (WhatsApp)" : "Service rendu"}
      </button>
    </form>
  );
}
