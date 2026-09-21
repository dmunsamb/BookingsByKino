/**
 * Logo KinoBooking — symbole "J1, la part gardée" (anneau ouvert + quart
 * plein soudé) et logotype (Kino en DM Serif Display, Booking en DM
 * Sans). Charte complète et sources SVG dans docs/brand-kit à la racine
 * du repo. Règles contraignantes (voir docs/brand-kit/README.md) :
 * une seule couleur par occurrence, orientation fixe (part en haut à
 * droite), jamais d'autre police ni d'autre couleur que celles prévues.
 */

const STROKE_WIDTH_BY_SIZE = (size: number) =>
  size <= 16 ? 14 : size <= 24 ? 12 : size <= 40 ? 10 : 9;

export function KinoBookingSymbol({
  size = 32,
  color = "#D4AF4F",
  className,
}: {
  size?: number;
  color?: string;
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
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray="160 54"
        transform="rotate(-90 50 50)"
      />
      <path d="M50 50V16A34 34 0 0 1 80 50Z" fill={color} />
    </svg>
  );
}

/** Verrouillage horizontal symbole + nom. `onDark` pour un fond encre
 * (bandeau d'en-tête) ; sans, pour un fond clair. */
export function KinoBookingLockup({
  size = 28,
  onDark = false,
}: {
  size?: number;
  onDark?: boolean;
}) {
  const symbolColor = onDark ? "#D4AF4F" : "#17131C";
  const kinoColor = onDark ? "#F7F4EF" : "#17131C";
  const bookingColor = onDark ? "#D4AF4F" : "#94741F";

  return (
    <span className="inline-flex items-center" style={{ gap: size * 0.45 }}>
      <KinoBookingSymbol
        size={size * 1.3}
        color={symbolColor}
        className="flex-none"
      />
      <span className="inline-flex items-baseline">
        <span
          className="font-serif leading-none"
          style={{ fontSize: size, color: kinoColor }}
        >
          Kino
        </span>
        <span
          className="font-sans leading-none tracking-tight"
          style={{ fontSize: size, color: bookingColor }}
        >
          Booking
        </span>
      </span>
    </span>
  );
}
