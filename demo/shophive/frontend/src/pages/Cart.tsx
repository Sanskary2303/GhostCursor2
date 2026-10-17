import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';

export function Cart() {
  const { items, removeItem, updateQuantity, cartTotal, clearCart } = useCart();
  const [promoCode, setPromoCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [promoMessage, setPromoMessage] = useState('');
  const navigate = useNavigate();

  const handleApplyPromo = () => {
    const code = promoCode.trim().toUpperCase();
    if (code === 'SAVE20') {
      if (cartTotal >= 100) {
        setDiscount(0.2);
        setPromoMessage('Promo SAVE20 applied: 20% discount!');
      } else {
        setPromoMessage('SAVE20 requires an order of at least $100.');
      }
    } else if (code === 'FREESHIP') {
      setDiscount(0.05); // symbolic discount representation or free shipping flag
      setPromoMessage('Promo FREESHIP applied: Free standard shipping!');
    } else {
      setPromoMessage('Invalid promo code. Try "SAVE20" or "FREESHIP".');
    }
  };

  const shippingCost = cartTotal > 75 || discount > 0 ? 0 : 5.99;
  const discountAmount = cartTotal * discount;
  const finalTotal = Math.max(0, cartTotal - discountAmount + (items.length > 0 ? shippingCost : 0));

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 flex items-center gap-2">
        <span>Shopping Cart</span>
        <span className="text-xl font-normal text-gray-500 dark:text-gray-400">({items.length} items)</span>
      </h1>

      {items.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center border border-gray-100 dark:border-gray-700 shadow-sm">
          <div className="text-6xl mb-4">🛒</div>
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">Your cart is empty</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">Looks like you haven't added any sneakers to your cart yet.</p>
          <Link
            to="/"
            className="inline-flex items-center px-6 py-3 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors shadow-sm"
          >
            Explore Sneakers
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items List */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => {
              const itemId = item.id || item.productId;
              const itemSize = item.selectedSize ?? item.size ?? 10;
              const bg = item.gradient || item.image || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
              return (
                <div
                  key={`${itemId}-${itemSize}`}
                  className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-6 border border-gray-100 dark:border-gray-700 shadow-sm flex items-center gap-4 sm:gap-6"
                  data-ghost-id={`cart.item.${itemId}`}
                >
                  <div
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl relative overflow-hidden flex items-center justify-center text-3xl sm:text-4xl flex-shrink-0 bg-gray-100 dark:bg-gray-900"
                    style={{ background: bg }}
                  >
                    {item.image?.startsWith('http') ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover object-center"
                      />
                    ) : (
                      item.emoji || '👟'
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 dark:text-white text-base sm:text-lg truncate">{item.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Size: US {itemSize}</p>
                    <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 mt-1">${item.price}</p>
                  </div>

                  {/* Quantity Controls */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(itemId, itemSize, item.quantity - 1)}
                      className="w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-600 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      -
                    </button>
                    <span className="w-8 text-center text-sm font-semibold text-gray-900 dark:text-white">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(itemId, itemSize, item.quantity + 1)}
                      className="w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-600 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      +
                    </button>
                  </div>

                  {/* Delete Button */}
                  <button
                    onClick={() => removeItem(itemId, itemSize)}
                    className="text-gray-400 hover:text-red-500 transition-colors p-2"
                    title="Remove item"
                  >
                    ✕
                  </button>
                </div>
              );
            })}

            <div className="flex justify-end pt-2">
              <button
                onClick={clearCart}
                className="text-sm text-gray-500 dark:text-gray-400 hover:text-red-600 transition-colors"
              >
                Clear Cart
              </button>
            </div>
          </div>

          {/* Order Summary & Promo */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm h-fit space-y-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-700 pb-3">Order Summary</h2>

            {/* Promo code input */}
            <div>
              <label htmlFor="promo" className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 uppercase tracking-wider">
                Promo Code
              </label>
              <div className="flex gap-2">
                <input
                  id="promo"
                  type="text"
                  placeholder="e.g. SAVE20"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl text-sm uppercase bg-transparent text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  data-ghost-id="cart.promo_code"
                />
                <button
                  onClick={handleApplyPromo}
                  className="px-4 py-2 bg-gray-900 dark:bg-gray-700 text-white rounded-xl text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-600 transition-colors"
                  data-ghost-id="cart.apply_promo"
                >
                  Apply
                </button>
              </div>
              {promoMessage && (
                <p className={`text-xs mt-2 ${promoMessage.includes('applied') ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>
                  {promoMessage}
                </p>
              )}
            </div>

            {/* Breakdown */}
            <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300 pt-2 border-t border-gray-100 dark:border-gray-700">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-semibold text-gray-900 dark:text-white">${cartTotal.toFixed(2)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-green-600 dark:text-green-400">
                  <span>Discount</span>
                  <span>-${discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Estimated Shipping</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {shippingCost === 0 ? 'FREE' : `$${shippingCost.toFixed(2)}`}
                </span>
              </div>
              <div className="flex justify-between text-base font-bold text-gray-900 dark:text-white pt-3 border-t border-gray-100 dark:border-gray-700">
                <span>Total</span>
                <span className="text-indigo-600 dark:text-indigo-400">${finalTotal.toFixed(2)}</span>
              </div>
            </div>


            {/* Checkout Button */}
            <button
              onClick={() => navigate('/checkout')}
              className="w-full py-3.5 bg-indigo-600 text-white rounded-xl font-semibold shadow-md hover:bg-indigo-700 transition-all hover:shadow-lg flex items-center justify-center gap-2"
              data-ghost-id="cart.checkout_btn"
            >
              <span>Proceed to Checkout</span>
              <span>→</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

