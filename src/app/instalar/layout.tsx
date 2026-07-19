import type { Metadata } from "next";
import PWASetup from "@/components/PWASetup";

export const metadata: Metadata = {
  title: "Instalar Consulcar Admin",
  manifest: "/manifest.json",
};

export default function InstalarLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <PWASetup />
      {children}
    </>
  );
}
