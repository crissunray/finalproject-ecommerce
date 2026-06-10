/**
 * ============================================================
 * FILE: actions/products.ts
 * JENIS: Utility async function (dipanggil dari Server Component)
 * ============================================================
 *
 * File ini menyediakan data produk untuk seluruh halaman.
 *
 * KENAPA PAKAI DATA LOKAL (data/products.json, data/categories.json)?
 * ----------------------------------------------------------------
 * Sebelumnya, file ini fetch langsung ke fakestoreapi.com.
 * Tapi saat di-deploy ke Vercel, SEMUA request ke fakestoreapi.com
 * gagal dengan HTTP 403 — karena Cloudflare (proteksi di depan
 * fakestoreapi.com) memblokir IP server Vercel sebagai "bot".
 * Ini terjadi di level jaringan SEBELUM kode kita berjalan,
 * jadi tidak bisa diperbaiki dengan retry/timeout/header apapun.
 *
 * SOLUSI: karena data produk FakeStore bersifat STATIS (tidak pernah
 * berubah), kita simpan salinannya di data/products.json dan
 * data/categories.json, lalu baca langsung dari situ.
 * Hasilnya: SELALU berhasil, SELALU cepat (tidak ada network call).
 */

import productsData from "@/data/products.json";
import categoriesData from "@/data/categories.json";

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

// Type-cast data JSON yang diimpor menjadi tipe yang sesuai
const PRODUCTS = productsData as Product[];
const CATEGORIES = categoriesData as string[];

// ============================================================
// FUNGSI 1: getProducts — Ambil SEMUA produk
// ============================================================
/**
 * getProducts — Mengembalikan seluruh daftar produk dari data lokal
 */
export async function getProducts(): Promise<ProductsResult> {
  try {
    return { success: true, data: PRODUCTS };
  } catch (error) {
    console.error("[getProducts] Error:", error);
    return { success: false, error: "Gagal memuat produk" };
  }
}

// ============================================================
// FUNGSI 2: getProductById — Ambil SATU produk berdasarkan ID
// ============================================================
/**
 * getProductById — Cari satu produk berdasarkan id
 *
 * @param id - id produk dalam bentuk string (dari URL params)
 */
export async function getProductById(id: string) {
  try {
    // Number(id) = ubah string "2" menjadi angka 2
    const product = PRODUCTS.find((p) => p.id === Number(id));

    if (!product) {
      return { success: false, error: "Produk tidak ditemukan" };
    }

    return { success: true, data: product };
  } catch (error) {
    console.error("[getProductById] Error:", error);
    return { success: false, error: "Produk tidak ditemukan" };
  }
}

// ============================================================
// FUNGSI 3: getProductsByCategory — Ambil produk per KATEGORI
// ============================================================
/**
 * getProductsByCategory — Filter produk berdasarkan kategori
 *
 * @param category - nama kategori, contoh: "electronics"
 */
export async function getProductsByCategory(category: string) {
  try {
    const products = PRODUCTS.filter((p) => p.category === category);
    return { success: true, data: products };
  } catch (error) {
    console.error("[getProductsByCategory] Error:", error);
    return { success: false, error: "Gagal memuat produk" };
  }
}

// ============================================================
// FUNGSI 4: getCategories — Ambil daftar semua kategori
// ============================================================
/**
 * getCategories — Mengembalikan daftar semua kategori dari data lokal
 */
export async function getCategories(): Promise<CategoriesResult> {
  try {
    return { success: true, data: CATEGORIES };
  } catch (error) {
    console.error("[getCategories] Error:", error);
    return { success: false, error: "Gagal memuat kategori" };
  }
}
