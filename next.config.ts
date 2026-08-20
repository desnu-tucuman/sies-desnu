import type { NextConfig } from "next";

const siesLastUpdated = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "America/Argentina/Tucuman",
}).format(new Date());

const nextConfig: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ["pdfkit"],
  env: {
    SIES_LAST_UPDATED: siesLastUpdated,
  },
};

export default nextConfig;
