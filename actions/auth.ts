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
// Dipakai sebagai FALLBACK jika API live (fakestoreapi.com) gagal
// diakses — misalnya diblokir Cloudflare (HTTP 403) di server Vercel.

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
// HELPER: fetchLive — Coba fetch ke FakeStore API (timeout pendek)
// ============================================================
/**
 * fetchLive — Fetch dengan timeout pendek (8 detik), tanpa retry panjang
 *
 * Cloudflare bisa memblokir dengan HTTP 403 secara INSTAN (bukan
 * timeout), jadi tidak perlu retry berkali-kali — cukup 1x percobaan
 * dengan timeout pendek, lalu jika gagal, caller akan pakai data lokal.
 *
 * @returns Response jika berhasil (HTTP ok), atau null jika gagal
 */
async function fetchLive(url: string, options: RequestInit = {}): Promise<Response | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000); // 8 detik

    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      cache: "no-store",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; FakeStore-NextJS/1.0)",
        "Accept": "application/json",
        ...(options.headers ?? {}),
      },
    });

    clearTimeout(timeout);

    if (response.ok) return response;

    console.warn(`[fetchLive] gagal: HTTP ${response.status} - ${url}`);
    return null;
  } catch (err) {
    console.warn(`[fetchLive] error:`, err);
    return null;
  }
}

// ============================================================
// FUNGSI 1: loginUser — Proses Login
// ============================================================
/**
 * loginUser — Login via FakeStore API (live), fallback ke data lokal
 *
 * ALUR:
 * 1. Coba POST ke fakestoreapi.com/auth/login (live)
 *    → jika berhasil, ambil data user lengkap via GET /users/{id}
 * 2. Jika API live gagal (mis. diblokir Cloudflare HTTP 403, atau
 *    timeout), VALIDASI ULANG ke data lokal (data/users.json) —
 *    sehingga login tetap berhasil untuk akun-akun demo.
 *
 * @param username - username yang diketik user
 * @param password - password yang diketik user
 */
export async function loginUser(username: string, password: string) {
  try {
    // ─── LANGKAH 1: Coba login via API live ───
    const authResponse = await fetchLive("https://fakestoreapi.com/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    let safeUser: Omit<User, "password"> | null = null;

    if (authResponse) {
      const { token } = await authResponse.json();

      if (token) {
        // Decode JWT untuk ambil user ID
        const payloadBase64 = token.split(".")[1];
        const payload = JSON.parse(Buffer.from(payloadBase64, "base64").toString("utf-8"));
        const userId: number = payload.sub;

        // Ambil data lengkap user dari API live
        const userResponse = await fetchLive(`https://fakestoreapi.com/users/${userId}`);
        if (userResponse) {
          const userDetail: User = await userResponse.json();
          const { password: _pw, ...rest } = userDetail;
          safeUser = rest;
        }
      }
    }

    // ─── LANGKAH 2: FALLBACK ke data lokal jika API live gagal ───
    if (!safeUser) {
      console.warn("[loginUser] API live gagal/diblokir, validasi via data lokal");

      // .find() = cari elemen pertama yang memenuhi kondisi, atau undefined
      const userLocal = (usersData as User[]).find(
        (u) => u.username === username && u.password === password
      );

      if (!userLocal) {
        return { success: false, error: "Username atau password salah" };
      }

      const { password: _pw, ...rest } = userLocal;
      safeUser = rest;
    }

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
