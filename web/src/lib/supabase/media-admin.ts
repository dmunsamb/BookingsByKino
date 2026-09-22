import "server-only";
import { createAdminClient } from "./admin";
import { MEDIA_BUCKET, MAX_PHOTO_SIZE_BYTES } from "@/lib/media";

/**
 * Types réellement acceptés, revérifiés ici — l'attribut `accept` du
 * `<input type="file">` (voir lib/media.ts, ACCEPTED_PHOTO_TYPES) n'est
 * qu'une suggestion pour le sélecteur de fichiers du navigateur, jamais
 * une garantie : une requête forgée peut envoyer n'importe quel fichier
 * sous n'importe quel Content-Type déclaré. Sans ce filtre, un SVG (qui
 * peut embarquer du JavaScript) ou un fichier HTML uploadé avec un
 * Content-Type falsifié se retrouverait servi tel quel depuis l'URL
 * publique du bucket — un visiteur qui l'ouvrirait directement dans un
 * nouvel onglet l'exécuterait dans le contexte du domaine de stockage
 * (XSS stocké). L'extension du fichier stocké est dérivée de ce type
 * validé, jamais du nom de fichier fourni par le client.
 */
const ALLOWED_PHOTO_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/**
 * Upload d'une photo (galerie salon, prestation, membre d'équipe) — passe
 * toujours par le client admin (service-role), jamais directement depuis
 * le navigateur, même principe que le logo à l'inscription (voir
 * inscription/actions.ts). `pathPrefix` sépare les usages dans le même
 * bucket (ex: "businesses/<id>", "services/<id>", "staff/<id>").
 *
 * Renvoie `null` en cas de fichier absent/vide/trop lourd/invalide,
 * plutôt que de lever une exception : l'appelant décide s'il s'agit
 * d'une erreur bloquante ou d'un champ simplement laissé vide.
 */
export async function uploadPhoto(
  file: FormDataEntryValue | null,
  pathPrefix: string
): Promise<string | null> {
  if (!(file instanceof File) || file.size === 0) return null;
  if (file.size > MAX_PHOTO_SIZE_BYTES) return null;

  const ext = ALLOWED_PHOTO_TYPES[file.type];
  if (!ext) return null;

  const path = `${pathPrefix}/${crypto.randomUUID()}.${ext}`;

  const admin = createAdminClient();
  const { error } = await admin.storage
    .from(MEDIA_BUCKET)
    .upload(path, file, { contentType: file.type });

  if (error) return null;

  const { data } = admin.storage.from(MEDIA_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/** Supprime le fichier correspondant à une URL publique du bucket media. */
export async function deletePhoto(url: string): Promise<void> {
  const marker = `/object/public/${MEDIA_BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return;

  const path = url.slice(idx + marker.length);
  const admin = createAdminClient();
  await admin.storage.from(MEDIA_BUCKET).remove([path]);
}
