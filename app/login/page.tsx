/**
 * ============================================================
 * FILE: app/login/page.tsx
 * JENIS: Client Component ("use client") — Halaman Login "/login"
 * ============================================================
 *
 * APA YANG DILAKUKAN HALAMAN INI?
 * ---------------------------------
 * Halaman login menampilkan form untuk masuk ke akun FakeStore.
 * Ada 2 cara input:
 * 1. Ketik username & password manual
 * 2. Klik salah satu dari 5 akun demo → username & password terisi otomatis
 *
 * KENAPA "use client"?
 * Karena halaman ini menggunakan:
 * - useState (untuk menyimpan nilai username, password)
 * - useAuth() (untuk akses fungsi login dari AuthContext)
 * - useRouter() (untuk redirect ke home setelah login)
 * - Event handler (onSubmit, onClick)
 *
 * ALUR LOGIN:
 * 1. User ketik username + password (atau klik akun demo)
 * 2. Klik tombol "Masuk" → handleSubmit dipanggil
 * 3. handleSubmit memanggil login() dari AuthContext
 * 4. login() memanggil loginUser() Server Action:
 *    a. POST ke /auth/login → dapat JWT token
 *    b. Decode JWT → dapat user ID
 *    c. GET /users/{id} → dapat data lengkap user
 *    d. Simpan ke cookie "user_session"
 * 5. Jika berhasil → login() return true → redirect ke "/"
 * 6. Jika gagal → error ditampilkan di form
 *
 * STATE YANG DIPAKAI:
 * - username, password: nilai input form (dikelola lokal di sini)
 * - isLoading, error: diambil dari AuthContext (dikelola di sana)
 */
"use client";

import { useState } from "react";
// useState = simpan nilai username dan password yang diketik user

import { useRouter } from "next/navigation";
// useRouter = untuk redirect ke halaman utama setelah login berhasil

import { useAuth } from "../contexts/AuthContext";
// useAuth() = akses login(), isLoading, error dari AuthContext

/**
 * DEMO_ACCOUNTS — Daftar akun yang bisa dipakai untuk login
 *
 * Ini adalah akun nyata dari FakeStore API (https://fakestoreapi.com/users)
 * Username dan password ini valid untuk autentikasi.
 */
const DEMO_ACCOUNTS = [
  { username: "johnd",     password: "m38rmF$"    },
  { username: "mor_2314",  password: "83r5^_"     },
  { username: "kevinryan", password: "kev02937@"  },
  { username: "donero",    password: "ewedon"     },
  { username: "derek",     password: "jklg*_56"   },
];

/**
 * LoginPage — Halaman form login dengan akun demo
 */
export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading, error } = useAuth();
  // login()    = fungsi login dari AuthContext
  // isLoading  = true saat proses login berlangsung (tampilkan spinner)
  // error      = string pesan error jika login gagal (null jika tidak ada)

  // State lokal untuk nilai form
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  // Nilai ini dikontrol oleh React (controlled inputs)
  // Setiap ketukan → setUsername/setPassword → re-render input

  /**
   * handleSubmit — Dipanggil saat form di-submit (klik "Masuk" atau tekan Enter)
   *
   * @param e - Event form submit (perlu preventDefault agar halaman tidak reload)
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Mencegah default behavior browser: submit form biasanya reload halaman.
    // Dengan preventDefault(), kita tangani sendiri dengan JavaScript.

    // Panggil login() dari AuthContext dengan username & password
    const success = await login(username, password);
    // login() return true jika berhasil, false jika gagal

    // Jika berhasil → redirect ke halaman utama
    if (success) router.push("/");
    // Jika gagal → login() sudah set error di AuthContext
    // → error akan ditampilkan di form (lihat di bawah: {error && ...})
  };

  return (
    // Layout: layar penuh, background abu terang, konten di tengah
    <div className="min-h-screen bg-[#f8f8f6] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* max-w-sm = lebar maksimal 384px (form tidak terlalu lebar) */}

        {/* ── HEADER ── */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">Masuk</h1>
          <p className="text-sm text-gray-500 mt-1">Masuk ke akun FakeStore Anda</p>
        </div>

        {/* ── FORM CARD ── */}
        <div className="bg-white border border-gray-100 rounded-2xl p-6 mb-4">

          {/* Pesan error — hanya tampil jika ada error */}
          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 text-sm p-3 rounded-lg mb-4">
              {error}
              {/* Contoh error: "Username atau password salah" */}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* space-y-4 = jarak vertikal 16px antar elemen form */}

            {/* ── INPUT USERNAME ── */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                // Setiap ketukan → setUsername → React update input
                placeholder="contoh: johnd"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:border-gray-400 transition-colors"
                required
                // required = validasi HTML — form tidak bisa submit jika kosong
                autoComplete="username"
                // autoComplete = hint ke browser untuk auto-fill
              />
            </div>

            {/* ── INPUT PASSWORD ── */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Password
              </label>
              <input
                type="password"
                // type="password" = karakter disembunyikan menjadi ••••
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:border-gray-400 transition-colors"
                required
                autoComplete="current-password"
              />
            </div>

            {/* ── TOMBOL MASUK ── */}
            <button
              type="submit"
              disabled={isLoading}
              // disabled saat proses login berlangsung (mencegah double submit)
              className="w-full bg-gray-900 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
            >
              {isLoading ? (
                // Loading state: spinner + teks "Memproses..."
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {/* Spinner: lingkaran dengan satu bagian penuh dan lainnya transparan */}
                  Memproses...
                </>
              ) : "Masuk"}
            </button>
          </form>
        </div>

        {/* ── DEMO ACCOUNTS CARD ── */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5">
          <p className="text-xs font-medium text-gray-500 mb-3 text-center uppercase tracking-wide">
            Akun Demo — Klik untuk isi otomatis
          </p>

          <div className="space-y-1.5">
            {/* Render satu tombol untuk setiap akun demo */}
            {DEMO_ACCOUNTS.map((acc) => (
              <button
                key={acc.username}
                type="button"
                // type="button" penting! Tanpa ini, browser anggap ini submit button
                onClick={() => {
                  setUsername(acc.username); // isi field username
                  setPassword(acc.password); // isi field password
                  // Setelah ini, user tinggal klik "Masuk"
                }}
                className={`w-full flex justify-between items-center px-3 py-2 rounded-lg border text-sm transition-all ${
                  username === acc.username
                    // Akun yang sedang dipilih: background hitam
                    ? "border-gray-900 bg-gray-900 text-white"
                    // Akun lain: border abu, hover lebih gelap
                    : "border-gray-100 text-gray-700 hover:border-gray-300"
                }`}
              >
                {/* Nama pengguna di kiri */}
                <span className="font-mono font-medium">{acc.username}</span>
                {/* Password di kanan */}
                <span className={`font-mono text-xs ${
                  username === acc.username ? "text-gray-300" : "text-gray-400"
                }`}>
                  {acc.password}
                </span>
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
