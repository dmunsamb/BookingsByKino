/* Logo KinoBooking — symbole + logotype. Une seule couleur par variante. */
export function KinoBookingSymbol({ size = 32, color = "#D4AF4F", ...rest }) {
  // Le trait s'epaissit quand la taille diminue (regle de la charte).
  const w = size <= 16 ? 14 : size <= 24 ? 12 : size <= 40 ? 10 : 9;
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-label="KinoBooking" {...rest}>
      <circle cx="50" cy="50" r="34" fill="none" stroke={color} strokeWidth={w}
              strokeDasharray="160 54" transform="rotate(-90 50 50)" />
      <path d="M50 50V16A34 34 0 0 1 80 50Z" fill={color} />
    </svg>
  );
}

export function KinoBookingLockup({ size = 28, onDark = false }) {
  const symbol = onDark ? "#D4AF4F" : "#17131C";
  const kino = onDark ? "#F7F4EF" : "#17131C";
  const booking = onDark ? "#D4AF4F" : "#94741F";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: size * 0.45 }}>
      <KinoBookingSymbol size={size * 1.3} color={symbol} style={{ flex: "none" }} />
      <span style={{ display: "inline-flex", alignItems: "baseline" }}>
        <span style={{ fontFamily: '"DM Serif Display", Georgia, serif', fontSize: size, lineHeight: 1, color: kino }}>Kino</span>
        <span style={{ fontFamily: '"DM Sans", Helvetica, Arial, sans-serif', fontSize: size, letterSpacing: "-0.02em", lineHeight: 1, color: booking }}>Booking</span>
      </span>
    </span>
  );
}
