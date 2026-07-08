import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { AppLayout } from "@/components/layout/AppLayout";

const inter = Inter({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "QRShop - Gestión de Inventario y Ventas",
  description: "Sistema inteligente de inventario y ventas mediante códigos QR",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" data-theme="light">
      <body className={inter.className}>
        <Providers>
          <AppLayout>{children}</AppLayout>
        </Providers>
      </body>
    </html>
  );
}
