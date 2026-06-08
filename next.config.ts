import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Izinkan gambar dari fakestoreapi.com ditampilkan
  images: {
    domains: ["fakestoreapi.com"],
  },
};

export default nextConfig;
