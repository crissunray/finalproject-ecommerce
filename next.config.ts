import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Perpanjang timeout function Vercel menjadi 30 detik
  // (default 10 detik — kurang untuk API yang "tidur")
  serverExternalPackages: [],
};

export default nextConfig;
