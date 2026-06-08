/**
 * ============================================================
 * FILE: app/checkout/page.tsx
 * JENIS: Client Component ("use client") — Halaman Checkout "/checkout"
 * ============================================================
 *
 * APA YANG DILAKUKAN HALAMAN INI?
 * ---------------------------------
 * Form pembayaran 3 langkah (wizard) untuk menyelesaikan pesanan.
 *
 * 3 LANGKAH (STEP):
 * ┌─────────────────────────────────────────────────────────────┐
 * │  ① Pengiriman → ② Pembayaran → ③ Konfirmasi               │
 * │     (aktif)        (abu)          (abu)                    │
 * └─────────────────────────────────────────────────────────────┘
 *
 * STEP 1 - Pengiriman:
 *   Form: Nama, Email, No. Telepon, Alamat, Kota, Kode Pos
 *   Auto-fill dari data profil user (diambil dari cookie session)
 *
 * STEP 2 - Pembayaran:
 *   Pilih metode: Kartu Kredit, Transfer Bank, COD, E-Wallet
 *   Jika pilih Kartu Kredit: muncul input nomor kartu, expiry, CVV
 *   Jika pilih Transfer: tampilkan nomor rekening (simulasi)
 *   Jika pilih E-Wallet: tampilkan tombol pilih provider
 *
 * STEP 3 - Konfirmasi:
 *   Review ringkasan: info pengiriman, metode bayar, daftar produk
 *   Tombol "Bayar Sekarang" → handlePlaceOrder()
 *
 * SIDEBAR (tampil di semua step):
 *   Ringkasan produk + subtotal + ongkir + pajak + grand total
 *
 * PROTEKSI:
 * - Belum login → redirect ke /login
 * - Keranjang kosong → redirect ke /cart
 *
 * ALUR CHECKOUT:
 * 1. User isi form pengiriman → klik "Lanjut ke Pembayaran"
 * 2. User pilih metode bayar → klik "Tinjau Pesanan"
 * 3. User review pesanan → klik "Bayar Sekarang"
 * 4. handlePlaceOrder():
 *    a. Kumpulkan data ke FormData
 *    b. Panggil processCheckout(formData) → server action
 *    c. Server: buat order, simpan ke cookie, hapus cart
 *    d. Client: clearCart() → badge keranjang jadi 0
 *    e. Redirect ke /checkout-success?orderId=...&total=...
 */
"use client";

import { useState, useEffect } from "react";
// useState  = simpan state step, data form, loading, error
// useEffect = proteksi halaman + auto-fill form dari data user

import { useRouter } from "next/navigation";
// useRouter = redirect jika belum login atau cart kosong

import { useAuth } from "../contexts/AuthContext";
// useAuth() = user, isLoading → cek login dan ambil data profil untuk auto-fill

import { useCart } from "../contexts/CartContext";
// useCart() = cart, total, clearCart → data keranjang + fungsi kosongkan

import { processCheckout } from "@/actions/checkout";
// Server action: proses checkout → buat order → simpan ke cookie → hapus cart

/**
 * Step — Tipe untuk langkah checkout saat ini
 * TypeScript union type: hanya boleh salah satu dari 3 nilai ini
 */
type Step = "shipping" | "payment" | "review";

/**
 * PAYMENT_METHODS — Daftar metode pembayaran yang tersedia
 * Setiap metode punya id, label, dan deskripsi.
 */
const PAYMENT_METHODS = [
  { id: "credit_card",   label: "Kartu Kredit / Debit", desc: "Visa, Mastercard, JCB" },
  { id: "bank_transfer", label: "Transfer Bank",         desc: "BCA, Mandiri, BNI, BRI" },
  { id: "cod",           label: "Bayar di Tempat (COD)", desc: "Bayar saat barang tiba" },
  { id: "ewallet",       label: "E-Wallet",              desc: "GoPay, OVO, DANA, ShopeePay" },
];

// Class Tailwind yang sama dipakai berulang — disimpan sebagai konstanta
// agar konsisten dan mudah diubah sekali
const inputCls = "w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:border-gray-400 transition-colors";
const labelCls = "block text-xs font-medium text-gray-600 mb-1.5";

/**
 * CheckoutPage — Halaman checkout 3 langkah
 */
export default function CheckoutPage() {
  const { user, isLoading: authLoading } = useAuth();
  // user        = data user login (untuk auto-fill form dan proteksi)
  // authLoading = true saat masih cek cookie sesi

  const { cart, total, clearCart } = useCart();
  // cart      = daftar item di keranjang
  // total     = total harga semua item (untuk perhitungan)
  // clearCart = fungsi kosongkan keranjang setelah checkout

  const router = useRouter();

  // State: step saat ini
  const [step, setStep] = useState<Step>("shipping");
  // Mulai dari step pertama ("shipping")

  // State: loading dan error saat proses checkout
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // State: data form pengiriman
  const [shipping, setShipping] = useState({
    name: "", email: "", address: "", city: "", postalCode: "", phone: ""
  });

  // State: metode pembayaran yang dipilih (default: kartu kredit)
  const [paymentMethod, setPaymentMethod] = useState("credit_card");

  // State: detail kartu kredit (hanya digunakan jika pilih credit_card)
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");

  /**
   * useEffect 1 — Proteksi halaman + auto-fill form dari profil user
   *
   * Dependency: [authLoading, user, router]
   * Jalankan setiap kali authLoading atau user berubah.
   */
  useEffect(() => {
    // Jika belum login → redirect ke login
    if (!authLoading && !user) router.push("/login");

    // Jika sudah login → auto-fill form pengiriman dari data profil
    if (!authLoading && user) {
      setShipping((prev) => ({
        ...prev,  // pertahankan nilai yang sudah ada (jika ada)
        name: `${user.name?.firstname || ""} ${user.name?.lastname || ""}`.trim() || user.username,
        // Gabungkan nama depan & belakang, fallback ke username
        // .trim() = hapus spasi di awal/akhir
        email: user.email || "",
        address: user.address ? `${user.address.street} No. ${user.address.number}` : "",
        city: user.address?.city || "",
        // ?. = optional chaining: aman jika user.address undefined
        postalCode: user.address?.zipcode || "",
        phone: user.phone || "",
      }));
    }
  }, [authLoading, user, router]);

  /**
   * useEffect 2 — Redirect ke cart jika keranjang kosong
   *
   * Mencegah user mengakses /checkout langsung tanpa item di keranjang.
   */
  useEffect(() => {
    if (!authLoading && cart.length === 0) router.push("/cart");
  }, [authLoading, cart, router]);

  // ── LOADING STATE ──
  if (authLoading) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-[#f8f8f6]">
        <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin" />
      </div>
    );
  }

  // Jangan render jika belum login (redirect sedang berjalan)
  if (!user) return null;

  // ── PERHITUNGAN BIAYA ──
  const shippingCost = total > 100 ? 0 : 9.99;
  const tax = total * 0.1;
  const grandTotal = total + shippingCost + tax;

  // Daftar steps untuk step indicator di atas
  const steps: { id: Step; label: string }[] = [
    { id: "shipping", label: "Pengiriman" },
    { id: "payment",  label: "Pembayaran" },
    { id: "review",   label: "Konfirmasi" },
  ];

  // Index step saat ini (0, 1, atau 2)
  const currentStepIdx = steps.findIndex((s) => s.id === step);

  /**
   * handlePlaceOrder — Proses checkout saat user klik "Bayar Sekarang"
   *
   * Alur:
   * 1. Kumpulkan data ke FormData
   * 2. Kirim ke processCheckout() server action
   * 3. Jika berhasil: clearCart() + redirect ke checkout-success
   * 4. Jika gagal: tampilkan error
   */
  const handlePlaceOrder = async () => {
    setIsProcessing(true);
    setError(null);

    // FormData = cara standar untuk mengirim data form ke server action
    const formData = new FormData();
    formData.set("name",          shipping.name);
    formData.set("email",         shipping.email);
    formData.set("address",       shipping.address);
    formData.set("city",          shipping.city);
    formData.set("postalCode",    shipping.postalCode);
    formData.set("paymentMethod", paymentMethod);

    // Panggil server action — buat order + hapus cart di server
    const result = await processCheckout(formData);

    if (result.success && result.data) {
      await clearCart(); // bersihkan cart di client (state + cookie)
      // clearCart() penting: memastikan badge keranjang di Navbar jadi 0
      router.push(`/checkout-success?orderId=${result.data.id}&total=${grandTotal.toFixed(2)}`);
      // Kirim orderId dan total ke halaman sukses via URL params
    } else {
      setError(result.error || "Checkout gagal");
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f8f6]">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-semibold text-gray-900 mb-8">Checkout</h1>

        {/* ── STEP INDICATOR ──
            Menampilkan progress 3 langkah dengan angka/centang dan label */}
        <div className="flex items-center gap-2 mb-8">
          {steps.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                {/* Lingkaran step */}
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
                  i < currentStepIdx
                    ? "bg-gray-900 text-white"  // step sudah dilalui: hitam + centang
                    : i === currentStepIdx
                    ? "bg-gray-900 text-white"  // step aktif: hitam + angka
                    : "bg-gray-200 text-gray-400" // step belum: abu
                }`}>
                  {i < currentStepIdx ? "✓" : i + 1}
                </div>
                {/* Label step (hanya tampil di layar sm+) */}
                <span className={`text-sm hidden sm:block ${
                  i === currentStepIdx ? "text-gray-900 font-medium" : "text-gray-400"
                }`}>
                  {s.label}
                </span>
              </div>
              {/* Garis penghubung antar step */}
              {i < steps.length - 1 && (
                <div className={`w-8 h-px ${i < currentStepIdx ? "bg-gray-900" : "bg-gray-200"}`} />
              )}
            </div>
          ))}
        </div>

        {/* Grid: 2/3 untuk form, 1/3 untuk sidebar ringkasan */}
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">

            {/* ══════════════════════════════════════
                STEP 1: FORM PENGIRIMAN
                Tampil hanya saat step === "shipping"
                ══════════════════════════════════════ */}
            {step === "shipping" && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();       // cegah reload halaman
                  setStep("payment");       // pindah ke step berikutnya
                  window.scrollTo(0, 0);   // scroll ke atas halaman
                }}
                className="bg-white border border-gray-100 rounded-2xl p-6"
              >
                <h2 className="text-base font-semibold text-gray-900 mb-5">Informasi Pengiriman</h2>
                <div className="grid sm:grid-cols-2 gap-4">

                  {/* Nama lengkap — span 2 kolom */}
                  <div className="sm:col-span-2">
                    <label className={labelCls}>Nama Lengkap *</label>
                    <input type="text" required value={shipping.name}
                      onChange={(e) => setShipping({...shipping, name: e.target.value})}
                      // {...shipping, name: ...} = spread operator: copy semua field,
                      // hanya ganti field "name" dengan nilai baru
                      className={inputCls} placeholder="John Doe" />
                  </div>

                  {/* Email */}
                  <div>
                    <label className={labelCls}>Email *</label>
                    <input type="email" required value={shipping.email}
                      onChange={(e) => setShipping({...shipping, email: e.target.value})}
                      className={inputCls} placeholder="john@example.com" />
                  </div>

                  {/* Telepon */}
                  <div>
                    <label className={labelCls}>Nomor Telepon *</label>
                    <input type="tel" required value={shipping.phone}
                      onChange={(e) => setShipping({...shipping, phone: e.target.value})}
                      className={inputCls} placeholder="+62 812 3456 7890" />
                  </div>

                  {/* Alamat — span 2 kolom */}
                  <div className="sm:col-span-2">
                    <label className={labelCls}>Alamat Lengkap *</label>
                    <input type="text" required value={shipping.address}
                      onChange={(e) => setShipping({...shipping, address: e.target.value})}
                      className={inputCls} placeholder="Jl. Sudirman No. 1" />
                  </div>

                  {/* Kota */}
                  <div>
                    <label className={labelCls}>Kota *</label>
                    <input type="text" required value={shipping.city}
                      onChange={(e) => setShipping({...shipping, city: e.target.value})}
                      className={inputCls} placeholder="Jakarta" />
                  </div>

                  {/* Kode pos */}
                  <div>
                    <label className={labelCls}>Kode Pos *</label>
                    <input type="text" required value={shipping.postalCode}
                      onChange={(e) => setShipping({...shipping, postalCode: e.target.value})}
                      className={inputCls} placeholder="12345" />
                  </div>
                </div>

                <button type="submit"
                  className="mt-6 w-full bg-gray-900 text-white py-3 rounded-xl text-sm font-medium hover:bg-gray-700 transition-colors">
                  Lanjut ke Pembayaran →
                </button>
              </form>
            )}

            {/* ══════════════════════════════════════
                STEP 2: METODE PEMBAYARAN
                Tampil hanya saat step === "payment"
                ══════════════════════════════════════ */}
            {step === "payment" && (
              <form
                onSubmit={(e) => { e.preventDefault(); setStep("review"); window.scrollTo(0, 0); }}
                className="bg-white border border-gray-100 rounded-2xl p-6"
              >
                <h2 className="text-base font-semibold text-gray-900 mb-5">Metode Pembayaran</h2>

                {/* Daftar pilihan metode pembayaran */}
                <div className="space-y-2 mb-6">
                  {PAYMENT_METHODS.map((m) => (
                    <label
                      key={m.id}
                      className={`flex items-center gap-3 p-3.5 border rounded-xl cursor-pointer transition-all ${
                        paymentMethod === m.id
                          ? "border-gray-900 bg-gray-50"   // dipilih: border hitam
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      {/* Input radio disembunyikan — diganti dengan UI custom di bawah */}
                      <input type="radio" name="payment" value={m.id}
                        checked={paymentMethod === m.id}
                        onChange={() => setPaymentMethod(m.id)}
                        className="hidden" />

                      {/* Lingkaran radio custom */}
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        paymentMethod === m.id ? "border-gray-900" : "border-gray-300"
                      }`}>
                        {/* Titik dalam lingkaran — hanya muncul saat dipilih */}
                        {paymentMethod === m.id && <div className="w-2 h-2 rounded-full bg-gray-900" />}
                      </div>

                      <div>
                        <p className="text-sm font-medium text-gray-900">{m.label}</p>
                        <p className="text-xs text-gray-400">{m.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>

                {/* Detail kartu kredit — hanya tampil jika dipilih */}
                {paymentMethod === "credit_card" && (
                  <div className="bg-gray-50 rounded-xl p-4 mb-5 space-y-3 border border-gray-100">
                    <p className="text-xs font-medium text-gray-600">Detail Kartu (Simulasi)</p>
                    {/* Nomor kartu — format otomatis: "1234 5678 9012 3456" */}
                    <input type="text" maxLength={19} value={cardNumber}
                      onChange={(e) => {
                        // Hapus semua non-digit, batasi 16 digit
                        const v = e.target.value.replace(/\D/g, "").slice(0, 16);
                        // Format dengan spasi setiap 4 digit
                        setCardNumber(v.replace(/(.{4})/g, "$1 ").trim());
                      }}
                      className={inputCls + " font-mono"} placeholder="1234 5678 9012 3456" />
                    <div className="grid grid-cols-2 gap-3">
                      {/* Expiry — format MM/YY */}
                      <input type="text" maxLength={5} value={cardExpiry}
                        onChange={(e) => {
                          const v = e.target.value.replace(/\D/g, "").slice(0, 4);
                          setCardExpiry(v.length > 2 ? `${v.slice(0, 2)}/${v.slice(2)}` : v);
                        }}
                        className={inputCls + " font-mono"} placeholder="MM/YY" />
                      {/* CVV — disembunyikan seperti password */}
                      <input type="password" maxLength={3} value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, "").slice(0, 3))}
                        className={inputCls + " font-mono"} placeholder="CVV" />
                    </div>
                  </div>
                )}

                {/* Info transfer bank — hanya tampil jika dipilih */}
                {paymentMethod === "bank_transfer" && (
                  <div className="bg-gray-50 rounded-xl p-4 mb-5 border border-gray-100">
                    <p className="text-xs font-medium text-gray-600 mb-2">Rekening Tujuan (Simulasi)</p>
                    <p className="text-sm text-gray-700">BCA: <span className="font-mono font-semibold">1234567890</span></p>
                    <p className="text-sm text-gray-700">Mandiri: <span className="font-mono font-semibold">0987654321</span></p>
                    <p className="text-xs text-gray-400 mt-2">a.n. FakeStore Indonesia</p>
                  </div>
                )}

                {/* Pilihan e-wallet — hanya tampil jika dipilih */}
                {paymentMethod === "ewallet" && (
                  <div className="bg-gray-50 rounded-xl p-4 mb-5 border border-gray-100">
                    <p className="text-xs font-medium text-gray-600 mb-3">Pilih E-Wallet (Simulasi)</p>
                    <div className="grid grid-cols-4 gap-2">
                      {["GoPay", "OVO", "DANA", "ShopeePay"].map((w) => (
                        <button key={w} type="button"
                          className="border border-gray-200 rounded-lg py-2 text-xs text-gray-700 font-medium hover:bg-gray-100 transition-colors bg-white">
                          {w}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tombol Kembali + Lanjut */}
                <div className="flex gap-3">
                  <button type="button" onClick={() => setStep("shipping")}
                    className="flex-1 border border-gray-200 text-gray-700 py-3 rounded-xl text-sm font-medium hover:border-gray-400 transition-colors">
                    ← Kembali
                  </button>
                  <button type="submit"
                    className="flex-1 bg-gray-900 text-white py-3 rounded-xl text-sm font-medium hover:bg-gray-700 transition-colors">
                    Tinjau Pesanan →
                  </button>
                </div>
              </form>
            )}

            {/* ══════════════════════════════════════
                STEP 3: KONFIRMASI PESANAN
                Tampil hanya saat step === "review"
                ══════════════════════════════════════ */}
            {step === "review" && (
              <div className="bg-white border border-gray-100 rounded-2xl p-6">
                <h2 className="text-base font-semibold text-gray-900 mb-5">Konfirmasi Pesanan</h2>

                {/* Pesan error jika checkout gagal */}
                {error && (
                  <div className="bg-red-50 border border-red-100 text-red-600 text-sm p-3 rounded-lg mb-4">
                    {error}
                  </div>
                )}

                {/* Ringkasan info pengiriman */}
                <div className="border border-gray-100 rounded-xl p-4 mb-3">
                  <div className="flex justify-between mb-2">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Pengiriman</p>
                    {/* Tombol "Ubah" → kembali ke step pengiriman */}
                    <button onClick={() => setStep("shipping")}
                      className="text-xs text-gray-400 underline underline-offset-1 hover:text-gray-600">
                      Ubah
                    </button>
                  </div>
                  <p className="text-sm font-medium text-gray-900">{shipping.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{shipping.email} · {shipping.phone}</p>
                  <p className="text-xs text-gray-500">{shipping.address}, {shipping.city} {shipping.postalCode}</p>
                </div>

                {/* Ringkasan metode pembayaran */}
                <div className="border border-gray-100 rounded-xl p-4 mb-3">
                  <div className="flex justify-between mb-2">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Pembayaran</p>
                    <button onClick={() => setStep("payment")}
                      className="text-xs text-gray-400 underline underline-offset-1 hover:text-gray-600">
                      Ubah
                    </button>
                  </div>
                  <p className="text-sm text-gray-900">
                    {/* Cari label metode berdasarkan id yang dipilih */}
                    {PAYMENT_METHODS.find((m) => m.id === paymentMethod)?.label}
                  </p>
                </div>

                {/* Daftar produk yang dipesan */}
                <div className="border border-gray-100 rounded-xl p-4 mb-5">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
                    Produk ({cart.length})
                  </p>
                  {/* max-h-52 overflow-y-auto = scroll jika produk banyak */}
                  <div className="space-y-3 max-h-52 overflow-y-auto">
                    {cart.map((item) => (
                      <div key={item.id} className="flex items-center gap-3">
                        <img src={item.image} alt={item.title}
                          className="w-10 h-10 object-contain bg-gray-50 rounded-lg p-1" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-800 truncate">{item.title}</p>
                          <p className="text-xs text-gray-400">x{item.quantity}</p>
                        </div>
                        <p className="text-xs font-semibold text-gray-900">
                          ${(item.price * item.quantity).toFixed(2)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tombol Kembali + Bayar Sekarang */}
                <div className="flex gap-3">
                  <button type="button" onClick={() => setStep("payment")}
                    className="flex-1 border border-gray-200 text-gray-700 py-3 rounded-xl text-sm font-medium hover:border-gray-400 transition-colors">
                    ← Kembali
                  </button>
                  <button onClick={handlePlaceOrder} disabled={isProcessing}
                    className="flex-1 bg-gray-900 text-white py-3 rounded-xl text-sm font-medium hover:bg-gray-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                    {isProcessing ? (
                      // Loading state: spinner + teks
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Memproses...
                      </>
                    ) : "Bayar Sekarang"}
                  </button>
                </div>
              </div>
            )}

          </div>

          {/* ── SIDEBAR RINGKASAN PESANAN ── */}
          {/* Tampil di SEMUA step sebagai referensi */}
          <div className="lg:col-span-1">
            <div className="bg-white border border-gray-100 rounded-2xl p-5 sticky top-20">
              <h2 className="text-sm font-semibold text-gray-900 mb-4">Ringkasan</h2>

              {/* Daftar item di sidebar — scrollable */}
              <div className="space-y-2.5 max-h-48 overflow-y-auto mb-4">
                {cart.map((item) => (
                  <div key={item.id} className="flex items-center gap-2.5">
                    <img src={item.image} alt={item.title}
                      className="w-9 h-9 object-contain bg-gray-50 rounded-lg p-1 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-800 truncate">{item.title}</p>
                      <p className="text-xs text-gray-400">x{item.quantity}</p>
                    </div>
                    <p className="text-xs font-medium text-gray-900 flex-shrink-0">
                      ${(item.price * item.quantity).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>

              {/* Perhitungan total */}
              <div className="border-t border-gray-100 pt-3 space-y-2 text-sm">
                <div className="flex justify-between text-gray-500">
                  <span>Subtotal</span><span>${total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>Ongkir</span>
                  <span>{shippingCost === 0
                    ? <span className="text-green-600">Gratis</span>
                    : `$${shippingCost.toFixed(2)}`}
                  </span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>Pajak</span><span>${tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-semibold text-gray-900 pt-1 border-t border-gray-100">
                  <span>Total</span><span>${grandTotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Info jaminan */}
              <div className="mt-4 space-y-1.5 text-xs text-gray-400">
                <p>🔒 Pembayaran aman & terenkripsi</p>
                <p>📦 Estimasi tiba 3-5 hari kerja</p>
                <p>↩️ Garansi pengembalian 30 hari</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
