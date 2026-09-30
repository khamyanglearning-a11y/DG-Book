/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AppSettings, Book } from './types';
import { getBooks } from './services/db';
import { isAdminAuthenticated } from './services/auth';
import { Navbar } from './components/Navbar';
import { HomePage } from './pages/HomePage';
import { LearnPage } from './pages/LearnPage';
import { SettingsPage } from './pages/SettingsPage';
import { AdminLoginPage } from './pages/AdminLoginPage';
import { AdminDashboard } from './pages/AdminDashboard';
import { QRScannerModal } from './components/QRScannerModal';
import { WifiOff } from 'lucide-react';

export default function App() {
  // App view state
  const [currentView, setCurrentView] = useState<'home' | 'learn' | 'settings' | 'admin' | 'admin-login'>('home');
  const [currentQrToken, setCurrentQrToken] = useState<string>('ABC123XYZ');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [sampleBooks, setSampleBooks] = useState<Book[]>([]);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  // User Settings with local persistence
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem('tai_dict_settings');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      darkMode: false,
      textSize: 'medium',
      audioSpeed: 1,
      autoPlayAudio: false,
    };
  });

  // Apply dark mode class to html element
  useEffect(() => {
    const root = document.documentElement;
    if (settings.darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('tai_dict_settings', JSON.stringify(settings));
  }, [settings]);

  // Network online/offline listener
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Parse path from URL to support direct bookmarking and QR code links: /learn/:token, /admin, /settings
  const parseUrl = () => {
    const path = window.location.pathname;
    if (path.startsWith('/learn/')) {
      const token = path.replace('/learn/', '').split('/')[0].split('?')[0];
      if (token) {
        setCurrentQrToken(token);
        setCurrentView('learn');
        return;
      }
    } else if (path === '/settings') {
      setCurrentView('settings');
      return;
    } else if (path === '/admin') {
      if (isAdminAuthenticated()) {
        setIsAdminLoggedIn(true);
        setCurrentView('admin');
      } else {
        setCurrentView('admin-login');
      }
      return;
    } else if (path === '/admin-login') {
      setCurrentView('admin-login');
      return;
    }
    setCurrentView('home');
  };

  useEffect(() => {
    parseUrl();
    setIsAdminLoggedIn(isAdminAuthenticated());

    // Listen for browser back / forward button
    const handlePopState = () => parseUrl();
    window.addEventListener('popstate', handlePopState);

    // Load initial sample books for home page preview
    getBooks().then((b) => setSampleBooks(b));

    // Register service worker if available
    if ('serviceWorker' in navigator && process.env.NODE_ENV !== 'test') {
      navigator.serviceWorker.register('/sw.js').catch((e) => {
        console.warn('Service worker registration failed:', e);
      });
    }

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const navigateTo = (view: 'home' | 'settings' | 'admin' | 'admin-login', pushState = true) => {
    setCurrentView(view);
    if (pushState) {
      const path = view === 'home' ? '/' : `/${view}`;
      window.history.pushState(null, '', path);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenLearnPage = (token: string, pushState = true) => {
    const cleanToken = token.trim();
    setCurrentQrToken(cleanToken);
    setCurrentView('learn');
    if (pushState) {
      window.history.pushState(null, '', `/learn/${cleanToken}`);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleUpdateSettings = (newPartial: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...newPartial }));
  };

  const handleScanSuccess = (token: string) => {
    setIsScannerOpen(false);
    handleOpenLearnPage(token);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white transition-colors duration-200">
      {/* Offline banner */}
      {!isOnline && (
        <div className="fixed top-0 inset-x-0 z-50 bg-black text-white dark:bg-white dark:text-black border-b border-stone-800 dark:border-stone-200 text-xs font-bold py-1.5 px-4 text-center flex items-center justify-center gap-1.5 shadow-md">
          <WifiOff className="w-3.5 h-3.5" />
          <span>Offline mode — You are browsing offline cached pages and vocabulary.</span>
        </div>
      )}

      {/* Main Navbar (hidden in admin dashboard to keep full work canvas, visible elsewhere) */}
      {currentView !== 'admin' && (
        <Navbar
          currentView={currentView}
          onNavigate={(view) => navigateTo(view)}
          onOpenScanner={() => setIsScannerOpen(true)}
        />
      )}

      {/* Content View Routing */}
      {currentView === 'home' && (
        <HomePage
          onOpenScanner={() => setIsScannerOpen(true)}
          onNavigate={(view) => navigateTo(view)}
          onSelectToken={(token) => handleOpenLearnPage(token)}
        />
      )}

      {currentView === 'learn' && (
        <LearnPage
          token={currentQrToken}
          textSize={settings.textSize}
          onNavigateHome={() => navigateTo('home')}
          onSelectToken={(token) => handleOpenLearnPage(token)}
        />
      )}

      {currentView === 'settings' && (
        <SettingsPage
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
          onNavigate={(view) => navigateTo(view)}
          isAdminLoggedIn={isAdminLoggedIn}
        />
      )}

      {currentView === 'admin-login' && (
        <AdminLoginPage
          onLoginSuccess={() => {
            setIsAdminLoggedIn(true);
            navigateTo('admin');
          }}
          onNavigateHome={() => navigateTo('home')}
        />
      )}

      {currentView === 'admin' && (
        <AdminDashboard
          onLogout={() => {
            setIsAdminLoggedIn(false);
            navigateTo('home');
          }}
          onNavigateHome={() => navigateTo('home')}
          onViewLearningPage={(token) => handleOpenLearnPage(token)}
        />
      )}

      {/* QR Code Camera Scanner Modal */}
      <QRScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleScanSuccess}
      />
    </div>
  );
}
