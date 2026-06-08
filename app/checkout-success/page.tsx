/**
 * ============================================================
 * FILE: app/checkout-success/page.tsx
 * JENIS: Client Component ("use client") — Halaman Sukses Bayar
 * ============================================================
 *
 * APA YANG DILAKUKAN HALAMAN INI?
 * ---------------------------------
 * Menampilkan konfirmasi bahwa pesanan berhasil dibayar.
 * Halaman ini dibuka setelah user klik "Bayar Sekarang" di /checkout.
 *
 * DATA YANG DITERIMA (dari URL):
 * URL format: /checkout-success?orderId=ORD-xxx&total=99.99
 * - orderId = ID pesanan yang baru dibuat
 * - total   = grand total pembayaran
 *
 * FITUR:
 * 1. Ikon centang besar (✓) — konfirmasi visual sukses
 * 2. Kartu detail pesanan (Order ID, total, status, tanggal, estimasi)
 * 3. Progress bar pesanan (Dibuat → Diproses → Dikirim → Tiba)
 * 4. Tombol: "Lihat Pesanan Saya" dan "Kembali Belanja"
 * 5. Countdown 10 detik → auto redirect ke halaman utama
 *
 * KENAPA ADA DUA KOMPONEN?
 * -------------------------
 * useSearchParams() di Next.js 16 WAJIB dibungkus <Suspense>.
 * Tanpa Suspense → error saat build/render.
 *
 * Solusi: pisahkan komponen yang pakai useSearchParams ke dalam
 * komponen anak, lalu bungkus dengan <Suspense> di komponen luar:
 *
 *   CheckoutSuccessPage (wrapper)
 *     └─ <Suspense fallback={spinner}>
 *           └─ CheckoutSuccessContent (pakai useSearchParams)
 */
"use client";

import Link from "next/link";
import { useEffect, useState, Suspense } from "react";
// useEffect = setup countdown timer saat komponen muncul
// useState  = simpan nilai countdown (10 → 9 → ... → 0)
// Suspense  = wrapper wajib untuk useSearchParams

import { useRouter, useSearchParams } from "next/navigation";
// useRouter     = redirect ke "/" setelah 10 detik
// useSearchParams = baca parameter dari URL (?orderId=...&total=...)

// ============================================================
// KOMPONEN INTI: CheckoutSuccessContent
// ============================================================

/**
 * CheckoutSuccessContent — Konten halaman sukses bayar
 *
 * Dipisah dari CheckoutSuccessPage agar bisa dibungkus <Suspense>.
 */
function CheckoutSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // searchParams = objek untuk membaca parameter URL

  // State countdown: mulai dari 10, berkurang setiap detik
  const [countdown, setCountdown] = useState(10);

  // Baca data dari URL params
  const orderId = searchParams.get("orderId") || "-";
  // || "-" = fallback jika tidak ada parameter tersebut
  const total = searchParams.get("total") || "0.00";

  /**
   * useEffect — Setup countdown timer dan auto-redirect
   * Dependency: [router] — hanya dijalankan sekali saat komponen muncul
   */
  useEffect(() => {
    // Interval: kurangi countdown setiap 1 detik
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer); // hentikan saat countdown = 1
          return 0;
        }
        return prev - 1;
      });
    }, 1000); // 1000ms = 1 detik

    // Redirect ke home setelah 10 detik
    const redirect = setTimeout(() => router.push("/"), 10000);

    // Cleanup: bersihkan timer saat komponen unmount
    // Tanpa cleanup → timer terus berjalan di background → memory leak
    return () => {
      clearInterval(timer);
      clearTimeout(redirect);
    };
  }, [router]);

  return (
    <div className="min-h-screen bg-[#f8f8f6] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* ── IKON SUKSES ── */}
        {/* Lingkaran hitam dengan centang putih */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-gray-900 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>

        {/* ── TEKS KONFIRMASI ── */}
        <div className="text-center mb-8">
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Pembayaran Berhasil</h1>
          <p className="text-sm text-gray-500">
            Terima kasih telah berbelanja di FakeStore.
            Pesanan Anda sedang diproses.
          </p>
        </div>

        {/* ── KARTU DETAIL PESANAN ── */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 mb-4">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Detail Pesanan</p>
          <div className="space-y-2.5 text-sm">
            {[
              { label: "Order ID", value: `#${orderId}` },
              { label: "Total", value: `$${parseFloat(total).toFixed(2)}` },
              // parseFloat = konversi string ke angka float
              // toFixed(2) = tampilkan 2 desimal
              { label: "Status", value: "Dibayar" },
              {
                label: "Tanggal",
                value: new Date().toLocaleDateString("id-ID", {
                  day: "numeric", month: "long", year: "numeric"
                })
                // Contoh output: "8 Juni 2026"
              },
              { label: "Estimasi Tiba", value: "3–5 hari kerja" },
            ].map((row) => (
              <div key={row.label} className="flex justify-between">
                <span className="text-gray-400">{row.label}</span>
                <span className={`font-medium ${row.label === "Status" ? "text-green-600" : "text-gray-900"}`}>
                  {/* Status "Dibayar" ditampilkan hijau */}
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── PROGRESS BAR PESANAN ── */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 mb-6">
          <div className="flex items-center justify-between">
            {/* 4 tahap: Dibuat → Diproses → Dikirim → Tiba */}
            {["Dibuat", "Diproses", "Dikirim", "Tiba"].map((s, i) => (
              <div key={s} className="flex flex-col items-center gap-1.5 flex-1">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${
                  i === 0
                    ? "bg-gray-900 text-white"    // Tahap 1 sudah dilalui → hitam + centang
                    : "bg-gray-100 text-gray-400" // Tahap lain belum → abu
                }`}>
                  {i === 0 ? "✓" : i + 1}
                </div>
                <span className="text-xs text-gray-400 text-center leading-tight">{s}</span>
                {i < 3 && <div className="absolute" />}
              </div>
            ))}
          </div>
        </div>

        {/* ── TOMBOL NAVIGASI ── */}
        <div className="space-y-2">
          <Link href="/profile" className="block w-full bg-gray-900 text-white text-sm font-medium py-3 rounded-xl text-center hover:bg-gray-700 transition-colors">
            Lihat Pesanan Saya
          </Link>
          <Link href="/" className="block w-full border border-gray-200 text-gray-700 text-sm font-medium py-3 rounded-xl text-center hover:border-gray-400 transition-colors">
            Kembali Belanja
          </Link>
        </div>

        {/* Teks countdown */}
        <p className="text-xs text-gray-400 text-center mt-5">
          Otomatis ke beranda dalam {countdown} detik
        </p>

      </div>
    </div>
  );
}

// ============================================================
// KOMPONEN WRAPPER: CheckoutSuccessPage
// ============================================================

/**
 * CheckoutSuccessPage — Wrapper dengan Suspense
 *
 * Wajib membungkus CheckoutSuccessContent dengan <Suspense>
 * karena komponen itu menggunakan useSearchParams().
 *
 * Next.js 16 mengharuskan ini — tanpa Suspense akan error saat build.
 */
export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={
      // Tampilkan spinner sederhana saat konten masih loading
      <div className="min-h-screen flex justify-center items-center bg-[#f8f8f6]">
        <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin" />
      </div>
    }>
      <CheckoutSuccessContent />
    </Suspense>
  );
}
