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

Copiez `.env.local.example` en `.env.local` et remplissez les clés Supabase une fois le projet Supabase créé.

## Statut

Projet initialisé (scaffold Next.js + branding). La connexion à Supabase, l'authentification et les flux de réservation restent à implémenter — voir le document de suivi MVP (`../docs/functioneel-ontwerp-kinobooking.md`, section 12).
