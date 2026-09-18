"use client";

import { useState } from "react";
import { CITIES, communesForCity } from "@/lib/communes";

const selectClass =
  "w-full rounded-xl border border-ink-900/16 bg-white p-3 text-sm text-ink-900 focus:border-2 focus:border-kino-400 focus:outline-none dark:border-paper/16 dark:bg-ink-900 dark:text-paper";

/**
 * Commune + Ville, sur un même form. Les communes proposées dépendent
 * de la ville choisie (voir lib/communes.ts) — la ville "pilote" la
 * commune même si elle s'affiche en second, pour matcher l'ordre
 * Adresse → Commune → Ville demandé. Comme il n'y a qu'une seule ville
 * pour l'instant, ça ne se voit pas encore, mais le formulaire est prêt
 * pour la prochaine (Lubumbashi...).
 */
export function CityCommuneFields({
  defaultCity = CITIES[0] ?? "",
}: {
  defaultCity?: string;
}) {
  const [city, setCity] = useState(defaultCity);
  const communes = communesForCity(city);

  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-ink-400">
          Commune
        </label>
        <select key={city} name="commune" defaultValue="" className={selectClass}>
          <option value="">Choisir...</option>
          {communes.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-ink-400">
          Ville
        </label>
        <select
          name="city"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className={selectClass}
        >
          {CITIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
