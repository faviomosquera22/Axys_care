import "./globals.css";
import type { Metadata } from "next";
import { Providers } from "@/components/providers/providers";

export const metadata: Metadata = {
  title: "Axyscare",
  description: "Plataforma clínica unificada para consulta independiente.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
