import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const CartContext = createContext(null);

const STORAGE_KEY = "tenzy_cart_v1";

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

export const CartProvider = ({ children }) => {
  const [items, setItems] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // ignore
    }
  }, [items]);

  const addToCart = (product, qty = 1) => {
    const quantity = Math.max(1, Number(qty) || 1);

    setItems((prev) => {
      const idx = prev.findIndex((x) => x.id === product.id);
      const stock = product?.stockCount ?? 999999;
      const maxQty = stock > 0 ? stock : 1;

      if (idx >= 0) {
        const next = [...prev];
        const updatedQty = clamp(next[idx].qty + quantity, 1, maxQty);
        next[idx] = { ...next[idx], qty: updatedQty };
        return next;
      }

      return [
        ...prev,
        {
          id: product.id,
          name: product.name,
          image: product.image,
          price: product.price,
          discountedPrice: product.discountedPrice ?? product.price,
          discountPercent: product.discountPercent ?? 0,
          stockCount: product.stockCount ?? 0,
          outOfStock: product.outOfStock ?? false,
          brand: product.brand,
          category: product.category,
          sku: product.sku,
          qty: clamp(quantity, 1, maxQty),
        },
      ];
    });
  };

  const removeFromCart = (id) => {
    setItems((prev) => prev.filter((x) => x.id !== id));
  };

  const setQty = (id, qty) => {
    setItems((prev) =>
      prev.map((x) => {
        if (x.id !== id) return x;
        const stock = x?.stockCount ?? 999999;
        const maxQty = stock > 0 ? stock : 1;
        return { ...x, qty: clamp(Number(qty) || 1, 1, maxQty) };
      })
    );
  };

  const incQty = (id) => {
    setItems((prev) =>
      prev.map((x) => {
        if (x.id !== id) return x;
        const stock = x?.stockCount ?? 999999;
        const maxQty = stock > 0 ? stock : 1;
        return { ...x, qty: clamp(x.qty + 1, 1, maxQty) };
      })
    );
  };

  const decQty = (id) => {
    setItems((prev) =>
      prev.map((x) => {
        if (x.id !== id) return x;
        return { ...x, qty: Math.max(1, x.qty - 1) };
      })
    );
  };

  const clearCart = () => setItems([]);

  const cartCount = useMemo(
    () => items.reduce((sum, x) => sum + (x.qty || 0), 0),
    [items]
  );

  const subtotal = useMemo(
    () =>
      items.reduce(
        (sum, x) => sum + (x.discountedPrice || 0) * (x.qty || 0),
        0
      ),
    [items]
  );

  const originalTotal = useMemo(
    () => items.reduce((sum, x) => sum + (x.price || 0) * (x.qty || 0), 0),
    [items]
  );

  const savings = useMemo(
    () => Math.max(0, originalTotal - subtotal),
    [originalTotal, subtotal]
  );

  const value = {
    items,
    cartCount,
    subtotal,
    originalTotal,
    savings,
    addToCart,
    removeFromCart,
    setQty,
    incQty,
    decQty,
    clearCart,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
};
