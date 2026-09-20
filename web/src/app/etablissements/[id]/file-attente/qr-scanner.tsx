"use client";

import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";

/**
 * Scanner QR intégré (caméra + jsQR) : débloque le formulaire de prise
 * de ticket une fois que le code affiché dans le salon est reconnu.
 * `expectedMatch` est simplement le chemin de CETTE page — voir lib/qr.ts
 * pour le choix (sécurité d'usage, pas cryptographique) de ne pas exiger
 * plus qu'un contenu scanné correspondant au bon établissement.
 */
export function QrScanner({
  expectedMatch,
  onScanned,
  onCancel,
}: {
  expectedMatch: string;
  onScanned: () => void;
  onCancel: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let rafId: number | null = null;
    let cancelled = false;

    function tick() {
      if (cancelled) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (code && code.data.includes(expectedMatch)) {
            cancelled = true;
            stream?.getTracks().forEach((t) => t.stop());
            onScanned();
            return;
          }
        }
      }
      rafId = requestAnimationFrame(tick);
    }

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        tick();
      } catch {
        setError(
          "Impossible d'accéder à la caméra. Vérifiez les autorisations de votre navigateur."
        );
      }
    }

    start();

    return () => {
      cancelled = true;
      if (rafId != null) cancelAnimationFrame(rafId);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [expectedMatch, onScanned]);

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-xl border border-ink-900/16 bg-black dark:border-paper/16">
        {/* eslint-disable-next-line jsx-a11y/media-has-caption -- flux caméra live, pas de piste de sous-titres possible */}
        <video ref={videoRef} className="w-full" muted playsInline />
      </div>
      <canvas ref={canvasRef} className="hidden" />
      {error && <p className="text-xs text-danger">{error}</p>}
      <p className="text-xs text-ink-400">
        Visez le code QR affiché dans le salon.
      </p>
      <button
        type="button"
        onClick={onCancel}
        className="text-xs font-bold text-ink-400 hover:underline"
      >
        Annuler
      </button>
    </div>
  );
}
