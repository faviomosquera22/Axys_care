import "./globals.css";
import type { Metadata } from "next";
import { Providers } from "@/components/providers/providers";

export const metadata: Metadata = {
  title: "AxysCare",
  description: "Plataforma clínica unificada para consulta independiente.",
  icons: {
    icon: "/branding/axyscare-icon.png",
    shortcut: "/branding/axyscare-icon.png",
    apple: "/branding/axyscare-icon.png",
  },
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
