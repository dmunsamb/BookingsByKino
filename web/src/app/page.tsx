import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; commune?: string; category?: string }>;
}) {
  const { q, commune, category } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("businesses")
    .select("id, name, main_category, categories, city, commune, address")
    .order("name");

  if (commune) {
    query = query.eq("commune", commune);
  }

  if (category) {
    query = query.contains("categories", [category]);
  }

  // Les caractères structurants de la syntaxe de filtre PostgREST
  // (virgule, parenthèses) sont retirés plutôt qu'échappés : un visiteur
  // qui tape "salon, coiffure" cherche juste ce texte, pas à construire
  // un filtre — la policy RLS limite de toute façon cette requête aux
  // établissements approuvés, donc au pire une recherche mal formée ne
  // renvoie rien plutôt que de fuiter des données.
  //
  // categories est un tableau : pas de recherche partielle dessus via
  // PostgREST (ilike ne s'applique pas à un text[]) — le menu de
  // catégories couvre déjà ce cas en filtre exact.
  const term = q?.trim().replace(/[,()]/g, "");
  if (term) {
    query = query.or(
      `name.ilike.%${term}%,city.ilike.%${term}%,commune.ilike.%${term}%,address.ilike.%${term}%`
    );
  }

  const { data: businesses } = await query;

  const businessIds = (businesses ?? []).map((b) => b.id);
  const { data: photoRows } = businessIds.length
    ? await supabase
        .from("business_photos")
        .select("business_id, url")
        .in("business_id", businessIds)
        .order("position")
    : { data: [] };

  const coverPhotoByBusiness = new Map<string, string>();
  for (const photo of photoRows ?? []) {
    if (!coverPhotoByBusiness.has(photo.business_id)) {
      coverPhotoByBusiness.set(photo.business_id, photo.url);
    }
  }

  // Seulement les communes effectivement renseignées par au moins un
  // établissement — pas la liste complète des 24 communes de Kinshasa,
  // qui proposerait des filtres ne renvoyant jamais rien.
  const { data: communeRows } = await supabase
    .from("businesses")
    .select("commune")
    .not("commune", "is", null);

  const communes = Array.from(
    new Set(
      (communeRows ?? [])
        .map((c) => c.commune)
        .filter((c): c is string => !!c)
    )
  ).sort();

  const hasFilters = !!term || !!commune || !!category;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-12">
      <div className="mb-10 text-center">
        <h1 className="font-serif text-4xl text-ink-900 dark:text-paper">
          KinoBooking
        </h1>
        <p className="mt-2 text-sm text-ink-400">
          Réservez vos soins à Kinshasa, sans faire la queue.
        </p>
      </div>

      <form method="GET" className="mb-4 flex flex-col gap-3 sm:flex-row">
        <input type="hidden" name="category" value={category ?? ""} />
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Rechercher un salon, une prestation..."
          className="w-full rounded-xl border border-ink-900/16 bg-white p-3 text-sm text-ink-900 focus:border-2 focus:border-kino-400 focus:outline-none dark:border-paper/14 dark:bg-ink-800 dark:text-paper sm:flex-1"
        />
        <select
          name="commune"
          defaultValue={commune ?? ""}
          className="w-full rounded-xl border border-ink-900/16 bg-white p-3 text-sm text-ink-900 dark:border-paper/14 dark:bg-ink-800 dark:text-paper sm:w-56"
        >
          <option value="">Toutes les communes</option>
          {communes.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-xl bg-kino-400 px-6 py-3 text-sm font-bold text-ink-900 transition hover:bg-kino-500"
        >
          Rechercher
        </button>
      </form>

      {category && (
        <div className="mb-8 flex items-center justify-center gap-2">
          <span className="rounded-full bg-kino-100 px-3 py-1 text-xs font-bold text-kino-700 dark:bg-kino-900 dark:text-kino-300">
            {category}
          </span>
          <Link
            href={{
              pathname: "/",
              query: { ...(q ? { q } : {}), ...(commune ? { commune } : {}) },
            }}
            className="text-xs font-bold text-ink-400 hover:underline"
          >
            Retirer le filtre
          </Link>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(!businesses || businesses.length === 0) && (
          <p className="col-span-full text-center text-sm text-ink-400">
            {hasFilters
              ? "Aucun établissement ne correspond à votre recherche."
              : "Aucun établissement disponible pour l'instant."}
          </p>
        )}
        {businesses?.map((b) => {
          const coverPhoto = coverPhotoByBusiness.get(b.id);
          return (
            <Link
              key={b.id}
              href={`/etablissements/${b.id}`}
              className="overflow-hidden rounded-2xl border border-ink-900/10 bg-white shadow-sm transition hover:shadow-md dark:border-paper/10 dark:bg-ink-800"
            >
              {coverPhoto && (
                // eslint-disable-next-line @next/next/no-img-element -- URL de stockage externe
                <img
                  src={coverPhoto}
                  alt=""
                  loading="lazy"
                  className="h-32 w-full object-cover"
                />
              )}
              <div className="p-4">
                {b.categories && b.categories.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-1">
                    {b.categories.map((c: string) => (
                      <span
                        key={c}
                        className="inline-block rounded bg-kino-100 px-2 py-0.5 text-[10.5px] font-bold tracking-wide text-kino-700 dark:bg-kino-900 dark:text-kino-300"
                      >
                        {c.toUpperCase()}
                      </span>
                    ))}
                  </div>
                )}
                <h2 className="font-serif text-lg text-ink-900 dark:text-paper">
                  {b.name}
                </h2>
                {(b.address || b.commune || b.city) && (
                  <p className="mt-1 text-xs text-ink-400">
                    {[b.address, b.commune, b.city].filter(Boolean).join(", ")}
                  </p>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
