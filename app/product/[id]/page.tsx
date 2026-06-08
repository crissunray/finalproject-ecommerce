/**
 * ============================================================
 * FILE: app/product/[id]/page.tsx
 * JENIS: Server Component (async) — Halaman Detail Produk
 * ============================================================
 *
 * APA ITU [id] DI NAMA FOLDER?
 * -----------------------------
 * [id] = "dynamic segment" di Next.js.
 * Artinya: bagian URL ini bisa berisi nilai apapun.
 *
 * Contoh:
 *   /product/1   → params.id = "1"
 *   /product/15  → params.id = "15"
 *
 * APA YANG DITAMPILKAN?
 * ----------------------
 * Detail lengkap satu produk:
 * - Breadcrumb navigasi
 * - Gambar produk (besar)
 * - Kategori, nama, rating bintang, deskripsi
 * - Harga + Tombol "Tambah ke Keranjang"
 *
 * KENAPA SERVER COMPONENT?
 * Fetch data produk dilakukan di server → lebih cepat, SEO lebih baik.
 * Hanya AddToCartButton yang "use client" karena butuh interaktivitas.
 */

import { notFound } from "next/navigation";
// notFound() = tampilkan halaman 404 jika produk tidak ditemukan

import { getProductById } from "@/actions/products";
// Server action untuk fetch satu produk berdasarkan ID dari FakeStore API

import AddToCartButton from "../../components/AddToCartButton";
// Tombol "Tambah ke Keranjang" (Client Component terpisah)

import Link from "next/link";
// Link = navigasi client-side ke halaman lain

/**
 * PageProps — Tipe props halaman detail produk
 *
 * Di Next.js 16, params adalah Promise (harus di-await).
 */
type PageProps = {
  params: Promise<{ id: string }>;
  // id = segmen URL dinamis [id], selalu string
};

/**
 * ProductDetailPage — Halaman detail satu produk
 *
 * @param params - URL params yang berisi id produk
 */
export default async function ProductDetailPage({ params }: PageProps) {
  // Await params untuk mendapatkan id
  const { id } = await params;

  // Fetch data produk dari FakeStore API
  const result = await getProductById(id);

  // Jika produk tidak ditemukan → tampilkan halaman 404
  if (!result.success || !result.data) {
    notFound();
  }

  const product = result.data;
  // product = { id, title, price, description, category, image, rating }

  // Hitung jumlah bintang (bulatkan rating ke integer)
  const stars = Math.round(product.rating.rate);
  // Math.round(4.2) = 4 → tampilkan 4 bintang penuh
  // Math.round(3.7) = 4 → tampilkan 4 bintang penuh

  return (
    <div className="min-h-screen bg-[#f8f8f6]">
      <div className="max-w-6xl mx-auto px-6 py-10">

        {/* ── BREADCRUMB ──
            Navigasi konteks: Produk → Kategori → Nama Produk
            Membantu user mengetahui posisinya dan kembali ke halaman sebelumnya */}
        <nav className="flex items-center gap-2 text-sm text-gray-400 mb-8">
          <Link href="/" className="hover:text-gray-700 transition-colors">Produk</Link>
          <span>/</span>
          <span className="capitalize text-gray-500">{product.category}</span>
          <span>/</span>
          <span className="text-gray-700 truncate max-w-xs">{product.title}</span>
          {/* truncate max-w-xs = potong nama panjang dengan "..." */}
        </nav>

        {/* ── KARTU UTAMA ── */}
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
          {/* Grid 2 kolom di layar medium (md = 768px+) */}
          <div className="grid md:grid-cols-2">

            {/* ── KOLOM KIRI: GAMBAR ── */}
            <div className="bg-gray-50 flex items-center justify-center p-12 min-h-80">
              <img
                src={product.image}
                alt={product.title}
                className="max-h-72 object-contain"
                // max-h-72 = tinggi maksimal 288px
                // object-contain = gambar tidak terpotong, proporsional
              />
            </div>

            {/* ── KOLOM KANAN: INFO ── */}
            <div className="p-8 flex flex-col justify-between">
              <div>
                {/* Kategori */}
                <span className="text-xs text-gray-400 uppercase tracking-widest">
                  {product.category}
                </span>

                {/* Nama produk */}
                <h1 className="text-xl font-semibold text-gray-900 mt-2 mb-4 leading-snug">
                  {product.title}
                </h1>

                {/* ── RATING BINTANG ── */}
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex gap-0.5">
                    {/* Render 5 bintang — bintang ke-i penuh jika i < stars */}
                    {[...Array(5)].map((_, i) => (
                      <svg
                        key={i}
                        className={`w-4 h-4 ${i < stars ? "text-gray-900" : "text-gray-200"}`}
                        // i < stars → bintang penuh (gelap)
                        // i >= stars → bintang kosong (terang)
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <span className="text-sm text-gray-500">
                    {product.rating.rate} ({product.rating.count} ulasan)
                  </span>
                </div>

                {/* Deskripsi produk */}
                <p className="text-sm text-gray-500 leading-relaxed mb-6">
                  {product.description}
                </p>
              </div>

              <div>
                {/* Harga */}
                <div className="flex items-baseline gap-2 mb-6">
                  <span className="text-3xl font-semibold text-gray-900">${product.price}</span>
                </div>

                {/* Tombol Tambah ke Keranjang (Client Component) */}
                <AddToCartButton product={product} />

                <p className="text-xs text-gray-400 mt-4 text-center">
                  Gratis ongkir untuk pembelian di atas $100
                </p>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
