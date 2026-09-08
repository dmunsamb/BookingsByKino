/**
 * Calcul des créneaux réellement disponibles pour un établissement à une date
 * donnée, à partir de ses règles de disponibilité (FR-9.2) et des
 * réservations déjà existantes (via la fonction get_agenda_capacity,
 * voir supabase/migrations/0002 et 0003).
 *
 * Toutes les heures sont traitées en heure de Kinshasa (WAT, UTC+1, sans
 * changement d'heure saisonnier) — un décalage fixe suffit, pas besoin
 * d'une librairie de fuseaux horaires.
 */

const BUSINESS_UTC_OFFSET = "+01:00";

export type AvailabilityRule = {
  weekday: number;
  start_time: string; // "09:00:00"
  end_time: string;
  slot_duration_minutes: number;
  capacity: number;
};

export type SlotCapacity = {
  start_time: string; // timestamptz ISO, renvoyé par Postgres
  end_time: string;
  booked_count: number;
};

export type Slot = {
  time: string; // "09:00", pour l'affichage
  slotDurationMinutes: number;
  capacity: number;
  bookedCount: number;
  available: boolean;
};

/** Combine une date locale ("YYYY-MM-DD") et une heure locale ("HH:MM") en instant UTC correct. */
export function localSlotToIso(dateStr: string, time: string): string {
  return `${dateStr}T${time}:00${BUSINESS_UTC_OFFSET}`;
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60)
    .toString()
    .padStart(2, "0");
  const m = (minutes % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

export function generateSlotsForDate(
  rules: AvailabilityRule[],
  dateStr: string,
  capacities: SlotCapacity[]
): Slot[] {
  const slots: Slot[] = [];

  for (const rule of rules) {
    const start = timeToMinutes(rule.start_time);
    const end = timeToMinutes(rule.end_time);

    for (
      let t = start;
      t + rule.slot_duration_minutes <= end;
      t += rule.slot_duration_minutes
    ) {
      const time = minutesToTime(t);
      const startMs = new Date(localSlotToIso(dateStr, time)).getTime();

      const matching = capacities.find(
        (c) => new Date(c.start_time).getTime() === startMs
      );
      const bookedCount = matching?.booked_count ?? 0;

      slots.push({
        time,
        slotDurationMinutes: rule.slot_duration_minutes,
        capacity: rule.capacity,
        bookedCount,
        available: bookedCount < rule.capacity,
      });
    }
  }

  return slots.sort((a, b) => a.time.localeCompare(b.time));
}
