import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/700.css";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "SIES",
  description: "Sistema de Información de Educación Superior No Universitaria",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body><SiteHeader />{children}<footer>Dirección de Educación Superior No Universitaria · Ministerio de Educación de Tucumán</footer></body>
    </html>
  );
}
