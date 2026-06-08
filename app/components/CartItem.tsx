// app/components/CartItem.tsx
"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

export type CartItemType = {
  id: number;
  userId: string;
  title: string;
  price: number;
  image: string;
  category: string;
  quantity: number;
};

type CartItemProps = {
  item: CartItemType;
  onUpdateQuantity: (id: number, quantity: number) => void;
  onRemove: (id: number) => void;
  isLoading?: boolean;
};

export default function CartItem({
  item,
  onUpdateQuantity,
  onRemove,
  isLoading = false,
}: CartItemProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleQuantityChange = async (newQuantity: number) => {
    if (newQuantity < 1) return;
    if (isUpdating) return;
    
    setIsUpdating(true);
    await onUpdateQuantity(item.id, newQuantity);
    setIsUpdating(false);
  };

  const handleRemove = async () => {
    if (isDeleting) return;
    
    setIsDeleting(true);
    await onRemove(item.id);
    setIsDeleting(false);
  };

  const subtotal = item.price * item.quantity;

  return (
    <div className={`flex flex-col sm:flex-row items-center gap-4 p-4 border-b border-gray-200 transition-all duration-300 ${isLoading || isUpdating || isDeleting ? "opacity-50" : "opacity-100"}`}>
      {/* Product Image */}
      <Link href={`/product/${item.id}`} className="flex-shrink-0">
        <div className="w-24 h-24 bg-gray-100 rounded-lg overflow-hidden hover:scale-105 transition-transform duration-200">
          <img
            src={item.image}
            alt={item.title}
            className="w-full h-full object-contain p-2"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "https://via.placeholder.com/100?text=No+Image";
            }}
          />
        </div>
      </Link>

      {/* Product Info */}
      <div className="flex-1 text-center sm:text-left">
        <Link href={`/product/${item.id}`}>
          <h3 className="font-semibold text-gray-800 hover:text-blue-600 transition line-clamp-1">
            {item.title}
          </h3>
        </Link>
        <p className="text-gray-500 text-sm capitalize mt-1">{item.category}</p>
        <p className="text-purple-600 font-bold mt-1">${item.price.toFixed(2)}</p>
      </div>

      {/* Quantity Controls */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => handleQuantityChange(item.quantity - 1)}
          disabled={isUpdating || item.quantity <= 1}
          className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 transition flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Kurangi jumlah"
        >
          -
        </button>
        
        <div className="flex flex-col items-center">
          <span className="w-10 text-center font-medium">{item.quantity}</span>
          {isUpdating && (
            <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mt-1"></div>
          )}
        </div>
        
        <button
          onClick={() => handleQuantityChange(item.quantity + 1)}
          disabled={isUpdating}
          className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 transition flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Tambah jumlah"
        >
          +
        </button>
      </div>

      {/* Subtotal & Remove Button */}
      <div className="flex flex-col items-end gap-2 min-w-[100px]">
        <p className="font-bold text-gray-800">
          ${subtotal.toFixed(2)}
        </p>
        <button
          onClick={handleRemove}
          disabled={isDeleting}
          className="text-red-500 hover:text-red-700 transition text-sm flex items-center gap-1 disabled:opacity-50"
          aria-label="Hapus item"
        >
          {isDeleting ? (
            <>
              <div className="w-3 h-3 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
              <span>Menghapus...</span>
            </>
          ) : (
            <>
              🗑️
              <span>Hapus</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}