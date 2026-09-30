import React from 'react';
import { Settings, Home, BookOpen, QrCode } from 'lucide-react';

interface NavbarProps {
  currentView: 'home' | 'learn' | 'settings' | 'admin' | 'admin-login';
  onNavigate: (view: 'home' | 'settings' | 'admin' | 'admin-login') => void;
  onOpenScanner?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, onNavigate, onOpenScanner }) => {
  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 dark:bg-black/95 backdrop-blur-md border-b border-black/10 dark:border-white/15 transition-colors">
      <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Brand */}
        <button
          onClick={() => onNavigate('home')}
          className="flex items-center gap-2.5 text-left group focus:outline-hidden"
        >
          <div className="w-10 h-10 rounded-2xl bg-black text-white dark:bg-white dark:text-black flex items-center justify-center shadow-sm transition group-hover:scale-105 border border-black dark:border-white">
            {/* Elegant Tai Emblem */}
            <span className="font-serif font-bold text-lg leading-none">တ</span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="font-extrabold text-sm sm:text-base tracking-tight text-black dark:text-white group-hover:opacity-80 transition">
                TAI DIGITAL DICTIONARY
              </h1>
            </div>
            <p className="text-[10px] text-stone-500 dark:text-stone-400 font-medium tracking-wide">
              တၢင်းႁူႉ လိၵ်ႈတႆး • Physical Book QR Portal
            </p>
          </div>
        </button>

        {/* Right Nav actions */}
        <div className="flex items-center gap-2">
          {currentView !== 'home' && (
            <button
              onClick={() => onNavigate('home')}
              className="p-2.5 rounded-xl text-black dark:text-white hover:bg-stone-100 dark:hover:bg-stone-900 border border-stone-200 dark:border-stone-800 transition active:scale-95"
              title="Home"
              aria-label="Home"
            >
              <Home className="w-5 h-5" />
            </button>
          )}

          {onOpenScanner && (
            <button
              onClick={onOpenScanner}
              className="sm:hidden p-2.5 rounded-xl bg-black text-white dark:bg-white dark:text-black hover:opacity-90 transition active:scale-95"
              title="Scan QR"
              aria-label="Scan QR Code"
            >
              <QrCode className="w-5 h-5" />
            </button>
          )}

          <button
            onClick={() => onNavigate('settings')}
            className={`p-2.5 rounded-xl transition active:scale-95 border ${
              currentView === 'settings'
                ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white shadow-xs'
                : 'text-black dark:text-white border-stone-200 dark:border-stone-800 hover:bg-stone-100 dark:hover:bg-stone-900'
            }`}
            title="Settings"
            aria-label="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
};
