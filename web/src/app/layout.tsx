import type { Metadata } from "next";
import { DM_Sans, DM_Serif_Display } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

const dmSerifDisplay = DM_Serif_Display({
  variable: "--font-dm-serif",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "KinoBooking",
  description:
    "Plateforme de réservation et de gestion de files d'attente pour les salons de beauté et établissements Horeca à Kinshasa et Lubumbashi.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className={`${dmSans.variable} ${dmSerifDisplay.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
