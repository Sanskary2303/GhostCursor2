import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';

export function Settings() {
  const { darkMode, setDarkMode } = useTheme();
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(false);
  const [pushAlerts, setPushAlerts] = useState(true);


  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Account Settings</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
          Manage system preferences, notifications, and shipping addresses
        </p>
      </div>

      {/* Appearance Section */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 sm:p-8 border border-gray-100 dark:border-gray-700 shadow-sm space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <span>🎨</span> Appearance
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Customize the look and feel of your ShopHive experience
            </p>
          </div>

          {/* Theme Toggle Switch */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {darkMode ? '🌙 Dark Mode' : '☀️ Light Mode'}
            </span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={darkMode}
                onChange={(e) => setDarkMode(e.target.checked)}
                className="sr-only peer"
                data-ghost-id="settings.theme_toggle"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>
        </div>

        {/* Notifications Section */}
        <div className="space-y-4 pt-2">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span>🔔</span> Notifications & Alerts
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Choose what updates and promotions you'd like to receive
          </p>

          <div className="space-y-3 pt-2">
            <label className="flex items-center justify-between p-3 rounded-xl border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer">
              <div>
                <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">Email Order Updates</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Receive receipts, tracking updates, and return confirmations</div>
              </div>
              <input
                type="checkbox"
                checked={emailAlerts}
                onChange={(e) => setEmailAlerts(e.target.checked)}
                className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                data-ghost-id="settings.notif_email"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer">
              <div>
                <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">SMS Delivery Alerts</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Real-time text alerts when your package is out for delivery</div>
              </div>
              <input
                type="checkbox"
                checked={smsAlerts}
                onChange={(e) => setSmsAlerts(e.target.checked)}
                className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                data-ghost-id="settings.notif_sms"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer">
              <div>
                <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">Browser Push Notifications</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Instant alerts for flash drops and restocks</div>
              </div>
              <input
                type="checkbox"
                checked={pushAlerts}
                onChange={(e) => setPushAlerts(e.target.checked)}
                className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                data-ghost-id="settings.notif_push"
              />
            </label>
          </div>
        </div>

        {/* Saved Addresses Section */}
        <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span>📦</span> Saved Shipping Address
          </h2>
          <div
            className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-sm"
            data-ghost-id="settings.saved_address"
          >
            <div className="font-semibold text-gray-800 dark:text-gray-200">Default Shipping Address</div>
            <div className="text-gray-600 dark:text-gray-400 mt-1">123 Main St, Apt 4B</div>
            <div className="text-gray-600 dark:text-gray-400">New York, NY 10001</div>
            <div className="text-gray-600 dark:text-gray-400">United States</div>
          </div>
        </div>
      </div>
    </div>
  );
}

