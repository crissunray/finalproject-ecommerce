/**
 * ============================================================
 * FILE: app/components/AddToCartButton.tsx
 * JENIS: Client Component ("use client")
 * ============================================================
 *
 * APA ITU ADDTOCARTBUTTON?
 * -------------------------
 * AddToCartButton adalah tombol "Tambah ke Keranjang" yang khusus
 * dipakai di halaman DETAIL produk (/product/[id]).
 *
 * PERBEDAAN DENGAN TOMBOL DI ProductCard.tsx:
 * ┌──────────────────┬────────────────────────────────┬──────────────────────────────────┐
 * │                  │ ProductCard.tsx                 │ AddToCartButton.tsx              │
 * ├──────────────────┼────────────────────────────────┼──────────────────────────────────┤
 * │ Dipakai di       │ Halaman list produk (/)         │ Halaman detail (/product/[id])   │
 * │ Ukuran           │ Kecil (px-3 py-1.5)            │ Penuh lebar (w-full py-3)        │
 * │ Teks saat proses │ "..."                           │ "Menambahkan..."                 │
 * │ Teks selesai     │ "Ditambahkan ✓"                 │ "✓ Ditambahkan ke Keranjang"     │
 * │ Timer reset      │ 1.5 detik                       │ 2 detik                          │
 * └──────────────────┴────────────────────────────────┴──────────────────────────────────┘
 *
 * PROPS YANG DITERIMA:
 * - product: { id, title, price, image, category }
 *   Dikirim dari halaman detail produk (app/product/[id]/page.tsx)
 *
 * ALUR KERJA:
 * 1. User klik "Tambah ke Keranjang"
 * 2. Cek login → belum login: alert + redirect /login
 * 3. isAdding=true → tombol disabled, teks "Menambahkan..."
 * 4. addToCart(item) → update cookie via server action
 * 5. isAdding=false, added=true → "✓ Ditambahkan ke Keranjang"
 * 6. Setelah 2 detik → added=false → tombol kembali normal
 */
"use client";

import { useState } from "react";
// useState = hook untuk menyimpan state lokal komponen

import { useCart } from "../contexts/CartContext";
// useCart() → fungsi addToCart untuk tambah ke keranjang

import { useAuth } from "../contexts/AuthContext";
// useAuth() → cek apakah user sudah login

import { useRouter } from "next/navigation";
// useRouter → redirect programatik ke halaman lain

/**
 * Product — Tipe data produk yang diterima sebagai prop
 * (sama dengan yang ada di ProductCard.tsx)
 */
type Product = {
  id: number;
  title: string;
  price: number;
  image: string;
  category: string;
};

/**
 * AddToCartButton — Tombol tambah keranjang di halaman detail produk
 *
 * @param product - Data produk yang akan ditambahkan ke keranjang
 */
export default function AddToCartButton({ product }: { product: Product }) {
  const { addToCart } = useCart(); // fungsi untuk tambah item ke keranjang
  const { user } = useAuth();       // cek status login
  const router = useRouter();       // untuk redirect ke login jika perlu

  // State untuk feedback visual tombol
  const [isAdding, setIsAdding] = useState(false);
  // isAdding = true saat proses addToCart sedang berlangsung
  // Mencegah klik ganda yang bisa menambahkan item dua kali

  const [added, setAdded] = useState(false);
  // added = true selama 2 detik setelah berhasil tambah
  // Memberi konfirmasi visual kepada user

  /**
   * handleAddToCart — Menangani klik tombol
   *
   * Langkah-langkah:
   * 1. Validasi login
   * 2. Set loading state
   * 3. Panggil server action melalui CartContext
   * 4. Set success state + reset setelah 2 detik
   */
  const handleAddToCart = async () => {
    // Langkah 1: Cek login
    if (!user) {
      alert("Silakan login terlebih dahulu");
      router.push("/login"); // bawa user ke halaman login
      return; // hentikan eksekusi fungsi
    }

    // Langkah 2: Tampilkan loading state
    setIsAdding(true);

    // Langkah 3: Tambahkan ke keranjang
    // addToCart dari CartContext → memanggil server action addToCartAction
    // → server baca cookie, tambah item, simpan kembali ke cookie
    // → refreshCart() dipanggil otomatis → Navbar badge +1
    await addToCart({
      id: product.id,
      userId: user.id,        // tandai item ini milik user yang login
      title: product.title,
      price: product.price,
      image: product.image,
      category: product.category,
      // quantity tidak perlu di sini — server action default-nya 1
      // (atau increment +1 jika item sudah ada)
    });

    // Langkah 4: Tampilkan sukses state
    setIsAdding(false);
    setAdded(true);

    // Reset ke tampilan normal setelah 2 detik
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <button
      onClick={handleAddToCart}
      disabled={isAdding}
      // disabled saat proses berlangsung — mencegah klik ganda
      className={`w-full py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
        added
          // State sukses: background abu terang, teks gelap (lebih "tenang")
          ? "bg-gray-100 text-gray-700 border border-gray-200"
          // State normal/loading: background hitam, teks putih
          : "bg-gray-900 text-white hover:bg-gray-700"
      } disabled:opacity-50`}
      // disabled:opacity-50 = tombol terlihat redup saat dinonaktifkan
    >
      {/*
        Teks berubah sesuai state:
        isAdding = true   → "Menambahkan..."         (proses berlangsung)
        added    = true   → "✓ Ditambahkan ke Keranjang" (berhasil)
        default          → "Tambah ke Keranjang"    (siap diklik)
      */}
      {isAdding ? "Menambahkan..." : added ? "✓ Ditambahkan ke Keranjang" : "Tambah ke Keranjang"}
    </button>
  );
}
