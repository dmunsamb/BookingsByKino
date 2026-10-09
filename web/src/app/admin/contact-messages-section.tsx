import { createClient } from "@/lib/supabase/server";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import { deleteContactMessage } from "./actions";

function formatMessageDate(createdAt: string): string {
  return new Date(createdAt).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Messages reçus via le formulaire de contact de /devenir-partenaire
 * (voir devenir-partenaire/actions.ts, table contact_messages,
 * migration 0044). Le champ "contact" accepte un email ou un numéro
 * WhatsApp en texte libre : on ne propose le lien wa.me que quand il
 * ressemble à un numéro (présence d'un chiffre), jamais sur une adresse
 * email.
 */
export async function ContactMessagesSection() {
  const supabase = await createClient();

  const { data: messages } = await supabase
    .from("contact_messages")
    .select("id, name, contact, message, created_at")
    .order("created_at", { ascending: false });

  if (!messages || messages.length === 0) {
    return null;
  }

  return (
    <section className="mb-8">
      <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-ink-400">
        Messages de contact ({messages.length})
      </h2>
      <div className="space-y-3">
        {messages.map((m) => {
          const looksLikePhone = /\d/.test(m.contact) && !m.contact.includes("@");
          return (
            <div
              key={m.id}
              className="rounded-2xl border border-ink-900/10 bg-white p-4 shadow-sm dark:border-paper/10 dark:bg-ink-800"
            >
              <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-bold text-ink-900 dark:text-paper">
                  {m.name}{" "}
                  <span className="text-xs font-normal text-ink-400">
                    · {m.contact}
                  </span>
                </p>
                <span className="text-xs text-ink-400">
                  {formatMessageDate(m.created_at)}
                </span>
              </div>
              <p className="mb-3 whitespace-pre-wrap text-sm text-ink-400">
                {m.message}
              </p>
              <div className="flex flex-wrap items-center gap-3">
                {looksLikePhone && (
                  <a
                    href={buildWhatsAppLink(
                      m.contact,
                      `Bonjour ${m.name}, merci de nous avoir contactés via KinoBooking.`
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-bold text-kino-600 hover:underline dark:text-kino-300"
                  >
                    Répondre sur WhatsApp →
                  </a>
                )}
                <form action={deleteContactMessage}>
                  <input type="hidden" name="id" value={m.id} />
                  <ConfirmDeleteButton label="Marquer comme traité" />
                </form>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
