/**
 * ============================================================
 * FILE: actions/products.ts
 * JENIS: Utility async function (dipanggil dari Server Component)
 * ============================================================
 *
 * File ini mengambil data produk dari FakeStore API.
 * Dilengkapi retry otomatis 3x + timeout 15 detik
 * agar andal di Vercel.
 */

// ============================================================
// TIPE DATA
// ============================================================

type SuccessResult<T> = {
  success: true;
  data: T;
};

type ErrorResult = {
  success: false;
  error: string;
};

export type Product = {
  id: number;
  title: string;
  price: number;
  description: string;
  category: string;
  image: string;
  rating: {
    rate: number;
    count: number;
  };
};

export type ProductsResult = SuccessResult<Product[]> | ErrorResult;
export type CategoriesResult = SuccessResult<string[]> | ErrorResult;

// ============================================================
// HELPER: fetch dengan retry otomatis
// ============================================================
/**
 * fetchWithRetry — Fetch URL dengan retry otomatis jika gagal
 *
 * FakeStore API berjalan di Render.com free tier yang bisa "tidur".
 * Request pertama butuh 10-20 detik untuk bangun.
 * Fungsi ini otomatis coba lagi hingga 4 kali.
 *
 * PERHITUNGAN WAKTU MAKSIMAL (harus < vercel.json maxDuration = 60s):
 *   4 percobaan x 12 detik timeout = 48 detik
 *   + jeda antar percobaan (1 + 2 + 3 detik)  = 6 detik
 *   ─────────────────────────────────────────────────
 *   Total maksimal                            = 54 detik (aman, < 60s)
 *
 * @param url     - URL yang akan di-fetch
 * @param retries - jumlah percobaan maksimal (default: 4)
 */
async function fetchWithRetry(url: string, retries = 4): Promise<Response> {
  let lastError: unknown;

  for (let i = 0; i < retries; i++) {
    try {
      // Buat controller baru setiap percobaan
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000); // 12 detik per percobaan

      const response = await fetch(url, {
        signal: controller.signal,
        cache: "no-store",
        headers: {
          // Beberapa server memblokir request tanpa User-Agent
          "User-Agent": "Mozilla/5.0 (compatible; FakeStore-NextJS/1.0)",
          "Accept": "application/json",
          "Accept-Language": "en-US,en;q=0.9",
        },
      });

      clearTimeout(timeout);

      if (response.ok) return response; // berhasil → langsung return

      console.warn(`[fetchWithRetry] Percobaan ${i + 1}/${retries} gagal: HTTP ${response.status} - ${url}`);
      lastError = new Error(`HTTP ${response.status}`);
    } catch (err) {
      console.warn(`[fetchWithRetry] Percobaan ${i + 1}/${retries} error:`, err);
      lastError = err;
    }

    // Tunggu sebelum retry: 1 detik, 2 detik, 3 detik
    if (i < retries - 1) {
      await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
    }
  }

  throw lastError ?? new Error("Fetch gagal setelah semua percobaan");
}

// ============================================================
// FUNGSI 1: getProducts — Ambil SEMUA produk
// ============================================================
export async function getProducts(): Promise<ProductsResult> {
  try {
    const response = await fetchWithRetry("https://fakestoreapi.com/products");
    const products: Product[] = await response.json();

    if (!Array.isArray(products)) {
      throw new Error("Format data tidak valid");
    }

    return { success: true, data: products };
  } catch (error) {
    console.error("[getProducts] Error:", error);
    return { success: false, error: "Gagal memuat produk" };
  }
}

// ============================================================
// FUNGSI 2: getProductById — Ambil SATU produk berdasarkan ID
// ============================================================
export async function getProductById(id: string) {
  try {
    const response = await fetchWithRetry(
      `https://fakestoreapi.com/products/${id}`
    );
    const product: Product = await response.json();
    return { success: true, data: product };
  } catch (error) {
    console.error("[getProductById] Error:", error);
    return { success: false, error: "Produk tidak ditemukan" };
  }
}

// ============================================================
// FUNGSI 3: getProductsByCategory — Ambil produk per KATEGORI
// ============================================================
export async function getProductsByCategory(category: string) {
  try {
    const response = await fetchWithRetry(
      `https://fakestoreapi.com/products/category/${encodeURIComponent(category)}`
    );
    const products: Product[] = await response.json();
    return { success: true, data: products };
  } catch (error) {
    console.error("[getProductsByCategory] Error:", error);
    return { success: false, error: "Gagal memuat produk" };
  }
}

// ============================================================
// FUNGSI 4: getCategories — Ambil daftar semua kategori
// ============================================================
export async function getCategories(): Promise<CategoriesResult> {
  try {
    const response = await fetchWithRetry(
      "https://fakestoreapi.com/products/categories"
    );
    const categories: string[] = await response.json();
    return { success: true, data: categories };
  } catch (error) {
    console.error("[getCategories] Error:", error);
    return { success: false, error: "Gagal memuat kategori" };
  }
}
