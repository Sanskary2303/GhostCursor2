import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';

export function NavigationHeader() {
  const location = useLocation();
  const { cartCount } = useCart();

  const isActive = (path: string) =>
    location.pathname === path
      ? 'text-indigo-600 dark:text-indigo-400 font-semibold'
      : 'text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400';

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-100 dark:border-gray-700 sticky top-0 z-50 transition-colors">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 text-xl font-bold text-gray-900 dark:text-white" data-ghost-nav="/">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-sm">
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M16 7a4 4 0 0 0-8 0v2H5a1 1 0 0 0-1 1v9a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-9a1 1 0 0 0-1-1h-3V7zm-2 2h-4V7a2 2 0 1 1 4 0v2zm-5 4a1 1 0 1 1 0-2 1 1 0 0 1 0 2zm6 0a1 1 0 1 1 0-2 1 1 0 0 1 0 2z"/>
            </svg>
          </div>
          <span className="bg-gradient-to-r from-indigo-500 to-violet-500 bg-clip-text text-transparent">
            ShopHive
          </span>
        </Link>

        {/* Navigation Links */}
        <div className="flex items-center gap-6">
          <Link
            to="/"
            className={`text-sm transition-colors ${isActive('/')}`}
            data-ghost-nav="/"
          >
            Home
          </Link>
          <Link
            to="/cart"
            className={`text-sm transition-colors relative ${isActive('/cart')}`}
            data-ghost-nav="cart"
            data-ghost-id="nav.cart"
          >
            🛒 Cart
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-4 bg-indigo-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-semibold animate-bounce">
                {cartCount}
              </span>
            )}
          </Link>
          <Link
            to="/orders"
            className={`text-sm transition-colors ${isActive('/orders')}`}
            data-ghost-nav="orders"
            data-ghost-id="nav.orders"
          >
            📦 Orders
          </Link>
          <Link
            to="/settings"
            className={`text-sm transition-colors ${isActive('/settings')}`}
            data-ghost-nav="settings"
            data-ghost-id="nav.settings"
          >
            ⚙️ Settings
          </Link>
        </div>
      </nav>
    </header>
  );

}

