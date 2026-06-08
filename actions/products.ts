"use server";

/**
 * ============================================================
 * FILE: actions/products.ts
 * JENIS: Server Action
 * ============================================================
 *
 * FILE INI BERTUGAS:
 * Mengambil data produk — via proxy internal (/api/products)
 * agar lebih andal di Vercel (retry otomatis, timeout lebih panjang).
 *
 * ARSITEKTUR FETCH:
 *   Server Action → /api/products (proxy) → fakestoreapi.com
 *
 * Kenapa pakai proxy?
 * FakeStore API berjalan di Render.com free tier yang bisa "tidur".
 * Proxy di /api/products sudah dilengkapi retry 3x + timeout 15 detik.
 */

// ============================================================
// TIPE DATA (TypeScript)
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
// Helper: URL dasar untuk proxy
// ============================================================
// Di server, harus pakai URL absolut — tidak bisa pakai "/" saja
// VERCEL_URL = domain otomatis dari Vercel (contoh: finalproject-ecommerce.vercel.app)
// Jika tidak ada (local dev) → pakai localhost:3000
function getBaseUrl(): string {
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}

// ============================================================
// FUNGSI 1: getProducts — Ambil SEMUA produk
// ============================================================
export async function getProducts(): Promise<ProductsResult> {
  try {
    const baseUrl = getBaseUrl();
    const response = await fetch(`${baseUrl}/api/products?type=all`, {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Status ${response.status}`);
    }

    const products: Product[] = await response.json();

    // Pastikan hasilnya array, bukan objek error
    if (!Array.isArray(products)) {
      throw new Error("Data tidak valid");
    }

    return { success: true, data: products };
  } catch (error) {
    console.error("getProducts error:", error);
    return { success: false, error: "Gagal memuat produk" };
  }
}

// ============================================================
// FUNGSI 2: getProductById — Ambil SATU produk berdasarkan ID
// ============================================================
export async function getProductById(id: string) {
  try {
    const baseUrl = getBaseUrl();
    const response = await fetch(`${baseUrl}/api/products?type=id&id=${id}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return { success: false, error: "Produk tidak ditemukan" };
    }

    const product: Product = await response.json();
    return { success: true, data: product };
  } catch (error) {
    console.error("getProductById error:", error);
    return { success: false, error: "Gagal memuat produk" };
  }
}

// ============================================================
// FUNGSI 3: getProductsByCategory — Ambil produk per KATEGORI
// ============================================================
export async function getProductsByCategory(category: string) {
  try {
    const baseUrl = getBaseUrl();
    const response = await fetch(
      `${baseUrl}/api/products?type=category&category=${encodeURIComponent(category)}`,
      { cache: "no-store" }
    );

    if (!response.ok) {
      throw new Error(`Status ${response.status}`);
    }

    const products: Product[] = await response.json();
    return { success: true, data: products };
  } catch (error) {
    console.error("getProductsByCategory error:", error);
    return { success: false, error: "Gagal memuat produk" };
  }
}

// ============================================================
// FUNGSI 4: getCategories — Ambil daftar semua kategori
// ============================================================
export async function getCategories(): Promise<CategoriesResult> {
  try {
    const baseUrl = getBaseUrl();
    const response = await fetch(`${baseUrl}/api/products?type=categories`, {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Status ${response.status}`);
    }

    const categories: string[] = await response.json();
    return { success: true, data: categories };
  } catch (error) {
    console.error("getCategories error:", error);
    return { success: false, error: "Gagal memuat kategori" };
  }
}
