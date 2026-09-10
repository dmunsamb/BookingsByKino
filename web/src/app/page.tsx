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
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-kino-500 to-amber-300 text-2xl font-black text-slate-950 shadow-lg">
          K
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Kino<span className="text-kino-500">Booking</span>
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Réservez vos soins et tables à Kinshasa.
        </p>
        <Link
          href="/login"
          className="mt-3 inline-block text-xs font-bold text-kino-600 underline-offset-4 hover:underline dark:text-kino-500"
        >
          Accès professionnel (gérant / personnel)
        </Link>
      </div>

      <form
        method="GET"
        className="mb-8 flex flex-col gap-3 sm:flex-row"
      >
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Rechercher un salon, un type de prestation..."
          className="w-full rounded-xl border border-slate-300 p-3 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white sm:flex-1"
        />
        <select
          name="city"
          defaultValue={city ?? ""}
          className="w-full rounded-xl border border-slate-300 p-3 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white sm:w-56"
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
          className="rounded-xl bg-kino-500 px-6 py-3 text-sm font-extrabold text-slate-950 transition hover:bg-kino-600"
        >
          Rechercher
        </button>
      </form>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(!businesses || businesses.length === 0) && (
          <p className="col-span-full text-center text-sm text-slate-400">
            {hasFilters
              ? "Aucun établissement ne correspond à votre recherche."
              : "Aucun établissement disponible pour l'instant."}
          </p>
        )}
        {businesses?.map((b) => (
          <Link
            key={b.id}
            href={`/etablissements/${b.id}`}
            className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
          >
            {b.sub_category && (
              <span className="mb-2 inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                {b.sub_category}
              </span>
            )}
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {b.name}
            </h2>
            {(b.address || b.city) && (
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {[b.address, b.city].filter(Boolean).join(", ")}
              </p>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
