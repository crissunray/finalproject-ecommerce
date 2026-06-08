/**
 * ============================================================
 * FILE: app/components/ProtectedRoute.tsx
 * JENIS: Client Component ("use client")
 * ============================================================
 *
 * APA ITU PROTECTEDROUTE?
 * ------------------------
 * ProtectedRoute adalah komponen "penjaga" (guard) yang memastikan
 * hanya user yang sudah LOGIN yang bisa melihat konten di dalamnya.
 *
 * Jika user belum login → otomatis redirect ke halaman login.
 * Jika user sudah login → tampilkan konten.
 *
 * ANALOGI:
 * Seperti satpam di pintu masuk — periksa dulu sebelum boleh masuk.
 * Kalau tidak punya "kartu anggota" (user session), langsung ditolak
 * dan diarahkan ke tempat daftar/login.
 *
 * CARA PAKAI (contoh):
 * --------------------
 * export default function DashboardPage() {
 *   return (
 *     <ProtectedRoute>
 *       <div>Konten rahasia ini hanya untuk user login</div>
 *     </ProtectedRoute>
 *   );
 * }
 *
 * PROPS YANG DITERIMA:
 * - children     : konten halaman yang dilindungi
 * - redirectTo   : URL tujuan jika tidak login (default: "/login")
 * - allowedRoles : (opsional) daftar role yang diizinkan masuk
 *                  (fitur ini sudah disiapkan tapi belum aktif — "future use")
 *
 * STATUS SAAT INI:
 * ProtectedRoute sudah dibuat tapi belum DIPAKAI di halaman manapun.
 * Halaman cart, checkout, profile menggunakan useEffect + router.push()
 * langsung di dalam komponen halaman masing-masing.
 * File ini disiapkan jika ingin refaktor ke pendekatan yang lebih terstruktur.
 */

// Direktif yang membuat komponen ini berjalan di browser (client side)
"use client";

import { useEffect, ReactNode } from "react";
// useEffect = jalankan logika proteksi setelah komponen dirender
// ReactNode = tipe TypeScript untuk children (bisa JSX, string, array, dll)

import { useRouter, usePathname } from "next/navigation";
// useRouter   = untuk redirect ke halaman login
// usePathname = membaca URL halaman saat ini (untuk disimpan agar bisa kembali)

import { useAuth } from "../contexts/AuthContext";
// useAuth() = ambil status login: { user, isLoading }

/**
 * ProtectedRouteProps — Tipe props yang diterima komponen ini
 */
type ProtectedRouteProps = {
  children: ReactNode;
  // children = konten yang dilindungi (halaman/komponen apapun)

  redirectTo?: string;
  // redirectTo = URL redirect jika belum login
  // ? = opsional, ada default value "/login"

  allowedRoles?: string[];
  // allowedRoles = daftar role yang diizinkan (opsional)
  // Contoh: ["admin", "premium_user"]
  // Catatan: Untuk future use — FakeStore API tidak punya system role
};

/**
 * ProtectedRoute — Komponen penjaga halaman yang membutuhkan autentikasi
 *
 * @param children     - Konten halaman yang akan dilindungi
 * @param redirectTo   - URL tujuan jika belum login (default: "/login")
 * @param allowedRoles - Daftar role yang diizinkan (opsional, belum aktif)
 */
export default function ProtectedRoute({
  children,
  redirectTo = "/login", // nilai default — bisa dioverride saat pakai komponen
  allowedRoles,
}: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  // user      = null (belum login) atau objek User (sudah login)
  // isLoading = true saat masih membaca cookie sesi

  const router = useRouter();
  const pathname = usePathname();
  // pathname = URL halaman sekarang, contoh: "/cart", "/profile"

  /**
   * useEffect — Cek autentikasi setiap kali user/isLoading berubah
   */
  useEffect(() => {
    // Jangan lakukan apa-apa jika masih loading
    if (isLoading) return;

    // Jika tidak ada user → redirect ke login
    if (!user) {
      // Simpan URL saat ini di sessionStorage agar setelah login bisa kembali
      sessionStorage.setItem("redirectAfterLogin", pathname);

      // Redirect ke halaman login + tambahkan parameter "from" di URL
      // Contoh: /login?from=%2Fcart  (%2F = "/" yang di-encode untuk URL)
      router.push(`${redirectTo}?from=${encodeURIComponent(pathname)}`);
      return;
    }

    // Role-based access control (fitur opsional, belum aktif di project ini)
    if (allowedRoles && allowedRoles.length > 0) {
      // Ambil role user (FakeStore tidak punya sistem role, fallback ke "user")
      const userRole = (user as any)?.role || "user";
      // (user as any) = type casting agar TypeScript tidak error
      // karena tipe User tidak punya field "role"

      // Jika role user tidak ada di allowedRoles → redirect ke /unauthorized
      if (!allowedRoles.includes(userRole)) {
        router.push("/unauthorized");
        return;
      }
    }
  }, [user, isLoading, router, pathname, redirectTo, allowedRoles]);

  // ── TAMPILAN LOADING ──
  // Ditampilkan saat masih mengecek cookie sesi
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-br from-gray-50 to-blue-50">
        {/* Spinner animasi */}
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-500 border-b-4 border-purple-500"></div>
        <p className="mt-4 text-gray-600">Memeriksa autentikasi...</p>
      </div>
    );
  }

  // Jika tidak ada user → jangan render apapun (redirect sedang berjalan)
  if (!user) {
    return null;
  }

  // User sudah login → render konten yang dilindungi
  // <></> = React Fragment (tidak menambah elemen HTML ekstra ke DOM)
  return <>{children}</>;
}
