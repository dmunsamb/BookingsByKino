"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  getCurrentProfile,
  canManageBusiness,
  isImpersonationRestricted,
} from "@/lib/auth/dal";
import { isValidCategory, mainCategoryForAny } from "@/lib/categories";

export type BusinessInfoFormState = {
  error?: string;
  success?: boolean;
  // Réinjecté par le formulaire après une erreur : React réinitialise les
  // champs non contrôlés d'un <form action={...}> à chaque soumission
  // (succès ou échec), donc sans ça, une erreur de validation effacerait
  // ce que le gérant venait de saisir dans les autres champs.
  values?: {
    name: string;
    categories: string[];
    address: string;
    commune: string;
    city: string;
    whatsapp: string;
    description: string;
  };
};

/**
 * Édition des informations de l'établissement après inscription — avant
 * ça, nom/catégorie/adresse/commune/ville/WhatsApp n'étaient modifiables
 * nulle part une fois le compte créé. L'écriture passe par le client
 * normal (pas admin) : la policy RLS owner_update_business (migration
 * 0002) autorise déjà le propriétaire à modifier sa propre ligne.
 */
export async function updateBusinessInfo(
  _prevState: BusinessInfoFormState,
  formData: FormData
): Promise<BusinessInfoFormState> {
  const profile = await getCurrentProfile();
  if (!profile?.business_id) {
    return { error: "Aucun établissement associé à votre compte." };
  }
  if (!canManageBusiness(profile)) {
    return { error: "Seul le gérant peut modifier ces informations." };
  }

  const name = formData.get("name");
  const categories = formData.getAll("categories").filter(
    (v): v is string => typeof v === "string"
  );
  const address = formData.get("address");
  const commune = formData.get("commune");
  const city = formData.get("city");
  const whatsappRaw = formData.get("whatsapp");
  const whatsapp = typeof whatsappRaw === "string" ? whatsappRaw.trim() : "";
  const descriptionRaw = formData.get("description");
  const description =
    typeof descriptionRaw === "string" ? descriptionRaw.trim() : "";

  const values = {
    name: typeof name === "string" ? name : "",
    categories,
    address: typeof address === "string" ? address : "",
    commune: typeof commune === "string" ? commune : "",
    city: typeof city === "string" ? city : "",
    whatsapp,
    description,
  };

  if (
    typeof name !== "string" ||
    !name.trim() ||
    categories.length === 0 ||
    !categories.every(isValidCategory)
  ) {
    return { error: "Veuillez remplir tous les champs obligatoires.", values };
  }

  if (description.length > 500) {
    return {
      error: "La description ne peut pas dépasser 500 caractères.",
      values,
    };
  }

  const supabase = await createClient();

  // Le numéro WhatsApp du salon sert de contact client ET de canal de
  // réclamation — un commercial en mode "voir en tant que" ne doit jamais
  // pouvoir le détourner (risque de fraude/détournement des clientes).
  // Seul le gérant lui-même (session réelle) ou le super admin peut le
  // changer ; le reste du formulaire (nom, catégories, adresse...) reste
  // modifiable pour ne pas empêcher une assistance légitime.
  const restricted = await isImpersonationRestricted();
  const { data: currentBusiness } = restricted
    ? await supabase
        .from("businesses")
        .select("owner_whatsapp")
        .eq("id", profile.business_id)
        .maybeSingle()
    : { data: null };

  const { error } = await supabase
    .from("businesses")
    .update({
      name: name.trim(),
      main_category: mainCategoryForAny(categories),
      categories,
      address: typeof address === "string" ? address.trim() || null : null,
      commune: typeof commune === "string" ? commune.trim() || null : null,
      city: typeof city === "string" ? city.trim() || null : null,
      owner_whatsapp: restricted
        ? (currentBusiness?.owner_whatsapp ?? null)
        : whatsapp || null,
      description: description || null,
    })
    .eq("id", profile.business_id);

  if (error) {
    return {
      error: "Erreur lors de l'enregistrement. Merci de réessayer.",
      values,
    };
  }

  revalidatePath("/dashboard/configuration/etablissement");
  revalidatePath("/dashboard");
  revalidatePath("/");
  return { success: true };
}

/**
 * Toggle "en ligne" (migration 0031) — indépendant de l'approbation
 * KinoBooking et de l'abonnement : un nouveau salon démarre hors ligne,
 * invisible du catalogue public, jusqu'à ce que le gérant l'active
 * lui-même (une fois son catalogue/ses horaires prêts).
 */
export async function toggleBusinessOnline(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!profile?.business_id || !canManageBusiness(profile)) return;

  const isOnline = formData.get("is_online") === "true";

  const supabase = await createClient();
  await supabase
    .from("businesses")
    .update({ is_online: isOnline })
    .eq("id", profile.business_id);

  revalidatePath("/dashboard/configuration");
  revalidatePath("/dashboard");
  revalidatePath("/");
}

/**
 * Toggle "file d'attente ouverte/fermée" (migration 0033) — indépendant
 * du toggle "en ligne" ci-dessus (qui ne concerne que les RDV) : le
 * salon peut couper les nouveaux tickets sans rendez-vous (fin de
 * journée, pause...) sans se rendre invisible du catalogue. Ouvert par
 * défaut, y compris pour un nouveau salon.
 */
export async function toggleWalkinQueueOpen(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!profile?.business_id || !canManageBusiness(profile)) return;

  const isOpen = formData.get("walkin_queue_open") === "true";

  const supabase = await createClient();
  await supabase
    .from("businesses")
    .update({ walkin_queue_open: isOpen })
    .eq("id", profile.business_id);

  revalidatePath("/dashboard/configuration");
  revalidatePath("/dashboard/configuration/file-attente");
  revalidatePath("/dashboard");
}
