/**
 * ============================================================
 * FILE: app/components/Navbar.tsx
 * JENIS: Client Component ("use client")
 * ============================================================
 *
 * APA ITU NAVBAR?
 * ---------------
 * Navbar (Navigation Bar) = bilah navigasi yang selalu tampil
 * di bagian ATAS setiap halaman aplikasi.
 *
 * Karena dipasang di layout.tsx, Navbar ini tampil di SEMUA halaman:
 * home, login, cart, profile, dll — tanpa perlu menulis ulang.
 *
 * TAMPILAN BERUBAH SESUAI STATUS LOGIN:
 *
 * Belum login:
 *   FakeStore  |  Produk  |  [Masuk]
 *
 * Sudah login:
 *   FakeStore  |  Produk  |  Keranjang (5)  |  johnd  |  Keluar
 *
 * DATA YANG DIPAKAI:
 * - useAuth()  → cek apakah user sudah login (user, authLoading)
 * - useCart()  → ambil jumlah item di keranjang (count) untuk badge angka
 *
 * KENAPA "use client"?
 * Karena Navbar menggunakan:
 * - useAuth() dan useCart() → React Context (hanya bisa di client)
 * - Event handler onClick (logout button)
 * - Link navigasi yang bereaksi terhadap klik user
 */
"use client";

import Link from "next/link";
// Link = komponen Next.js untuk navigasi antar halaman
// Lebih cepat dari <a href> biasa karena pakai client-side navigation
// (tidak reload halaman penuh — hanya ganti konten)

import { useAuth } from "../contexts/AuthContext";
// useAuth() = hook untuk akses data login:
// { user, logout, isLoading }
// user = null jika belum login, objek user jika sudah login

import { useCart } from "../contexts/CartContext";
// useCart() = hook untuk akses data keranjang:
// { count } = jumlah total item (ditampilkan sebagai badge)

/**
 * Navbar — Komponen navigasi atas yang selalu tampil di semua halaman
 *
 * Tidak menerima props — semua data diambil langsung dari Context.
 */
export default function Navbar() {
  // Ambil data auth dari AuthContext
  const { user, logout, isLoading: authLoading } = useAuth();
  // user         = data user yang login (atau null)
  // logout       = fungsi untuk keluar
  // authLoading  = diganti nama jadi authLoading agar tidak konflik
  //                (true = masih mengecek cookie sesi, false = selesai)

  // Ambil jumlah item keranjang dari CartContext
  const { count } = useCart();
  // count = total quantity semua item (untuk badge angka di "Keranjang")

  return (
    // <nav> = elemen HTML semantik untuk navigasi
    // sticky top-0 = menempel di atas saat halaman di-scroll ke bawah
    // z-50 = z-index tinggi agar Navbar selalu tampil di atas elemen lain
    // border-b border-gray-200 = garis bawah tipis (desain minimalis)
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">

      {/* Container: max-width 6xl, centered, padding horizontal 6 */}
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">

        {/* ── LOGO ── */}
        <Link
          href="/"
          className="text-lg font-bold tracking-tight text-gray-900 hover:text-gray-600 transition-colors"
        >
          FakeStore
        </Link>
        {/* Klik logo → kembali ke halaman utama (/) */}

        {/* ── MENU KANAN ── */}
        <div className="flex items-center gap-6 text-sm text-gray-600">

          {/* Link ke halaman produk (halaman utama) */}
          <Link href="/" className="hover:text-gray-900 transition-colors">
            Produk
          </Link>

          {/*
            Conditional rendering berdasarkan status auth:
            - authLoading = true  → sembunyikan semua (hindari flicker/kedip)
            - authLoading = false, user ada  → tampilkan menu login
            - authLoading = false, user null → tampilkan tombol Masuk
          */}
          {!authLoading && (
            user ? (
              // ── USER SUDAH LOGIN ──
              <>
                {/* Link ke keranjang + badge jumlah item */}
                <Link
                  href="/cart"
                  className="relative hover:text-gray-900 transition-colors flex items-center gap-1"
                >
                  Keranjang
                  {/* Badge hanya muncul jika ada item (count > 0) */}
                  {count > 0 && (
                    <span className="bg-gray-900 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-medium">
                      {count}
                      {/* Angka ini berubah otomatis saat addToCart/clearCart dipanggil */}
                    </span>
                  )}
                </Link>

                {/* Username user — klik buka halaman profil */}
                <Link href="/profile" className="hover:text-gray-900 transition-colors">
                  {user.username}
                  {/* Contoh: "johnd", "mor_2314" */}
                </Link>

                {/* Tombol Keluar */}
                <button
                  onClick={logout}
                  // logout() dari AuthContext:
                  // 1. Hapus cookie user_session di server
                  // 2. Set user = null di state
                  // 3. Navbar otomatis kembali tampilkan tombol "Masuk"
                  className="text-gray-400 hover:text-gray-900 transition-colors"
                >
                  Keluar
                </button>
              </>
            ) : (
              // ── USER BELUM LOGIN ──
              <Link
                href="/login"
                className="bg-gray-900 text-white text-sm px-4 py-1.5 rounded-full hover:bg-gray-700 transition-colors"
              >
                Masuk
              </Link>
            )
          )}
        </div>
      </div>
    </nav>
  );
}
