import React, { useState } from 'react';
import { orders, Order } from '../data/orders';

export function Orders() {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(orders[0]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Delivered':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'Shipped':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Processing':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'Returned':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Your Orders</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Track shipments, view receipts, and manage returns</p>
        </div>
        <div className="bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-indigo-100 dark:border-indigo-900">
          <span>🛡️</span> 30-Day Hassle-Free Returns
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Order List */}
        <div className="lg:col-span-1 space-y-3">
          {orders.map((ord) => {
            const isSelected = selectedOrder?.id === ord.id;
            return (
              <div
                key={ord.id}
                onClick={() => setSelectedOrder(ord)}
                className={`p-4 rounded-2xl cursor-pointer border transition-all ${
                  isSelected
                    ? 'bg-white dark:bg-gray-800 border-indigo-600 shadow-md ring-1 ring-indigo-600'
                    : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 shadow-sm'
                }`}
                data-ghost-id={`orders.item.${ord.id}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="font-bold text-gray-900 dark:text-white text-sm">{ord.id}</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusBadge(ord.status)}`}>
                    {ord.status}
                  </span>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Placed on {ord.date}</div>
                <div className="text-xs text-gray-700 dark:text-gray-300 font-medium">
                  {ord.items.length} {ord.items.length === 1 ? 'item' : 'items'} • ${ord.total.toFixed(2)}
                </div>
              </div>
            );
          })}
        </div>


        {/* Order Details & Timeline */}
        <div className="lg:col-span-2">
          {selectedOrder ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 sm:p-8 border border-gray-100 dark:border-gray-700 shadow-sm space-y-6">
              {/* Header */}
              <div className="flex flex-wrap justify-between items-start gap-4 pb-4 border-b border-gray-100 dark:border-gray-700">
                <div>
                  <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Order Details</div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-0.5">{selectedOrder.id}</h2>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Order Date: {selectedOrder.date}</div>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusBadge(selectedOrder.status)}`}>
                    {selectedOrder.status}
                  </span>
                  {selectedOrder.trackingNumber && (
                    <a
                      href="#track"
                      onClick={(e) => {
                        e.preventDefault();
                        alert(`Tracking ${selectedOrder.trackingNumber} via Carrier Express`);
                      }}
                      className="px-3 py-1 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 border border-indigo-200 dark:border-indigo-800"
                      data-ghost-id="orders.tracking_link"
                    >
                      <span>🔍 Track Package</span>
                    </a>
                  )}
                </div>
              </div>

              {/* Items in this order */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">Items</h3>
                <div className="space-y-3">
                  {selectedOrder.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center py-2 border-b border-gray-50 dark:border-gray-700/50">
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-white text-sm">{item.name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {item.brand} • Size US {item.size} • Qty {item.quantity}
                        </div>
                      </div>
                      <div className="font-semibold text-gray-900 dark:text-white text-sm">
                        ${(item.price * item.quantity).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Shipment Timeline */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-4">Shipment Progress</h3>
                <div className="relative pl-6 space-y-6 before:content-[''] before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-indigo-100 dark:before:bg-indigo-900">
                  {selectedOrder.timeline.map((evt, idx) => (
                    <div key={idx} className="relative">
                      <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-indigo-600 ring-4 ring-indigo-50 dark:ring-indigo-950"></div>
                      <div className="text-sm font-semibold text-gray-900 dark:text-white">{evt.status}</div>
                      <div className="text-xs text-gray-400 dark:text-gray-400">{evt.timestamp}</div>
                      <div className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">{evt.description}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total Summary */}
              <div className="pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center text-sm">
                <span className="text-gray-500 dark:text-gray-400">Total Paid</span>
                <span className="text-lg font-bold text-gray-900 dark:text-white">${selectedOrder.total.toFixed(2)}</span>
              </div>
            </div>

          ) : (
            <div className="bg-white rounded-2xl p-12 text-center text-gray-500 border border-gray-100">
              Select an order to view timeline and tracking.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

