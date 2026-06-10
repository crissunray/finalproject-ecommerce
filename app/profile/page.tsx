/**
 * ============================================================
 * FILE: app/profile/page.tsx
 * JENIS: Client Component ("use client") — Halaman Profil "/profile"
 * ============================================================
 *
 * APA YANG DILAKUKAN HALAMAN INI?
 * ---------------------------------
 * Halaman akun user dengan 3 tab yang bisa diklik:
 *
 * TAB 1 - Profil:
 *   Data user: avatar (inisial), username, email, nama lengkap,
 *   nomor telepon, alamat, kota & kode pos
 *   (Diambil dari cookie session yang menyimpan data FakeStore API)
 *
 * TAB 2 - Pesanan:
 *   Riwayat order setelah checkout (disimpan di cookie "user_orders")
 *   Setiap order: Order ID, tanggal, status badge, thumbnail produk,
 *   jumlah item, metode bayar, total harga
 *
 * TAB 3 - Pengaturan:
 *   Toggle notifikasi email
 *   Dropdown pilih bahasa
 *   Dropdown pilih mata uang
 *   Tombol keluar dari akun
 *
 * PROTEKSI:
 * Jika belum login → otomatis redirect ke /login
 *
 * STATE YANG DIPAKAI:
 * - tab          : tab yang sedang aktif ("profile" | "orders" | "settings")
 * - orders       : daftar pesanan dari cookie (dimuat saat tab "orders" aktif)
 * - ordersLoading: true saat mengambil data pesanan
 * - isLoggingOut : true saat proses logout berlangsung
 *
 * PERBAIKAN TERBARU:
 * useEffect untuk memuat pesanan kini hanya berjalan saat tab
 * "Pesanan" aktif DAN user sudah login. Sebelumnya request selalu
 * dipanggil di setiap perubahan tab — sekarang sudah dioptimalkan.
 */
"use client";

import { useAuth } from "../contexts/AuthContext";
// useAuth() = user, isLoading, logout

import { useRouter } from "next/navigation";
// useRouter = redirect ke /login jika belum login

import { useEffect, useState } from "react";
// useEffect = proteksi halaman + muat data pesanan
// useState  = simpan tab aktif, orders, loading states

import Link from "next/link";
// Link = navigasi ke halaman lain

import { getUserOrders } from "@/actions/checkout";
// Server action: ambil riwayat pesanan dari cookie "user_orders"

import type { Order } from "@/actions/checkout";
// Impor tipe Order saja (tidak ada kode runtime)

/**
 * Tab — Tipe untuk tab yang bisa dipilih
 * Union type: hanya boleh salah satu dari 3 nilai
 */
type Tab = "profile" | "orders" | "settings";

/**
 * ProfilePage — Halaman profil user dengan 3 tab
 */
export default function ProfilePage() {
  const { user, isLoading, logout } = useAuth();
  // user      = data user yang login
  // isLoading = true saat masih cek cookie
  // logout    = fungsi untuk keluar

  const router = useRouter();

  // State tab yang aktif (default: tampilkan tab Profil)
  const [tab, setTab] = useState<Tab>("profile");

  // State daftar pesanan
  const [orders, setOrders] = useState<Order[]>([]);

  // State loading khusus untuk pesanan
  const [ordersLoading, setOrdersLoading] = useState(false);

  // State loading untuk tombol keluar
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  /**
   * useEffect 1 — Proteksi halaman: redirect jika belum login
   *
   * Dependency: [user, isLoading, router]
   */
  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [user, isLoading, router]);

  /**
   * useEffect 2 — Muat data pesanan
   *
   * PERBAIKAN (sebelumnya ada bug):
   * Dulu getUserOrders() dipanggil DULUAN sebelum cek
   * `if (tab === "orders" && user)`, sehingga request selalu
   * jalan di setiap perubahan tab/user — boros & loading state
   * tidak akurat.
   *
   * Sekarang: pengecekan kondisi dilakukan PALING AWAL.
   * Request ke server HANYA jalan saat tab "Pesanan" aktif
   * dan user sudah login.
   *
   * Dependency: [tab, user]
   */
  useEffect(() => {
    // ✅ Cek dulu: hanya jalan jika tab "orders" aktif & user sudah login
    if (tab === "orders" && user) {
      setOrdersLoading(true); // tampilkan spinner SEBELUM fetch dimulai

      getUserOrders().then((r) => {
        if (r.success) {
          // .slice().reverse() = buat salinan array lalu balik urutannya
          // (pesanan terbaru tampil di atas)
          setOrders((r.data as Order[]).slice().reverse());
        }
        setOrdersLoading(false); // sembunyikan spinner setelah selesai
      });
    }
  }, [tab, user]);

  /**
   * handleLogout — Proses logout dan redirect ke /login
   */
  const handleLogout = async () => {
    setIsLoggingOut(true);
    await logout();        // hapus cookie session
    router.push("/login"); // redirect ke halaman login
  };

  // ── LOADING STATE ──
  if (isLoading) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-[#f8f8f6]">
        <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin" />
      </div>
    );
  }

  // Jangan render jika belum login
  if (!user) return null;

  // ── KONFIGURASI STATUS PESANAN ──

  // Label status dalam bahasa Indonesia
  const statusLabel: Record<string, string> = {
    paid:      "Dibayar",
    shipped:   "Dikirim",
    delivered: "Selesai",
    pending:   "Menunggu",
  };
  // Record<string, string> = objek dengan key string dan value string

  // Warna badge sesuai status
  const statusColor: Record<string, string> = {
    paid:      "bg-green-50 text-green-700",
    shipped:   "bg-blue-50 text-blue-700",
    delivered: "bg-emerald-50 text-emerald-700",
    pending:   "bg-yellow-50 text-yellow-700",
  };

  // Definisi tab
  const TABS: { id: Tab; label: string }[] = [
    { id: "profile",  label: "Profil" },
    { id: "orders",   label: "Pesanan" },
    { id: "settings", label: "Pengaturan" },
  ];

  return (
    <div className="min-h-screen bg-[#f8f8f6]">
      <div className="max-w-4xl mx-auto px-6 py-10">

        {/* ── HEADER HALAMAN ── */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Akun Saya</h1>
            <p className="text-sm text-gray-400 mt-0.5">{user.email}</p>
          </div>
          {/* Tombol keluar di pojok kanan atas */}
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="text-sm text-gray-400 hover:text-gray-700 transition-colors underline underline-offset-2"
          >
            {isLoggingOut ? "Keluar..." : "Keluar"}
          </button>
        </div>

        {/* ── NAVIGASI TAB ── */}
        {/* Tampilan: tombol dalam kotak abu dengan background putih saat aktif */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit mb-6">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              // Klik tab → setTab → re-render dengan konten tab yang baru
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                tab === t.id
                  ? "bg-white text-gray-900 shadow-sm"  // tab aktif: putih + shadow
                  : "text-gray-500 hover:text-gray-700"  // tab lain: abu
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ════════════════════════════════════════
            TAB: PROFIL
            Tampil hanya saat tab === "profile"
            ════════════════════════════════════════ */}
        {tab === "profile" && (
          <div className="bg-white border border-gray-100 rounded-2xl p-6">

            {/* Avatar + info singkat */}
            <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100">
              {/* Avatar: lingkaran hitam dengan inisial username */}
              <div className="w-14 h-14 bg-gray-900 rounded-full flex items-center justify-center text-white text-xl font-semibold flex-shrink-0">
                {user.username?.charAt(0).toUpperCase()}
                {/* charAt(0) = karakter pertama, toUpperCase() = kapital */}
              </div>
              <div>
                <p className="font-semibold text-gray-900">{user.username}</p>
                <p className="text-sm text-gray-400">{user.email}</p>
              </div>
            </div>

            {/* Grid 2 kolom: data profil lengkap */}
            <div className="grid sm:grid-cols-2 gap-4">
              {/* Render field-field profil menggunakan .map() */}
              {[
                { label: "Username",     value: user.username },
                { label: "Email",        value: user.email },
                { label: "Nama Lengkap", value: user.name ? `${user.name.firstname} ${user.name.lastname}` : "-" },
                { label: "Nomor Telepon", value: user.phone || "-" },
                // || "-" = tampilkan "-" jika phone tidak ada
                { label: "Alamat",       value: user.address ? `${user.address.street} No. ${user.address.number}` : "-" },
                { label: "Kota",         value: user.address ? `${user.address.city}, ${user.address.zipcode}` : "-" },
              ].map((f) => (
                <div key={f.label}>
                  <p className="text-xs text-gray-400 mb-1">{f.label}</p>
                  <p className="text-sm text-gray-900 bg-gray-50 px-3 py-2.5 rounded-lg">{f.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════
            TAB: PESANAN
            Tampil hanya saat tab === "orders"
            ════════════════════════════════════════ */}
        {tab === "orders" && (
          <div className="bg-white border border-gray-100 rounded-2xl p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-5">Riwayat Pesanan</h2>

            {/* State: loading */}
            {ordersLoading ? (
              <div className="flex justify-center py-12">
                <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin" />
              </div>

            ) : orders.length === 0 ? (
              /* State: belum ada pesanan */
              <div className="text-center py-12">
                <p className="text-gray-400 text-sm mb-3">Belum ada pesanan.</p>
                <Link href="/" className="text-sm text-gray-900 underline underline-offset-2 hover:text-gray-600">
                  Mulai belanja
                </Link>
              </div>

            ) : (
              /* State: ada pesanan */
              <div className="space-y-3">
                {orders.map((order) => (
                  <div key={order.id} className="border border-gray-100 rounded-xl overflow-hidden">

                    {/* Header order: Order ID + tanggal + status badge */}
                    <div className="flex items-center justify-between px-4 py-3 bg-gray-50">
                      <div>
                        <p className="text-xs font-mono text-gray-600">#{order.id}</p>
                        {/* font-mono = font dengan lebar karakter sama (cocok untuk ID) */}
                        <p className="text-xs text-gray-400">
                          {new Date(order.date).toLocaleDateString("id-ID", {
                            day: "numeric", month: "long", year: "numeric"
                          })}
                          {/* Format tanggal Indonesia: "8 Juni 2026" */}
                        </p>
                      </div>
                      {/* Badge status */}
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                        statusColor[order.status] || "bg-gray-100 text-gray-600"
                        // Fallback ke warna abu jika status tidak dikenal
                      }`}>
                        {statusLabel[order.status] || order.status}
                      </span>
                    </div>

                    {/* Body order: thumbnail + ringkasan */}
                    <div className="px-4 py-3">
                      {/* Thumbnail produk (maksimal 5, sisanya "+N") */}
                      <div className="flex gap-2 mb-3">
                        {order.items.slice(0, 5).map((item, i) => (
                          <img key={i} src={item.image} alt=""
                            className="w-10 h-10 object-contain bg-gray-50 rounded-lg p-1 border border-gray-100" />
                        ))}
                        {/* Jika lebih dari 5 item, tampilkan "+N" */}
                        {order.items.length > 5 && (
                          <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-xs text-gray-400">
                            +{order.items.length - 5}
                          </div>
                        )}
                      </div>

                      {/* Jumlah item + metode bayar + total */}
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500 text-xs">
                          {/* Hitung total quantity semua item */}
                          {order.items.reduce((s, i) => s + i.quantity, 0)} item · via {order.paymentMethod.replace("_", " ")}
                          {/* .reduce() = akumulasi → jumlahkan semua qty */}
                          {/* .replace("_", " ") = "credit_card" → "credit card" */}
                        </span>
                        <span className="font-semibold text-gray-900">${order.total.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════
            TAB: PENGATURAN
            Tampil hanya saat tab === "settings"
            ════════════════════════════════════════ */}
        {tab === "settings" && (
          <div className="bg-white border border-gray-100 rounded-2xl p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-5">Pengaturan Akun</h2>

            {/* Daftar pengaturan dengan garis pemisah */}
            <div className="divide-y divide-gray-100">
              {[
                {
                  label: "Notifikasi Email",
                  desc: "Terima info pesanan dan promo",
                  ctrl: (
                    // Toggle switch custom menggunakan CSS Tailwind
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      {/* sr-only = hanya untuk screen reader (disembunyikan visual) */}
                      {/* peer = marker untuk sibling selector */}
                      <div className="w-10 h-5 bg-gray-200 rounded-full peer peer-checked:bg-gray-900 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5"></div>
                      {/* peer-checked:bg-gray-900 = background hitam saat checked */}
                      {/* peer-checked:after:translate-x-5 = geser tombol ke kanan saat checked */}
                    </label>
                  ),
                },
                {
                  label: "Bahasa",
                  desc: "Pilih bahasa tampilan",
                  ctrl: (
                    <select className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 text-gray-900 bg-white focus:outline-none focus:border-gray-400">
                      <option>Bahasa Indonesia</option>
                      <option>English</option>
                    </select>
                  ),
                },
                {
                  label: "Mata Uang",
                  desc: "Pilih format mata uang",
                  ctrl: (
                    <select className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 text-gray-900 bg-white focus:outline-none focus:border-gray-400">
                      <option>USD ($)</option>
                      <option>IDR (Rp)</option>
                    </select>
                  ),
                },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between py-4">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.label}</p>
                    <p className="text-xs text-gray-400">{item.desc}</p>
                  </div>
                  {/* Render kontrol sesuai tipe (toggle/select) */}
                  {item.ctrl}
                </div>
              ))}
            </div>

            {/* Tombol keluar di bagian bawah pengaturan */}
            <div className="mt-4 pt-4 border-t border-gray-100">
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="text-sm text-red-500 hover:text-red-700 transition-colors"
                // Warna merah untuk aksi destruktif (logout)
              >
                {isLoggingOut ? "Keluar..." : "Keluar dari akun"}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
