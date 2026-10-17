import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { products } from '../data/products';
import { useCart } from '../context/CartContext';

export function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const product = products.find((p) => p.id === id);
  const { addItem } = useCart();
  const [selectedSize, setSelectedSize] = useState<number | null>(null);
  const [added, setAdded] = useState(false);

  if (!product) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-gray-400">Product not found</h2>
        <Link to="/" className="text-indigo-600 mt-4 inline-block">← Back to catalog</Link>
      </div>
    );
  }

  const handleAddToCart = () => {
    if (selectedSize === null) return;
    addItem({ ...product, productId: product.id, selectedSize });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div className="max-w-5xl mx-auto">
      <Link to="/" className="text-indigo-600 dark:text-indigo-400 text-sm mb-6 inline-block hover:underline">
        ← Back to catalog
      </Link>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="grid md:grid-cols-2 gap-0">
          {/* Product Image */}
          <div
            className="h-80 md:h-full relative min-h-[360px] flex items-center justify-center overflow-hidden bg-gray-100 dark:bg-gray-900"
            style={{ background: product.gradient }}
          >
            {product.image?.startsWith('http') ? (
              <img
                src={product.image}
                alt={product.name}
                className="w-full h-full object-cover object-center"
              />
            ) : (
              <span className="text-8xl">{product.emoji || '👟'}</span>
            )}
          </div>

          {/* Product Info */}
          <div className="p-8">
            <p className="text-sm text-indigo-600 dark:text-indigo-400 font-semibold uppercase tracking-wider mb-1">
              {product.brand}
            </p>
            <h1
              data-ghost-id="product.title"
              className="text-3xl font-bold text-gray-900 dark:text-white mb-2"
            >
              {product.name}
            </h1>
            <p
              data-ghost-id="product.price"
              className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mb-4"
            >
              ${product.price}
            </p>
            <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">{product.description}</p>

            {/* Size Selector */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">Select Size (US Men's)</h3>
              <div className="flex flex-wrap gap-2">
                {product.sizes.map((sz) => (
                  <button
                    key={sz}
                    data-ghost-id={`product.size.${sz}`}
                    onClick={() => setSelectedSize(sz)}
                    className={`w-14 h-10 rounded-lg text-sm font-medium border transition-all
                      ${selectedSize === sz
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                        : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-600 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400'
                      }`}
                  >
                    {sz}
                  </button>
                ))}
              </div>
              {!selectedSize && (
                <p className="text-xs text-gray-400 dark:text-gray-400 mt-2">Please select a size to continue</p>
              )}
            </div>

            {/* Stock Status */}
            <div className="flex items-center gap-2 mb-6">
              <span className={`w-2 h-2 rounded-full ${product.inStock ? 'bg-green-500' : 'bg-red-500'}`}></span>
              <span className="text-sm text-gray-600 dark:text-gray-300">
                {product.inStock ? 'In Stock' : 'Out of Stock'}
              </span>
              <span className="text-xs text-gray-400 dark:text-gray-400">SKU: {product.sku}</span>
            </div>


            {/* Add to Cart Button */}
            <button
              data-ghost-id="product.add_to_cart_btn"
              onClick={handleAddToCart}
              disabled={!selectedSize || !product.inStock}
              className={`w-full py-3 px-6 rounded-xl text-base font-semibold transition-all duration-300
                ${!selectedSize || !product.inStock
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : added
                  ? 'bg-green-500 text-white shadow-lg'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg hover:shadow-xl hover:-translate-y-0.5'
                }`}
            >
              {added ? '✓ Added to Cart!' : 'Add to Cart'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

