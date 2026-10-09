"use client";

import { OPEN_COOKIE_SETTINGS_EVENT } from "./cookie-consent";

/** Rouvre le bandeau de consentement cookies (voir cookie-consent.tsx) — permet de
 * changer d'avis après le premier choix, sans devoir vider le cache du navigateur. */
export function ManageCookiesLink() {
  return (
    <button
      type="button"
      onClick={() =>
        window.dispatchEvent(new Event(OPEN_COOKIE_SETTINGS_EVENT))
      }
      className="hover:underline"
    >
      Gérer les cookies
    </button>
  );
}
