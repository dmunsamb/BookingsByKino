import { redirect } from "next/navigation";

// Fusionné dans /dashboard/rapports (bilan de la semaine + rapport par
// période, sur une seule page "Rapport") — redirige les liens existants.
export default function BilanPage() {
  redirect("/dashboard/rapports");
}
