/**
 * Calcul des créneaux réellement disponibles pour un établissement à une date
 * donnée, à partir de ses règles de disponibilité (FR-9.2) et des
 * réservations déjà existantes (via la fonction get_agenda_capacity,
 * voir supabase/migrations/0002 et 0003).
 *
 * Toutes les heures sont traitées en heure de Kinshasa (WAT, UTC+1, sans
 * changement d'heure saisonnier) — un décalage fixe suffit, pas besoin
 * d'une librairie de fuseaux horaires.
 *
 * slot_duration_minutes (règle) n'est que le pas de la grille des heures de
 * début proposées (ex. un service peut démarrer toutes les 30 min) ; la
 * durée réellement bloquée est celle du service choisi. Un créneau n'est
 * proposé que si le service a le temps de se terminer avant la fermeture.
 *
 * Limite connue : la capacité (get_agenda_capacity) ne compare que des
 * horaires de début strictement identiques, elle ne détecte donc pas un
 * chevauchement entre deux services de durées différentes démarrant à des
 * heures voisines. Acceptable à l'échelle d'un pilote avec peu de
 * réservations simultanées ; à revoir si plusieurs services longs et
 * courts coexistent sur la même grille.
 */

const BUSINESS_UTC_OFFSET = "+01:00";

export type AvailabilityRule = {
  weekday: number;
  start_time: string; // "09:00:00"
  end_time: string;
  slot_duration_minutes: number;
  capacity: number;
  staff_id?: string | null;
};

export type SlotCapacity = {
  start_time: string; // timestamptz ISO, renvoyé par Postgres
  end_time: string;
  booked_count: number;
};

/** Un blocage (congé/indisponibilité) sur un créneau exact — staff_id
 * null signifie "toute l'équipe" (0027_staff_aware_blocking.sql). */
export type BlockedStaffSlot = {
  start_time: string; // timestamptz ISO
  staff_id: string | null;
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

/**
 * Première date réservable par un client (BR-x) : jamais le jour même,
 * toujours à partir du lendemain (heure de Kinshasa). Revérifié aussi côté
 * base par le trigger enforce_agenda_capacity (0008).
 */
export function minBookableDateIso(): string {
  const tomorrowInKinshasa = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Africa/Kinshasa" })
  );
  tomorrowInKinshasa.setDate(tomorrowInKinshasa.getDate() + 1);
  const y = tomorrowInKinshasa.getFullYear();
  const m = (tomorrowInKinshasa.getMonth() + 1).toString().padStart(2, "0");
  const d = tomorrowInKinshasa.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60)
    .toString()
    .padStart(2, "0");
  const m = (minutes % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

function kinshasaNow(): Date {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "Africa/Kinshasa" })
  );
}

function dateIso(d: Date): string {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Date locale (Kinshasa) du jour, au format "YYYY-MM-DD". */
export function todayIso(): string {
  return dateIso(kinshasaNow());
}

/**
 * Créneau (aligné sur la grille d'ouverture) qui correspond à l'instant
 * présent, ou `null` si l'établissement n'est pas ouvert maintenant selon
 * ses règles de disponibilité — utilisé pour le ticket "sans rendez-vous"
 * (FR-3.x) : la file d'attente ne peut être rejointe que pendant les
 * heures d'ouverture déclarées.
 */
export function currentSlotStart(
  rules: AvailabilityRule[]
): { date: string; time: string; rule: AvailabilityRule } | null {
  const now = kinshasaNow();
  const weekday = now.getDay();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const rule = rules.find((r) => {
    if (r.weekday !== weekday) return false;
    return (
      nowMinutes >= timeToMinutes(r.start_time) &&
      nowMinutes < timeToMinutes(r.end_time)
    );
  });

  if (!rule) return null;

  const ruleStart = timeToMinutes(rule.start_time);
  const slotIndex = Math.floor(
    (nowMinutes - ruleStart) / rule.slot_duration_minutes
  );
  const slotStartMinutes = ruleStart + slotIndex * rule.slot_duration_minutes;

  return {
    date: dateIso(now),
    time: minutesToTime(slotStartMinutes),
    rule,
  };
}

/**
 * Débuts de créneaux (en minutes depuis minuit), alignés sur la grille
 * d'une règle de disponibilité, à l'intérieur de la plage
 * [fromMinutes, toMinutes) demandée — utilisé pour générer un blocage qui
 * recouvre exactement les mêmes créneaux que ceux proposés aux clients
 * (voir get_agenda_capacity, migration 0018).
 */
export function alignedSlotStartsInRange(
  rule: AvailabilityRule,
  fromMinutes: number,
  toMinutes: number
): number[] {
  const ruleStart = timeToMinutes(rule.start_time);
  const ruleEnd = timeToMinutes(rule.end_time);
  const starts: number[] = [];
  for (let t = ruleStart; t < ruleEnd; t += rule.slot_duration_minutes) {
    if (t >= fromMinutes && t < toMinutes) {
      starts.push(t);
    }
  }
  return starts;
}

/**
 * Une règle par membre de l'équipe peut désormais couvrir le même jour —
 * leurs capacités doivent alors s'additionner au lieu de produire des
 * créneaux en double. On regroupe donc d'abord par minute de début exacte
 * (grille de CHAQUE règle) avant de générer les créneaux.
 *
 * Limite connue : si deux règles ont des grilles différentes (ex. 30 min
 * vs 60 min) sans partager les mêmes points de départ, leurs capacités ne
 * se cumulent qu'aux instants où les grilles coïncident exactement — pas
 * de fusion d'intervalles générale. Acceptable à l'échelle d'un pilote où
 * les membres d'une même équipe partagent en pratique le même pas.
 *
 * `blockedSlots` (congés/indisponibilités, 0027) retire la capacité d'un
 * membre précis (staff_id) sur un créneau exact, ou celle de tout le
 * monde si staff_id est null — même logique que le trigger
 * enforce_agenda_capacity côté base.
 */
export function generateSlotsForDate(
  rules: AvailabilityRule[],
  dateStr: string,
  capacities: SlotCapacity[],
  serviceDurationMinutes: number,
  blockedSlots: BlockedStaffSlot[] = []
): Slot[] {
  const byStartMinutes = new Map<number, number>();

  for (const rule of rules) {
    const start = timeToMinutes(rule.start_time);
    const end = timeToMinutes(rule.end_time);

    for (
      let t = start;
      // Le service doit pouvoir se terminer avant la fermeture, pas
      // seulement démarrer avant : sinon un service de 120 min réservé
      // 30 min avant la fermeture déborderait sur les heures fermées.
      t + serviceDurationMinutes <= end;
      t += rule.slot_duration_minutes
    ) {
      const startMs = new Date(
        localSlotToIso(dateStr, minutesToTime(t))
      ).getTime();
      const isBlocked = blockedSlots.some(
        (b) =>
          new Date(b.start_time).getTime() === startMs &&
          (b.staff_id === null || b.staff_id === rule.staff_id)
      );
      if (isBlocked) continue;

      byStartMinutes.set(t, (byStartMinutes.get(t) ?? 0) + rule.capacity);
    }
  }

  const slots: Slot[] = [];
  for (const [t, capacity] of byStartMinutes) {
    const time = minutesToTime(t);
    const startMs = new Date(localSlotToIso(dateStr, time)).getTime();

    const matching = capacities.find(
      (c) => new Date(c.start_time).getTime() === startMs
    );
    const bookedCount = matching?.booked_count ?? 0;

    slots.push({
      time,
      slotDurationMinutes: serviceDurationMinutes,
      capacity,
      bookedCount,
      available: bookedCount < capacity,
    });
  }

  return slots.sort((a, b) => a.time.localeCompare(b.time));
}

/** Ajoute `days` jours à une date locale ("YYYY-MM-DD"), sans dépendre du
 * fuseau horaire d'exécution (le calcul se fait sur des composants
 * calendaires, pas sur un instant réel). */
function addDaysIso(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + days);
  const yy = date.getUTCFullYear();
  const mm = (date.getUTCMonth() + 1).toString().padStart(2, "0");
  const dd = date.getUTCDate().toString().padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

/**
 * Première date (à partir de `fromDateIso`) où au moins un créneau est
 * réellement disponible pour ce service — pré-sélectionnée à l'arrivée
 * sur la fiche établissement plutôt que systématiquement "demain", qui
 * peut très bien être complet, bloqué ou fermé. Au-delà de la fenêtre de
 * recherche (aucune date dispo trouvée, ex. salon sans horaires), on
 * retombe sur `fromDateIso`.
 */
export function firstAvailableDateIso(
  rules: AvailabilityRule[],
  capacities: SlotCapacity[],
  serviceDurationMinutes: number,
  fromDateIso: string,
  blockedSlots: BlockedStaffSlot[] = [],
  maxDaysAhead = 60
): string {
  let candidate = fromDateIso;

  for (let i = 0; i < maxDaysAhead; i++) {
    const weekday = new Date(`${candidate}T12:00:00+01:00`).getDay();
    const slots = generateSlotsForDate(
      rules.filter((r) => r.weekday === weekday),
      candidate,
      capacities,
      serviceDurationMinutes,
      blockedSlots
    );
    if (slots.some((s) => s.available)) {
      return candidate;
    }
    candidate = addDaysIso(candidate, 1);
  }

  return fromDateIso;
}
