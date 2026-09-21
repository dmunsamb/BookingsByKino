/**
 * Logo KinoBooking — symbole "J1, la part gardée" (anneau ouvert + quart
 * plein soudé) et logotype (Kino en DM Serif Display, Booking en DM
 * Sans). Charte complète et sources SVG dans docs/brand-kit à la racine
 * du repo. Règles contraignantes (voir docs/brand-kit/README.md) :
 * une seule couleur par occurrence, orientation fixe (part en haut à
 * droite), jamais d'autre police ni d'autre couleur que celles prévues.
 *
 * Couleurs pilotées par des classes Tailwind (currentColor), pas des
 * styles inline figés : `onDark` (bandeau d'en-tête, toujours sur fond
 * encre ink-900 quel que soit le thème système) utilise des teintes
 * fixes, tandis que le mode par défaut suit le thème clair/sombre du
 * système (dark:) — un fond de page peut basculer, un bandeau d'en-tête
 * fixe non.
 */

const STROKE_WIDTH_BY_SIZE = (size: number) =>
  size <= 16 ? 14 : size <= 24 ? 12 : size <= 40 ? 10 : 9;

export function KinoBookingSymbol({
  size = 32,
  className = "text-ink-900 dark:text-kino-400",
}: {
  size?: number;
  className?: string;
}) {
  const strokeWidth = STROKE_WIDTH_BY_SIZE(size);
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      aria-hidden="true"
      className={className}
    >
      <circle
        cx="50"
        cy="50"
        r="34"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeDasharray="160 54"
        transform="rotate(-90 50 50)"
      />
      <path d="M50 50V16A34 34 0 0 1 80 50Z" fill="currentColor" />
    </svg>
  );
}

/** Verrouillage horizontal symbole + nom. `onDark` pour un bandeau
 * toujours sur fond encre (en-tête) ; sans, suit le thème clair/sombre
 * du système (page normale, fond papier ou encre selon prefers-color-scheme). */
export function KinoBookingLockup({
  size = 28,
  onDark = false,
}: {
  size?: number;
  onDark?: boolean;
}) {
  const symbolClass = onDark ? "text-kino-400" : "text-ink-900 dark:text-kino-400";
  const kinoClass = onDark ? "text-paper" : "text-ink-900 dark:text-paper";
  const bookingClass = onDark
    ? "text-kino-400"
    : "text-kino-600 dark:text-kino-400";

  return (
    <span className="inline-flex items-center" style={{ gap: size * 0.45 }}>
      <KinoBookingSymbol
        size={size * 1.3}
        className={`flex-none ${symbolClass}`}
      />
      <span className="inline-flex items-baseline">
        <span
          className={`font-serif leading-none ${kinoClass}`}
          style={{ fontSize: size }}
        >
          Kino
        </span>
        <span
          className={`font-sans leading-none tracking-tight ${bookingClass}`}
          style={{ fontSize: size }}
        >
          Booking
        </span>
      </span>
    </span>
  );
}
