import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const { data: businesses } = await supabase
    .from("businesses")
    .select("id, name, main_category, sub_category, city, address")
    .order("name");

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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(!businesses || businesses.length === 0) && (
          <p className="col-span-full text-center text-sm text-slate-400">
            Aucun établissement disponible pour l&apos;instant.
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
