/**
 * ============================================================
 * FILE: app/components/SearchFilter.tsx
 * JENIS: Client Component ("use client")
 * ============================================================
 *
 * APA ITU SEARCHFILTER?
 * ----------------------
 * SearchFilter adalah komponen yang berisi:
 * 1. Input pencarian teks (cari berdasarkan nama/kategori/deskripsi)
 * 2. Dropdown pilih kategori produk
 *
 * CARA KERJA (Pola URL-based Search):
 * ------------------------------------
 * Komponen ini TIDAK menyimpan produk — ia hanya mengubah URL.
 * Halaman utama (page.tsx = Server Component) membaca URL lalu
 * memfilter produk di server.
 *
 * Alur lengkap:
 * User ketik "laptop"
 *     ↓ debounce 400ms (tunggu user selesai ketik)
 *     ↓ router.push("/?q=laptop")
 *     ↓ page.tsx (server) baca searchParams → filter produk
 *     ↓ ProductList re-render dengan produk yang sudah difilter
 *
 * KENAPA DEBOUNCE?
 * ----------------
 * Tanpa debounce: setiap ketukan huruf langsung push URL baru.
 * Ketik "laptop" (6 huruf) = 6 navigasi URL dalam 1 detik = lambat.
 *
 * Dengan debounce 400ms: tunggu user berhenti ketik selama 400ms,
 * baru update URL. Ketik "laptop" = 1 navigasi saja.
 *
 * TEKNIK useRef untuk Debounce:
 * ------------------------------
 * debounceRef.current menyimpan ID timeout.
 * Setiap kali user ketik huruf baru:
 * 1. clearTimeout(debounceRef.current) → batalkan timer sebelumnya
 * 2. setTimeout baru dengan delay 400ms
 * Hanya timer TERAKHIR yang berjalan hingga selesai.
 *
 * PROPS YANG DITERIMA:
 * - categories: string[] → daftar kategori untuk dropdown
 *   (diambil dari FakeStore API di page.tsx, lalu dikirim ke sini)
 */
"use client";

import { useState, useEffect, useRef } from "react";
// useState  = simpan nilai search dan category yang dipilih user
// useEffect = jalankan debounce setiap kali search atau category berubah
// useRef    = simpan ID timeout tanpa memicu re-render

import { useRouter, useSearchParams } from "next/navigation";
// useRouter     = untuk push URL baru (/?q=...&cat=...)
// useSearchParams = baca parameter URL saat ini (agar sinkron dengan URL)

/**
 * SearchFilterProps — Tipe props yang diterima komponen ini
 */
type SearchFilterProps = {
  categories: string[]; // ["electronics", "jewelery", "men's clothing", ...]
};

/**
 * SearchFilter — Input pencarian + dropdown kategori
 *
 * @param categories - Daftar kategori produk dari FakeStore API
 */
export default function SearchFilter({ categories }: SearchFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  // searchParams = objek URL params saat ini
  // Digunakan untuk sinkronisasi nilai awal input dengan URL
  // Contoh: buka /?q=laptop → input terisi "laptop" otomatis

  // State: nilai input pencarian teks
  const [search, setSearch] = useState(searchParams?.get("q") || "");
  // searchParams?.get("q") = ambil parameter "q" dari URL
  // Contoh URL /?q=laptop → get("q") = "laptop"
  // || "" = fallback ke string kosong jika tidak ada parameter "q"

  // State: kategori yang dipilih di dropdown
  const [category, setCategory] = useState(searchParams?.get("cat") || "");
  // Sama seperti search, tapi untuk parameter "cat"

  // Ref untuk menyimpan ID timeout debounce
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // useRef tidak memicu re-render saat nilainya berubah
  // Ini penting: kita tidak mau re-render hanya karena timer berubah
  // ReturnType<typeof setTimeout> = tipe TypeScript yang benar untuk setTimeout ID

  /**
   * useEffect — Jalankan debounce setiap kali search atau category berubah
   *
   * Dependency array: [search, category]
   * → Efek ini berjalan setiap kali nilai search ATAU category berubah
   */
  useEffect(() => {
    // Langkah 1: Batalkan timer sebelumnya (jika ada)
    // Ini inti dari debounce — timer lama dibatalkan, timer baru dimulai
    if (debounceRef.current) clearTimeout(debounceRef.current);

    // Langkah 2: Buat timer baru dengan delay 400ms
    debounceRef.current = setTimeout(() => {
      // Kode di dalam setTimeout ini hanya jalan SETELAH 400ms tanpa perubahan

      // Bangun URL params baru
      const params = new URLSearchParams();
      // URLSearchParams = class bawaan browser untuk mengelola query string
      if (search) params.set("q", search);     // tambahkan "q=..." jika ada teks
      if (category) params.set("cat", category); // tambahkan "cat=..." jika dipilih

      // Navigasi ke URL baru → memicu halaman server (page.tsx) untuk filter ulang
      router.push(`/?${params.toString()}`);
      // Contoh hasil: "/?q=laptop&cat=electronics"
      // Jika search dan category kosong: "/?", yang sama dengan "/"
    }, 400); // 400 milidetik = 0.4 detik

    // Cleanup function: dipanggil saat komponen unmount atau sebelum efek berikutnya
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      // Bersihkan timer agar tidak ada memory leak
    };
  }, [search, category]); // eslint-disable-line react-hooks/exhaustive-deps
  // eslint-disable-line = mematikan peringatan ESLint untuk baris ini
  // (ESLint ingin kita tambahkan "router" ke dependency, tapi itu akan menyebabkan
  //  infinite loop karena router berubah setiap render)

  return (
    // Layout: kolom di mobile, baris di layar sm keatas
    <div className="flex flex-col sm:flex-row gap-3 mb-8">

      {/* ── INPUT PENCARIAN ── */}
      <div className="relative flex-1">
        {/* Ikon kaca pembesar (SVG) di sisi kiri input */}
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
          // absolute + top-1/2 + -translate-y-1/2 = posisikan ikon di tengah vertikal
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
        </svg>

        <input
          type="text"
          placeholder="Cari produk..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          // Setiap ketukan → setSearch → useEffect jalan → debounce mulai
          className="w-full pl-9 pr-9 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-400 transition-colors"
          // pl-9 = padding kiri besar agar teks tidak menimpa ikon kaca pembesar
          // pr-9 = padding kanan besar agar teks tidak menimpa tombol X
        />

        {/* Tombol X untuk hapus teks pencarian — hanya muncul saat ada teks */}
        {search && (
          <button
            onClick={() => setSearch("")}
            // setSearch("") → useEffect jalan → push URL tanpa "q" → filter hilang
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              {/* Ikon X (silang) */}
            </svg>
          </button>
        )}
      </div>

      {/* ── DROPDOWN KATEGORI ── */}
      <select
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        // Setiap pilihan berubah → setCategory → useEffect → debounce → push URL
        className="py-2.5 px-3 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-gray-400 transition-colors sm:w-48"
        // sm:w-48 = lebar tetap 192px di layar medium ke atas
      >
        {/* Opsi default: tampilkan semua produk */}
        <option value="" className="text-gray-900">Semua Kategori</option>

        {/* Render satu <option> untuk setiap kategori dari API */}
        {categories.map((cat) => (
          <option key={cat} value={cat} className="text-gray-900">
            {/* Kapitalkan huruf pertama kategori */}
            {cat.charAt(0).toUpperCase() + cat.slice(1)}
            {/* Contoh: "electronics" → "Electronics" */}
          </option>
        ))}
      </select>
    </div>
  );
}
