/**
 * ============================================================
 * FILE: actions/products.ts
 * JENIS: Utility async function (dipanggil dari Server Component)
 * ============================================================
 *
 * File ini mengambil data produk dari FakeStore API (live),
 * dengan FALLBACK ke data lokal (data/products.json,
 * data/categories.json) jika API gagal diakses.
 *
 * KENAPA PERLU FALLBACK?
 * ----------------------------------------------------------------
 * Saat di-deploy ke Vercel, request ke fakestoreapi.com KADANG
 * gagal dengan HTTP 403 — Cloudflare (proteksi di depan
 * fakestoreapi.com) mendeteksi IP server Vercel sebagai "bot"
 * dan memblokirnya. Ini terjadi di level jaringan, di luar
 * kendali kode kita.
 *
 * SOLUSI: tetap COBA panggil API terlebih dahulu (live data,
 * selalu paling update). Jika gagal (403/timeout/network error),
 * otomatis pakai salinan data lokal sebagai cadangan — sehingga
 * halaman tetap bisa tampil meski API sedang diblokir/lambat.
 */

import productsDataLocal from "@/data/products.json";
import categoriesDataLocal from "@/data/categories.json";

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

// Data lokal (fallback) — type-cast ke tipe yang sesuai
const PRODUCTS_LOCAL = productsDataLocal as Product[];
const CATEGORIES_LOCAL = categoriesDataLocal as string[];

// ============================================================
// HELPER: fetchLive — Coba ambil data dari FakeStore API
// ============================================================
/**
 * fetchLive — Fetch ke FakeStore API dengan timeout pendek
 *
 * Karena Cloudflare bisa memblokir dengan HTTP 403 secara INSTAN
 * (bukan timeout), kita tidak perlu retry banyak kali — cukup
 * 2 percobaan dengan timeout pendek (8 detik), lalu menyerah dan
 * pakai data lokal. Ini menjaga halaman tetap cepat dimuat.
 *
 * @param url     - URL endpoint FakeStore API
 * @param retries - jumlah percobaan maksimal (default: 2)
 * @returns Response jika berhasil, atau null jika semua percobaan gagal
 */
async function fetchLive(url: string, retries = 2): Promise<Response | null> {
  for (let i = 0; i < retries; i++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000); // 8 detik

      const response = await fetch(url, {
        signal: controller.signal,
        cache: "no-store",
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; FakeStore-NextJS/1.0)",
          "Accept": "application/json",
          "Accept-Language": "en-US,en;q=0.9",
        },
      });

      clearTimeout(timeout);

      if (response.ok) return response; // berhasil → langsung return

      console.warn(`[fetchLive] Percobaan ${i + 1}/${retries} gagal: HTTP ${response.status} - ${url}`);
    } catch (err) {
      console.warn(`[fetchLive] Percobaan ${i + 1}/${retries} error:`, err);
    }

    // Jeda singkat sebelum retry terakhir
    if (i < retries - 1) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  // Semua percobaan gagal → kembalikan null (caller akan pakai data lokal)
  return null;
}

// ============================================================
// FUNGSI 1: getProducts — Ambil SEMUA produk
// ============================================================
/**
 * getProducts — Coba ambil dari API live, fallback ke data lokal
 */
export async function getProducts(): Promise<ProductsResult> {
  try {
    const response = await fetchLive("https://fakestoreapi.com/products");

    if (response) {
      const products: Product[] = await response.json();
      if (Array.isArray(products) && products.length > 0) {
        return { success: true, data: products };
      }
    }

    // ── FALLBACK: API gagal/diblokir → pakai data lokal ──
    console.warn("[getProducts] API live gagal, menggunakan data lokal");
    return { success: true, data: PRODUCTS_LOCAL };
  } catch (error) {
    console.error("[getProducts] Error:", error);
    // Tetap coba kembalikan data lokal sebagai pilihan terakhir
    return { success: true, data: PRODUCTS_LOCAL };
  }
}

// ============================================================
// FUNGSI 2: getProductById — Ambil SATU produk berdasarkan ID
// ============================================================
/**
 * getProductById — Coba ambil dari API live, fallback ke data lokal
 *
 * @param id - id produk dalam bentuk string (dari URL params)
 */
export async function getProductById(id: string) {
  try {
    const response = await fetchLive(`https://fakestoreapi.com/products/${id}`);

    if (response) {
      const product: Product = await response.json();
      // FakeStore API mengembalikan `{}` (objek kosong) untuk ID tidak valid
      if (product && product.id) {
        return { success: true, data: product };
      }
    }

    // ── FALLBACK: cari di data lokal ──
    const productLocal = PRODUCTS_LOCAL.find((p) => p.id === Number(id));
    if (productLocal) {
      console.warn(`[getProductById] API live gagal, menggunakan data lokal untuk id=${id}`);
      return { success: true, data: productLocal };
    }

    // Tidak ditemukan baik di API maupun data lokal
    return { success: false, error: "Produk tidak ditemukan" };
  } catch (error) {
    console.error("[getProductById] Error:", error);

    // Fallback terakhir: cek data lokal
    const productLocal = PRODUCTS_LOCAL.find((p) => p.id === Number(id));
    if (productLocal) return { success: true, data: productLocal };

    return { success: false, error: "Produk tidak ditemukan" };
  }
}

// ============================================================
// FUNGSI 3: getProductsByCategory — Ambil produk per KATEGORI
// ============================================================
/**
 * getProductsByCategory — Coba ambil dari API live, fallback ke data lokal
 *
 * @param category - nama kategori, contoh: "electronics"
 */
export async function getProductsByCategory(category: string) {
  try {
    const response = await fetchLive(
      `https://fakestoreapi.com/products/category/${encodeURIComponent(category)}`
    );

    if (response) {
      const products: Product[] = await response.json();
      if (Array.isArray(products)) {
        return { success: true, data: products };
      }
    }

    // ── FALLBACK: filter dari data lokal ──
    console.warn(`[getProductsByCategory] API live gagal, menggunakan data lokal untuk category=${category}`);
    const productsLocal = PRODUCTS_LOCAL.filter((p) => p.category === category);
    return { success: true, data: productsLocal };
  } catch (error) {
    console.error("[getProductsByCategory] Error:", error);
    const productsLocal = PRODUCTS_LOCAL.filter((p) => p.category === category);
    return { success: true, data: productsLocal };
  }
}

// ============================================================
// FUNGSI 4: getCategories — Ambil daftar semua kategori
// ============================================================
/**
 * getCategories — Coba ambil dari API live, fallback ke data lokal
 */
export async function getCategories(): Promise<CategoriesResult> {
  try {
    const response = await fetchLive("https://fakestoreapi.com/products/categories");

    if (response) {
      const categories: string[] = await response.json();
      if (Array.isArray(categories) && categories.length > 0) {
        return { success: true, data: categories };
      }
    }

    // ── FALLBACK: data lokal ──
    console.warn("[getCategories] API live gagal, menggunakan data lokal");
    return { success: true, data: CATEGORIES_LOCAL };
  } catch (error) {
    console.error("[getCategories] Error:", error);
    return { success: true, data: CATEGORIES_LOCAL };
  }
}
