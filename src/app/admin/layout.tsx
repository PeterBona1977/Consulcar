import type { Metadata } from "next";
import PWASetup from "@/components/PWASetup";

export const metadata: Metadata = {
  title: "Consulcar Admin",
  manifest: "/manifest.json",
};

export default function AdminLayout({
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
