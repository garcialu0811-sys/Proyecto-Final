import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl: string;
  maxStock: number;
  category: string;
  sku: string;
}

export interface GuestInfo {
  name: string;
  email: string;
  phone: string;
}

interface CartStore {
  items: CartItem[];
  isOpen: boolean;
  pendingProduct: CartItem | null;
  checkoutOpen: boolean;
  guestCheckout: boolean;
  guestInfo: GuestInfo | null;
  addItem: (product: Omit<CartItem, 'quantity'>, qty?: number) => string;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getSubtotal: () => number;
  getShipping: () => number;
  getTotal: () => number;
  setOpen: (open: boolean) => void;
  setPendingProduct: (product: CartItem | null) => void;
  setCheckoutOpen: (open: boolean) => void;
  setGuestCheckout: (guest: boolean) => void;
  setGuestInfo: (info: GuestInfo | null) => void;
  clearGuest: () => void;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      pendingProduct: null,
      checkoutOpen: false,
      guestCheckout: false,
      guestInfo: null,

      addItem: (product, qty = 1) => {
        const items = get().items;
        const existing = items.find(i => i.productId === product.productId);

        if (existing) {
          const newQty = Math.min(existing.quantity + qty, existing.maxStock);
          set({
            items: items.map(i =>
              i.productId === product.productId
                ? { ...i, quantity: newQty }
                : i
            ),
          });
          return newQty > existing.quantity ? 'added' : 'max';
        } else {
          set({ items: [...items, { ...product, quantity: Math.min(qty, product.maxStock) }] });
          return 'added';
        }
      },

      removeItem: (productId) => {
        set({ items: get().items.filter(i => i.productId !== productId) });
      },

      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId);
          return;
        }
        set({
          items: get().items.map(i =>
            i.productId === productId
              ? { ...i, quantity: Math.min(quantity, i.maxStock) }
              : i
          ),
        });
      },

      clearCart: () => set({ items: [], checkoutOpen: false }),

      getTotalItems: () => {
        return get().items.reduce((sum, i) => sum + i.quantity, 0);
      },

      getSubtotal: () => {
        return get().items.reduce((sum, i) => sum + (i.price * i.quantity), 0);
      },

      getShipping: () => {
        const subtotal = get().getSubtotal();
        return subtotal >= 200 ? 0 : 25;
      },

      getTotal: () => {
        return get().getSubtotal() + get().getShipping();
      },

      setOpen: (open) => set({ isOpen: open }),
      setPendingProduct: (product) => set({ pendingProduct: product }),
      setCheckoutOpen: (open) => set({ checkoutOpen: open }),
      setGuestCheckout: (guest) => set({ guestCheckout: guest }),
      setGuestInfo: (info) => set({ guestInfo: info }),
      clearGuest: () => set({ guestCheckout: false, guestInfo: null }),
    }),
    {
      name: 'qrshop-cart',
    }
  )
);
