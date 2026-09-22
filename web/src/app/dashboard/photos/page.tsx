import Link from "next/link";
import Image from "next/image";
import { getCurrentProfile, canManageBusiness } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { PhotoUploadForm } from "./photo-upload-form";
import { deleteBusinessPhoto, moveBusinessPhoto } from "./actions";
import { MAX_BUSINESS_PHOTOS } from "@/lib/media";

export default async function PhotosPage() {
  const profile = await getCurrentProfile();

  if (!profile) {
    return <p className="p-8 text-sm text-ink-400">Compte non configuré.</p>;
  }

  if (!profile.business_id) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 text-sm text-ink-400">
        Aucun établissement n&apos;est encore associé à votre compte.
      </div>
    );
  }

  if (!canManageBusiness(profile)) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 text-sm text-ink-400">
        Seul le gérant peut gérer les photos.
      </div>
    );
  }

  const supabase = await createClient();
  const { data: photos } = await supabase
    .from("business_photos")
    .select("id, url, position")
    .eq("business_id", profile.business_id)
    .order("position");

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <Link
        href="/dashboard"
        className="mb-4 inline-block text-xs font-bold text-ink-400 hover:underline"
      >
        ← Retour au tableau de bord
      </Link>

      <div className="mb-6">
        <h1 className="font-serif text-2xl text-ink-900 dark:text-paper">
          Photos du salon
        </h1>
        <p className="text-sm text-ink-400">
          Visibles en défilement sur votre fiche établissement. La première
          photo sert de couverture sur la page d&apos;accueil.
          Maximum {MAX_BUSINESS_PHOTOS} photos.
        </p>
      </div>

      <PhotoUploadForm />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {(!photos || photos.length === 0) && (
          <p className="col-span-full rounded-2xl border border-ink-900/10 bg-white p-6 text-center text-sm text-ink-400 dark:border-paper/10 dark:bg-ink-800">
            Aucune photo pour l&apos;instant.
          </p>
        )}
        {photos?.map((photo, index) => (
          <div
            key={photo.id}
            className="overflow-hidden rounded-2xl border border-ink-900/10 bg-white dark:border-paper/10 dark:bg-ink-800"
          >
            <div className="relative aspect-square">
              <Image
                src={photo.url}
                alt="Photo du salon"
                fill
                sizes="(min-width: 640px) 33vw, 50vw"
                className="object-cover"
              />
              {index === 0 && (
                <span className="absolute left-2 top-2 rounded bg-ink-900/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-paper">
                  Couverture
                </span>
              )}
            </div>
            <div className="flex items-center justify-between p-2">
              <div className="flex gap-1">
                <form action={moveBusinessPhoto}>
                  <input type="hidden" name="id" value={photo.id} />
                  <input type="hidden" name="direction" value="up" />
                  <button
                    type="submit"
                    disabled={index === 0}
                    className="rounded px-2 py-1 text-xs font-bold text-ink-400 hover:bg-ink-900/5 disabled:opacity-30 dark:hover:bg-paper/5"
                  >
                    ←
                  </button>
                </form>
                <form action={moveBusinessPhoto}>
                  <input type="hidden" name="id" value={photo.id} />
                  <input type="hidden" name="direction" value="down" />
                  <button
                    type="submit"
                    disabled={index === (photos?.length ?? 0) - 1}
                    className="rounded px-2 py-1 text-xs font-bold text-ink-400 hover:bg-ink-900/5 disabled:opacity-30 dark:hover:bg-paper/5"
                  >
                    →
                  </button>
                </form>
              </div>
              <form action={deleteBusinessPhoto}>
                <input type="hidden" name="id" value={photo.id} />
                <input type="hidden" name="url" value={photo.url} />
                <ConfirmDeleteButton />
              </form>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
