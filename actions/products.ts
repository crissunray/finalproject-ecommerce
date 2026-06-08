/**
 * ============================================================
 * FILE: actions/products.ts
 * JENIS: Server Action
 * ============================================================
 *
 * APA ITU SERVER ACTION?
 * ----------------------
 * Server Action adalah fungsi yang HANYA berjalan di server (bukan di browser).
 * Ditandai dengan "use server" di baris pertama.
 *
 * Keuntungan:
 * - Lebih aman (API key, logika sensitif tidak terlihat di browser)
 * - Bisa langsung dipanggil dari komponen React seperti fungsi biasa
 *
 * FILE INI BERTUGAS:
 * - Mengambil data produk dari FakeStore API (https://fakestoreapi.com)
 * - Menyediakan 4 fungsi: getProducts, getProductById, getProductsByCategory, getCategories
 */

"use server";

// ============================================================
// TIPE DATA (TypeScript)
// ============================================================
// TypeScript mengharuskan kita mendefinisikan "bentuk" data.
// Ini seperti membuat formulir kosong — kita tahu kolom apa saja yang ada.

/**
 * SuccessResult<T> — Tipe data ketika fungsi BERHASIL
 * T adalah "generik" — bisa diisi tipe data apapun
 * Contoh: SuccessResult<Product[]> berarti sukses dan datanya array produk
 */
type SuccessResult<T> = {
  success: true; // selalu true kalau berhasil
  data: T;       // isi datanya (tipenya fleksibel tergantung T)
};

/**
 * ErrorResult — Tipe data ketika fungsi GAGAL
 */
type ErrorResult = {
  success: false; // selalu false kalau gagal
  error: string;  // pesan error untuk ditampilkan ke user
};

/**
 * Product — Bentuk data satu produk dari FakeStore API
 * Setiap produk punya id, title, price, dll.
 */
export type Product = {
  id: number;          // nomor unik produk (1, 2, 3, ...)
  title: string;       // nama produk
  price: number;       // harga (dalam USD)
  description: string; // deskripsi panjang produk
  category: string;    // kategori: "electronics", "jewelery", dll
  image: string;       // URL gambar produk
  rating: {
    rate: number;      // rata-rata rating (contoh: 4.5)
    count: number;     // jumlah orang yang memberi rating
  };
};

// Union type: hasil bisa SUKSES atau GAGAL
// Tanda | berarti "atau"
export type ProductsResult = SuccessResult<Product[]> | ErrorResult;
export type CategoriesResult = SuccessResult<string[]> | ErrorResult;

// ============================================================
// FUNGSI 1: getProducts — Ambil SEMUA produk
// ============================================================
/**
 * Mengambil semua produk dari FakeStore API.
 *
 * CARA KERJA:
 * 1. Kirim request HTTP GET ke https://fakestoreapi.com/products
 * 2. Kalau berhasil → kembalikan array produk
 * 3. Kalau gagal → kembalikan pesan error
 *
 * next: { revalidate: 3600 } = cache data selama 1 jam (3600 detik)
 * Artinya: tidak fetch ulang ke API setiap ada user baru,
 * tapi setiap 1 jam data diperbarui otomatis.
 *
 * @returns Promise<ProductsResult> — hasil bisa sukses atau error
 */
export async function getProducts(): Promise<ProductsResult> {
  try {
    // AbortController = mekanisme untuk membatalkan fetch jika terlalu lama
    // Penting di Vercel karena serverless function punya batas waktu
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000); // batalkan setelah 8 detik

    const response = await fetch("https://fakestoreapi.com/products", {
      signal: controller.signal, // hubungkan ke AbortController
      cache: "no-store",         // selalu ambil data terbaru (hindari cache stale di Vercel)
    });

    clearTimeout(timeout); // batalkan timer jika fetch selesai sebelum 8 detik

    // Cek apakah server API merespons dengan sukses (status 200-299)
    if (!response.ok) {
      throw new Error(`Gagal fetch produk: status ${response.status}`);
    }

    // .json() = ubah response teks menjadi objek JavaScript
    const products: Product[] = await response.json();

    return { success: true, data: products };
  } catch (error) {
    // Kalau ada error apapun (network mati, API down, timeout) tangkap di sini
    console.error("Error fetching products:", error);
    return { success: false, error: "Gagal memuat produk" };
  }
}

// ============================================================
// FUNGSI 2: getProductById — Ambil SATU produk berdasarkan ID
// ============================================================
/**
 * Mengambil detail satu produk berdasarkan ID-nya.
 * Digunakan di halaman /product/[id]
 *
 * @param id - ID produk dalam bentuk string (dari URL)
 *
 * CONTOH PENGGUNAAN:
 *   const result = await getProductById("1");
 *   // result.data = { id: 1, title: "Fjallraven...", price: 109.95, ... }
 */
export async function getProductById(id: string) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    // Template literal (backtick) untuk menyisipkan variabel ke dalam string
    const response = await fetch(`https://fakestoreapi.com/products/${id}`, {
      signal: controller.signal,
      cache: "no-store",
    });

    clearTimeout(timeout);

    if (!response.ok) {
      // Produk tidak ditemukan (404) atau error lain
      return { success: false, error: "Produk tidak ditemukan" };
    }

    const product: Product = await response.json();
    return { success: true, data: product };
  } catch (error) {
    console.error("Error fetching product:", error);
    return { success: false, error: "Gagal memuat produk" };
  }
}

// ============================================================
// FUNGSI 3: getProductsByCategory — Ambil produk per KATEGORI
// ============================================================
/**
 * Mengambil semua produk dalam satu kategori tertentu.
 *
 * @param category - nama kategori (contoh: "electronics", "jewelery")
 *
 * CONTOH PENGGUNAAN:
 *   const result = await getProductsByCategory("electronics");
 */
export async function getProductsByCategory(category: string) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(
      `https://fakestoreapi.com/products/category/${category}`,
      { signal: controller.signal, cache: "no-store" }
    );

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`Gagal fetch kategori: ${response.status}`);
    }

    const products: Product[] = await response.json();
    return { success: true, data: products };
  } catch (error) {
    console.error("Error fetching by category:", error);
    return { success: false, error: "Gagal memuat produk" };
  }
}

// ============================================================
// FUNGSI 4: getCategories — Ambil daftar semua kategori
// ============================================================
/**
 * Mengambil daftar nama kategori yang tersedia.
 * Digunakan untuk mengisi dropdown filter di halaman utama.
 *
 * revalidate: 86400 = cache 24 jam (kategori jarang berubah)
 *
 * CONTOH HASIL:
 *   ["electronics", "jewelery", "men's clothing", "women's clothing"]
 */
export async function getCategories(): Promise<CategoriesResult> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(
      "https://fakestoreapi.com/products/categories",
      { signal: controller.signal, cache: "no-store" }
    );

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`Gagal fetch kategori: ${response.status}`);
    }

    const categories: string[] = await response.json();
    return { success: true, data: categories };
  } catch (error) {
    console.error("Error fetching categories:", error);
    return { success: false, error: "Gagal memuat kategori" };
  }
}
