/**
 * ============================================================
 * FILE: app/components/ProductCard.tsx
 * JENIS: Client Component ("use client")
 * ============================================================
 *
 * APA ITU PRODUCTCARD?
 * ---------------------
 * ProductCard adalah komponen kartu yang menampilkan SATU produk
 * di grid halaman utama. Halaman utama merender banyak kartu ini
 * dalam grid 2–4 kolom.
 *
 * TAMPILAN SATU KARTU:
 * ┌────────────────────────┐
 * │  [Gambar Produk]       │  ← klik → buka detail produk
 * ├────────────────────────┤
 * │  electronics           │  ← kategori (kecil, abu)
 * │  Nama Produk...        │  ← klik → buka detail produk
 * │  $299.99  [+ Keranjang]│  ← harga + tombol tambah keranjang
 * └────────────────────────┘
 *
 * PROPS YANG DITERIMA:
 * - product: { id, title, price, image, category }
 *   Data produk dikirim dari page.tsx (server component yang
 *   fetch dari FakeStore API)
 *
 * STATE LOKAL (useState):
 * - isAdding: boolean → true saat sedang proses tambah keranjang
 *   (tombol jadi disabled, teks "...")
 * - added: boolean → true selama 1.5 detik setelah berhasil tambah
 *   (tombol berubah jadi "Ditambahkan ✓" warna hitam)
 *
 * ALUR TAMBAH KERANJANG:
 * 1. User klik "+ Keranjang"
 * 2. Cek login → jika tidak login: alert + redirect ke /login
 * 3. setIsAdding(true) → tombol disabled, teks "..."
 * 4. addToCart(item) → server action update cookie
 * 5. setIsAdding(false), setAdded(true) → teks "Ditambahkan ✓"
 * 6. setTimeout 1.5 detik → setAdded(false) → tombol kembali normal
 *
 * PERBEDAAN DENGAN AddToCartButton.tsx:
 * - ProductCard = kartu di halaman LIST produk (ukuran kecil)
 * - AddToCartButton = tombol di halaman DETAIL produk (ukuran penuh)
 */
"use client";

import Link from "next/link";
// Link = navigasi client-side ke halaman lain (tidak reload)

import { useCart } from "../contexts/CartContext";
// useCart() → ambil fungsi addToCart

import { useAuth } from "../contexts/AuthContext";
// useAuth() → cek apakah user sudah login sebelum tambah keranjang

import { useState } from "react";
// useState = hook untuk menyimpan state lokal (isAdding, added)

import { useRouter } from "next/navigation";
// useRouter = navigasi programatik (redirect ke /login jika belum login)

/**
 * Product — Tipe data produk yang diterima sebagai prop
 *
 * Catatan: rating dan description tidak diperlukan di kartu
 * (hanya ditampilkan di halaman detail), jadi tidak ada di sini.
 */
type Product = {
  id: number;
  title: string;
  price: number;
  image: string;
  category: string;
};

/**
 * ProductCard — Menampilkan satu kartu produk di grid halaman utama
 *
 * @param product - Data produk: id, title, price, image, category
 */
export default function ProductCard({ product }: { product: Product }) {
  const { addToCart } = useCart();   // fungsi tambah keranjang dari CartContext
  const { user } = useAuth();        // data user yang login (null jika belum)
  const router = useRouter();        // untuk redirect ke /login

  // State untuk feedback visual tombol "+ Keranjang"
  const [isAdding, setIsAdding] = useState(false);
  // isAdding = true → tombol disabled + teks "..."
  // Mencegah user klik berkali-kali sebelum proses selesai

  const [added, setAdded] = useState(false);
  // added = true selama 1.5 detik → teks "Ditambahkan ✓"
  // Memberi feedback visual bahwa produk berhasil ditambahkan

  /**
   * handleAddToCart — Menangani klik tombol "+ Keranjang"
   *
   * Urutan langkah:
   * 1. Cek apakah user sudah login
   * 2. Tampilkan loading state
   * 3. Kirim item ke server (update cookie)
   * 4. Tampilkan sukses state, lalu reset
   */
  const handleAddToCart = async () => {
    // Langkah 1: Proteksi — harus login untuk bisa tambah keranjang
    if (!user) {
      alert("Silakan login terlebih dahulu");
      router.push("/login"); // redirect ke halaman login
      return;
    }

    // Langkah 2: Mulai proses → disable tombol
    setIsAdding(true);

    // Langkah 3: Kirim ke server melalui CartContext → server action
    await addToCart({
      id: product.id,
      userId: user.id,         // penting: tandai item milik siapa
      title: product.title,
      price: product.price,
      image: product.image,
      category: product.category,
      // quantity tidak perlu — server action otomatis set qty=1
      // (atau +1 jika produk sudah ada di keranjang)
    });

    // Langkah 4: Selesai → tampilkan feedback sukses
    setIsAdding(false);
    setAdded(true);

    // Setelah 1.5 detik, tombol kembali ke tampilan normal
    setTimeout(() => setAdded(false), 1500);
  };

  return (
    // group = Tailwind "group" agar class child bisa bereaksi saat hover parent
    // hover:border-gray-300 hover:shadow-sm = efek hover di seluruh kartu
    <div className="group bg-white border border-gray-100 rounded-xl overflow-hidden hover:border-gray-300 hover:shadow-sm transition-all duration-200">

      {/* ── GAMBAR PRODUK ── */}
      {/* Klik gambar → buka halaman detail produk */}
      <Link href={`/product/${product.id}`}>
        {/* Kotak gambar berukuran tetap (h-52) dengan background abu terang */}
        <div className="h-52 bg-gray-50 flex items-center justify-center p-6">
          <img
            src={product.image}
            alt={product.title}
            // object-contain = gambar tidak terpotong, proporsional
            // group-hover:scale-105 = zoom sedikit saat kartu di-hover
            className="h-full w-full object-contain group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      </Link>

      {/* ── INFORMASI PRODUK ── */}
      <div className="p-4">

        {/* Kategori — huruf kecil, abu, uppercase */}
        <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
          {product.category}
        </p>

        {/* Nama produk — klik buka detail */}
        <Link href={`/product/${product.id}`}>
          <h2 className="text-sm font-medium text-gray-900 leading-snug line-clamp-2 hover:text-gray-600 transition-colors mb-3">
            {product.title}
            {/* line-clamp-2 = potong teks setelah 2 baris (tambah "...")
                agar semua kartu tingginya sama meskipun nama berbeda-beda */}
          </h2>
        </Link>

        {/* ── HARGA + TOMBOL ── */}
        <div className="flex items-center justify-between">

          {/* Harga */}
          <span className="text-base font-semibold text-gray-900">
            ${product.price}
          </span>

          {/* Tombol + Keranjang */}
          <button
            onClick={handleAddToCart}
            disabled={isAdding}
            // disabled=true saat proses tambah berjalan (mencegah double-click)
            className={`text-xs px-3 py-1.5 rounded-lg border transition-all duration-150 font-medium ${
              added
                // State "Ditambahkan ✓": background hitam, teks putih
                ? "bg-gray-900 text-white border-gray-900"
                // State normal: background putih, hover jadi hitam
                : "bg-white text-gray-700 border-gray-200 hover:bg-gray-900 hover:text-white hover:border-gray-900"
            } disabled:opacity-50`}
            // disabled:opacity-50 = tombol terlihat redup saat disabled
          >
            {/* Teks tombol berubah sesuai state:
                isAdding=true  → "..."           (proses berlangsung)
                added=true     → "Ditambahkan ✓" (berhasil)
                default        → "+ Keranjang"   (normal) */}
            {isAdding ? "..." : added ? "Ditambahkan ✓" : "+ Keranjang"}
          </button>
        </div>
      </div>
    </div>
  );
}
