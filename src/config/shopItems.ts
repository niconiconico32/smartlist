/**
 * shopItems.ts
 * Catálogo local de items de la tienda (bundleados en el build).
 * Los items remotos (Supabase) se fusionan en el hook useShopItems.
 */

const BG_PRICE = 500;
const OUTFIT_PRICE = 650;

export type ShopItem = {
  id: string;
  name: string;
  price: number;
  isPro?: boolean;
  type: 'background' | 'outfit';
  /** Imagen local (require). Presente solo en items bundleados. */
  image?: any;
  /** URL de imagen remota (Supabase Storage). Presente solo en items remotos. */
  imageUri?: string;
  sort_order?: number;
};

export const SHOP_ITEMS: ShopItem[] = [
  // ── Backgrounds (PNG originales) ───────────────────────────────────────────
  {
    id: 'bg_spring',
    name: 'Primavera',
    price: BG_PRICE,
    type: 'background',
    image: require('@/assets/images/pixelbgs/spring.png'),
  },
  {
    id: 'bg_beach',
    name: 'Playa',
    price: BG_PRICE,
    type: 'background',
    image: require('@/assets/images/pixelbgs/beach.png'),
  },
  {
    id: 'bg_autumn',
    name: 'Otoño',
    price: BG_PRICE,
    type: 'background',
    image: require('@/assets/images/pixelbgs/autumm.png'),
  },
  {
    id: 'bg_winter',
    name: 'Invierno',
    price: BG_PRICE,
    type: 'background',
    image: require('@/assets/images/pixelbgs/winter.png'),
  },
  {
    id: 'bg_woods',
    name: 'Bosque',
    price: BG_PRICE,
    type: 'background',
    image: require('@/assets/images/pixelbgs/woods.png'),
  },
  // ── Backgrounds (WEBP nuevos) ──────────────────────────────────────────────
  {
    id: 'bg_w1',
    name: 'Fondo 1',
    price: 1250,
    isPro: true,
    type: 'background',
    image: require('@/assets/images/pixelbgs/1.webp'),
  },
  {
    id: 'bg_w2',
    name: 'Fondo 2',
    price: 1250,
    isPro: true,
    type: 'background',
    image: require('@/assets/images/pixelbgs/2.webp'),
  },
  {
    id: 'bg_w3',
    name: 'Fondo 3',
    price: 1250,
    isPro: true,
    type: 'background',
    image: require('@/assets/images/pixelbgs/3.webp'),
  },
  {
    id: 'bg_w4',
    name: 'Fondo 4',
    price: 1250,
    type: 'background',
    image: require('@/assets/images/pixelbgs/4.webp'),
  },
  {
    id: 'bg_w5',
    name: 'Fondo 5',
    price: 1250,
    isPro: true,
    type: 'background',
    image: require('@/assets/images/pixelbgs/5.webp'),
  },
  {
    id: 'bg_w6',
    name: 'Fondo 6',
    price: 1250,
    isPro: true,
    type: 'background',
    image: require('@/assets/images/pixelbgs/6.webp'),
  },
  {
    id: 'bg_w7',
    name: 'Fondo 7',
    price: 1250,
    type: 'background',
    image: require('@/assets/images/pixelbgs/7.webp'),
  },
  {
    id: 'bg_w8',
    name: 'Fondo 8',
    price: 1250,
    isPro: true,
    type: 'background',
    image: require('@/assets/images/pixelbgs/8.webp'),
  },
  {
    id: 'bg_w9',
    name: 'Fondo 9',
    price: 1650,
    type: 'background',
    image: require('@/assets/images/pixelbgs/9.webp'),
  },
  {
    id: 'bg_w10',
    name: 'Fondo 10',
    price: 1650,
    isPro: true,
    type: 'background',
    image: require('@/assets/images/pixelbgs/10.webp'),
  },
  // ── Outfits (PNG originales) ───────────────────────────────────────────────
  {
    id: 'outfit_1_1',
    name: 'Outfit 1',
    price: OUTFIT_PRICE,
    type: 'outfit',
    image: require('@/assets/images/outfits/1_1.png'),
  },
  {
    id: 'outfit_1_2',
    name: 'Outfit 2',
    price: OUTFIT_PRICE,
    type: 'outfit',
    image: require('@/assets/images/outfits/1_2.png'),
  },
  {
    id: 'outfit_1_3',
    name: 'Outfit 3',
    price: OUTFIT_PRICE,
    type: 'outfit',
    image: require('@/assets/images/outfits/1_3.png'),
  },
  {
    id: 'outfit_1_4',
    name: 'Outfit 4',
    price: OUTFIT_PRICE,
    type: 'outfit',
    image: require('@/assets/images/outfits/1_4.png'),
  },
  // ── Outfits (WEBP nuevos) ──────────────────────────────────────────────────
  {
    id: 'outfit_w5',
    name: 'Outfit 5',
    price: 1600,
    type: 'outfit',
    image: require('@/assets/images/outfits/5.webp'),
  },
  {
    id: 'outfit_w6',
    name: 'Outfit 6',
    price: 1750,
    type: 'outfit',
    image: require('@/assets/images/outfits/6.webp'),
  },
  {
    id: 'outfit_w7',
    name: 'Outfit 7',
    price: 1900,
    type: 'outfit',
    image: require('@/assets/images/outfits/7.webp'),
  },
  {
    id: 'outfit_w8',
    name: 'Outfit 8',
    price: 1750,
    type: 'outfit',
    image: require('@/assets/images/outfits/8.webp'),
  },
  {
    id: 'outfit_w9',
    name: 'Outfit 9',
    price: 1750,
    isPro: true,
    type: 'outfit',
    image: require('@/assets/images/outfits/9.webp'),
  },
  {
    id: 'outfit_w10',
    name: 'Outfit 10',
    price: 1750,
    isPro: true,
    type: 'outfit',
    image: require('@/assets/images/outfits/10.webp'),
  },
  {
    id: 'outfit_w11',
    name: 'Outfit 11',
    price: 1750,
    isPro: true,
    type: 'outfit',
    image: require('@/assets/images/outfits/11.webp'),
  },
  {
    id: 'outfit_w12',
    name: 'Outfit 12',
    price: 2200,
    isPro: true,
    type: 'outfit',
    image: require('@/assets/images/outfits/12.webp'),
  },
  {
    id: 'outfit_w13',
    name: 'Outfit 13',
    price: 1750,
    isPro: true,
    type: 'outfit',
    image: require('@/assets/images/outfits/13.webp'),
  },
  {
    id: 'outfit_w14',
    name: 'Outfit 14',
    price: 1750,
    isPro: true,
    type: 'outfit',
    image: require('@/assets/images/outfits/14.webp'),
  },
];
