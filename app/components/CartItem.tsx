/**
 * ============================================================
 * FILE: app/components/CartItem.tsx
 * JENIS: Client Component ("use client") — Kartu Satu Item Keranjang
 * ============================================================
 *
 * APA YANG DITAMPILKAN?
 * -----------------------
 * Satu baris/kartu untuk SATU produk di keranjang, berisi:
 * - Gambar produk (klik → ke halaman detail produk)
 * - Nama, kategori, harga satuan
 * - Kontrol jumlah: tombol [-] [angka] [+]
 * - Subtotal (harga × jumlah)
 * - Tombol "Hapus" (dengan ikon 🗑️)
 *
 * KENAPA "use client"?
 * Karena komponen ini:
 * - Pakai useState (untuk status loading saat update/hapus)
 * - Punya event handler (onClick tombol +/-/hapus)
 *
 * CATATAN PENTING — KOMPONEN INI BELUM DIPAKAI:
 * ----------------------------------------------
 * Saat ini halaman `/cart` (app/cart/page.tsx) menampilkan daftar
 * item keranjang dengan markup-nya SENDIRI (tidak meng-import
 * komponen ini). Jadi `CartItem.tsx` adalah komponen "siap pakai"
 * yang BELUM disambungkan — bisa dipakai nanti untuk merapikan
 * app/cart/page.tsx (mengganti blok `cart.map(...)` di sana
 * dengan `<CartItem item={item} ... />`).
 *
 * CARA PAKAI (jika ingin dipasang):
 *   import CartItem from "../components/CartItem";
 *   ...
 *   {cart.map((item) => (
 *     <CartItem
 *       key={item.id}
 *       item={item}
 *       onUpdateQuantity={(id, qty) => updateQuantity(id, qty)}
 *       onRemove={(id) => removeFromCart(id)}
 *     />
 *   ))}
 */
"use client";

import { useState } from "react";
// useState = simpan status "sedang update" / "sedang hapus"
// agar tombol bisa dinonaktifkan sementara dan menampilkan spinner

import Image from "next/image";
// Image diimpor tapi TIDAK dipakai di JSX (gambar pakai tag <img> biasa
// di bawah). Aman dihapus jika tidak diperlukan — disisakan agar tidak
// mengubah struktur impor yang sudah ada.

import Link from "next/link";
// Link = navigasi client-side ke halaman detail produk saat gambar/judul diklik

// ============================================================
// TIPE DATA
// ============================================================

/**
 * CartItemType — Bentuk data satu item keranjang yang diterima komponen ini.
 *
 * CATATAN: `userId` di sini bertipe `string`, sedangkan di
 * `CartContext.tsx` (CartItem) tipenya `number`. Jika komponen ini
 * dipakai langsung dengan data dari CartContext, sesuaikan tipe ini
 * menjadi `number` agar tidak ada error TypeScript.
 */
export type CartItemType = {
  id: number;        // ID produk
  userId: string;    // ID pemilik item (lihat catatan di atas)
  title: string;     // nama produk
  price: number;     // harga satuan
  image: string;     // URL gambar produk
  category: string;  // kategori produk
  quantity: number;  // jumlah yang dipesan
};

/**
 * CartItemProps — Props yang diterima komponen <CartItem />
 *
 * Pola "lifting state up": komponen ini TIDAK menyimpan data cart
 * sendiri — semua perubahan (ubah jumlah, hapus) dikirim ke ATAS
 * lewat callback (onUpdateQuantity, onRemove) yang disediakan oleh
 * komponen induk (misalnya app/cart/page.tsx).
 */
type CartItemProps = {
  item: CartItemType;
  // item     = data satu produk di keranjang (lihat CartItemType)

  onUpdateQuantity: (id: number, quantity: number) => void;
  // onUpdateQuantity = fungsi dari induk untuk mengubah jumlah item
  // dipanggil dengan (id produk, jumlah baru)

  onRemove: (id: number) => void;
  // onRemove = fungsi dari induk untuk menghapus item dari keranjang

  isLoading?: boolean;
  // isLoading = opsional — true jika induk sedang memuat ulang
  // seluruh keranjang (membuat kartu ini terlihat pudar/disabled)
};

/**
 * CartItem — Kartu satu item keranjang
 *
 * @param item             - data produk + jumlah
 * @param onUpdateQuantity - callback saat tombol +/- ditekan
 * @param onRemove         - callback saat tombol "Hapus" ditekan
 * @param isLoading        - status loading dari induk (default: false)
 */
export default function CartItem({
  item,
  onUpdateQuantity,
  onRemove,
  isLoading = false,
}: CartItemProps) {
  // ── STATE LOKAL ──
  // State ini HANYA untuk UI (spinner & disable tombol) saat proses
  // berjalan — data cart yang sebenarnya tetap dikelola oleh induk.
  const [isUpdating, setIsUpdating] = useState(false); // true saat ubah jumlah
  const [isDeleting, setIsDeleting] = useState(false); // true saat hapus item

  /**
   * handleQuantityChange — Dipanggil saat tombol [-] atau [+] ditekan
   *
   * @param newQuantity - jumlah baru yang diinginkan
   *
   * ALUR:
   * 1. Jika jumlah baru < 1 → batalkan (jumlah minimal 1, hapus
   *    item dilakukan lewat tombol "Hapus", bukan dengan qty 0)
   * 2. Jika sedang dalam proses update → batalkan (cegah klik ganda)
   * 3. Set isUpdating = true → tombol disable + spinner muncul
   * 4. Panggil onUpdateQuantity(id, jumlah baru) dari induk dan TUNGGU
   *    selesai (await) — induk biasanya memanggil server action lalu
   *    refresh data cart
   * 5. Set isUpdating = false → kembali normal
   */
  const handleQuantityChange = async (newQuantity: number) => {
    if (newQuantity < 1) return;
    if (isUpdating) return;

    setIsUpdating(true);
    await onUpdateQuantity(item.id, newQuantity);
    setIsUpdating(false);
  };

  /**
   * handleRemove — Dipanggil saat tombol "Hapus" ditekan
   *
   * Sama polanya dengan handleQuantityChange:
   * cegah klik ganda → set loading → panggil callback induk → selesai
   */
  const handleRemove = async () => {
    if (isDeleting) return;

    setIsDeleting(true);
    await onRemove(item.id);
    setIsDeleting(false);
  };

  // Subtotal = harga satuan × jumlah, contoh: $10 × 3 = $30
  const subtotal = item.price * item.quantity;

  return (
    // Container kartu:
    // - flex-col di layar kecil (mobile), flex-row di layar sm+ (desktop)
    // - opacity-50 (pudar) saat isLoading dari induk ATAU sedang
    //   update/hapus → memberi sinyal visual "sedang diproses"
    <div className={`flex flex-col sm:flex-row items-center gap-4 p-4 border-b border-gray-200 transition-all duration-300 ${isLoading || isUpdating || isDeleting ? "opacity-50" : "opacity-100"}`}>

      {/* ── GAMBAR PRODUK ──
          Klik gambar → pindah ke halaman detail produk /product/[id] */}
      <Link href={`/product/${item.id}`} className="flex-shrink-0">
        <div className="w-24 h-24 bg-gray-100 rounded-lg overflow-hidden hover:scale-105 transition-transform duration-200">
          <img
            src={item.image}
            alt={item.title}
            className="w-full h-full object-contain p-2"
            onError={(e) => {
              // Jika gambar gagal dimuat (link rusak/404) → ganti
              // dengan gambar placeholder, supaya tidak tampil ikon
              // "broken image" yang jelek
              (e.target as HTMLImageElement).src = "https://via.placeholder.com/100?text=No+Image";
            }}
          />
        </div>
      </Link>

      {/* ── INFO PRODUK ──
          Nama (bisa diklik), kategori, dan harga satuan */}
      <div className="flex-1 text-center sm:text-left">
        <Link href={`/product/${item.id}`}>
          <h3 className="font-semibold text-gray-800 hover:text-blue-600 transition line-clamp-1">
            {/* line-clamp-1 = potong jadi 1 baris dengan "..." jika kepanjangan */}
            {item.title}
          </h3>
        </Link>
        <p className="text-gray-500 text-sm capitalize mt-1">{item.category}</p>
        <p className="text-purple-600 font-bold mt-1">${item.price.toFixed(2)}</p>
        {/* toFixed(2) = selalu tampilkan 2 angka desimal, contoh: $19.99 */}
      </div>

      {/* ── KONTROL JUMLAH: [-] [angka] [+] ── */}
      <div className="flex items-center gap-3">

        {/* Tombol kurangi jumlah */}
        <button
          onClick={() => handleQuantityChange(item.quantity - 1)}
          // disabled jika: sedang update ATAU jumlah sudah 1 (tidak boleh 0)
          disabled={isUpdating || item.quantity <= 1}
          className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 transition flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Kurangi jumlah"
          // aria-label = teks untuk pembaca layar (accessibility),
          // karena tombol ini hanya berisi simbol "-"
        >
          -
        </button>

        {/* Angka jumlah + spinner kecil saat sedang update */}
        <div className="flex flex-col items-center">
          <span className="w-10 text-center font-medium">{item.quantity}</span>
          {isUpdating && (
            // Spinner kecil muncul di BAWAH angka selama proses update
            <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mt-1"></div>
          )}
        </div>

        {/* Tombol tambah jumlah */}
        <button
          onClick={() => handleQuantityChange(item.quantity + 1)}
          disabled={isUpdating}
          // Tidak ada batas atas — bisa terus ditambah
          className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 transition flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Tambah jumlah"
        >
          +
        </button>
      </div>

      {/* ── SUBTOTAL & TOMBOL HAPUS ── */}
      <div className="flex flex-col items-end gap-2 min-w-[100px]">
        {/* Subtotal = harga × jumlah */}
        <p className="font-bold text-gray-800">
          ${subtotal.toFixed(2)}
        </p>

        {/* Tombol hapus item — teks berubah jadi "Menghapus..." + spinner
            saat proses berjalan */}
        <button
          onClick={handleRemove}
          disabled={isDeleting}
          className="text-red-500 hover:text-red-700 transition text-sm flex items-center gap-1 disabled:opacity-50"
          aria-label="Hapus item"
        >
          {isDeleting ? (
            <>
              <div className="w-3 h-3 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
              <span>Menghapus...</span>
            </>
          ) : (
            <>
              🗑️
              <span>Hapus</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
