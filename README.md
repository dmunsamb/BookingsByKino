# KinoBooking

Plateforme de réservation et de gestion de files d'attente pour les salons de beauté, coiffure/spa et établissements Horeca (restaurants, lounges) à Kinshasa et Lubumbashi.

## Fonctionnalités

- **Vue Client** : recherche d'établissements par catégorie (Beauté/Horeca) et commune, réservation avec rendez-vous ou prise de ticket virtuel pour la file sans rendez-vous, option VIP/discrète.
- **Espace Salon / Horeca** : tableau de bord des demandes entrantes (validation/refus avec délai de réponse configurable), gestion du catalogue de services et tarifs, ajout rapide de clients sans rendez-vous, poster QR pour la file d'attente, relance marketing WhatsApp automatique, séparation des droits gérant/personnel (protection des numéros clients).
- **Admin SaaS** : vue d'ensemble de la monétisation de la plateforme (abonnements, options additionnelles, frais de service VIP).

## Structure du dépôt

| Chemin | Contenu |
|---|---|
| `index.html` | Prototype front-end statique (HTML/Tailwind CDN/JavaScript vanilla, données de démonstration). Reste hébergé tel quel sur GitHub Pages pendant le développement de la vraie application. |
| `web/` | Application réelle en cours de développement (Next.js + TypeScript + Tailwind CSS, destinée à Supabase + Netlify). Voir `web/README.md`. |
| `docs/` | Documentation du projet : cahier des charges, user stories, statut MVP, architecture (`docs/functioneel-ontwerp-kinobooking.md`, en néerlandais). |

## Statut

Le prototype statique (`index.html`) a servi de base de reverse-engineering pour le cahier des charges. Le développement de l'application réelle a démarré dans `web/` — voir `docs/functioneel-ontwerp-kinobooking.md` (section 12 : statut MVP, section 13 : architecture) pour l'état d'avancement détaillé.

## Lancer le prototype statique en local

Ouvrez `index.html` directement dans un navigateur, ou servez le dossier avec un serveur statique, par exemple :

```bash
python3 -m http.server 8000
```

Puis rendez-vous sur `http://localhost:8000`.

## Lancer l'application Next.js en local

```bash
cd web
npm install
npm run dev
```

Puis rendez-vous sur `http://localhost:3000`. Voir `web/README.md` pour plus de détails.
