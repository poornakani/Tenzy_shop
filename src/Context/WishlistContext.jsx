import React, { createContext, useContext, useMemo, useState } from "react";

const WishlistContext = createContext(null);

export const WishlistProvider = ({ children }) => {
  const [wishlistIds, setWishlistIds] = useState(() => new Set());

  // Wishlist add / remove
  const toggleWishlist = (product) => {
    setWishlistIds((prev) => {
      const next = new Set(prev);
      if (next.has(product.id)) next.delete(product.id);
      else next.add(product.id);
      return next;
    });
  };

  const value = useMemo(
    () => ({
      wishlistIds,
      wishlistCount: wishlistIds.size,
      isWishlisted: (id) => wishlistIds.has(id),
      toggleWishlist,
    }),
    [wishlistIds]
  );

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  );
};

// Hook
export const useWishlist = () => {
  const ctx = useContext(WishlistContext);
  if (!ctx) {
    throw new Error("useWishlist must be used inside WishlistProvider");
  }
  return ctx;
};
