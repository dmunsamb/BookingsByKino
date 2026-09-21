import { Fragment, type ReactNode } from "react";

type Step = {
  icon: ReactNode;
  title: string;
  description: string;
};

function StoreIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width={28}
      height={28}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 10V20a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V10" />
      <path d="M3 6l1.5-3h15L21 6" />
      <path d="M3 6a2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0" />
      <path d="M9.5 21v-6h5v6" />
    </svg>
  );
}

function QrScanIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width={28}
      height={28}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 8V5a1 1 0 0 1 1-1h3" />
      <path d="M20 8V5a1 1 0 0 0-1-1h-3" />
      <path d="M4 16v3a1 1 0 0 0 1 1h3" />
      <path d="M20 16v3a1 1 0 0 1-1 1h-3" />
      <rect x="7" y="7" width="4" height="4" rx="0.5" />
      <path d="M15 7h2v2" />
      <path d="M7 15h2v2" />
      <path d="M13 13h2v2h2" />
      <path d="M17 17h.01" />
    </svg>
  );
}

function TicketIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width={28}
      height={28}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 8a2 2 0 0 0 0 4v1a2 2 0 0 0 0 4v1a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-1a2 2 0 0 1 0-4V8a2 2 0 0 1 0-4V3a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v1a2 2 0 0 1 0 4z" />
      <path d="M14 3v18" strokeDasharray="1.5 2.5" />
    </svg>
  );
}

function Arrow({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={18}
      height={18}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M5 12h14" />
      <path d="M13 6l6 6-6 6" />
    </svg>
  );
}

const STEPS: Step[] = [
  {
    icon: <StoreIcon />,
    title: "1. Rendez-vous sur place",
    description:
      "La file d'attente n'est valable qu'une fois arrivée au salon — impossible de la rejoindre depuis chez vous.",
  },
  {
    icon: <QrScanIcon />,
    title: "2. Scannez le code QR",
    description:
      "Le code est affiché à l'accueil du salon. Cliquez sur « Prendre un ticket », visez le code avec votre caméra.",
  },
  {
    icon: <TicketIcon />,
    title: "3. Rejoignez la file",
    description:
      "Indiquez votre prénom, votre numéro et le service souhaité. Suivez votre position depuis « Voir la file d'attente ».",
  },
];

/** Explication illustrée du fonctionnement (US demandée) — l'espace vide
 * sous le module manquait d'un mode d'emploi pour une visiteuse qui
 * découvre la page pour la première fois. */
export function HowItWorks() {
  return (
    <div className="mt-10 rounded-2xl border border-kino-200 bg-kino-50 p-6 dark:border-kino-800 dark:bg-ink-800">
      <p className="mb-5 text-center text-xs font-bold uppercase tracking-widest text-ink-400">
        Comment ça marche
      </p>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-3">
        {STEPS.map((step, index) => (
          <Fragment key={step.title}>
            <div className="flex items-start gap-4 sm:flex-1 sm:flex-col sm:items-center sm:gap-0 sm:text-center">
              <div className="flex h-14 w-14 flex-none items-center justify-center rounded-full bg-white text-kino-600 shadow-sm dark:bg-ink-900 dark:text-kino-300">
                {step.icon}
              </div>
              <div className="sm:mt-3">
                <p className="text-sm font-bold text-ink-900 dark:text-paper">
                  {step.title}
                </p>
                <p className="mt-1 text-xs text-ink-400">
                  {step.description}
                </p>
              </div>
            </div>
            {index < STEPS.length - 1 && (
              <Arrow className="ml-7 -my-1 rotate-90 flex-none text-kino-400 sm:mx-0 sm:mt-6 sm:rotate-0 sm:self-start" />
            )}
          </Fragment>
        ))}
      </div>
    </div>
  );
}
