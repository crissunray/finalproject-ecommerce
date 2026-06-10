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
// HELPER: fetch dengan retry otomatis (sama seperti products.ts)
// ============================================================
/**
 * fetchWithRetry — Coba fetch hingga 4 kali jika gagal
 * Menangani FakeStore API yang lambat "bangun" di Render.com free tier
 *
 * PERHITUNGAN WAKTU MAKSIMAL (harus < vercel.json maxDuration = 60s):
 *   4 percobaan x 12 detik timeout = 48 detik
 *   + jeda antar percobaan (1 + 2 + 3 detik)  = 6 detik
 *   ─────────────────────────────────────────────────
 *   Total maksimal                            = 54 detik (aman, < 60s)
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retries = 4
): Promise<Response> {
  let lastError: unknown;

  for (let i = 0; i < retries; i++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000); // 12 detik per percobaan

      const response = await fetch(url, {
        ...options,              // spread options yang dikirim (method, headers, body, dll)
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; FakeStore-NextJS/1.0)",
          "Accept": "application/json",
          ...(options.headers ?? {}), // gabungkan dengan headers dari options
        },
      });

      clearTimeout(timeout);

      if (response.ok) return response; // berhasil → langsung return

      // Jika 401 (unauthorized) = password salah, langsung berhenti — tidak perlu retry
      if (response.status === 401 || response.status === 400) {
        throw Object.assign(new Error("INVALID_CREDENTIALS"), { status: response.status });
      }

      console.warn(`[auth] Percobaan ${i + 1}/${retries} gagal: HTTP ${response.status}`);
      lastError = new Error(`HTTP ${response.status}`);
    } catch (err: any) {
      // Kalau error karena kredensial salah → lempar langsung, jangan retry
      if (err?.message === "INVALID_CREDENTIALS") throw err;

      console.warn(`[auth] Percobaan ${i + 1}/${retries} error:`, err);
      lastError = err;
    }

    // Jeda sebelum retry
    if (i < retries - 1) {
      await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
    }
  }

  throw lastError ?? new Error("Fetch gagal setelah semua percobaan");
}

// ============================================================
// FUNGSI 1: loginUser — Proses Login
// ============================================================
export async function loginUser(username: string, password: string) {
  try {
    // ─── LANGKAH 1: Validasi kredensial via FakeStore Auth API ───
    let authResponse: Response;

    try {
      authResponse = await fetchWithRetry(
        "https://fakestoreapi.com/auth/login",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
          cache: "no-store",
        }
      );
    } catch (err: any) {
      // Jika error karena kredensial salah (401/400)
      if (err?.message === "INVALID_CREDENTIALS") {
        return { success: false, error: "Username atau password salah" };
      }
      // Jika error karena timeout/network
      return { success: false, error: "Server sedang sibuk, coba lagi dalam beberapa detik" };
    }

    // Ambil token dari response
    const { token } = await authResponse.json();

    if (!token) {
      return { success: false, error: "Username atau password salah" };
    }

    // ─── LANGKAH 2: Decode JWT untuk ambil user ID ───
    const payloadBase64 = token.split(".")[1];
    const payload = JSON.parse(
      Buffer.from(payloadBase64, "base64").toString("utf-8")
    );
    const userId: number = payload.sub;

    // ─── LANGKAH 3: Ambil data lengkap user dari API ───
    let userResponse: Response;
    try {
      userResponse = await fetchWithRetry(
        `https://fakestoreapi.com/users/${userId}`,
        { cache: "no-store" }
      );
    } catch {
      return { success: false, error: "Gagal mengambil data user, coba lagi" };
    }

    const userDetail: User = await userResponse.json();

    // Hapus password dari data sebelum disimpan ke cookie
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
