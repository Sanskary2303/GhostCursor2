import React from 'react';
import { Link } from 'react-router-dom';
import { products } from '../data/products';

export function Catalog() {
  return (
    <div>
      {/* Hero */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-3">
          Welcome to ShopHive <span className="text-3xl">👟</span>
        </h1>
        <p className="text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
          Discover the latest sneakers and sportswear. Ask our AI co-pilot for help anytime!
        </p>
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {products.map((product) => (
          <Link
            key={product.id}
            to={`/product/${product.id}`}
            className="group bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
            data-ghost-id={`catalog.product.${product.id}`}
          >
            {/* Product Image */}
            <div
              className="h-56 relative overflow-hidden flex items-center justify-center bg-gray-100 dark:bg-gray-900"
              style={{ background: product.gradient }}
            >
              {product.image?.startsWith('http') ? (
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
              ) : (
                <span className="text-6xl">{product.emoji || '👟'}</span>
              )}
            </div>

            {/* Product Info */}
            <div className="p-5">
              <p className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold uppercase tracking-wider mb-1">
                {product.brand}
              </p>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                {product.name}
              </h3>
              <div className="flex items-center justify-between mt-3">
                <span className="text-xl font-bold text-gray-900 dark:text-white">${product.price}</span>
                <span className="text-sm text-indigo-600 dark:text-indigo-400 font-medium group-hover:translate-x-1 transition-transform">
                  View Details →
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>

    </div>
  );
}

