import "server-only";
import { createAdminClient } from "./admin";
import { MEDIA_BUCKET, MAX_PHOTO_SIZE_BYTES } from "@/lib/media";

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

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
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
