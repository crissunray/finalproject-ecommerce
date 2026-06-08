# 📚 Dokumentasi Project FakeStore E-Commerce

> Panduan belajar lengkap untuk memahami setiap file dan konsep dalam project ini.

---

## 🗺️ Peta Project (Struktur Folder)

```
finalproject/
│
├── actions/                    ← Kode SERVER (ambil data, kelola cookie)
│   ├── products.ts             ← Ambil produk dari FakeStore API
│   ├── auth.ts                 ← Login, logout, cek sesi
│   ├── cart.ts                 ← CRUD keranjang belanja (disimpan di cookie)
│   └── checkout.ts             ← Proses pesanan & riwayat order
│
├── app/                        ← Semua halaman & komponen UI
│   ├── layout.tsx              ← Bingkai semua halaman (Navbar + Providers)
│   ├── globals.css             ← CSS global (warna, font, input style)
│   ├── page.tsx                ← Halaman utama → localhost:3000/
│   │
│   ├── login/
│   │   └── page.tsx            ← Halaman login → localhost:3000/login
│   ├── product/[id]/
│   │   └── page.tsx            ← Detail produk → localhost:3000/product/1
│   ├── cart/
│   │   └── page.tsx            ← Keranjang → localhost:3000/cart
│   ├── checkout/
│   │   └── page.tsx            ← Pembayaran → localhost:3000/checkout
│   ├── checkout-success/
│   │   └── page.tsx            ← Sukses bayar → localhost:3000/checkout-success
│   ├── profile/
│   │   └── page.tsx            ← Profil user → localhost:3000/profile
│   │
│   ├── components/             ← Komponen kecil yang dipakai berulang
│   │   ├── Navbar.tsx          ← Navigasi atas
│   │   ├── Providers.tsx       ← Pembungkus AuthProvider + CartProvider
│   │   ├── ProductCard.tsx     ← Kartu produk di halaman utama
│   │   ├── AddToCartButton.tsx ← Tombol tambah keranjang di detail produk
│   │   ├── SearchFilter.tsx    ← Input pencarian + dropdown kategori
│   │   └── ProtectedRoute.tsx  ← Guard halaman yang butuh login
│   │
│   └── contexts/               ← "Gudang data global" (React Context)
│       ├── AuthContext.tsx      ← State: user login, login(), logout()
│       └── CartContext.tsx      ← State: cart, addToCart(), clearCart(), dll
│
└── DOKUMENTASI.md              ← File ini
```

---

## 🧠 Konsep Penting yang Wajib Dipahami

### 1. Server vs Client Component

```
SERVER Component              │  CLIENT Component
──────────────────────────────┼──────────────────────────────
Jalan di server               │  Jalan di browser user
Tidak ada "use client"        │  Ada "use client" di baris 1
BISA: fetch data, baca cookie │  BISA: klik, ketik, useState
TIDAK BISA: useState, onClick │  TIDAK BISA: baca cookie langsung
Contoh: page.tsx, actions/*   │  Contoh: Navbar, ProductCard
```

### 2. useState — Data yang Bisa Berubah

```tsx
const [nilai, setNilai] = useState(nilaiAwal);
//     ↑         ↑              ↑
//   bacanya   cara ubah     nilai awal

// Contoh nyata:
const [isAdding, setIsAdding] = useState(false);
setIsAdding(true);   // ✅ Benar — pakai setter
isAdding = true;     // ❌ Salah — jangan langsung ubah
```

### 3. useEffect — Jalankan Kode Saat Sesuatu Terjadi

```tsx
useEffect(() => {
  // kode di sini
}, [dependency]);

// [] kosong  = jalankan SEKALI saat komponen pertama muncul
// [user]     = jalankan SETIAP KALI nilai user berubah
// [user, id] = jalankan saat user ATAU id berubah
```

### 4. Context — Data Global Tanpa Prop Drilling

```tsx
// Buat Context → Provider → Custom Hook

// Di dalam komponen:
const { user, login, logout } = useAuth();     // data login
const { cart, addToCart, count } = useCart();  // data keranjang
```

### 5. async/await — Operasi yang Butuh Waktu

```tsx
// await = "tunggu sampai selesai sebelum lanjut"
const result = await fetch("https://...");  // tunggu respons API
const data = await result.json();           // tunggu parsing JSON

// async = wajib ditulis di fungsi yang pakai await
async function ambilData() {
  const data = await fetch("...");
}
```

---

## 📄 Penjelasan Detail Setiap File

---

### `actions/products.ts` — Ambil Data Produk

**Bertugas:** Mengambil data dari FakeStore API  
**Jenis:** Server Action (`"use server"`)

| Fungsi | Kegunaan |
|--------|----------|
| `getProducts()` | Ambil semua produk (cache 1 jam) |
| `getProductById(id)` | Ambil 1 produk berdasarkan ID |
| `getProductsByCategory(cat)` | Ambil produk per kategori |
| `getCategories()` | Ambil daftar semua kategori (cache 24 jam) |

**Pola yang dipakai:**
```tsx
// Setiap fungsi mengembalikan salah satu dari 2 kemungkinan:
{ success: true, data: [...] }   // berhasil
{ success: false, error: "..." } // gagal
```

---

### `actions/auth.ts` — Login & Session

**Bertugas:** Autentikasi user lewat FakeStore API  
**Jenis:** Server Action (`"use server"`)

**Alur Login:**
```
1. POST /auth/login  → dapat JWT token (jika kredensial benar)
2. Decode JWT        → dapat user ID dari payload token
3. GET /users/{id}   → ambil data lengkap user
4. Simpan ke cookie  → "user_session" (httpOnly, 7 hari)
```

| Fungsi | Kegunaan |
|--------|----------|
| `loginUser(username, password)` | Validasi & buat sesi |
| `getCurrentUser()` | Baca cookie sesi → data user aktif |
| `logoutUser()` | Hapus cookie sesi |

---

### `actions/cart.ts` — Keranjang Belanja

**Bertugas:** CRUD keranjang yang disimpan di cookie `user_cart`  
**Jenis:** Server Action (`"use server"`)

**Fitur userId:**  
Setiap item menyimpan `userId` agar keranjang tiap user tidak tercampur
meskipun pakai browser yang sama.

| Fungsi | Kegunaan |
|--------|----------|
| `getCart()` | Ambil cart milik user aktif |
| `addToCart(item)` | Tambah item (qty +1 jika sudah ada) |
| `removeFromCart(id)` | Hapus item |
| `updateCartQuantity(id, qty)` | Ubah jumlah (hapus jika qty ≤ 0) |
| `clearCart()` | Kosongkan semua |
| `getCartTotal()` | Hitung total harga |
| `getCartCount()` | Hitung total quantity (untuk badge navbar) |

---

### `actions/checkout.ts` — Proses Pesanan

**Bertugas:** Buat order baru, simpan ke cookie `user_orders`  
**Jenis:** Server Action (`"use server"`)

**Alur Checkout:**
```
1. Cek user sudah login
2. Ambil isi keranjang
3. Hitung total
4. Buat objek Order baru
5. Simpan ke cookie "user_orders"
6. Kosongkan keranjang
7. Return data order
```

| Fungsi | Kegunaan |
|--------|----------|
| `processCheckout(formData)` | Proses checkout lengkap |
| `getUserOrders()` | Ambil riwayat pesanan dari cookie |

---

### `app/contexts/AuthContext.tsx` — Global Auth State

**Bertugas:** Menyediakan state login untuk seluruh app  
**Jenis:** React Context + Client Component

**Yang tersedia via `useAuth()`:**
```tsx
const { user, isLoading, login, logout, error } = useAuth();
//      ↑      ↑          ↑      ↑       ↑
//   data   loading  fn login fn logout pesan error
```

**Cara kerja:**
1. Saat pertama buka app → cek cookie `user_session`
2. Jika ada → set user otomatis (tidak perlu login ulang)
3. Saat login → panggil server action, simpan user ke state
4. Saat logout → hapus cookie, set user = null

---

### `app/contexts/CartContext.tsx` — Global Cart State

**Bertugas:** Menyinkronkan data keranjang (cookie server ↔ state client)  
**Jenis:** React Context + Client Component

**Yang tersedia via `useCart()`:**
```tsx
const { cart, total, count, addToCart, clearCart, ... } = useCart();
```

**Pola refresh:**
```
Aksi user (addToCart, removeFromCart, dll)
    ↓ panggil server action
    ↓ server update cookie
    ↓ refreshCart() ambil data terbaru
    ↓ setCart/setTotal/setCount update state
    ↓ UI otomatis re-render
```

---

### `app/layout.tsx` — Bingkai Semua Halaman

**Bertugas:** Struktur HTML dasar + komponen yang selalu muncul  
**Yang ada di sini:** `<html>`, `<body>`, font, metadata, Providers, Navbar

---

### `app/components/Providers.tsx` — Wrapper Context

**Bertugas:** Membungkus app dengan AuthProvider + CartProvider  
**Alasan dipisah dari layout.tsx:** layout = Server Component, Provider = Client Component

---

### `app/page.tsx` — Halaman Utama (/)

**Bertugas:** Tampilkan semua produk + fitur search & filter  
**Jenis:** Server Component (bisa async, bisa fetch langsung)

**Fitur:**
- Baca `searchParams` dari URL (?q=kata&cat=kategori)
- Filter produk berdasarkan search & kategori
- Suspense untuk loading skeleton saat produk masih dimuat

---

### `app/login/page.tsx` — Halaman Login (/login)

**Bertugas:** Form login dengan akun demo  
**Fitur:**
- 5 akun demo siap klik → username & password terisi otomatis
- Error message jika login gagal
- Loading state saat proses login
- Redirect ke home setelah berhasil

---

### `app/product/[id]/page.tsx` — Detail Produk (/product/1)

**Bertugas:** Tampilkan detail lengkap satu produk  
**`[id]`** = URL dinamis — angka di URL jadi variabel `id`  

**Yang ditampilkan:** Gambar, nama, kategori, rating bintang, deskripsi, harga, tombol tambah keranjang

---

### `app/cart/page.tsx` — Keranjang (/cart)

**Bertugas:** Tampilkan & kelola isi keranjang  
**Proteksi:** Redirect ke `/login` jika belum login

**Fitur:**
- List produk dengan gambar, nama, harga, quantity control
- Tombol hapus per item
- Ringkasan: subtotal + ongkir + pajak = total
- Tombol "Lanjut ke Pembayaran"

---

### `app/checkout/page.tsx` — Checkout (/checkout)

**Bertugas:** Form pembayaran 3 langkah  
**Proteksi:** Redirect ke `/login` jika belum login, redirect ke `/cart` jika keranjang kosong

**3 Langkah:**
1. **Pengiriman** — nama, email, telepon, alamat (auto-fill dari profil)
2. **Pembayaran** — pilih metode: kartu kredit, transfer bank, COD, e-wallet
3. **Konfirmasi** — review semua, klik "Bayar Sekarang"

---

### `app/checkout-success/page.tsx` — Sukses Bayar

**Bertugas:** Konfirmasi pesanan berhasil  
**Fitur:**
- Tampilkan Order ID & total dari URL params (?orderId=...&total=...)
- Progress bar pesanan (Dibuat → Diproses → Dikirim → Tiba)
- Auto redirect ke home setelah 10 detik

---

### `app/profile/page.tsx` — Profil (/profile)

**Bertugas:** Halaman akun user dengan 3 tab  
**Proteksi:** Redirect ke `/login` jika belum login

| Tab | Isi |
|-----|-----|
| Profil | Data user dari API (username, email, nama, alamat) |
| Pesanan | Riwayat order dari cookie (real data setelah checkout) |
| Pengaturan | Toggle notifikasi, pilih bahasa & mata uang |

---

### `app/components/Navbar.tsx` — Navigasi Atas

**Bertugas:** Bar navigasi yang selalu tampil di semua halaman  
**Data yang dipakai:** `useAuth()` (cek login), `useCart()` (ambil count badge)

**Tampilan berubah sesuai status:**
```
Belum login:  Logo | Produk | [Masuk]
Sudah login:  Logo | Produk | Keranjang(5) | johnd | Keluar
```

---

### `app/components/ProductCard.tsx` — Kartu Produk

**Bertugas:** Satu kartu produk di grid halaman utama  
**Props yang diterima:** `product` (id, title, price, image, category)

**Fitur:**
- Klik gambar/nama → buka halaman detail
- Klik "+ Keranjang" → tambah ke cart (cek login dulu)
- State visual: loading "..." saat proses, "Ditambahkan ✓" saat selesai

---

### `app/components/SearchFilter.tsx` — Filter Produk

**Bertugas:** Input pencarian + dropdown kategori  
**Cara kerja:**
1. User ketik di search / pilih kategori
2. Debounce 400ms (tunggu user selesai ketik)
3. Update URL: `/?q=kata&cat=kategori`
4. `page.tsx` (server) baca URL → filter produk → render ulang

---

### `app/components/AddToCartButton.tsx` — Tombol di Detail Produk

**Bertugas:** Tombol "Tambah ke Keranjang" di halaman detail produk  
**Berbeda dari ProductCard:** Ukuran lebih besar, pakai `useRouter` untuk redirect ke login

---

### `app/globals.css` — CSS Global

**Bertugas:** Aturan CSS yang berlaku untuk seluruh app

```css
/* Warna dasar */
:root { --background: #f8f8f6; --foreground: #111111; }

/* PENTING: Tanpa ini, text di input bisa tidak kelihatan */
input, select, textarea { color: #1f2937; background: white; }
```

---

## 🔄 Alur Data Lengkap

### Alur Login:
```
User ketik username + password → klik Login
    ↓ handleSubmit() di login/page.tsx
    ↓ login() dari useAuth()
    ↓ loginUser() Server Action
        → POST ke /auth/login → dapat JWT
        → Decode JWT → dapat user ID
        → GET /users/{id} → dapat data user
        → Set cookie "user_session"
    ↓ setUser(data) di AuthContext
    ↓ router.push("/") → redirect ke home
    ↓ Navbar update → tampilkan nama user
```

### Alur Tambah ke Keranjang:
```
User klik "+ Keranjang" di ProductCard
    ↓ handleAddToCart()
    ↓ Cek user login (dari useAuth)
    ↓ addToCart() dari useCart()
    ↓ addToCartAction() Server Action
        → Baca cookie "user_cart"
        → Tambah/update item
        → Simpan kembali ke cookie
    ↓ refreshCart() dari CartContext
        → Ambil cart terbaru dari server
        → Update state: cart, total, count
    ↓ Badge keranjang di Navbar +1
```

### Alur Checkout:
```
User klik "Bayar Sekarang"
    ↓ handlePlaceOrder() di checkout/page.tsx
    ↓ processCheckout(formData) Server Action
        → Cek user login
        → Ambil cart dari cookie
        → Hitung total
        → Buat objek Order
        → Simpan ke cookie "user_orders"
        → Hapus cookie "user_cart"
    ↓ clearCart() dari CartContext (update UI)
    ↓ router.push("/checkout-success?orderId=...&total=...")
    ↓ Badge keranjang → 0
```

---

## 💡 Tips Belajar

1. **Baca dari bawah ke atas** — Mulai dari `actions/` untuk paham data, baru ke halaman

2. **Ikuti data** — Pilih satu data (misal: harga produk) dan ikuti perjalanannya dari API → server action → context → komponen → tampilan

3. **Coba ubah** — Ganti teks, warna, atau angka kecil untuk lihat efeknya langsung

4. **Perhatikan `console.log`** — Ada beberapa `console.log` di kode yang bisa dilihat di terminal (server) atau DevTools browser (client)

5. **Gunakan TypeScript error sebagai guru** — Kalau ada garis merah di VS Code, bacalah pesannya — TypeScript menjelaskan apa yang salah

---

*Dokumentasi ini dibuat sebagai panduan belajar frontend. Setiap file di project ini sudah dilengkapi komentar penjelasan langsung di dalam kodenya.*
