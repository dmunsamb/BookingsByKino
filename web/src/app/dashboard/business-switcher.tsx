"use client";

import Link from "next/link";
import { switchActiveBusiness } from "./etablissements/actions";

export type OwnedBusiness = {
  id: string;
  name: string;
  signup_status: string;
};

export function BusinessSwitcher({
  businesses,
  currentBusinessId,
}: {
  businesses: OwnedBusiness[];
  currentBusinessId: string;
}) {
  if (businesses.length <= 1) {
    return (
      <div className="mb-6">
        <Link
          href="/dashboard/etablissements/nouveau"
          className="text-xs font-bold text-kino-600 hover:underline dark:text-kino-300"
        >
          + Ajouter un établissement
        </Link>
      </div>
    );
  }

  return (
    <div className="mb-6 flex flex-wrap items-center gap-3">
      <form action={switchActiveBusiness}>
        <select
          name="business_id"
          defaultValue={currentBusinessId}
          onChange={(e) => e.currentTarget.form?.requestSubmit()}
          className="rounded-xl border border-ink-900/16 bg-white p-2 text-sm font-bold text-ink-900 focus:border-2 focus:border-kino-400 focus:outline-none dark:border-paper/16 dark:bg-ink-800 dark:text-paper"
        >
          {businesses.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
              {b.signup_status === "pending_approval" ? " (en attente)" : ""}
              {b.signup_status === "awaiting_payment"
                ? " (sous conditions)"
                : ""}
              {b.signup_status === "rejected" ? " (refusé)" : ""}
            </option>
          ))}
        </select>
      </form>
      <Link
        href="/dashboard/etablissements/nouveau"
        className="text-xs font-bold text-kino-600 hover:underline dark:text-kino-300"
      >
        + Ajouter un établissement
      </Link>
    </div>
  );
}
