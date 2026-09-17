import { NextRequest } from "next/server";
import { getCurrentProfile } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { currentMonthIso, monthRange } from "../month-range";

/** Échappe une valeur pour une cellule CSV (RFC 4180 : guillemets doublés). */
function csvCell(value: string | number): string {
  const str = String(value);
  return `"${str.replace(/"/g, '""')}"`;
}

export async function GET(request: NextRequest) {
  const profile = await getCurrentProfile();
  if (profile?.role !== "platform_admin") {
    return new Response("Accès réservé à l'équipe KinoBooking.", {
      status: 403,
    });
  }

  const month = request.nextUrl.searchParams.get("month") || currentMonthIso();
  const { start, end } = monthRange(month);

  const supabase = await createClient();
  const { data: payments } = await supabase
    .from("subscription_payments")
    .select("business_id, amount_usd, duration_months, recorded_at, recorded_by")
    .gte("recorded_at", start)
    .lt("recorded_at", end)
    .order("recorded_at");

  const allPayments = payments ?? [];

  const businessIds = [...new Set(allPayments.map((p) => p.business_id))];
  const { data: businesses } = businessIds.length
    ? await supabase
        .from("businesses")
        .select("id, name, is_test")
        .in("id", businessIds)
    : { data: [] };
  const businessById = new Map((businesses ?? []).map((b) => [b.id, b]));

  const recorderIds = [
    ...new Set(allPayments.map((p) => p.recorded_by).filter((id): id is string => !!id)),
  ];
  const { data: recorders } = recorderIds.length
    ? await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", recorderIds)
    : { data: [] };
  const recorderNameById = new Map(
    (recorders ?? []).map((r) => [r.id, r.full_name])
  );

  const rows = allPayments.filter(
    (p) => !businessById.get(p.business_id)?.is_test
  );

  const header = ["Date", "Établissement", "Durée (mois)", "Montant (USD)", "Enregistré par"]
    .map(csvCell)
    .join(",");

  const lines = rows.map((p) => {
    const date = new Date(p.recorded_at).toLocaleString("fr-FR", {
      timeZone: "Africa/Kinshasa",
    });
    return [
      csvCell(date),
      csvCell(businessById.get(p.business_id)?.name ?? ""),
      csvCell(p.duration_months),
      csvCell(Number(p.amount_usd).toFixed(2)),
      csvCell((p.recorded_by && recorderNameById.get(p.recorded_by)) ?? ""),
    ].join(",");
  });

  // BOM UTF-8 en tête : Excel (très utilisé pour ce genre de rapport)
  // n'affiche correctement les accents français que si le fichier CSV en
  // commence par un.
  const csv = "﻿" + [header, ...lines].join("\r\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="kinobooking-paiements-${month}.csv"`,
    },
  });
}
