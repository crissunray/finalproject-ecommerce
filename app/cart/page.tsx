/**
 * ============================================================
 * FILE: app/cart/page.tsx
 * JENIS: Client Component ("use client") — Halaman Keranjang "/cart"
 * ============================================================
 *
 * APA YANG DILAKUKAN HALAMAN INI?
 * ---------------------------------
 * Menampilkan dan mengelola isi keranjang belanja user.
 *
 * TAMPILAN:
 * ┌──────────────────────────────┬─────────────────┐
 * │  [Gambar] Nama Produk  $harga│  Ringkasan      │
 * │           electronics   x   │  Subtotal: $...  │
 * │           qty: [−] 2 [+]    │  Ongkir:  $9.99  │
 * │           Subtotal: $harga  │  Pajak:   $...   │
 * │                             │  ─────────────── │
 * │  [Item 2]                   │  Total:   $...   │
 * │                             │                  │
 * │  Kosongkan keranjang        │  [Lanjut Bayar]  │
 * └──────────────────────────────┴─────────────────┘
 *
 * PROTEKSI HALAMAN:
 * Jika user belum login → otomatis redirect ke /login
 * Jika keranjang kosong → tampilkan pesan "Keranjang kosong"
 *
 * DATA YANG DIPAKAI:
 * - useAuth()  → user (untuk proteksi + filter cart per user)
 * - useCart()  → cart, total, updateQuantity, removeFromCart, clearCart
 *
 * PERHITUNGAN HARGA:
 * - Subtotal    = total dari CartContext (jumlah harga semua item)
 * - Ongkos kirim = $9.99 jika subtotal < $100, GRATIS jika >= $100
 * - Pajak       = 10% dari subtotal
 * - Grand Total = subtotal + ongkir + pajak
 *
 * KENAPA ADA FILTER cart.every(item => item.userId !== user.id)?
 * Karena cart di cookie bisa berisi item dari user lain (jika multi-user
 * di browser yang sama). Filter ini memastikan user hanya melihat
 * item miliknya sendiri. Jika semua item bukan miliknya → anggap kosong.
 */
"use client";

import Link from "next/link";
// Link = navigasi ke halaman lain tanpa reload

import { useCart } from "../contexts/CartContext";
// useCart() = cart, total, updateQuantity, removeFromCart, clearCart, isLoading

import { useAuth } from "../contexts/AuthContext";
// useAuth() = user, isLoading (untuk proteksi halaman)

import { useEffect } from "react";
// useEffect = jalankan efek samping (redirect jika belum login)

import { useRouter } from "next/navigation";
// useRouter = redirect programatik ke /login

/**
 * CartPage — Halaman keranjang belanja
 */
export default function CartPage() {
  const { user, isLoading: authLoading } = useAuth();
  // user        = data user login (null jika belum)
  // authLoading = true saat masih cek cookie sesi

  const { cart, total, isLoading: cartLoading, updateQuantity, removeFromCart, clearCart } = useCart();
  // cart           = array CartItem[] milik user aktif
  // total          = total harga semua item
  // cartLoading    = true saat cart masih loading dari server
  // updateQuantity = ubah jumlah item (qty+1 atau qty-1)
  // removeFromCart = hapus satu item dari keranjang
  // clearCart      = hapus semua item sekaligus

  const router = useRouter();

  // Log untuk debugging — bisa dilihat di DevTools browser (tab Console)
  console.log("cart di page", cart);

  /**
   * useEffect — Redirect ke login jika belum login
   * Dependency: [user, authLoading, router]
   * Jalankan setiap kali user atau authLoading berubah.
   */
  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
    // !authLoading = sudah selesai cek (bukan sedang loading)
    // !user = belum login
    // → redirect ke /login
  }, [user, authLoading, router]);

  // ── LOADING STATE ──
  // Tampilkan spinner saat auth atau cart masih loading
  if (authLoading || cartLoading) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-[#f8f8f6]">
        <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin" />
        {/* Spinner kecil di tengah layar */}
      </div>
    );
  }

  // Jika belum login → jangan render apapun (redirect sedang berjalan)
  if (!user) return null;

  // ── CEK KERANJANG KOSONG ──
  // cart.length === 0: tidak ada item sama sekali
  // cart.every(item => item.userId !== user.id): semua item bukan milik user ini
  if (cart.length === 0 || cart.every(item => item.userId !== user.id)) {
    return (
      <div className="min-h-screen bg-[#f8f8f6] flex flex-col items-center justify-center gap-4">
        <p className="text-gray-400 text-sm">Keranjang Anda masih kosong.</p>
        <Link
          href="/"
          className="text-sm text-gray-900 underline underline-offset-2 hover:text-gray-600 transition-colors"
        >
          Mulai belanja
        </Link>
      </div>
    );
  }

  // ── PERHITUNGAN BIAYA ──
  const shippingCost = total > 100 ? 0 : 9.99;
  // Gratis ongkir jika belanja lebih dari $100
  const tax = total * 0.1;
  // Pajak 10% dari subtotal
  const grandTotal = total + shippingCost + tax;
  // Grand total = subtotal + ongkir + pajak

  return (
    <div className="min-h-screen bg-[#f8f8f6]">
      <div className="max-w-6xl mx-auto px-6 py-10">

        {/* ── HEADER ── */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">Keranjang</h1>
          <span className="text-sm text-gray-400">{cart.length} item</span>
          {/* Tampilkan jumlah produk berbeda (bukan total quantity) */}
        </div>

        {/* Grid: 2/3 untuk daftar item, 1/3 untuk ringkasan */}
        <div className="grid lg:grid-cols-3 gap-8">

          {/* ── DAFTAR ITEM ── */}
          <div className="lg:col-span-2 space-y-3">
            {cart.map((item) => (
              <div key={item.id} className="bg-white border border-gray-100 rounded-xl p-4 flex gap-4">

                {/* Gambar item */}
                <div className="w-20 h-20 bg-gray-50 rounded-lg flex-shrink-0 flex items-center justify-center p-2">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-contain"
                  />
                </div>

                {/* Info item */}
                <div className="flex-1 min-w-0">
                  {/* min-w-0 mencegah text overflow di flex container */}
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">{item.category}</p>
                  <p className="text-sm font-medium text-gray-900 line-clamp-1 mb-1">{item.title}</p>
                  <p className="text-sm text-gray-700 font-semibold">${item.price}</p>
                </div>

                {/* Kontrol quantity + hapus */}
                <div className="flex flex-col items-end justify-between">

                  {/* Tombol X hapus item */}
                  <button
                    onClick={() => removeFromCart(item.id)}
                    // removeFromCart → server action hapus item dari cookie
                    // → refreshCart() → cart state update → UI re-render
                    className="text-gray-300 hover:text-gray-600 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>

                  {/* Kontrol jumlah: [−] angka [+] */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      // Kurangi qty 1. Jika qty menjadi 0 → server hapus item otomatis
                      className="w-7 h-7 flex items-center justify-center border border-gray-200 rounded-lg text-gray-600 hover:border-gray-400 transition-colors text-sm"
                    >
                      −
                    </button>

                    {/* Tampilkan quantity saat ini */}
                    <span className="w-6 text-center text-sm font-medium text-gray-900">
                      {item.quantity}
                    </span>

                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      // Tambah qty 1
                      className="w-7 h-7 flex items-center justify-center border border-gray-200 rounded-lg text-gray-600 hover:border-gray-400 transition-colors text-sm"
                    >
                      +
                    </button>
                  </div>

                  {/* Subtotal per item = harga × qty */}
                  <p className="text-sm font-semibold text-gray-900">
                    ${(item.price * item.quantity).toFixed(2)}
                    {/* toFixed(2) = 2 angka desimal, contoh: $29.90 */}
                  </p>
                </div>
              </div>
            ))}

            {/* Tombol kosongkan keranjang */}
            <button
              onClick={clearCart}
              // clearCart → server action hapus semua item dari cookie
              // → refreshCart() → cart = [] → cart badge = 0
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors underline underline-offset-2"
            >
              Kosongkan keranjang
            </button>
          </div>

          {/* ── RINGKASAN BELANJA ── */}
          <div className="lg:col-span-1">
            <div className="bg-white border border-gray-100 rounded-xl p-6 sticky top-20">
              {/* sticky top-20 = card ini menempel saat scroll ke bawah */}
              <h2 className="text-sm font-semibold text-gray-900 mb-4">Ringkasan</h2>

              <div className="space-y-2.5 text-sm mb-4">
                {/* Subtotal */}
                <div className="flex justify-between text-gray-500">
                  <span>Subtotal</span>
                  <span>${total.toFixed(2)}</span>
                </div>

                {/* Ongkos kirim */}
                <div className="flex justify-between text-gray-500">
                  <span>Ongkos Kirim</span>
                  <span>
                    {shippingCost === 0
                      ? <span className="text-green-600">Gratis</span>
                      : `$${shippingCost.toFixed(2)}`}
                  </span>
                </div>

                {/* Pajak 10% */}
                <div className="flex justify-between text-gray-500">
                  <span>Pajak (10%)</span>
                  <span>${tax.toFixed(2)}</span>
                </div>

                {/* Total */}
                <div className="border-t border-gray-100 pt-2.5 flex justify-between font-semibold text-gray-900">
                  <span>Total</span>
                  <span>${grandTotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Notif gratis ongkir — hanya tampil jika sudah gratis */}
              {shippingCost === 0 && (
                <p className="text-xs text-green-600 bg-green-50 px-3 py-2 rounded-lg mb-4">
                  Gratis ongkir untuk pembelian di atas $100
                </p>
              )}

              {/* Tombol lanjut ke checkout */}
              <Link
                href="/checkout"
                className="block w-full bg-gray-900 text-white text-sm font-medium py-3 rounded-xl text-center hover:bg-gray-700 transition-colors"
              >
                Lanjut ke Pembayaran
              </Link>

              {/* Link kembali belanja */}
              <Link
                href="/"
                className="block w-full text-center text-xs text-gray-400 hover:text-gray-600 transition-colors mt-3 underline underline-offset-2"
              >
                Lanjutkan belanja
              </Link>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
