/**
 * ============================================================
 * FILE: app/contexts/AuthContext.tsx
 * JENIS: React Context (Client Component)
 * ============================================================
 *
 * APA ITU CONTEXT?
 * ----------------
 * Context = "gudang data global" yang bisa diakses dari komponen
 * mana saja tanpa harus melewati props satu per satu.
 *
 * ANALOGI:
 * Bayangkan Context seperti papan pengumuman kantor.
 * Siapapun bisa membaca pengumuman itu tanpa harus minta ke orang lain.
 *
 * TANPA Context (repot):
 *   App → Layout → Navbar → ... → Komponen (props 5 level)
 *
 * DENGAN Context (mudah):
 *   AuthContext ──→ Navbar       (langsung: useAuth())
 *               ├─→ ProductCard  (langsung: useAuth())
 *               └─→ ProfilePage  (langsung: useAuth())
 *
 * YANG DISEDIAKAN FILE INI:
 * - user        → data user yang login (atau null jika belum)
 * - isLoading   → true saat sedang proses login/logout
 * - login()     → fungsi untuk login
 * - logout()    → fungsi untuk logout
 * - error       → pesan error jika login gagal
 */

// app/contexts/AuthContext.tsx
"use client"; // HARUS client karena pakai useState dan useEffect

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { getCurrentUser, loginUser, logoutUser } from "@/actions/auth";
// @/ = alias untuk root folder project

// ============================================================
// TIPE DATA
// ============================================================

/** User — Bentuk data user yang disimpan di context */
type User = {
  id: number;
  username: string;
  email: string;
  name?: {
    firstname: string;
    lastname: string;
  };
  address?: {
    city: string;
    street: string;
    number: number;
    zipcode: string;
  };
  phone?: string;
};

/**
 * AuthContextType — Data & fungsi yang bisa diakses lewat useAuth()
 */
type AuthContextType = {
  user: User | null;   // null = belum login
  isLoading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  error: string | null;
};

// ============================================================
// MEMBUAT CONTEXT
// ============================================================

/**
 * AuthContext — "Wadah" context yang menyimpan nilai auth.
 * undefined = nilai default sebelum Provider dipasang.
 */
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ============================================================
// PROVIDER COMPONENT
// ============================================================

/**
 * AuthProvider — Komponen pembungkus yang menyebarkan data auth.
 *
 * Dipasang di layout.tsx agar seluruh halaman bisa mengakses auth:
 *   <AuthProvider>
 *     <CartProvider>
 *       <Navbar />
 *       {children}
 *     </CartProvider>
 *   </AuthProvider>
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  // useState = simpan data yang bisa berubah dan memicu re-render
  const [user, setUser] = useState<User | null>(null);     // data user
  const [isLoading, setIsLoading] = useState(true);        // status loading
  const [error, setError] = useState<string | null>(null); // pesan error

  // useEffect dengan [] = jalankan SEKALI saat komponen pertama muncul
  useEffect(() => {
    loadUser(); // cek apakah ada sesi login sebelumnya di cookie
  }, []);

  /**
   * loadUser — Cek cookie sesi, jika ada → login otomatis
   * Ini membuat user tidak perlu login ulang setiap refresh halaman.
   */
  const loadUser = async () => {
    const result = await getCurrentUser(); // server action: baca cookie
    if (result.success && result.data) {
      setUser(result.data); // set data user dari cookie
    }
    setIsLoading(false); // selesai mengecek, matikan loading
  };

  /**
   * login — Proses login dengan username & password
   *
   * @returns true jika berhasil, false jika gagal
   *
   * Kode yang di-comment adalah percobaan refaktor yang belum selesai.
   * Kode aktif dimulai dari setIsLoading(true) ke bawah.
   */
  const login = async (username: string, password: string) => {
    // try{
    //       setIsLoading(true);
    // setError(null);
    // const result = await loginUser(username, password);
  //   if (result.success && result.data) {
  //     setUser(result.data);
  //     return true;
  //     } else {
      // setError(result.error || "Login failed");
  //     setIsLoading(false);
  //   }
  //   }catch(error){
  //     console.error("Login error:", error);
  //     setError("An unexpected error occurred during login.");
  //   } finally{(() => {
  //     setIsLoading(false);
  //   });
  // }

    setIsLoading(true);  // tampilkan spinner di tombol Login
    setError(null);      // hapus error sebelumnya

    const result = await loginUser(username, password); // server action

    if (result.success && result.data) {
      setUser(result.data);   // simpan data user ke state
      setIsLoading(false);
      return true;            // beri tahu login page → redirect ke home
    } else {
      setError(result.error || "Login failed"); // tampilkan pesan error
      setIsLoading(false);
      return false; // beri tahu login page → jangan redirect
    }
  };

  /**
   * logout — Hapus sesi login
   * Menghapus cookie di server, lalu reset state user ke null.
   */
  const logout = async () => {
    setIsLoading(true);
    await logoutUser(); // server action: hapus cookie
    setUser(null);      // reset user di state → komponen yang pakai user ikut update
    setIsLoading(false);
  };

  // Bungkus children dengan Provider dan sebarkan nilai
  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, error }}>
      {children}
    </AuthContext.Provider>
  );
}

// ============================================================
// CUSTOM HOOK: useAuth
// ============================================================

/**
 * useAuth — Hook untuk menggunakan AuthContext di komponen manapun
 *
 * CARA PAKAI:
 *   const { user, login, logout } = useAuth();
 *
 * Harus dipakai di dalam komponen yang terbungkus <AuthProvider>.
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
