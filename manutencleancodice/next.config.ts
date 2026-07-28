import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @react-pdf/renderer va caricato a runtime da Node, non impacchettato dal bundler.
  serverExternalPackages: ["@react-pdf/renderer"],
};

export default nextConfig;
