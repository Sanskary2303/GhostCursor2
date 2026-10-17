/**
 * ShopHive Order Data
 *
 * Mock order history with status timelines for the demo.
 */

export type OrderStatus = 'Pending' | 'Processing' | 'Shipped' | 'Delivered' | 'Returned';

/** A single event in an order's status timeline. */
export interface OrderTimelineEvent {
  status: OrderStatus;
  timestamp: string;
  description: string;
}

/** An item within an order. */
export interface OrderItem {
  productId: string;
  name: string;
  brand: string;
  size: number;
  quantity: number;
  price: number;
}

/** A complete order record. */
export interface Order {
  id: string;
  date: string;
  status: OrderStatus;
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  trackingNumber: string | null;
  timeline: OrderTimelineEvent[];
}

/** Sample order history for the demo user. */
export const orders: Order[] = [
  {
    id: 'SH-1024',
    date: '2024-10-24',
    status: 'Shipped',
    items: [
      {
        productId: 'air-max-90',
        name: 'Air Max 90',
        brand: 'Nike',
        size: 10,
        quantity: 1,
        price: 129.99,
      },
    ],
    subtotal: 129.99,
    shipping: 0.0,
    tax: 10.72,
    total: 140.71,
    trackingNumber: '1Z999SH10247890123',
    timeline: [
      { status: 'Pending', timestamp: '2024-10-24T09:00:00Z', description: 'Order placed successfully.' },
      { status: 'Processing', timestamp: '2024-10-24T11:30:00Z', description: 'Payment confirmed. Packaging order.' },
      { status: 'Shipped', timestamp: '2024-10-25T14:15:00Z', description: 'In transit with FedEx Express.' },
    ],
  },
  {
    id: 'ORD-20241001-A7X',
    date: '2024-10-01',
    status: 'Delivered',
    items: [
      {
        productId: 'air-max-90',
        name: 'Air Max 90',
        brand: 'Nike',
        size: 10,
        quantity: 1,
        price: 129.99,
      },
      {
        productId: 'chuck-taylor',
        name: 'Chuck Taylor All Star',
        brand: 'Converse',
        size: 10,
        quantity: 1,
        price: 64.99,
      },
    ],
    subtotal: 194.98,
    shipping: 0.0,
    tax: 16.09,
    total: 211.07,
    trackingNumber: '1Z999AA10123456784',
    timeline: [
      { status: 'Pending', timestamp: '2024-10-01T10:00:00Z', description: 'Order placed successfully.' },
      { status: 'Processing', timestamp: '2024-10-01T14:30:00Z', description: 'Payment confirmed. Preparing shipment.' },
      { status: 'Shipped', timestamp: '2024-10-02T09:15:00Z', description: 'Package shipped via UPS Ground.' },
      { status: 'Delivered', timestamp: '2024-10-05T16:42:00Z', description: 'Package delivered to front door.' },
    ],
  },
  {
    id: 'ORD-20241015-B3K',
    date: '2024-10-15',
    status: 'Shipped',
    items: [
      {
        productId: 'air-jordan-1',
        name: 'Air Jordan 1 Retro High OG',
        brand: 'Jordan',
        size: 11,
        quantity: 1,
        price: 179.99,
      },
    ],
    subtotal: 179.99,
    shipping: 0.0,
    tax: 14.85,
    total: 194.84,
    trackingNumber: '1Z999AA10987654321',
    timeline: [
      { status: 'Pending', timestamp: '2024-10-15T08:00:00Z', description: 'Order placed successfully.' },
      { status: 'Processing', timestamp: '2024-10-15T10:00:00Z', description: 'Payment confirmed. Preparing shipment.' },
      { status: 'Shipped', timestamp: '2024-10-16T11:30:00Z', description: 'Package shipped via FedEx Express.' },
    ],
  },
  {
    id: 'ORD-20241022-C9P',
    date: '2024-10-22',
    status: 'Processing',
    items: [
      {
        productId: 'ultra-boost',
        name: 'Ultra Boost 23',
        brand: 'Adidas',
        size: 9.5,
        quantity: 1,
        price: 189.99,
      },
      {
        productId: 'nb-550',
        name: 'New Balance 550',
        brand: 'New Balance',
        size: 9.5,
        quantity: 2,
        price: 109.99,
      },
    ],
    subtotal: 409.97,
    shipping: 0.0,
    tax: 33.82,
    total: 443.79,
    trackingNumber: null,
    timeline: [
      { status: 'Pending', timestamp: '2024-10-22T12:00:00Z', description: 'Order placed successfully.' },
      { status: 'Processing', timestamp: '2024-10-22T14:15:00Z', description: 'Payment confirmed. Preparing shipment.' },
    ],
  },
];
