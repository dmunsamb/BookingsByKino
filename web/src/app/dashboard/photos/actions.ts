"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, canManageBusiness } from "@/lib/auth/dal";
import { uploadPhoto, deletePhoto } from "@/lib/supabase/media-admin";
import { MAX_BUSINESS_PHOTOS } from "@/lib/media";

/**
 * Galerie de photos du salon (défilable côté client — voir
 * etablissements/[id]/page.tsx). `position` détermine l'ordre
 * d'affichage ; la première photo sert de couverture sur la page
 * d'accueil (voir page.tsx).
 */

export type PhotoFormState = { error?: string };

export async function addBusinessPhotos(
  _prevState: PhotoFormState,
  formData: FormData
): Promise<PhotoFormState> {
  const profile = await getCurrentProfile();
  if (!profile?.business_id) {
    return { error: "Aucun établissement associé à votre compte." };
  }
  if (!canManageBusiness(profile)) {
    return { error: "Seul le gérant peut modifier les photos." };
  }

  const files = formData.getAll("photos");
  if (files.length === 0) {
    return { error: "Choisissez au moins une photo." };
  }

  const supabase = await createClient();
  const { count } = await supabase
    .from("business_photos")
    .select("id", { count: "exact", head: true })
    .eq("business_id", profile.business_id);

  const currentCount = count ?? 0;
  if (currentCount >= MAX_BUSINESS_PHOTOS) {
    return {
      error: `Maximum ${MAX_BUSINESS_PHOTOS} photos par établissement — supprimez-en une avant d'en ajouter une nouvelle.`,
    };
  }

  const roomLeft = MAX_BUSINESS_PHOTOS - currentCount;
  const toUpload = files.slice(0, roomLeft);

  const rows: { business_id: string; url: string; position: number }[] = [];
  for (let i = 0; i < toUpload.length; i++) {
    const url = await uploadPhoto(toUpload[i], `businesses/${profile.business_id}`);
    if (url) {
      rows.push({
        business_id: profile.business_id,
        url,
        position: currentCount + i,
      });
    }
  }

  if (rows.length === 0) {
    return {
      error:
        "Aucune photo valide (formats acceptés : JPEG, PNG, WebP — 5 Mo max chacune).",
    };
  }

  const { error } = await supabase.from("business_photos").insert(rows);
  if (error) {
    return { error: `Erreur lors de l'enregistrement : ${error.message}` };
  }

  revalidatePath("/dashboard/photos");
  revalidatePath("/");
  return {};
}

export async function deleteBusinessPhoto(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!profile || !canManageBusiness(profile)) return;

  const id = formData.get("id");
  const url = formData.get("url");
  if (typeof id !== "string" || typeof url !== "string") return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("business_photos")
    .delete()
    .eq("id", id)
    .eq("business_id", profile.business_id ?? "");

  if (!error) {
    await deletePhoto(url);
  }

  revalidatePath("/dashboard/photos");
  revalidatePath("/");
}

export async function moveBusinessPhoto(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!profile?.business_id || !canManageBusiness(profile)) return;

  const id = formData.get("id");
  const direction = formData.get("direction");
  if (
    typeof id !== "string" ||
    (direction !== "up" && direction !== "down")
  ) {
    return;
  }

  const supabase = await createClient();
  const { data: photos } = await supabase
    .from("business_photos")
    .select("id, position")
    .eq("business_id", profile.business_id)
    .order("position");

  if (!photos) return;

  const index = photos.findIndex((p) => p.id === id);
  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || swapIndex < 0 || swapIndex >= photos.length) return;

  const current = photos[index];
  const swapWith = photos[swapIndex];

  await Promise.all([
    supabase
      .from("business_photos")
      .update({ position: swapWith.position })
      .eq("id", current.id),
    supabase
      .from("business_photos")
      .update({ position: current.position })
      .eq("id", swapWith.id),
  ]);

  revalidatePath("/dashboard/photos");
  revalidatePath("/");
}
