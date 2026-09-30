import React from 'react';
import { AppSettings, TextSize } from '../types';
import { PWAInstallButton } from '../components/PWAInstallButton';
import { Moon, Sun, Type, Gauge, Lock, ChevronLeft, Info, BookOpen } from 'lucide-react';

interface SettingsPageProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  onNavigate: (view: 'home' | 'settings' | 'admin' | 'admin-login') => void;
  isAdminLoggedIn: boolean;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  settings,
  onUpdateSettings,
  onNavigate,
  isAdminLoggedIn,
}) => {
  return (
    <div className="max-w-xl mx-auto px-4 py-6 sm:py-8 pb-20">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => onNavigate('home')}
          className="p-2 rounded-xl text-stone-600 dark:text-stone-300 hover:bg-stone-200/60 dark:hover:bg-stone-800 transition"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-2xl font-bold font-serif text-stone-900 dark:text-stone-50">
            Settings
          </h2>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            Personalize your reading and audio experience
          </p>
        </div>
      </div>

      <div className="space-y-5">
        {/* Appearance: Dark Mode */}
        <div className="bg-white dark:bg-black border border-stone-300 dark:border-stone-800 rounded-3xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-stone-100 text-black dark:bg-stone-900 dark:text-white flex items-center justify-center border border-stone-200 dark:border-stone-800">
                {settings.darkMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="text-sm font-bold text-black dark:text-white">
                  Dark Mode
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  High-contrast mode for night and low-light reading
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onUpdateSettings({ darkMode: !settings.darkMode })}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-hidden ${
                settings.darkMode ? 'bg-white' : 'bg-black'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full transition-transform ${
                  settings.darkMode ? 'translate-x-6 bg-black' : 'translate-x-1 bg-white'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Text Size */}
        <div className="bg-white dark:bg-black border border-stone-300 dark:border-stone-800 rounded-3xl p-5 shadow-xs">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-2xl bg-stone-100 text-black dark:bg-stone-900 dark:text-white flex items-center justify-center border border-stone-200 dark:border-stone-800">
              <Type className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-black dark:text-white">
                Text Size
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Optimized for elderly learners and new readers
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            {(['small', 'medium', 'large'] as TextSize[]).map((size) => {
              const labels = {
                small: { title: 'A-', desc: 'Small' },
                medium: { title: 'A', desc: 'Medium' },
                large: { title: 'A+', desc: 'Large' },
              }[size];

              const isSelected = settings.textSize === size;

              return (
                <button
                  key={size}
                  type="button"
                  onClick={() => onUpdateSettings({ textSize: size })}
                  className={`py-3 px-2 rounded-2xl text-center transition-all border ${
                    isSelected
                      ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white shadow-xs ring-2 ring-stone-400'
                      : 'bg-stone-50 dark:bg-stone-900 text-black dark:text-white border-stone-200 dark:border-stone-800 hover:bg-stone-100 dark:hover:bg-stone-800'
                  }`}
                >
                  <span className="block text-lg font-bold font-serif leading-none mb-1">
                    {labels.title}
                  </span>
                  <span className="block text-[11px] font-medium opacity-80">
                    {labels.desc}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Audio Playback Speed Preference */}
        <div className="bg-white dark:bg-black border border-stone-300 dark:border-stone-800 rounded-3xl p-5 shadow-xs">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-2xl bg-stone-100 text-black dark:bg-stone-900 dark:text-white flex items-center justify-center border border-stone-200 dark:border-stone-800">
              <Gauge className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-black dark:text-white">
                Default Audio Speed
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Slower playback helps with delicate phonetic tones
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            {[0.75, 1.0, 1.25].map((speed) => {
              const isSelected = settings.audioSpeed === speed;
              return (
                <button
                  key={speed}
                  type="button"
                  onClick={() => onUpdateSettings({ audioSpeed: speed })}
                  className={`py-2.5 px-3 rounded-2xl text-center text-xs font-bold transition-all border ${
                    isSelected
                      ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white shadow-xs'
                      : 'bg-stone-50 dark:bg-stone-900 text-black dark:text-white border-stone-200 dark:border-stone-800 hover:bg-stone-100 dark:hover:bg-stone-800'
                  }`}
                >
                  {speed === 0.75 ? '0.75x Slow' : speed === 1.0 ? '1.0x Normal' : '1.25x Fast'}
                </button>
              );
            })}
          </div>
        </div>

        {/* Install Progressive Web App */}
        <div className="bg-white dark:bg-black border border-stone-300 dark:border-stone-800 rounded-3xl p-5 shadow-xs flex items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-black dark:text-white">
              Install App on Device
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Fast offline access from home screen
            </p>
          </div>
          <PWAInstallButton />
        </div>

        {/* Cultural Language Note */}
        <div className="p-4 rounded-3xl bg-stone-100 dark:bg-stone-900 border border-stone-300 dark:border-stone-800 flex items-start gap-3">
          <BookOpen className="w-5 h-5 text-black dark:text-white flex-shrink-0 mt-0.5" />
          <div className="text-xs text-stone-700 dark:text-stone-300 leading-relaxed">
            <strong className="text-black dark:text-white">About Tai Digital Dictionary:</strong> This open digital companion is designed to accompany physical textbooks and revitalizing literature in Tai Khamyang, Tai Phake, Tai Ahom, and related Southwestern Tai language traditions in Northeast India.
          </div>
        </div>

        {/* Divider & Admin Login Section */}
        <div className="pt-6 border-t border-stone-300 dark:border-stone-800">
          <div className="text-xs font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500 mb-3">
            Administrator
          </div>

          <div className="bg-white dark:bg-black border border-stone-300 dark:border-stone-800 rounded-3xl p-5 shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-stone-100 dark:bg-stone-900 text-black dark:text-white flex items-center justify-center border border-stone-200 dark:border-stone-800">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-black dark:text-white">
                  {isAdminLoggedIn ? 'Admin Dashboard' : 'Admin Login'}
                </h4>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  {isAdminLoggedIn ? 'Logged in as Administrator' : 'Manage books, pages, words & QR codes'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onNavigate(isAdminLoggedIn ? 'admin' : 'admin-login')}
              className="py-2.5 px-4 rounded-xl bg-black text-white hover:bg-stone-800 dark:bg-white dark:text-black dark:hover:bg-stone-200 text-xs font-bold active:scale-95 transition border border-black dark:border-white shadow-xs"
            >
              {isAdminLoggedIn ? 'Open Dashboard' : '🔐 Admin Login'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
