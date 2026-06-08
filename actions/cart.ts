/**
 * ============================================================
 * FILE: actions/cart.ts
 * JENIS: Server Action
 * ============================================================
 *
 * FILE INI BERTUGAS:
 * Mengelola keranjang belanja yang disimpan di COOKIE browser.
 *
 * MENGAPA DISIMPAN DI COOKIE (bukan database)?
 * --------------------------------------------
 * Ini adalah simulasi/demo. Di aplikasi nyata, keranjang biasanya
 * disimpan di database. Tapi untuk belajar, cookie sudah cukup karena:
 * - Tidak butuh setup database
 * - Data tetap ada walau browser ditutup (maxAge 30 hari)
 *
 * STRUKTUR COOKIE:
 * "user_cart" → berisi JSON array dari CartItem[]
 * Contoh: [{"id":1,"title":"Produk A","price":10,"quantity":2}, ...]
 */

// app/actions/cart.ts
"use server";

import { cookies } from "next/headers";

// ============================================================
// TIPE DATA
// ============================================================

/**
 * CartItem — Bentuk data satu item di keranjang belanja
 */
export type CartItem = {
  id: number;       // ID produk (sama dengan ID di FakeStore API)
  userId: number;   // ID user pemilik keranjang (agar cart tiap user terpisah)
  title: string;    // nama produk
  price: number;    // harga satuan
  image: string;    // URL gambar
  category: string; // kategori produk
  quantity: number; // jumlah yang dipesan
};

// ============================================================
// FUNGSI HELPER INTERNAL (tidak diekspor ke luar)
// ============================================================

/**
 * getCurrentUserId — Ambil ID user yang sedang login dari cookie sesi
 *
 * Dipakai untuk memfilter cart agar hanya menampilkan
 * item milik user yang sedang login.
 *
 * @returns user ID (number) atau null jika belum login
 */
async function getCurrentUserId(): Promise<number | null> {
  const cookieStore = await cookies();
  const session = cookieStore.get("user_session");
  if (!session) return null;
  try {
    const user = JSON.parse(session.value);
    return user.id ?? null; // ?? = "jika null/undefined, gunakan null"
  } catch {
    return null;
  }
}

/**
 * getCartFromCookie — Baca SEMUA data keranjang dari cookie
 *
 * Mengembalikan semua item dari semua user yang pernah login
 * di browser ini. Pemfilteran per user dilakukan di fungsi lain.
 */
async function getCartFromCookie(): Promise<CartItem[]> {
  const cookieStore = await cookies();
  const cartCookie = cookieStore.get("user_cart");

  // Cookie belum ada = keranjang kosong
  if (!cartCookie) {
    return [];
  }

  try {
    return JSON.parse(cartCookie.value);
  } catch {
    // Cookie rusak → kembalikan array kosong
    return [];
  }
}

/**
 * saveCartToCookie — Simpan data keranjang ke cookie
 *
 * @param cart - Array item yang akan disimpan
 */
async function saveCartToCookie(cart: CartItem[]) {
  const cookieStore = await cookies();

  console.log("cart nich",cart); // debug log — bisa dihapus setelah yakin berjalan

  cookieStore.set("user_cart", JSON.stringify(cart), {
    httpOnly: true,   // tidak bisa diakses lewat JavaScript di browser (keamanan)
    secure: process.env.NODE_ENV === "production", // HTTPS only di production
    sameSite: "strict",
    maxAge: 60 * 60 * 24 * 30, // 30 hari
  });
}

// ============================================================
// FUNGSI PUBLIK (diekspor — bisa dipanggil dari luar file)
// ============================================================

/**
 * getCart — Ambil keranjang milik user yang sedang login
 *
 * PENTING: Filter item berdasarkan userId!
 * Jika banyak user pakai browser yang sama, cart mereka tidak tercampur.
 *
 * Promise.all() = jalankan dua async fungsi BERSAMAAN (lebih cepat)
 */
export async function getCart() {
  // Jalankan keduanya paralel, tunggu keduanya selesai
  const [cart, userId] = await Promise.all([
    getCartFromCookie(),
    getCurrentUserId(),
  ]);

  // Filter: hanya ambil item yang userId-nya cocok dengan user aktif
  const data = userId ? cart.filter((item) => item.userId === userId) : [];
  return { success: true, data };
}

/**
 * addToCart — Tambah produk ke keranjang
 *
 * LOGIKA:
 * - Produk sudah ada → quantity +1
 * - Produk baru → push ke array dengan quantity: 1
 *
 * Omit<CartItem, "quantity"> = tipe CartItem TANPA field "quantity"
 * (quantity diset otomatis ke 1 saat pertama ditambahkan)
 */
export async function addToCart(item: Omit<CartItem, "quantity">) {
  const cart = await getCartFromCookie();
  console.log("cart nich",cart); // debug log

  // findIndex = cari posisi item, kembalikan -1 jika tidak ditemukan
  const existingIndex = cart.findIndex((i) => i.id === item.id);

  if (existingIndex !== -1) {
    // Produk sudah ada: tambah 1
    cart[existingIndex].quantity += 1;
  } else {
    // Produk baru: tambahkan dengan quantity awal = 1
    // Spread operator: salin semua field dari item, lalu tambah quantity
    cart.push({ ...item, quantity: 1 });
  }

  await saveCartToCookie(cart);
  return { success: true, data: cart };
}

/**
 * removeFromCart — Hapus satu produk dari keranjang
 *
 * filter() = buat array baru yang HANYA berisi item dengan id BERBEDA
 * Efek: item dengan id yang cocok "tidak ikut" ke array baru → terhapus
 */
export async function removeFromCart(productId: number) {
  const cart = await getCartFromCookie();
  const filteredCart = cart.filter((item) => item.id !== productId);
  await saveCartToCookie(filteredCart);
  return { success: true, data: filteredCart };
}

/**
 * updateCartQuantity — Ubah jumlah item tertentu di keranjang
 *
 * Jika quantity baru <= 0 → hapus produk dari keranjang.
 * Ini terjadi ketika user tekan "-" sampai quantity = 0.
 *
 * map() = buat array baru dengan mengubah item tertentu.
 * Item yang id-nya cocok diubah quantitynya, yang lain dibiarkan.
 */
export async function updateCartQuantity(productId: number, quantity: number) {
  const cart = await getCartFromCookie();

  if (quantity <= 0) {
    // Quantity habis → hapus dari keranjang
    return removeFromCart(productId);
  }

  const updatedCart = cart.map((item) =>
    item.id === productId
      ? { ...item, quantity } // salin semua field, timpa quantity dengan yang baru
      : item                 // item lain tidak diubah
  );

  await saveCartToCookie(updatedCart);
  return { success: true, data: updatedCart };
}

/**
 * clearCart — Kosongkan seluruh keranjang
 *
 * Dipanggil setelah checkout berhasil.
 * Menyimpan array kosong [] menggantikan isi keranjang sebelumnya.
 */
export async function clearCart() {
  await saveCartToCookie([]);
  return { success: true };
}

/**
 * getCartTotal — Hitung total harga keranjang user aktif
 *
 * reduce() bekerja seperti ini:
 * - Mulai dari nilai 0
 * - Untuk setiap item: tambahkan (harga × quantity) ke total
 * - Kembalikan hasil akhir
 *
 * Contoh: [{ price:10, qty:2 }, { price:5, qty:3 }]
 * Total = (10×2) + (5×3) = 20 + 15 = 35
 */
export async function getCartTotal() {
  const [cart, userId] = await Promise.all([
    getCartFromCookie(),
    getCurrentUserId(),
  ]);
  const userCart = userId ? cart.filter((item) => item.userId === userId) : [];
  const total = userCart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  return { success: true, data: total };
}

/**
 * getCartCount — Hitung total jumlah item (quantity) di keranjang
 *
 * Ini menghitung TOTAL QUANTITY, bukan jumlah jenis produk.
 * Contoh: { produk A qty 2, produk B qty 3 } → count = 5
 *
 * Angka ini muncul sebagai badge merah di ikon keranjang Navbar.
 */
export async function getCartCount() {
  const [cart, userId] = await Promise.all([
    getCartFromCookie(),
    getCurrentUserId(),
  ]);
  const userCart = userId ? cart.filter((item) => item.userId === userId) : [];
  const count = userCart.reduce((sum, item) => sum + item.quantity, 0);
  return { success: true, data: count };
}
