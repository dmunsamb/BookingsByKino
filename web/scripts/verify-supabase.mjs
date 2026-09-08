// Script de vérification manuelle : confirme que le schéma est bien appliqué
// et que le RLS se comporte comme documenté (section 13.6 / 13.6.1).
// Usage : node --env-file=.env.local scripts/verify-supabase.mjs
// Nécessite NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY et
// SUPABASE_SERVICE_ROLE_KEY dans l'environnement (voir .env.local).

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anonKey || !serviceKey) {
  console.error(
    "Variables manquantes. Lance ce script avec : node --env-file=.env.local scripts/verify-supabase.mjs"
  );
  process.exit(1);
}

const admin = createClient(url, serviceKey);
const anon = createClient(url, anonKey);

let passed = 0;
let failed = 0;

function check(label, condition, detail = "") {
  if (condition) {
    console.log(`✅ ${label}`);
    passed++;
  } else {
    console.log(`❌ ${label}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

console.log("=== 1. Création d'une zaak de test (via service role) ===");

const { data: business, error: businessError } = await admin
  .from("businesses")
  .insert({
    name: "[TEST] Vérification KinoBooking",
    main_category: "beauty",
    sub_category: "Coiffure & Perruques",
    city: "Gombe, Kinshasa",
    address: "Adresse de test",
    mobile_money_number: "+243 00 000 0000",
    response_timeout_hours: 2,
  })
  .select()
  .single();

check("Création de la zaak de test", !businessError && !!business, businessError?.message);
if (!business) {
  console.error("Impossible de continuer sans zaak de test.");
  process.exit(1);
}

const { data: service, error: serviceError } = await admin
  .from("services")
  .insert({
    business_id: business.id,
    name: "[TEST] Soin capillaire",
    category: "Soins",
    description: "Service de test",
    duration_minutes: 60,
    price_usd: 25,
    deposit_usd: 5,
  })
  .select()
  .single();

check("Création d'un service de test", !serviceError && !!service, serviceError?.message);

const { error: availabilityError } = await admin.from("availability_rules").insert({
  business_id: business.id,
  weekday: 1,
  start_time: "09:00",
  end_time: "17:00",
  slot_duration_minutes: 30,
  capacity: 2,
});

check("Création d'une règle de disponibilité", !availabilityError, availabilityError?.message);

console.log("\n=== 2. Lecture publique du catalogue (anon) ===");

const { data: publicBusinesses, error: publicBusinessesError } = await anon
  .from("businesses")
  .select("id, name")
  .eq("id", business.id);

check(
  "Un visiteur anonyme peut lire les zaken (catalogue public)",
  !publicBusinessesError && publicBusinesses?.length === 1,
  publicBusinessesError?.message
);

const { data: publicServices, error: publicServicesError } = await anon
  .from("services")
  .select("id, name")
  .eq("business_id", business.id);

check(
  "Un visiteur anonyme peut lire les diensten (catalogue public)",
  !publicServicesError && publicServices?.length === 1,
  publicServicesError?.message
);

console.log("\n=== 3. Confidentialité de l'agenda (anon ne doit RIEN pouvoir lire) ===");

const { data: adminEntry, error: adminEntryError } = await admin
  .from("agenda_entries")
  .insert({
    business_id: business.id,
    service_id: service.id,
    source: "klant_app",
    status: "pending_approval",
    client_name: "Client Test",
    client_phone: "+243 81 999 8888",
    start_time: new Date().toISOString(),
  })
  .select()
  .single();

check("Insertion d'une réservation de test (via service role)", !adminEntryError && !!adminEntry, adminEntryError?.message);

const { data: leakedEntries, error: leakedError } = await anon
  .from("agenda_entries")
  .select("*")
  .eq("business_id", business.id);

check(
  "Un visiteur anonyme NE PEUT PAS lire l'agenda (RLS bloque, aucune fuite de données client)",
  !leakedError && leakedEntries?.length === 0,
  leakedError ? "" : `${leakedEntries?.length} lignes visibles !`
);

console.log("\n=== 4. Écriture publique restreinte (anon) ===");

const { error: validPublicBookingError } = await anon.from("agenda_entries").insert({
  business_id: business.id,
  service_id: service.id,
  source: "klant_app",
  status: "pending_approval",
  client_name: "Client Public Test",
  client_phone: "+243 81 111 2222",
  start_time: new Date().toISOString(),
});

check(
  "Un visiteur anonyme PEUT soumettre une demande de réservation (pending_approval)",
  !validPublicBookingError,
  validPublicBookingError?.message
);

const { error: invalidPublicBookingError } = await anon.from("agenda_entries").insert({
  business_id: business.id,
  service_id: service.id,
  source: "klant_app",
  status: "confirmed", // tentative de s'auto-confirmer directement
  client_name: "Tentative frauduleuse",
  client_phone: "+243 81 000 0000",
  start_time: new Date().toISOString(),
});

check(
  "Un visiteur anonyme NE PEUT PAS s'auto-confirmer une réservation",
  !!invalidPublicBookingError,
  invalidPublicBookingError ? "" : "l'insertion a réussi alors qu'elle aurait dû être refusée !"
);

console.log("\n=== 5. Vue de disponibilité agrégée (anon, sans données personnelles) ===");

const { data: capacity, error: capacityError } = await anon
  .from("agenda_capacity_public")
  .select("*")
  .eq("business_id", business.id);

check(
  "Un visiteur anonyme peut voir la capacité agrégée (compteurs uniquement)",
  !capacityError && Array.isArray(capacity),
  capacityError?.message
);

console.log("\n=== 6. Nettoyage des données de test ===");

const { error: cleanupError } = await admin.from("businesses").delete().eq("id", business.id);
check(
  "Suppression de la zaak de test (cascade sur services/availability_rules/agenda_entries)",
  !cleanupError,
  cleanupError?.message
);

console.log(`\n${passed} test(s) réussi(s), ${failed} échec(s).`);
process.exit(failed > 0 ? 1 : 0);
