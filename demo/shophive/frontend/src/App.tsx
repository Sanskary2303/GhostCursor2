import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { NavigationHeader } from './components/NavigationHeader';
import { Catalog } from './pages/Catalog';
import { ProductDetail } from './pages/ProductDetail';
import { Cart } from './pages/Cart';
import { Checkout } from './pages/Checkout';
import { Orders } from './pages/Orders';
import { Settings } from './pages/Settings';

// =========================================================================
// [GHOST-CURSOR INTEGRATION - STEP 1: IMPORT SDK COMPONENT]
// Total additions: 1 import + 1 JSX component = ~9 lines
// =========================================================================
import { GhostCursor } from '@ghost-cursor/sdk/react';

function AppContent() {
  const { darkMode } = useTheme();

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-900'}`}>
      <NavigationHeader />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Routes>
          <Route path="/" element={<Catalog />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>

      <GhostCursor
        apiEndpoint={'/api/ghost-cursor'}
        theme={{
          primaryColor: '#6366f1',
          cursorColor: '#ef4444',
          position: 'bottom-right',
        }}
        requireApprovalForActions={true}
      />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <CartProvider>
          <AppContent />
        </CartProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}


