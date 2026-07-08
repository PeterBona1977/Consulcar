import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Consulcar | Importação Automóvel",
  description: "Consultoria em Importação Automóvel. Encontre, importe e legalize o carro dos seus sonhos com total segurança e transparência.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-PT" className="scroll-smooth" suppressHydrationWarning>
      <body className={`${outfit.className} bg-[#050505] text-white overflow-x-hidden antialiased`} suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
