/**
 * ============================================================
 * FILE: app/page.tsx
 * JENIS: Server Component (async) — Halaman Utama "/"
 * ============================================================
 *
 * APA ITU PAGE.TSX DI ROOT APP/?
 * --------------------------------
 * File ini adalah halaman yang muncul saat user membuka:
 *   http://localhost:3000/
 *   (atau domain utama saat di-deploy)
 *
 * Karena ini SERVER Component (tidak ada "use client"):
 * ✅ Bisa pakai async/await langsung
 * ✅ Bisa fetch data dari API tanpa useEffect
 * ✅ Data diproses di server → HTML dikirim ke browser (lebih cepat)
 * ❌ Tidak bisa pakai useState, useEffect, onClick
 *
 * FITUR HALAMAN INI:
 * 1. Tampilkan semua produk dari FakeStore API
 * 2. Filter berdasarkan teks pencarian (?q=kata)
 * 3. Filter berdasarkan kategori (?cat=electronics)
 * 4. Loading skeleton saat produk masih dimuat
 *
 * ARSITEKTUR (ada 3 komponen di file ini):
 * ┌─────────────────────────────────────────────────────────┐
 * │ HomePage (Server Component)                              │
 * │   ├─ SearchFilter (Client) ← dalam <Suspense>           │
 * │   └─ <Suspense fallback={<LoadingSkeleton />}>          │
 * │         └─ ProductList (Server) ← filter + render kartu │
 * └─────────────────────────────────────────────────────────┘
 *
 * KENAPA PRODUCTLIST DIPISAH?
 * React Suspense membutuhkan komponen async terpisah.
 * HomePage tidak bisa await dirinya sendiri untuk fallback.
 * Solusi: pisahkan ProductList sebagai komponen async terpisah,
 * lalu bungkus dengan <Suspense> di HomePage.
 */

import { Suspense } from "react";
// Suspense = komponen React yang menampilkan fallback saat menunggu
// komponen async selesai dirender

import { getProducts, getCategories } from "@/actions/products";
// getProducts()   = ambil semua produk dari FakeStore API (cache 1 jam)
// getCategories() = ambil daftar kategori (cache 24 jam)

import type { Product } from "@/actions/products";
// Impor TIPE saja (tidak ada kode runtime) — untuk TypeScript typing

import ProductCard from "./components/ProductCard";
// Komponen kartu produk individual

import SearchFilter from "./components/SearchFilter";
// Komponen input pencarian + dropdown kategori (Client Component)

import { getCartCount } from "@/actions/cart";
// Diimport tapi tidak dipakai di sini (mungkin sisa dari versi sebelumnya)

/**
 * HomePageProps — Tipe props yang diterima HomePage
 *
 * searchParams = URL query string dari browser
 * Di Next.js 16, searchParams adalah Promise (harus di-await)
 * Contoh URL: /?q=laptop&cat=electronics
 * → searchParams = { q: "laptop", cat: "electronics" }
 */
type HomePageProps = {
  searchParams: Promise<{ q?: string; cat?: string }>;
  // q   = query teks pencarian (opsional)
  // cat = kategori yang dipilih (opsional)
};

// ============================================================
// KOMPONEN INTERNAL: ProductList
// ============================================================

/**
 * ProductList — Mengambil dan menampilkan daftar produk yang sudah difilter
 *
 * Ini adalah komponen ASYNC Server Component.
 * Dipanggil dari dalam <Suspense> di HomePage.
 *
 * @param search   - Teks pencarian (dari URL param ?q=)
 * @param category - Kategori yang dipilih (dari URL param ?cat=)
 */
async function ProductList({ search, category }: { search: string; category: string }) {
  // Ambil semua produk dari FakeStore API
  // Data ini di-cache 1 jam (ISR — Incremental Static Regeneration)
  const result = await getProducts();

  // Jika fetch gagal → tampilkan pesan error
  if (!result.success) {
    return (
      <div className="text-center py-20 text-gray-400">
        <p>Gagal memuat produk. Coba lagi.</p>
      </div>
    );
  }

  // Mulai dengan semua produk
  let products: Product[] = result.data;

  // Filter 1: berdasarkan kategori
  if (category) {
    products = products.filter((p) => p.category === category);
    // Hanya simpan produk yang kategorinya cocok persis
    // Contoh: category="electronics" → hanya produk elektronik
  }

  // Filter 2: berdasarkan teks pencarian
  if (search) {
    const q = search.toLowerCase();
    // toLowerCase() = bandingkan tanpa peduli huruf besar/kecil
    // "LAPTOP" dan "laptop" dianggap sama

    products = products.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||       // cocok di nama produk
        p.category.toLowerCase().includes(q) ||    // cocok di kategori
        p.description.toLowerCase().includes(q)   // cocok di deskripsi
    );
  }

  // Jika tidak ada produk yang cocok dengan filter
  if (products.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-400 text-sm">Tidak ada produk ditemukan.</p>
      </div>
    );
  }

  // Render grid produk
  return (
    // Grid responsif:
    // - 2 kolom di mobile
    // - 3 kolom di layar sm (640px+)
    // - 4 kolom di layar lg (1024px+)
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {products.map((product: Product) => (
        // Render satu ProductCard untuk setiap produk
        // key={product.id} = React butuh key unik untuk setiap item dalam list
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}

// ============================================================
// KOMPONEN INTERNAL: LoadingSkeleton
// ============================================================

/**
 * LoadingSkeleton — Placeholder animasi saat produk masih dimuat
 *
 * Ditampilkan sebagai fallback di <Suspense> saat ProductList
 * masih menunggu data dari API.
 *
 * "Skeleton" = bentuk kartu kosong yang berwarna abu dan beranimasi
 * (pola umum di UI modern untuk menunjukkan loading)
 */
function LoadingSkeleton() {
  return (
    // Grid 8 kartu skeleton (sama dengan jumlah produk yang biasa muncul pertama)
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {[...Array(8)].map((_, i) => (
        // [...Array(8)] = buat array [undefined, undefined, ...] 8 elemen
        // .map((_, i) => ...) = _ = nilai (tidak dipakai), i = index 0-7
        <div key={i} className="bg-white border border-gray-100 rounded-xl overflow-hidden animate-pulse">
          {/* animate-pulse = animasi fade-in/fade-out terus-menerus (Tailwind) */}
          <div className="h-52 bg-gray-100" />          {/* placeholder gambar */}
          <div className="p-4 space-y-2">
            <div className="h-3 bg-gray-100 rounded w-1/3" />  {/* placeholder kategori */}
            <div className="h-4 bg-gray-100 rounded w-3/4" />  {/* placeholder nama baris 1 */}
            <div className="h-4 bg-gray-100 rounded w-1/2" />  {/* placeholder nama baris 2 */}
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================
// KOMPONEN UTAMA: HomePage
// ============================================================

/**
 * HomePage — Halaman utama yang menampilkan semua produk
 *
 * Ini adalah async Server Component — bisa await searchParams.
 *
 * @param searchParams - URL query params (Promise di Next.js 16)
 */
export default async function HomePage({ searchParams }: HomePageProps) {
  // Await searchParams untuk mendapatkan nilainya
  // Di Next.js 16, searchParams adalah Promise (breaking change dari versi sebelumnya)
  const { q = "", cat = "" } = await searchParams;
  // q   = teks pencarian (default: string kosong)
  // cat = kategori (default: string kosong)

  // Ambil daftar kategori untuk dropdown SearchFilter
  const categoriesResult = await getCategories();
  const categories = categoriesResult.success ? categoriesResult.data : [];
  // Jika gagal fetch kategori → pakai array kosong (dropdown tidak ada pilihan)

  return (
    // Background abu sangat terang untuk seluruh halaman
    <div className="min-h-screen bg-[#f8f8f6]">
      <div className="max-w-6xl mx-auto px-6 py-10">

        {/* ── HEADER ── */}
        <div className="mb-10">
          <h1 className="text-2xl font-semibold text-gray-900 mb-1">Semua Produk</h1>
          <p className="text-sm text-gray-500">
            {/* Tampilkan nama kategori jika filter aktif, atau teks default */}
            {cat ? `Kategori: ${cat}` : "Temukan produk terbaik untuk Anda"}
          </p>
        </div>

        {/* ── SEARCH & FILTER ──
            SearchFilter adalah Client Component (perlu "use client" karena useState)
            Dibungkus <Suspense> karena useSearchParams() di dalamnya
            membutuhkan Suspense boundary di Next.js 16 */}
        <Suspense>
          <SearchFilter categories={categories} />
        </Suspense>

        {/* ── BADGE FILTER AKTIF ──
            Tampilkan chip/tag yang menunjukkan filter apa yang sedang aktif
            Hanya muncul jika ada pencarian ATAU kategori yang dipilih */}
        {(q || cat) && (
          <div className="flex items-center gap-2 mb-6 text-sm text-gray-500">
            <span>Hasil untuk:</span>
            {/* Badge teks pencarian */}
            {q && (
              <span className="bg-gray-900 text-white px-2.5 py-0.5 rounded-full text-xs">
                "{q}"
              </span>
            )}
            {/* Badge kategori */}
            {cat && (
              <span className="bg-gray-900 text-white px-2.5 py-0.5 rounded-full text-xs capitalize">
                {cat}
                {/* capitalize = huruf pertama jadi kapital (CSS) */}
              </span>
            )}
          </div>
        )}

        {/* ── DAFTAR PRODUK ──
            Dibungkus <Suspense> dengan fallback LoadingSkeleton.
            Saat ProductList masih fetch API → LoadingSkeleton ditampilkan.
            Setelah selesai → ProductList (kartu produk) ditampilkan. */}
        <Suspense fallback={<LoadingSkeleton />}>
          <ProductList search={q} category={cat} />
        </Suspense>

      </div>
    </div>
  );
}
