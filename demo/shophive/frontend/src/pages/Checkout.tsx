import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';

export function Checkout() {
  const { items, cartTotal, clearCart } = useCart();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    street: '',
    city: '',
    state: '',
    zip: '',
    cardName: 'Demo Customer',
    cardNumber: '•••• •••• •••• 4242',
    expDate: '12/28',
    cvv: '•••',
  });

  const [orderPlaced, setOrderPlaced] = useState(false);
  const [createdOrderId, setCreatedOrderId] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePlaceOrder = (e: React.FormEvent) => {
    e.preventDefault();
    const newId = `SH-${Math.floor(1000 + Math.random() * 9000)}`;
    setCreatedOrderId(newId);
    setOrderPlaced(true);
    clearCart();
  };

  const tax = cartTotal * 0.0825;
  const shipping = cartTotal > 75 ? 0 : 5.99;
  const orderFinalTotal = cartTotal + tax + (cartTotal > 0 ? shipping : 0);

  if (orderPlaced) {
    return (
      <div className="max-w-2xl mx-auto bg-white dark:bg-gray-800 rounded-2xl p-8 sm:p-12 text-center border border-gray-100 dark:border-gray-700 shadow-sm">
        <div className="w-16 h-16 bg-green-100 dark:bg-green-950/50 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">
          ✓
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Order Confirmed!</h1>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          Thank you for your purchase. Your order number is{' '}
          <span className="font-semibold text-indigo-600 dark:text-indigo-400" data-ghost-id="checkout.confirmed_id">
            {createdOrderId}
          </span>
          .
        </p>

        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 mb-6 text-left text-sm text-gray-600 dark:text-gray-300 space-y-1 border border-gray-100 dark:border-gray-700">
          <p>
            <span className="font-semibold text-gray-800 dark:text-gray-200">Shipped to:</span> {formData.street || '123 Main St'},{' '}
            {formData.city || 'New York'}, {formData.state || 'NY'} {formData.zip || '10001'}
          </p>
          <p>
            <span className="font-semibold text-gray-800 dark:text-gray-200">Payment:</span> Demo Card ending in 4242
          </p>
          <p>
            <span className="font-semibold text-gray-800 dark:text-gray-200">Total:</span> ${orderFinalTotal.toFixed(2)}
          </p>
        </div>


        <div className="flex justify-center gap-4">
          <Link
            to="/orders"
            className="px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-colors"
          >
            Track in Orders
          </Link>
          <Link
            to="/"
            className="px-6 py-2.5 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
          >
            Back to Catalog
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Checkout</h1>

      <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Shipping & Payment details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Shipping Address Section */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-700 pb-3 flex items-center gap-2">
              <span>📍</span> Shipping Address
            </h2>

            <div>
              <label htmlFor="street" className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1">
                Street Address
              </label>
              <input
                id="street"
                name="street"
                type="text"
                placeholder="123 Main St"
                required
                value={formData.street}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 bg-transparent text-gray-900 dark:text-white rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                data-ghost-id="checkout.address.street"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label htmlFor="city" className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1">
                  City
                </label>
                <input
                  id="city"
                  name="city"
                  type="text"
                  placeholder="New York"
                  required
                  value={formData.city}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 bg-transparent text-gray-900 dark:text-white rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                  data-ghost-id="checkout.address.city"
                />
              </div>

              <div>
                <label htmlFor="state" className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1">
                  State
                </label>
                <input
                  id="state"
                  name="state"
                  type="text"
                  placeholder="NY"
                  required
                  value={formData.state}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 bg-transparent text-gray-900 dark:text-white rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                  data-ghost-id="checkout.address.state"
                />
              </div>

              <div>
                <label htmlFor="zip" className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1">
                  ZIP Code
                </label>
                <input
                  id="zip"
                  name="zip"
                  type="text"
                  placeholder="10001"
                  required
                  value={formData.zip}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 bg-transparent text-gray-900 dark:text-white rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                  data-ghost-id="checkout.address.zip"
                />
              </div>
            </div>
          </div>

          {/* Payment Section (pre-filled mock) */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-700 pb-3 flex items-center gap-2">
              <span>💳</span> Payment Information
            </h2>
            <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white rounded-xl p-5 shadow-sm max-w-sm border border-gray-700">
              <div className="flex justify-between items-center mb-6">
                <span className="text-xs uppercase tracking-wider text-gray-400">Demo Card</span>
                <span className="font-bold tracking-widest text-sm">VISA</span>
              </div>
              <div className="text-lg font-mono tracking-widest mb-4">•••• •••• •••• 4242</div>
              <div className="flex justify-between items-center text-xs">
                <div>
                  <div className="text-gray-400 text-[10px] uppercase">Cardholder</div>
                  <div>Demo Customer</div>
                </div>
                <div>
                  <div className="text-gray-400 text-[10px] uppercase">Expires</div>
                  <div>12/28</div>
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-400">Demo sandbox mode active. No actual charges will occur.</p>
          </div>
        </div>

        {/* Order Summary & Submit */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm h-fit space-y-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-700 pb-3">Review & Place</h2>

          <div className="space-y-3 max-h-60 overflow-y-auto">
            {items.map((it) => {
              const itId = it.id || it.productId;
              const itSize = it.selectedSize ?? it.size ?? 10;
              return (
                <div key={`${itId}-${itSize}`} className="flex justify-between text-sm">
                  <div>
                    <div className="font-medium text-gray-800 dark:text-gray-200">{it.name}</div>
                    <div className="text-xs text-gray-400">
                      US {itSize} × {it.quantity}
                    </div>
                  </div>
                  <div className="font-semibold text-gray-800 dark:text-gray-200">${(it.price * it.quantity).toFixed(2)}</div>
                </div>
              );
            })}
          </div>

          <div className="border-t border-gray-100 dark:border-gray-700 pt-3 space-y-2 text-sm text-gray-600 dark:text-gray-300">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="text-gray-900 dark:text-white">${cartTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Tax (8.25%)</span>
              <span className="text-gray-900 dark:text-white">${tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Shipping</span>
              <span className="text-gray-900 dark:text-white">{shipping === 0 ? 'FREE' : `$${shipping.toFixed(2)}`}</span>
            </div>
            <div className="flex justify-between font-bold text-base text-gray-900 dark:text-white pt-2 border-t border-gray-100 dark:border-gray-700">
              <span>Total</span>
              <span className="text-indigo-600 dark:text-indigo-400">${orderFinalTotal.toFixed(2)}</span>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3.5 bg-indigo-600 text-white rounded-xl font-semibold shadow-md hover:bg-indigo-700 transition-all hover:shadow-lg"
            data-ghost-id="checkout.place_order"
          >
            Place Order (${orderFinalTotal.toFixed(2)})
          </button>
        </div>

      </form>
    </div>
  );
}

