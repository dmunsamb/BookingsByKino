"use client";

import Link from "next/link";
import Script from "next/script";
import { useEffect, useState } from "react";

const GA_MEASUREMENT_ID = "G-3EKEH72WKN";
const CONSENT_STORAGE_KEY = "kinobooking-cookie-consent";
export const OPEN_COOKIE_SETTINGS_EVENT = "kinobooking:open-cookie-settings";

type Consent = "accepted" | "declined" | null;

/**
 * Bandeau de consentement cookies + chargement conditionnel de Google
 * Analytics. Les scripts GA ne sont injectés qu'après un clic sur
 * "Accepter" : pas de mesure d'audience avant consentement explicite.
 *
 * Le choix est mémorisé dans localStorage (jamais envoyé au serveur, pas
 * besoin de cookie dédié rien que pour ça). Rendu une seule fois, dans le
 * layout racine — voir aussi ManageCookiesLink (site-footer.tsx) qui
 * permet de rouvrir ce bandeau pour changer d'avis.
 */
export function CookieConsent() {
  const [consent, setConsent] = useState<Consent>(null);
  const [bannerVisible, setBannerVisible] = useState(false);

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(CONSENT_STORAGE_KEY);
    } catch {
      // Stockage indisponible (navigation privée, cookies bloqués...) :
      // on retombe sur l'affichage du bandeau plutôt que de bloquer la
      // page ou de supposer un consentement qui n'a jamais été donné.
    }
    if (stored === "accepted" || stored === "declined") {
      setConsent(stored);
    } else {
      setBannerVisible(true);
    }

    function handleReopen() {
      setBannerVisible(true);
    }
    window.addEventListener(OPEN_COOKIE_SETTINGS_EVENT, handleReopen);
    return () =>
      window.removeEventListener(OPEN_COOKIE_SETTINGS_EVENT, handleReopen);
  }, []);

  function choose(value: "accepted" | "declined") {
    setConsent(value);
    setBannerVisible(false);
    try {
      localStorage.setItem(CONSENT_STORAGE_KEY, value);
    } catch {
      // Le choix ne sera pas mémorisé d'une visite à l'autre, mais la
      // page continue de fonctionner normalement.
    }
  }

  return (
    <>
      {consent === "accepted" && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
            strategy="afterInteractive"
          />
          <Script id="google-analytics" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${GA_MEASUREMENT_ID}');
            `}
          </Script>
        </>
      )}

      {bannerVisible && (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-ink-900/10 bg-white px-4 py-4 shadow-[0_-4px_16px_rgba(0,0,0,0.12)] dark:border-paper/10 dark:bg-ink-800">
          <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-relaxed text-ink-400">
              On utilise des cookies de mesure d&apos;audience (Google
              Analytics) pour comprendre comment le site est utilisé. Rien
              n&apos;est activé sans votre accord. Détails dans notre{" "}
              <Link
                href="/politique-de-confidentialite"
                className="font-bold text-kino-600 hover:underline dark:text-kino-300"
              >
                politique de confidentialité
              </Link>
              .
            </p>
            <div className="flex flex-none gap-2">
              <button
                type="button"
                onClick={() => choose("declined")}
                className="rounded-xl border border-ink-900/16 px-4 py-2 text-xs font-bold text-ink-900 transition hover:bg-ink-900/5 dark:border-paper/16 dark:text-paper dark:hover:bg-paper/5"
              >
                Refuser
              </button>
              <button
                type="button"
                onClick={() => choose("accepted")}
                className="rounded-xl bg-kino-400 px-4 py-2 text-xs font-bold text-ink-900 transition hover:bg-kino-500"
              >
                Accepter
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
