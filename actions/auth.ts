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
 *
 * APA ITU COOKIE?
 * ---------------
 * Cookie adalah data kecil yang disimpan di browser user.
 * Dipakai untuk "mengingat" bahwa user sudah login,
 * sehingga tidak perlu login ulang setiap buka halaman baru.
 *
 * Cookie kita pakai:
 * - "user_session" → menyimpan data user yang sedang login
 */

"use server";

// cookies() adalah fungsi dari Next.js untuk membaca/menulis cookie
import { cookies } from "next/headers";

// ============================================================
// TIPE DATA
// ============================================================

/**
 * User — Bentuk data satu user dari FakeStore API
 */
export type User = {
  id: number;        // ID unik user
  username: string;  // nama login
  email: string;     // alamat email
  password?: string; // password (tanda ? = opsional, kadang tidak ada)
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
 * Memvalidasi username & password, lalu menyimpan sesi login ke cookie.
 *
 * ALUR KERJA (3 langkah):
 * 1. POST ke /auth/login → FakeStore API cek kredensial, balik JWT token
 * 2. Decode token JWT → dapat user ID
 * 3. GET /users/{id} → ambil data lengkap user, simpan ke cookie
 *
 * APA ITU JWT?
 * ------------
 * JWT (JSON Web Token) = string terenkripsi berisi informasi user.
 * Bentuknya: xxxxx.yyyyy.zzzzz (3 bagian dipisah titik)
 * Bagian tengah (yyyyy) bisa di-decode untuk dapat data seperti user ID.
 *
 * @param username - nama login user
 * @param password - password user
 * @returns { success: true, data: User } atau { success: false, error: string }
 */
export async function loginUser(username: string, password: string) {
  try {
    // ─── LANGKAH 1: Validasi kredensial via FakeStore Auth API ───
    const authResponse = await fetch("https://fakestoreapi.com/auth/login", {
      method: "POST",  // POST = kirim data ke server
      headers: {
        "Content-Type": "application/json", // beritahu server bahwa kita kirim JSON
      },
      body: JSON.stringify({ username, password }), // ubah objek JS ke string JSON
      cache: "no-store", // jangan cache — request login harus selalu fresh
    });

    // Kalau API mengembalikan error (400/401) berarti kredensial salah
    if (!authResponse.ok) {
      return { success: false, error: "Username atau password salah" };
    }

    // Ambil token dari response
    // Bentuk response: { "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." }
    const { token } = await authResponse.json();

    if (!token) {
      return { success: false, error: "Username atau password salah" };
    }

    // ─── LANGKAH 2: Decode JWT untuk ambil user ID ───
    // JWT terdiri dari 3 bagian: header.payload.signature
    // Kita ambil bagian tengah (index 1) yaitu payload
    const payloadBase64 = token.split(".")[1];

    // Decode dari Base64 ke JSON string, lalu parse ke objek
    const payload = JSON.parse(
      Buffer.from(payloadBase64, "base64").toString("utf-8")
    );
    // Contoh isi payload: { sub: 1, user: "johnd", iat: 1234567890 }
    const userId: number = payload.sub; // "sub" = subject = user ID

    // ─── LANGKAH 3: Ambil data lengkap user dari API ───
    const userResponse = await fetch(
      `https://fakestoreapi.com/users/${userId}`,
      { cache: "no-store" }
    );

    if (!userResponse.ok) {
      return { success: false, error: "Gagal mengambil data user" };
    }

    const userDetail: User = await userResponse.json();

    // Hapus password dari data sebelum disimpan ke cookie (keamanan!)
    // Destructuring: pisahkan password dari sisa data
    const { password: _pw, ...safeUser } = userDetail;
    // safeUser = semua field KECUALI password

    // ─── Simpan ke cookie ───
    const cookieStore = await cookies();
    cookieStore.set("user_session", JSON.stringify(safeUser), {
      httpOnly: true,  // cookie tidak bisa diakses lewat JavaScript browser (aman dari XSS)
      secure: process.env.NODE_ENV === "production", // HTTPS only di production
      sameSite: "strict", // cookie hanya dikirim ke domain yang sama (aman dari CSRF)
      maxAge: 60 * 60 * 24 * 7, // durasi: 7 hari (dalam detik)
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
/**
 * Membaca cookie "user_session" untuk mendapatkan data user aktif.
 * Dipanggil setiap kali app dimuat untuk mengecek status login.
 *
 * KAPAN DIPANGGIL?
 * ----------------
 * Di AuthContext.tsx → useEffect saat pertama kali app dibuka.
 * Ini membuat navbar langsung menampilkan nama user tanpa login ulang.
 *
 * @returns { success: true, data: User } jika sudah login
 * @returns { success: false, data: null } jika belum login
 */
export async function getCurrentUser() {
  try {
    const cookieStore = await cookies();
    // Coba ambil cookie bernama "user_session"
    const session = cookieStore.get("user_session");

    // Kalau cookie tidak ada → user belum login
    if (!session) {
      return { success: false, data: null };
    }

    // Parse JSON string dari cookie kembali ke objek JavaScript
    const user: User = JSON.parse(session.value);
    return { success: true, data: user };
  } catch {
    // Cookie rusak/tidak valid
    return { success: false, data: null };
  }
}

// ============================================================
// FUNGSI 3: logoutUser — Proses Logout
// ============================================================
/**
 * Menghapus cookie sesi login, efektif "melupakan" user.
 *
 * Setelah fungsi ini dipanggil:
 * - Cookie "user_session" terhapus
 * - Halaman yang butuh login akan redirect ke /login
 */
export async function logoutUser() {
  const cookieStore = await cookies();
  cookieStore.delete("user_session"); // hapus cookie
  return { success: true };
}
