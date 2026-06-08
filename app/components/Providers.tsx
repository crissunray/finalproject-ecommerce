/**
 * ============================================================
 * FILE: app/components/Providers.tsx
 * JENIS: Client Component (Wrapper)
 * ============================================================
 *
 * MENGAPA FILE INI ADA?
 * ----------------------
 * layout.tsx adalah Server Component.
 * AuthProvider dan CartProvider adalah Client Components ("use client").
 *
 * Masalah: Server Component tidak bisa langsung merender
 * Client Component yang pakai Context di dalamnya — harus dipisah.
 *
 * Solusi: Buat file Providers.tsx sebagai "jembatan":
 *   layout.tsx (Server) → Providers.tsx (Client) → AuthProvider → CartProvider
 *
 * URUTAN PENTING:
 * AuthProvider harus di LUAR CartProvider karena
 * CartProvider menggunakan useAuth() dari AuthProvider.
 * Jika dibalik → error "useAuth must be used within AuthProvider"
 *
 * STRUKTUR:
 *   <AuthProvider>        ← sediakan data user
 *     <CartProvider>      ← sediakan data cart (butuh data user dari AuthProvider)
 *       {children}        ← semua halaman app
 *     </CartProvider>
 *   </AuthProvider>
 */

"use client";
// Harus "use client" agar Context bisa berjalan di browser

import { AuthProvider } from "../contexts/AuthContext";
import { CartProvider } from "../contexts/CartContext";

/**
 * Providers — Membungkus seluruh app dengan semua Context yang dibutuhkan
 *
 * @param children - Semua komponen anak (Navbar + halaman aktif)
 */
export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      {/* AuthProvider di luar agar CartProvider bisa akses useAuth() */}
      <CartProvider>
        {children}
      </CartProvider>
    </AuthProvider>
  );
}
