export interface ShopLocation {
  venue: string;
  building?: string;
  floor?: string;
  svgId?: string;
}

export interface CartProduct {
  id: string;
  name: string;
  price: number;
  images: string[];
  shopId: string;
  shopName?: string;
  shopCode?: string;
  shopLocation?: ShopLocation;
}

export interface CartItem extends CartProduct {
  quantity: number;
  addedAt: number;
}

export interface CartState {
  items: CartItem[];
  isHydrated: boolean;
}
