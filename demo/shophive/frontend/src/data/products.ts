/**
 * ShopHive Product Data
 *
 * Mock product catalog of 6 sneakers with placeholder gradient backgrounds.
 * Each product includes all the fields needed for the storefront.
 */

/** Represents a sneaker product in the ShopHive catalog. */
export interface Product {
  id: string;
  name: string;
  brand: string;
  price: number;
  /** CSS gradient used as a placeholder for product images */
  image: string;
  gradient?: string;
  emoji?: string;
  sizes: number[];
  colors: string[];
  description: string;
  sku: string;
  inStock: boolean;
}


/** Available US men's shoe sizes (7 – 13 including half sizes) */
const ALL_SIZES = [7, 7.5, 8, 8.5, 9, 9.5, 10, 10.5, 11, 11.5, 12, 12.5, 13];

/** The full ShopHive product catalog. */
export const products: Product[] = [
  {
    id: 'air-max-90',
    name: 'Air Max 90',
    brand: 'Nike',
    price: 129.99,
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80',
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    emoji: '👟',
    sizes: ALL_SIZES,
    colors: ['Infrared/White', 'Black/Royal Blue', 'Grey/Volt'],
    description:
      'The Nike Air Max 90 stays true to its OG running roots with the iconic Waffle outsole, stitched overlays, and classic TPU accents. Fresh colors give a modern look while Max Air cushioning adds comfort to your journey.',
    sku: 'NK-AM90-001',
    inStock: true,
  },
  {
    id: 'air-jordan-1',
    name: 'Air Jordan 1 Retro High OG',
    brand: 'Jordan',
    price: 179.99,
    image: 'https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&w=800&q=80',
    gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    emoji: '🏀',
    sizes: ALL_SIZES,
    colors: ['Chicago', 'Royal Toe', 'Shadow 2.0'],
    description:
      'The Air Jordan 1 Retro High OG is a timeless silhouette that changed the sneaker game forever. Premium leather construction, iconic Wings logo, and Nike Air cushioning make this a must-have for any collection.',
    sku: 'JD-AJ1-002',
    inStock: true,
  },
  {
    id: 'ultra-boost',
    name: 'Ultra Boost 23',
    brand: 'Adidas',
    price: 189.99,
    image: 'https://images.unsplash.com/photo-1587563871167-1ee9c731aefb?auto=format&fit=crop&w=800&q=80',
    gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    emoji: '⚡',
    sizes: ALL_SIZES.filter((s) => s !== 12.5), // 12.5 out of stock
    colors: ['Core Black', 'Cloud White', 'Solar Red'],
    description:
      'Experience epic energy with the Adidas Ultraboost 23. Featuring a BOOST midsole that returns energy with every step, a Primeknit+ upper for adaptive support, and a Continental rubber outsole for all-weather grip.',
    sku: 'AD-UB23-003',
    inStock: true,
  },
  {
    id: 'nb-550',
    name: 'New Balance 550',
    brand: 'New Balance',
    price: 109.99,
    image: 'https://images.unsplash.com/photo-1539185441755-769473a23570?auto=format&fit=crop&w=800&q=80',
    gradient: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
    emoji: '🛹',
    sizes: ALL_SIZES,
    colors: ['White/Green', 'White/Navy', 'Sea Salt/Pink'],
    description:
      'The New Balance 550 brings back classic basketball style from the early 1990s. A clean leather upper, retro branding, and a durable rubber cupsole make this sneaker a versatile wardrobe staple.',
    sku: 'NB-550-004',
    inStock: true,
  },
  {
    id: 'chuck-taylor',
    name: 'Chuck Taylor All Star',
    brand: 'Converse',
    price: 64.99,
    image: 'https://images.unsplash.com/photo-1607522370275-f14206abe5d3?auto=format&fit=crop&w=800&q=80',
    gradient: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
    emoji: '⭐',
    sizes: ALL_SIZES,
    colors: ['Optical White', 'Black', 'Parchment'],
    description:
      'The Converse Chuck Taylor All Star is the icon that started it all. Timeless canvas construction, the signature rubber toe cap, and the unmistakable All Star patch make this sneaker eternally cool.',
    sku: 'CV-CT70-005',
    inStock: true,
  },
  {
    id: 'dunk-low',
    name: 'Dunk Low Retro',
    brand: 'Nike',
    price: 114.99,
    image: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&w=800&q=80',
    gradient: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
    emoji: '🔥',
    sizes: ALL_SIZES.filter((s) => s !== 13), // 13 out of stock
    colors: ['Panda', 'Grey Fog', 'University Red'],
    description:
      'Created for the hardwood but taken to the streets, the Nike Dunk Low Retro returns with crisp overlays and original team colors. Padded, low-cut collar and classic pivot-circle outsole provide comfort and traction.',
    sku: 'NK-DL-006',
    inStock: true,
  },
];


/**
 * Look up a product by its ID.
 * @param id - The product identifier
 * @returns The matching Product or undefined
 */
export function getProductById(id: string): Product | undefined {
  return products.find((p) => p.id === id);
}
