/**
 * FILE: app/api/products/route.ts
 * JENIS: Next.js API Route (berjalan di server Vercel)
 *
 * KENAPA FILE INI ADA?
 * --------------------
 * FakeStore API kadang lambat merespons dari Vercel (perlu "dipanaskan").
 * File ini bertindak sebagai PROXY — perantara antara app dan FakeStore API.
 *
 * Dengan retry otomatis 3x dan timeout 15 detik,
 * kemungkinan berhasil jauh lebih tinggi.
 *
 * URL: /api/products?type=all|categories|id=1
 */

import { NextRequest, NextResponse } from "next/server";

// Fungsi fetch dengan retry otomatis
async function fetchWithRetry(url: string, retries = 3): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const controller = new AbortController();
      // Timeout 15 detik — cukup untuk "membangunkan" Render.com free tier
      const timeout = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(url, {
        signal: controller.signal,
        cache: "no-store",
        headers: {
          // Beberapa API memblokir request tanpa User-Agent
          "User-Agent": "Mozilla/5.0 (compatible; NextJS-App/1.0)",
          "Accept": "application/json",
        },
      });

      clearTimeout(timeout);

      if (response.ok) return response;
      // Jika response tidak OK, coba lagi
      console.warn(`Percobaan ${i + 1} gagal: status ${response.status}`);
    } catch (err) {
      console.warn(`Percobaan ${i + 1} error:`, err);
      // Tunggu sebentar sebelum retry (500ms, 1000ms, 1500ms)
      if (i < retries - 1) await new Promise(r => setTimeout(r, 500 * (i + 1)));
    }
  }
  throw new Error(`Gagal setelah ${retries} percobaan`);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "all";
  const id = searchParams.get("id");
  const category = searchParams.get("category");

  try {
    let url = "https://fakestoreapi.com/products";

    if (type === "categories") {
      url = "https://fakestoreapi.com/products/categories";
    } else if (type === "id" && id) {
      url = `https://fakestoreapi.com/products/${id}`;
    } else if (type === "category" && category) {
      url = `https://fakestoreapi.com/products/category/${encodeURIComponent(category)}`;
    }

    const response = await fetchWithRetry(url);
    const data = await response.json();

    return NextResponse.json(data, {
      headers: {
        // Cache di browser 5 menit, di CDN Vercel 1 jam
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=300",
      },
    });
  } catch (error) {
    console.error("Proxy API error:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data produk" },
      { status: 500 }
    );
  }
}
