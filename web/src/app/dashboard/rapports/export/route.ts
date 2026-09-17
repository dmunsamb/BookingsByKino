import { NextRequest } from "next/server";
import { getCurrentProfile, canManageBusiness } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { formatBookingReference } from "@/lib/booking-reference";
import {
  type PeriodType,
  currentWeekIso,
  weekRange,
  currentMonthIso,
  monthRange,
  currentQuarterIso,
  quarterRange,
  currentYearIso,
  yearRange,
} from "@/lib/period-range";

const statusLabels: Record<string, string> = {
  pending_approval: "Demande en attente",
  approved_waiting_payment: "En attente de paiement",
  confirmed: "Confirmée",
  termine: "Terminée",
  no_show: "No-show",
  geannuleerd: "Annulée",
};

/** Échappe une valeur pour une cellule CSV (RFC 4180 : guillemets doublés). */
function csvCell(value: string | number): string {
  const str = String(value);
  return `"${str.replace(/"/g, '""')}"`;
}

function periodRange(type: PeriodType, value: string) {
  switch (type) {
    case "week":
      return weekRange(value);
    case "month":
      return monthRange(value);
    case "quarter":
      return quarterRange(value);
    case "year":
      return yearRange(value);
  }
}

export async function GET(request: NextRequest) {
  const profile = await getCurrentProfile();
  if (!profile?.business_id || !canManageBusiness(profile)) {
    return new Response("Accès réservé au gérant de l'établissement.", {
      status: 403,
    });
  }

  const params = request.nextUrl.searchParams;
  const type: PeriodType =
    params.get("type") === "week" ||
    params.get("type") === "quarter" ||
    params.get("type") === "year"
      ? (params.get("type") as PeriodType)
      : "month";
  const value =
    params.get(type) ||
    (type === "week"
      ? currentWeekIso()
      : type === "quarter"
        ? currentQuarterIso()
        : type === "year"
          ? currentYearIso()
          : currentMonthIso());
  const { start, end } = periodRange(type, value);

  const supabase = await createClient();
  const { data: entries } = await supabase
    .from("agenda_entries_for_dashboard")
    .select(
      "service_id, client_name, client_phone_display, start_time, status, reference_number"
    )
    .eq("business_id", profile.business_id)
    .gte("start_time", start)
    .lt("start_time", end)
    .order("start_time");

  const allEntries = entries ?? [];

  const serviceIds = [
    ...new Set(allEntries.map((e) => e.service_id).filter((id): id is string => !!id)),
  ];
  const { data: services } = serviceIds.length
    ? await supabase
        .from("services")
        .select("id, name, price_usd")
        .in("id", serviceIds)
    : { data: [] };
  const serviceById = new Map((services ?? []).map((s) => [s.id, s]));

  const header = [
    "Date",
    "Client",
    "Téléphone",
    "Service",
    "Montant (USD)",
    "Statut",
    "Référence",
  ]
    .map(csvCell)
    .join(",");

  const lines = allEntries.map((e) => {
    const service = e.service_id ? serviceById.get(e.service_id) : undefined;
    const date = new Date(e.start_time).toLocaleString("fr-FR", {
      timeZone: "Africa/Kinshasa",
    });
    return [
      csvCell(date),
      csvCell(e.client_name ?? ""),
      csvCell(e.client_phone_display ?? ""),
      csvCell(service?.name ?? ""),
      csvCell(service ? service.price_usd.toFixed(2) : ""),
      csvCell(statusLabels[e.status] ?? e.status),
      csvCell(formatBookingReference(e.reference_number)),
    ].join(",");
  });

  // BOM UTF-8 en tête pour qu'Excel affiche correctement les accents.
  const csv = "﻿" + [header, ...lines].join("\r\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="kinobooking-rapport-${type}-${value}.csv"`,
    },
  });
}
