import Image from "next/image";

/**
 * Galerie défilable (swipe gauche/droite) — pur CSS scroll-snap, sans
 * JavaScript : reste léger sur une connexion lente et fonctionne nativement
 * au doigt sur mobile. next/image (audit performance) : redimensionnement
 * et conversion WebP/AVIF à la volée, important sur une connexion mobile.
 */
export function PhotoGallery({ photos }: { photos: { id: string; url: string }[] }) {
  if (photos.length === 0) return null;

  return (
    <div className="mb-6 -mx-4 sm:mx-0">
      <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 pb-1 sm:rounded-2xl sm:px-0">
        {photos.map((photo, index) => (
          <div
            key={photo.id}
            className="relative h-56 w-[85%] flex-none snap-center overflow-hidden rounded-2xl sm:h-72 sm:w-full"
          >
            <Image
              src={photo.url}
              alt=""
              fill
              sizes="(min-width: 640px) 672px, 85vw"
              className="object-cover"
              priority={index === 0}
            />
          </div>
        ))}
      </div>
      {photos.length > 1 && (
        <div className="mt-2 flex justify-center gap-1.5 sm:hidden">
          {photos.map((photo) => (
            <span
              key={photo.id}
              className="h-1.5 w-1.5 rounded-full bg-ink-900/20 dark:bg-paper/20"
            />
          ))}
        </div>
      )}
    </div>
  );
}
