import type { Metadata } from "next";
import { Chakra_Petch } from "next/font/google";
import "./globals.css";
import { TopBar } from "@/components/TopBar";
import { ProfileProvider } from "@/lib/store";

// Typo display du jeu (titres, chiffres, boutons)
const display = Chakra_Petch({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-chakra" });

export const metadata: Metadata = {
  title: "Darwin Arena",
  description: "Only the fittest basket survives.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={display.variable}>
      <body className="min-h-screen bg-[#0b0716] text-white antialiased">
        <ProfileProvider>
          <TopBar />
          <main className="mx-auto max-w-6xl px-4 pb-16 pt-24">{children}</main>
        </ProfileProvider>
      </body>
    </html>
  );
}
