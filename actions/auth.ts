"use server";

/**
 * ============================================================
 * FILE: actions/auth.ts
 * JENIS: Server Action
 * ============================================================
 *
 * FILE INI BERTUGAS:
 * - Login user (verifikasi username & password ke FakeStore API)
 * - Menyimpan data user yang login ke dalam COOKIE
 * - Mengambil data user dari cookie (cek apakah sudah login)
 * - Logout (hapus cookie)
 */

import { cookies } from "next/headers";

import usersData from "@/data/users.json";
// usersData = salinan LOKAL data /users dari FakeStore API.
//
// KENAPA PAKAI DATA LOKAL UNTUK LOGIN?
// -------------------------------------
// Saat di-deploy ke Vercel, request ke fakestoreapi.com/auth/login
// SELALU gagal dengan HTTP 403 — Cloudflare (proteksi di depan
// fakestoreapi.com) memblokir IP server Vercel sebagai "bot".
// Ini terjadi di level jaringan, SEBELUM kode kita berjalan,
// jadi tidak bisa diperbaiki dengan retry/timeout apapun.
//
// SOLUSI: karena akun demo (johnd, mor_2314, dst) bersifat TETAP
// dan datanya PUBLIK (https://fakestoreapi.com/users), kita simpan
// salinannya di file data/users.json dan validasi login LANGSUNG
// dari situ — tanpa perlu memanggil fakestoreapi.com sama sekali.

// ============================================================
// TIPE DATA
// ============================================================

export type User = {
  id: number;
  username: string;
  email: string;
  password?: string;
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

// ============================================================
// FUNGSI 1: loginUser — Proses Login
// ============================================================
/**
 * loginUser — Validasi username & password ke data LOKAL (data/users.json)
 *
 * Tidak ada panggilan ke fakestoreapi.com sama sekali — menghindari
 * blokir Cloudflare (HTTP 403) yang terjadi saat Vercel mengakses
 * fakestoreapi.com.
 *
 * @param username - username yang diketik user
 * @param password - password yang diketik user
 */
export async function loginUser(username: string, password: string) {
  try {
    // ─── Cari user di data lokal yang username & password-nya cocok ───
    // .find() = cari elemen pertama yang memenuhi kondisi, atau undefined
    const userDetail = (usersData as User[]).find(
      (u) => u.username === username && u.password === password
    );

    // Jika tidak ditemukan → username atau password salah
    if (!userDetail) {
      return { success: false, error: "Username atau password salah" };
    }

    // Hapus password dari data sebelum disimpan ke cookie
    // (destructuring: ambil semua field KECUALI password)
    const { password: _pw, ...safeUser } = userDetail;

    // ─── Simpan ke cookie ───
    const cookieStore = await cookies();
    cookieStore.set("user_session", JSON.stringify(safeUser), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24 * 7, // 7 hari
    });

    return { success: true, data: safeUser };
  } catch (error) {
    console.error("Login error:", error);
    return { success: false, error: "Login gagal. Coba lagi." };
  }
}

// ============================================================
// FUNGSI 2: getCurrentUser — Cek User yang Sedang Login
// ============================================================
export async function getCurrentUser() {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("user_session");

    if (!session) {
      return { success: false, data: null };
    }

    const user: User = JSON.parse(session.value);
    return { success: true, data: user };
  } catch {
    return { success: false, data: null };
  }
}

// ============================================================
// FUNGSI 3: logoutUser — Proses Logout
// ============================================================
export async function logoutUser() {
  const cookieStore = await cookies();
  cookieStore.delete("user_session");
  return { success: true };
}
