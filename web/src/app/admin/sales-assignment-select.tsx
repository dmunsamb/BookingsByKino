"use client";

import { assignSalesRep } from "./actions";

export type SalesRep = { id: string; full_name: string | null };

export function SalesAssignmentSelect({
  businessId,
  salesReps,
  assignedSalesRepId,
}: {
  businessId: string;
  salesReps: SalesRep[];
  assignedSalesRepId: string | null;
}) {
  if (salesReps.length === 0) {
    return <span className="text-xs text-ink-400">Aucun commercial</span>;
  }

  return (
    <form action={assignSalesRep}>
      <input type="hidden" name="business_id" value={businessId} />
      <select
        name="sales_profile_id"
        defaultValue={assignedSalesRepId ?? ""}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="rounded-lg border border-ink-900/16 bg-white p-1.5 text-xs text-ink-900 focus:border-2 focus:border-kino-400 focus:outline-none dark:border-paper/16 dark:bg-ink-900 dark:text-paper"
      >
        <option value="">— Non assigné —</option>
        {salesReps.map((s) => (
          <option key={s.id} value={s.id}>
            {s.full_name ?? "Sans nom"}
          </option>
        ))}
      </select>
    </form>
  );
}
