import React, { useEffect, useState } from 'react';
import { Camera, Settings, BookOpen, Volume2, Sparkles, ArrowRight, RefreshCw, QrCode } from 'lucide-react';
import { Page, Book } from '../types';
import { getPages, getBooks, subscribeToDatabaseChanges } from '../services/db';

interface HomePageProps {
  onOpenScanner: () => void;
  onNavigate: (view: 'home' | 'settings' | 'admin' | 'admin-login') => void;
  onSelectToken: (token: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  onOpenScanner,
  onNavigate,
  onSelectToken,
}) => {
  const [publishedPages, setPublishedPages] = useState<(Page & { book_title?: string })[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPublishedData = async () => {
    try {
      const [pages, books] = await Promise.all([getPages(), getBooks()]);
      const mapped = pages.slice(0, 6).map((p) => {
        const book = books.find((b) => b.id === p.book_id);
        return {
          ...p,
          book_title: book?.title || 'Tai Physical Book',
        };
      });
      setPublishedPages(mapped);
    } catch (e) {
      console.warn('Failed to load published pages:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPublishedData();

    // Real-time synchronization: when admin publishes or edits in Supabase, update immediately!
    const unsubscribe = subscribeToDatabaseChanges(['books', 'pages'], () => {
      loadPublishedData();
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <div className="relative min-h-[calc(100vh-4rem)] flex flex-col justify-between px-4 py-8 max-w-xl mx-auto">
      {/* Background Tai Cultural Geometry Motif */}
      <div className="absolute inset-0 pointer-events-none opacity-5 dark:opacity-10 overflow-hidden -z-10">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none">
          <pattern id="tai-lattice" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 0 10 L 10 0 L 20 10 L 10 20 Z" fill="none" stroke="currentColor" strokeWidth="0.5" />
            <circle cx="10" cy="10" r="2" fill="currentColor" />
          </pattern>
          <rect width="100%" height="100%" fill="url(#tai-lattice)" />
        </svg>
      </div>

      {/* Main Content Card */}
      <div className="flex-1 flex flex-col items-center justify-center text-center my-auto">
        {/* Cultural Seal Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-stone-100 dark:bg-stone-900 border border-black/20 dark:border-white/25 mb-6">
          <span className="w-2 h-2 rounded-full bg-black dark:bg-white animate-pulse" />
          <span className="text-xs font-semibold text-black dark:text-white tracking-wider uppercase">
            Tai Language Revitalization Platform
          </span>
        </div>

        {/* Title */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-black dark:text-white mb-3 font-serif">
          TAI DIGITAL DICTIONARY
        </h1>

        {/* Subtitle */}
        <p className="text-lg sm:text-xl font-medium text-stone-700 dark:text-stone-300 mb-8 max-w-md">
          Learn • Listen • Understand
        </p>

        {/* Giant Mobile-First SCAN QR Button */}
        <div className="w-full max-w-xs mb-8">
          <button
            type="button"
            onClick={onOpenScanner}
            className="w-full relative group overflow-hidden flex items-center justify-center gap-3.5 py-5 px-6 rounded-3xl bg-black text-white hover:bg-stone-800 dark:bg-white dark:text-black dark:hover:bg-stone-200 active:scale-95 transition-all duration-150 border-2 border-black dark:border-white shadow-xl"
            aria-label="Scan QR Code from Book"
          >
            {/* Subtle light sweep effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
            
            <div className="w-12 h-12 rounded-2xl bg-white text-black dark:bg-black dark:text-white flex items-center justify-center shadow-inner border border-stone-200 dark:border-stone-800">
              <Camera className="w-7 h-7" />
            </div>
            <div className="text-left">
              <span className="block text-xl tracking-wide font-black">SCAN QR</span>
              <span className="block text-[11px] font-normal text-stone-300 dark:text-stone-700">Point at book page</span>
            </div>
          </button>
        </div>

        {/* Quick Instructions & Highlights */}
        <div className="w-full grid grid-cols-3 gap-2.5 mb-8 text-black dark:text-white">
          <div className="p-3 rounded-2xl bg-white dark:bg-black border border-stone-300 dark:border-stone-800 shadow-xs flex flex-col items-center">
            <BookOpen className="w-5 h-5 text-black dark:text-white mb-1.5" />
            <span className="text-xs font-semibold">Physical Book</span>
            <span className="text-[10px] text-stone-500">Scan QR Code</span>
          </div>

          <div className="p-3 rounded-2xl bg-white dark:bg-black border border-stone-300 dark:border-stone-800 shadow-xs flex flex-col items-center">
            <Volume2 className="w-5 h-5 text-black dark:text-white mb-1.5" />
            <span className="text-xs font-semibold">Authentic Audio</span>
            <span className="text-[10px] text-stone-500">Elder voice notes</span>
          </div>

          <div className="p-3 rounded-2xl bg-white dark:bg-black border border-stone-300 dark:border-stone-800 shadow-xs flex flex-col items-center">
            <Sparkles className="w-5 h-5 text-black dark:text-white mb-1.5" />
            <span className="text-xs font-semibold">Word Meanings</span>
            <span className="text-[10px] text-stone-500">Assamese & Eng</span>
          </div>
        </div>

        {/* Real Published Book Pages Section (Real-Time from Supabase) */}
        <div className="w-full text-left bg-white dark:bg-black border border-stone-300 dark:border-stone-800 rounded-3xl p-5 shadow-xs mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
              Published Pages Catalog
            </h3>
            <span className="text-[11px] text-black dark:text-white font-mono font-bold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-black dark:bg-white animate-ping" />
              Real-time
            </span>
          </div>

          {loading ? (
            <div className="p-6 text-center text-xs text-stone-400 flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Checking Supabase catalog...</span>
            </div>
          ) : publishedPages.length > 0 ? (
            <div className="space-y-2.5">
              {publishedPages.map((page) => (
                <button
                  key={page.id}
                  type="button"
                  onClick={() => onSelectToken(page.qr_token)}
                  className="w-full text-left p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-900 hover:bg-stone-100 dark:hover:bg-stone-800 border border-stone-200 dark:border-stone-800 flex items-center justify-between group transition active:scale-98"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-black text-white dark:bg-white dark:text-black text-[10px] font-bold">
                        Pg {page.page_number}
                      </span>
                      <span className="text-xs font-bold text-black dark:text-white">
                        {page.book_title}
                      </span>
                    </div>
                    {page.page_title && (
                      <p className="text-[11px] text-stone-600 dark:text-stone-400 mt-1 line-clamp-1">
                        {page.page_title}
                      </p>
                    )}
                    <span className="text-[10px] font-mono text-stone-400 mt-0.5 block">
                      Token: {page.qr_token}
                    </span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-stone-400 group-hover:text-black dark:group-hover:text-white group-hover:translate-x-1 transition" />
                </button>
              ))}
            </div>
          ) : (
            <div className="p-6 rounded-2xl bg-stone-50 dark:bg-stone-900/50 border border-dashed border-stone-300 dark:border-stone-800 text-center">
              <QrCode className="w-8 h-8 text-stone-400 mx-auto mb-2" />
              <p className="text-xs font-bold text-black dark:text-white">No pages published in Supabase yet</p>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">
                Scan a physical book QR code with the camera, or log in as administrator to publish books and pages.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Footer / Secondary Action */}
      <div className="w-full flex items-center justify-between pt-4 border-t border-stone-300 dark:border-stone-800 text-xs text-stone-500">
        <button
          type="button"
          onClick={() => onNavigate('settings')}
          className="flex items-center gap-1.5 py-2 px-3 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-900 text-black dark:text-white transition border border-stone-200 dark:border-stone-800"
        >
          <Settings className="w-4 h-4" />
          <span>⚙ Settings</span>
        </button>

        <span className="text-[11px] text-stone-500 dark:text-stone-400 font-medium">
          No login required for learners
        </span>
      </div>
    </div>
  );
};
