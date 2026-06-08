/**
 * ============================================================
 * FILE: app/contexts/CartContext.tsx
 * JENIS: React Context (Client Component)
 * ============================================================
 *
 * FILE INI BERTUGAS:
 * Menjadi "jembatan" antara tampilan (UI) dengan data keranjang
 * yang tersimpan di server (cookie).
 *
 * MASALAH YANG DIPECAHKAN:
 * -------------------------
 * Data keranjang disimpan di cookie SERVER (aman, persisten).
 * Tapi React butuh data di memori CLIENT untuk menampilkan UI.
 * CartContext menyinkronkan keduanya.
 *
 * ALUR DATA:
 *
 *   User klik "+ Keranjang"
 *        ↓
 *   addToCart() di CartContext
 *        ↓
 *   addToCartAction() → Server Action → update cookie
 *        ↓
 *   refreshCart() → ambil data terbaru dari server
 *        ↓
 *   setCart(), setTotal(), setCount() → update state React
 *        ↓
 *   Navbar badge angka & halaman cart otomatis update
 *
 * YANG DISEDIAKAN FILE INI:
 * - cart        → daftar item di keranjang
 * - total       → total harga
 * - count       → jumlah item (untuk badge di navbar)
 * - isLoading   → status loading
 * - addToCart() → tambah produk
 * - removeFromCart() → hapus produk
 * - updateQuantity() → ubah jumlah
 * - clearCart()      → kosongkan semua
 * - refreshCart()    → sync ulang dengan server
 */

// app/contexts/CartContext.tsx
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useAuth } from "./AuthContext";
// Import server actions dari cart.ts
// "as" = memberi alias agar tidak konflik nama dengan fungsi lokal
import {
  getCart,
  addToCart as addToCartAction,
  removeFromCart as removeFromCartAction,
  updateCartQuantity as updateCartQuantityAction,
  clearCart as clearCartAction,
  getCartTotal as getCartTotalAction,
  getCartCount as getCartCountAction,
} from "@/actions/cart";

// ============================================================
// TIPE DATA
// ============================================================

/** CartItem — Bentuk data satu item keranjang di sisi client */
export type CartItem = {
  id: number;
  userId: number;   // ID pemilik item (agar cart tiap user terpisah)
  title: string;
  price: number;
  image: string;
  category: string;
  quantity: number;
};

/**
 * CartContextType — Semua yang bisa diakses lewat useCart()
 */
type CartContextType = {
  cart: CartItem[];
  total: number;
  count: number;
  isLoading: boolean;
  addToCart: (item: Omit<CartItem, "quantity">) => Promise<void>;
  // Omit<CartItem, "quantity"> = CartItem TANPA field quantity
  removeFromCart: (productId: number) => Promise<void>;
  updateQuantity: (productId: number, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  refreshCart: () => Promise<void>;
};

// ============================================================
// MEMBUAT CONTEXT
// ============================================================

const CartContext = createContext<CartContextType | undefined>(undefined);

// ============================================================
// PROVIDER COMPONENT
// ============================================================

/**
 * CartProvider — Menyediakan data keranjang untuk seluruh app
 *
 * Dipasang di layout.tsx, di dalam AuthProvider:
 *   <AuthProvider>
 *     <CartProvider>   ← di sini
 *       ...
 *     </CartProvider>
 *   </AuthProvider>
 */
export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth(); // ambil data user dari AuthContext

  // State: data keranjang di memori client
  const [cart, setCart] = useState<CartItem[]>([]);
  const [total, setTotal] = useState(0);   // total harga
  const [count, setCount] = useState(0);   // total quantity (untuk badge navbar)
  const [isLoading, setIsLoading] = useState(true);

  /**
   * refreshCart — Sinkronisasi data keranjang dari server ke client
   *
   * Fungsi ini melakukan 3 request sekaligus secara berurutan:
   * 1. Ambil daftar item keranjang
   * 2. Ambil total harga
   * 3. Ambil jumlah item
   *
   * Dipanggil setiap kali ada perubahan (tambah, hapus, ubah qty).
   */
  const refreshCart = async () => {
    setIsLoading(true);

    // Ambil data keranjang dari server (baca cookie)
    const cartResult = await getCart();
    if (cartResult.success) {
      setCart(cartResult.data); // update state dengan data terbaru
    }

    // Ambil total harga
    const totalResult = await getCartTotalAction();
    if (totalResult.success) {
      setTotal(totalResult.data);
    }

    // Ambil jumlah item (untuk badge di navbar)
    const countResult = await getCartCountAction();
    if (countResult.success) {
      setCount(countResult.data);
    }

    setIsLoading(false);
  };

  /**
   * useEffect dengan [user?.id] sebagai dependency:
   * Jalankan refreshCart() setiap kali user.id berubah.
   *
   * Ini berarti:
   * - Saat pertama buka app (user belum ada → undefined → dipanggil)
   * - Saat user login (user.id berubah dari undefined ke angka)
   * - Saat user logout (user.id berubah dari angka ke undefined)
   *
   * Kenapa user?.id bukan user?
   * user?.id = ambil id secara opsional (tidak error kalau user null)
   * Ini lebih presisi — hanya trigger kalau ID-nya yang berubah
   */
  useEffect(() => {
    refreshCart();
  }, [user?.id]);

  // ─── Fungsi-fungsi wrapper ───
  // Setiap fungsi: panggil server action → lalu refreshCart()
  // refreshCart() memastikan UI selalu menampilkan data terbaru

  /**
   * addToCart — Tambah produk ke keranjang
   * Wrapper untuk addToCartAction dari server, diikuti refresh UI
   */
  const addToCart = async (item: Omit<CartItem, "quantity">) => {
    await addToCartAction(item); // kirim ke server
    await refreshCart();         // update UI
  };

  /**
   * removeFromCart — Hapus produk dari keranjang
   */
  const removeFromCart = async (productId: number) => {
    await removeFromCartAction(productId);
    await refreshCart();
  };

  /**
   * updateQuantity — Ubah jumlah produk tertentu
   */
  const updateQuantity = async (productId: number, quantity: number) => {
    await updateCartQuantityAction(productId, quantity);
    await refreshCart();
  };

  /**
   * clearCart — Kosongkan seluruh keranjang
   * Dipanggil setelah checkout berhasil agar badge navbar jadi 0
   */
  const clearCart = async () => {
    await clearCartAction(); // hapus di server (cookie)
    await refreshCart();     // update UI → count jadi 0, badge hilang
  };

  // Sediakan semua nilai dan fungsi ke komponen di dalamnya
  return (
    <CartContext.Provider
      value={{
        cart,
        total,
        count,
        isLoading,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        refreshCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

// ============================================================
// CUSTOM HOOK: useCart
// ============================================================

/**
 * useCart — Hook untuk menggunakan CartContext di komponen manapun
 *
 * CARA PAKAI:
 *   const { cart, addToCart, total, count } = useCart();
 *
 * Harus dipakai di dalam komponen yang terbungkus <CartProvider>.
 */
export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
