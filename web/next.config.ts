import type { NextConfig } from "next";

// Autorise next/image à optimiser les photos hébergées sur Supabase Storage
// (jusqu'ici servies en <img> brut faute de config — voir audit performance :
// next/image redimensionne, compresse et convertit en WebP/AVIF à la volée,
// ce qui compte sur les connexions mobiles de Kinshasa/Lubumbashi). Dérivé de
// l'URL du projet plutôt que codé en dur, pour rester juste si le projet
// Supabase change un jour.
const supabaseHostname = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : undefined;

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
  images: supabaseHostname
    ? {
        remotePatterns: [
          {
            protocol: "https",
            hostname: supabaseHostname,
            pathname: "/storage/v1/object/public/**",
          },
        ],
      }
    : undefined,
  // En-têtes de sécurité de base (audit sécurité) — absents jusqu'ici.
  // Rien ici ne remplace les policies RLS (la vraie barrière), mais ce sont
  // des filets standards contre le clickjacking, le MIME-sniffing et les
  // fuites de Referer vers des tiers.
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(self), geolocation=(), microphone=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
