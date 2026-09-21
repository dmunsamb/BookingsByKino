import type { ReactNode } from "react";
import { getImpersonationBanner } from "@/lib/auth/dal";
import { ImpersonationBanner } from "./impersonation-banner";

/**
 * Point d'insertion unique du bandeau "voir en tant que" — toutes les
 * pages sous /dashboard en héritent sans avoir à être modifiées.
 */
export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const impersonation = await getImpersonationBanner();

  return (
    <>
      {impersonation && <ImpersonationBanner {...impersonation} />}
      {children}
    </>
  );
}
