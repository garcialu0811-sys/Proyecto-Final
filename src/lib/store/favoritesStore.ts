import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface FavoriteItem {
  productId: string;
  name: string;
  price: number;
  imageUrl: string;
  category: string;
  addedAt: string;
}

interface FavoritesStore {
  items: FavoriteItem[];
  addFavorite: (product: Omit<FavoriteItem, 'addedAt'>) => void;
  removeFavorite: (productId: string) => void;
  isFavorite: (productId: string) => boolean;
}

export const useFavoritesStore = create<FavoritesStore>()(
  persist(
    (set, get) => ({
      items: [],

      addFavorite: (product) => {
        const items = get().items;
        if (items.find(i => i.productId === product.productId)) return;
        set({ items: [...items, { ...product, addedAt: new Date().toISOString() }] });
      },

      removeFavorite: (productId) => {
        set({ items: get().items.filter(i => i.productId !== productId) });
      },

      isFavorite: (productId) => {
        return get().items.some(i => i.productId === productId);
      },
    }),
    {
      name: 'qrshop-favorites',
    }
  )
);
