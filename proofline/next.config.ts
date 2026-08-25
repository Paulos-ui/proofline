import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Solana tooling is optional; keep it out of the default server bundle unless used.
  serverExternalPackages: ["@solana/kit", "@solana-program/memo"],
};

export default nextConfig;
