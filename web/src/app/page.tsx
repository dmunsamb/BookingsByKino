import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; city?: string }>;
}) {
  const { q, city } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("businesses")
    .select("id, name, main_category, sub_category, city, address")
    .order("name");

  if (city) {
    query = query.eq("city", city);
  }

  // Les caractères structurants de la syntaxe de filtre PostgREST
  // (virgule, parenthèses) sont retirés plutôt qu'échappés : un visiteur
  // qui tape "salon, coiffure" cherche juste ce texte, pas à construire
  // un filtre — la policy RLS limite de toute façon cette requête aux
  // établissements approuvés, donc au pire une recherche mal formée ne
  // renvoie rien plutôt que de fuiter des données.
  const term = q?.trim().replace(/[,()]/g, "");
  if (term) {
    query = query.or(
      `name.ilike.%${term}%,sub_category.ilike.%${term}%,city.ilike.%${term}%,address.ilike.%${term}%`
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

  const { data: cityRows } = await supabase
    .from("businesses")
    .select("city")
    .not("city", "is", null);

  const cities = Array.from(
    new Set((cityRows ?? []).map((c) => c.city).filter((c): c is string => !!c))
  ).sort();

  const hasFilters = !!term || !!city;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-12">
      <div className="mb-10 text-center">
        <h1 className="font-serif text-4xl text-ink-900 dark:text-paper">
          KinoBooking
        </h1>
        <p className="mt-2 text-sm text-ink-400">
          Réservez vos soins à Kinshasa, sans faire la queue.
        </p>
        <Link
          href="/login"
          className="mt-3 inline-block text-xs font-bold text-kino-600 underline-offset-4 hover:underline dark:text-kino-300"
        >
          Accès professionnel (gérant / personnel)
        </Link>
      </div>

      <form method="GET" className="mb-8 flex flex-col gap-3 sm:flex-row">
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Rechercher un salon, une prestation..."
          className="w-full rounded-xl border border-ink-900/16 bg-white p-3 text-sm text-ink-900 focus:border-2 focus:border-kino-400 focus:outline-none dark:border-paper/14 dark:bg-ink-800 dark:text-paper sm:flex-1"
        />
        <select
          name="city"
          defaultValue={city ?? ""}
          className="w-full rounded-xl border border-ink-900/16 bg-white p-3 text-sm text-ink-900 dark:border-paper/14 dark:bg-ink-800 dark:text-paper sm:w-56"
        >
          <option value="">Toutes les communes</option>
          {cities.map((c) => (
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
                {b.sub_category && (
                  <span className="mb-2 inline-block rounded bg-kino-100 px-2 py-0.5 text-[10.5px] font-bold tracking-wide text-kino-700 dark:bg-kino-900 dark:text-kino-300">
                    {b.sub_category.toUpperCase()}
                  </span>
                )}
                <h2 className="font-serif text-lg text-ink-900 dark:text-paper">
                  {b.name}
                </h2>
                {(b.address || b.city) && (
                  <p className="mt-1 text-xs text-ink-400">
                    {[b.address, b.city].filter(Boolean).join(", ")}
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
