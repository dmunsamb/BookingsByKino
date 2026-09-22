"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

export type ReviewFormState = { error?: string; success?: boolean };

const REVIEW_RATE_LIMIT_MAX = 5;
const REVIEW_RATE_LIMIT_WINDOW_SECONDS = 60;

/**
 * Avis client (note + commentaire), autorisé uniquement via le jeton à
 * usage unique transmis dans l'URL (voir submit_business_review_by_token,
 * migration 0040) — le jeton lui-même prouve qu'il s'agit de cette
 * réservation, plus besoin de faire ressaisir numéro de suivi ou
 * téléphone. Rate-limité comme les autres formulaires publics.
 */
export async function submitReviewByToken(
  token: string,
  _prevState: ReviewFormState,
  formData: FormData
): Promise<ReviewFormState> {
  const ip = getClientIp(await headers());
  const allowed = await checkRateLimit(
    `review:${ip}`,
    REVIEW_RATE_LIMIT_MAX,
    REVIEW_RATE_LIMIT_WINDOW_SECONDS
  );
  if (!allowed) {
    return {
      error: "Trop de tentatives. Merci de réessayer dans une minute.",
    };
  }

  const ratingRaw = formData.get("rating");
  const commentRaw = formData.get("comment");
  const rating = Number(ratingRaw);

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { error: "Merci de choisir une note." };
  }

  const comment = typeof commentRaw === "string" ? commentRaw.trim() : "";
  if (comment.length > 500) {
    return { error: "Le commentaire ne peut pas dépasser 500 caractères." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("submit_business_review_by_token", {
      p_token: token,
      p_rating: rating,
      p_comment: comment || null,
    })
    .single();

  if (error || !data) {
    return { error: "Une erreur est survenue. Merci de réessayer." };
  }

  const result = data as { ok: boolean; message: string };
  if (!result.ok) {
    return { error: result.message };
  }

  return { success: true };
}
