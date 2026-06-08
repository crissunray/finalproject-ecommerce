/**
 * ============================================================
 * FILE: actions/checkout.ts
 * JENIS: Server Action
 * ============================================================
 *
 * FILE INI BERTUGAS:
 * - Memproses pesanan (checkout) setelah user mengisi form pembayaran
 * - Menyimpan riwayat pesanan ke cookie "user_orders"
 * - Menyediakan fungsi untuk membaca riwayat pesanan
 *
 * ALUR CHECKOUT:
 * 1. User isi form (nama, alamat, metode bayar)
 * 2. Klik "Bayar Sekarang"
 * 3. processCheckout() dipanggil
 * 4. Data order dibuat dan disimpan ke cookie
 * 5. Keranjang dikosongkan
 * 6. User diarahkan ke halaman sukses
 */

"use server";

import { cookies } from "next/headers";
import { getCart, clearCart } from "./cart";
import { getCurrentUser } from "./auth";

// ============================================================
// TIPE DATA
// ============================================================

/**
 * Order — Bentuk data satu pesanan yang telah dibuat
 */
export type Order = {
  id: number;    // ID unik pesanan (dibuat dari timestamp: Date.now())
  date: string;  // tanggal pesanan dibuat (format ISO: "2024-01-15T10:30:00Z")
  items: any[];  // daftar produk yang dipesan (any[] karena dari CartItem)
  total: number; // total harga yang dibayar
  customer: {    // informasi pengiriman yang diisi user
    name: string;
    email: string;
    address: string;
    city: string;
    postalCode: string;
  };
  paymentMethod: string; // metode bayar: "credit_card", "bank_transfer", dll
  status: "pending" | "paid" | "shipped" | "delivered";
  // status hanya bisa salah satu dari 4 nilai di atas (union type)
};

// ============================================================
// FUNGSI 1: processCheckout — Proses Pesanan
// ============================================================
/**
 * Memproses checkout: buat order baru, simpan ke cookie, kosongkan keranjang.
 *
 * PARAMETER FormData:
 * FormData adalah cara standar HTML mengirim data form.
 * Kita bisa ambil nilainya dengan formData.get("namaField")
 *
 * MENGAPA PAKAI FormData (bukan objek biasa)?
 * Next.js Server Actions mendukung FormData secara native,
 * yang membuatnya lebih mudah diintegrasikan dengan elemen <form>.
 *
 * @param formData - Data dari form checkout (nama, email, alamat, dll)
 */
export async function processCheckout(formData: FormData) {
  try {
    // ─── Langkah 1: Pastikan user sudah login ───
    const userResult = await getCurrentUser();
    if (!userResult.success || !userResult.data) {
      return { success: false, error: "User belum login" };
    }

    // ─── Langkah 2: Ambil isi keranjang ───
    const cartResult = await getCart();
    if (!cartResult.success || cartResult.data.length === 0) {
      return { success: false, error: "Keranjang kosong" };
    }

    // ─── Langkah 3: Hitung total harga ───
    // reduce() menjumlahkan price × quantity untuk setiap item
    const total = cartResult.data.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    // ─── Langkah 4: Ambil riwayat order yang sudah ada ───
    const ordersCookie = await cookies();
    const existingOrders = ordersCookie.get("user_orders");

    // Parse JSON atau mulai dari array kosong kalau belum ada
    let orders: Order[] = existingOrders
      ? JSON.parse(existingOrders.value)
      : [];

    // ─── Langkah 5: Buat objek order baru ───
    const newOrder: Order = {
      id: Date.now(), // timestamp sebagai ID unik (contoh: 1703123456789)
      date: new Date().toISOString(), // format: "2024-01-15T10:30:00.000Z"
      items: cartResult.data,
      total: total,
      customer: {
        // formData.get() ambil nilai input berdasarkan name attribute
        // "as string" = TypeScript cast: beritahu compiler ini pasti string
        name: formData.get("name") as string,
        email: formData.get("email") as string,
        address: formData.get("address") as string,
        city: formData.get("city") as string,
        postalCode: formData.get("postalCode") as string,
      },
      paymentMethod: formData.get("paymentMethod") as string,
      status: "paid", // langsung "paid" karena ini simulasi
    };

    // ─── Langkah 6: Simpan order ke array dan update cookie ───
    orders.push(newOrder); // tambahkan order baru ke daftar
    ordersCookie.set("user_orders", JSON.stringify(orders), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24 * 365, // simpan 1 tahun
    });

    // ─── Langkah 7: Kosongkan keranjang ───
    await clearCart();

    // Log untuk debug (bisa dihapus di production)
    console.log(`Order ${newOrder.id} berhasil dibuat`);

    return { success: true, data: newOrder };
  } catch (error) {
    console.error("Checkout error:", error);
    return { success: false, error: "Checkout gagal" };
  }
}

// ============================================================
// FUNGSI 2: getUserOrders — Ambil Riwayat Pesanan
// ============================================================
/**
 * Membaca semua pesanan yang tersimpan di cookie "user_orders".
 * Ditampilkan di halaman Profile → tab "Pesanan Saya".
 *
 * CATATAN:
 * Saat ini semua order dari semua user tersimpan bersama.
 * Di aplikasi nyata, order disimpan per user di database.
 */
export async function getUserOrders() {
  try {
    const ordersCookie = await cookies();
    const orders = ordersCookie.get("user_orders");

    return {
      success: true,
      // Kalau cookie belum ada → kembalikan array kosong
      data: orders ? JSON.parse(orders.value) : [],
    };
  } catch (error) {
    console.error("Get orders error:", error);
    return { success: false, error: "Gagal memuat pesanan" };
  }
}
