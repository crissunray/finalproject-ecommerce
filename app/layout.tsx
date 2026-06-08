/**
 * ============================================================
 * FILE: app/layout.tsx
 * JENIS: Root Layout (Server Component)
 * ============================================================
 *
 * APA ITU LAYOUT?
 * ---------------
 * Layout adalah "bingkai" yang mengelilingi SEMUA halaman.
 * Apapun halamannya (home, login, cart, dll), layout ini selalu ada.
 *
 * ANALOGI:
 * Seperti template buku — cover dan halaman terakhir selalu sama,
 * hanya isi tengahnya yang berganti.
 *
 * STRUKTUR YANG DIRENDER:
 * ┌──────────────────────────────┐
 * │  <html>                     │
 * │    <body>                   │
 * │      <Providers>            │ ← AuthProvider + CartProvider (data global)
 * │        <Navbar />           │ ← Selalu tampil di atas semua halaman
 * │        {children}           │ ← ISI HALAMAN BERUBAH sesuai URL
 * │      </Providers>           │
 * │    </body>                  │
 * │  </html>                    │
 * └──────────────────────────────┘
 */

import type { Metadata } from "next";
// Metadata = tipe Next.js untuk mengatur <title> dan <meta> di <head> HTML
// Ini yang muncul di tab browser dan hasil pencarian Google

import { Inter } from "next/font/google";
// Inter = font Google yang dioptimasi otomatis oleh Next.js
// Tidak perlu CDN manual — Next.js load font ini secara efisien

import "./globals.css";           // CSS global berlaku untuk seluruh app
import Providers from "./components/Providers"; // wrapper AuthProvider + CartProvider
import Navbar from "./components/Navbar";       // navigasi atas

// Inisialisasi font Inter hanya untuk karakter Latin
// (hemat ukuran font file — tidak load karakter Asia/Arab yang tidak dipakai)
const inter = Inter({ subsets: ["latin"] });

/**
 * metadata — Konfigurasi SEO halaman
 * Ditampilkan di: tab browser, Google, preview link di WhatsApp/Twitter
 */
export const metadata: Metadata = {
  title: "FakeStore E-Commerce",
  description: "Belanja mudah dan aman di FakeStore",
};

/**
 * RootLayout — Komponen layout utama aplikasi
 *
 * @param children - Konten halaman aktif (diisi otomatis Next.js sesuai URL)
 *
 * Contoh: buka /login → children = isi LoginPage
 *         buka /cart  → children = isi CartPage
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
    {/* lang="id" = konten berbahasa Indonesia → penting untuk aksesibilitas & SEO */}
      <body className={inter.className}>
      {/* inter.className = class CSS yang mengaktifkan font Inter */}

        {/*
          Providers membungkus semua halaman dengan:
          - AuthProvider  → data login tersedia di semua halaman
          - CartProvider  → data keranjang tersedia di semua halaman
        */}
        <Providers>
          <Navbar />      {/* tampil di atas semua halaman */}
          {children}      {/* isi halaman berubah-ubah sesuai URL */}
        </Providers>

      </body>
    </html>
  );
}
