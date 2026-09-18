import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Next.js plafonne par défaut le corps d'une Server Action à 1 Mo — très
      // en dessous d'une photo réelle de téléphone (souvent 2-8 Mo), ce qui
      // provoquait une erreur générique de plateforme (rejetée avant même
      // d'atteindre notre propre contrôle de taille dans media-admin.ts).
      // 6 Mo correspond au plafond de charge utile des fonctions Netlify —
      // au-delà, la fonction elle-même rejette la requête quel que soit ce
      // réglage, donc inutile de monter plus haut ici.
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
