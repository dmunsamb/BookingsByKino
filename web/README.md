# KinoBooking — Web App (Next.js)

Application web réelle de KinoBooking, en cours de développement. Voir `../docs/functioneel-ontwerp-kinobooking.md` (section 13 : Architectuur) pour l'architecture complète et les choix technologiques.

## Stack

- [Next.js](https://nextjs.org) (App Router) + TypeScript
- Tailwind CSS v4 (palette KinoBooking définie dans `src/app/globals.css`)
- Supabase (PostgreSQL, Auth, Realtime, Storage) — à connecter

## Démarrer en local

```bash
npm install
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000).

## Variables d'environnement

Copiez `.env.local.example` en `.env.local` et remplissez les clés Supabase une fois le projet Supabase créé (Project Settings → API dans le tableau de bord Supabase) :

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — clés publiques, safe côté client.
- `SUPABASE_SERVICE_ROLE_KEY` — clé privée, utilisée uniquement par `src/lib/supabase/admin.ts` (code serveur). Ne jamais l'exposer au navigateur ni la commiter.

## Base de données (Supabase)

Le schéma et les policies de sécurité sont versionnés dans `supabase/migrations/` :

- `0001_init_schema.sql` — tables (`businesses`, `services`, `availability_rules`, `agenda_entries`, `profiles`) et la fonction de rate limiting.
- `0002_rls_policies.sql` — Row Level Security sur chaque table, plus les vues `agenda_entries_for_dashboard` (numéro masqué pour le personnel) et `agenda_capacity_public` (disponibilité agrégée, sans données personnelles).

Pour les appliquer : dans le tableau de bord Supabase → SQL Editor, exécuter les fichiers dans l'ordre, ou utiliser la Supabase CLI (`supabase db push`) si le projet local y est lié.

## Structure Supabase côté code

- `src/lib/supabase/client.ts` — client navigateur (anon key), pour les Client Components.
- `src/lib/supabase/server.ts` — client serveur avec session utilisateur (Server Components / Route Handlers).
- `src/lib/supabase/admin.ts` — client privilégié (service role key), réservé au code serveur qui doit contourner le RLS (ex. onboarding d'une zaak). Protégé par le package `server-only`.
- `src/proxy.ts` — rafraîchit la session Supabase à chaque requête (équivalent Next.js 16 du "middleware").
- `src/lib/rateLimit.ts` — helper pour limiter le débit des endpoints publics (voir `docs/functioneel-ontwerp-kinobooking.md`, section 13.6.1).

## Statut

Scaffold Next.js + branding + schéma de base de données et policies RLS en place. Restent à construire : l'authentification (pages de login), les écrans réels (portail client, dashboard, agenda) branchés sur Supabase, et les API routes métier (créer une aanvraag, valider, confirmer un paiement). Voir le document de suivi MVP (`../docs/functioneel-ontwerp-kinobooking.md`, section 12).
