export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-slate-50 px-6 py-24 text-center dark:bg-slate-950">
      <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-kino-500 to-amber-300 text-2xl font-black text-slate-950 shadow-lg">
        K
      </div>
      <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
        Kino<span className="text-kino-500">Booking</span>
      </h1>
      <p className="mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
        L&apos;application est en cours de développement. Le prototype
        statique reste disponible sur GitHub Pages en attendant la mise en
        production de cette version.
      </p>
    </div>
  );
}
