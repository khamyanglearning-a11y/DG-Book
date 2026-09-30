import React, { useEffect, useState } from 'react';
import { PageWithDetails, TextSize } from '../types';
import { getPageByQrToken, subscribeToLearningPage } from '../services/db';
import { AudioPlayer } from '../components/AudioPlayer';
import { 
  ArrowLeft, 
  ArrowRight, 
  BookOpen, 
  Volume2, 
  Sparkles, 
  ZoomIn, 
  X, 
  AlertCircle, 
  Share2, 
  Check, 
  ChevronLeft,
  ChevronRight,
  Maximize2
} from 'lucide-react';

interface LearnPageProps {
  token: string;
  textSize: TextSize;
  onNavigateHome: () => void;
  onSelectToken: (token: string) => void;
}

export const LearnPage: React.FC<LearnPageProps> = ({
  token,
  textSize,
  onNavigateHome,
  onSelectToken,
}) => {
  const [pageData, setPageData] = useState<PageWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [copiedShare, setCopiedShare] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    getPageByQrToken(token)
      .then((data) => {
        if (!isMounted) return;
        if (!data) {
          setError('Sorry, this QR code is not registered. Please check that the physical QR code is intact or contact the book coordinator.');
        } else {
          setPageData(data);
          // Scroll smoothly to top on token change
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('Error fetching learning page:', err);
        setError('Unable to load the content. Please check your internet connection.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    // Realtime listener for live updates to this page
    const unsubscribe = subscribeToLearningPage(token, (updated) => {
      if (isMounted && updated) {
        setPageData(updated);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [token]);

  const handleShare = () => {
    if (navigator.share) {
      navigator
        .share({
          title: `Tai Digital Dictionary - Page ${pageData?.page_number}`,
          text: `Learn Tai with Page ${pageData?.page_number} of ${pageData?.book?.title}`,
          url: window.location.href,
        })
        .catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href).then(() => {
        setCopiedShare(true);
        setTimeout(() => setCopiedShare(false), 2000);
      });
    }
  };

  // Font size classes based on user setting
  const contentTextSizeClass = {
    small: 'text-sm sm:text-base leading-relaxed',
    medium: 'text-base sm:text-lg leading-relaxed',
    large: 'text-lg sm:text-xl leading-relaxed',
  }[textSize];

  const wordTitleSizeClass = {
    small: 'text-xl sm:text-2xl',
    medium: 'text-2xl sm:text-3xl',
    large: 'text-3xl sm:text-4xl',
  }[textSize];

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-14 h-14 rounded-full border-4 border-stone-300 border-t-black dark:border-stone-700 dark:border-t-white animate-spin mb-4" />
        <h3 className="text-lg font-bold text-black dark:text-white">
          Loading learning page...
        </h3>
        <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 font-mono">
          Token: {token}
        </p>
      </div>
    );
  }

  if (error || !pageData) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
        <div className="w-14 h-14 rounded-full bg-stone-100 dark:bg-stone-900 text-black dark:text-white flex items-center justify-center mb-4 border border-stone-300 dark:border-stone-800">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h3 className="text-xl font-bold text-black dark:text-white mb-2">
          Page Not Available
        </h3>
        <p className="text-sm text-stone-600 dark:text-stone-400 mb-6 leading-relaxed">
          {error || 'This page is currently unavailable.'}
        </p>
        <button
          onClick={onNavigateHome}
          className="px-5 py-2.5 rounded-xl bg-black text-white dark:bg-white dark:text-black text-sm font-semibold hover:opacity-90 active:scale-95 transition border border-black dark:border-white"
        >
          Return to Scanner
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 sm:py-8 pb-24">
      {/* Top Header Card */}
      <div className="bg-white dark:bg-black border border-stone-300 dark:border-stone-800 rounded-3xl p-5 sm:p-6 shadow-sm mb-6">
        <div className="flex items-center justify-between gap-3 mb-3">
          <button
            onClick={onNavigateHome}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-black dark:text-white hover:opacity-80 transition"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Home</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-black text-white dark:bg-white dark:text-black text-[11px] font-bold border border-black dark:border-white">
              {pageData.book?.language || 'Tai Language'}
            </span>

            <button
              onClick={handleShare}
              className="p-1.5 rounded-lg text-black dark:text-white hover:bg-stone-100 dark:hover:bg-stone-900 border border-stone-200 dark:border-stone-800 transition"
              title="Share Page Link"
            >
              {copiedShare ? <Check className="w-4 h-4 text-black dark:text-white" /> : <Share2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500 mb-1">
              Book
            </div>
            <h2 className="text-xl sm:text-2xl font-bold font-serif text-black dark:text-white">
              {pageData.book?.title || 'Tai Speaking Book'}
            </h2>
            {pageData.page_title && (
              <p className="text-sm font-semibold text-stone-700 dark:text-stone-300 mt-1">
                {pageData.page_title}
              </p>
            )}
          </div>

          <div className="flex-shrink-0 text-center bg-black text-white dark:bg-white dark:text-black rounded-2xl px-3.5 py-2 shadow-xs border border-black dark:border-white">
            <span className="block text-[10px] font-bold uppercase tracking-wider opacity-80">Page</span>
            <span className="block text-2xl font-black font-mono leading-none mt-0.5">
              {pageData.page_number}
            </span>
          </div>
        </div>
      </div>

      {/* Page Physical Image (if available) */}
      {pageData.page_image_url && (
        <div className="relative mb-6 rounded-3xl overflow-hidden shadow-md border border-stone-300 dark:border-stone-800 bg-stone-100 dark:bg-stone-950 group">
          <img
            src={pageData.page_image_url}
            alt={`Page ${pageData.page_number} of ${pageData.book?.title}`}
            className="w-full max-h-[380px] object-cover cursor-pointer transition-transform duration-300 group-hover:scale-[1.01]"
            onClick={() => setLightboxImage(pageData.page_image_url)}
          />
          <button
            onClick={() => setLightboxImage(pageData.page_image_url)}
            className="absolute bottom-3 right-3 p-2 rounded-xl bg-black/70 text-white backdrop-blur-xs hover:bg-black transition active:scale-95 border border-white/20"
            title="Expand image"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Full Page Audio Player */}
      <div className="mb-6">
        <AudioPlayer
          src={pageData.full_page_audio_url}
          label="Listen to Full Page"
          subLabel="Complete recitation by native Tai speakers"
          variant="full"
        />
      </div>

      {/* PAGE CONTENT */}
      <section className="bg-white dark:bg-black border border-stone-300 dark:border-stone-800 rounded-3xl p-5 sm:p-7 shadow-sm mb-8">
        <div className="flex items-center gap-2 mb-4 pb-2 border-b border-stone-200 dark:border-stone-800">
          <BookOpen className="w-5 h-5 text-black dark:text-white" />
          <h3 className="font-extrabold text-sm sm:text-base uppercase tracking-wider text-black dark:text-white">
            Page Content
          </h3>
        </div>

        <div className={`text-black dark:text-white whitespace-pre-line font-serif ${contentTextSizeClass}`}>
          {pageData.page_text}
        </div>
      </section>

      {/* IMPORTANT WORDS SECTION */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4 px-1">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-black dark:text-white" />
            <h3 className="font-extrabold text-base sm:text-lg tracking-tight text-black dark:text-white">
              Important Words ({pageData.words?.length || 0})
            </h3>
          </div>
          <span className="text-xs text-stone-500 dark:text-stone-400">
            Tap audio to hear pronunciation
          </span>
        </div>

        {pageData.words && pageData.words.length > 0 ? (
          <div className="space-y-4">
            {pageData.words.map((w, index) => (
              <div
                key={w.id || index}
                className="bg-white dark:bg-black border border-stone-300 dark:border-stone-800 rounded-3xl p-5 sm:p-6 shadow-xs transition-all hover:border-black dark:hover:border-white"
              >
                {/* Word header & Tai script */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <span className="text-[11px] font-mono font-bold text-stone-400 dark:text-stone-500 mb-0.5 block">
                      {index + 1 < 10 ? `0${index + 1}` : index + 1}
                    </span>
                    <h4 className={`font-bold font-serif text-black dark:text-white ${wordTitleSizeClass}`}>
                      {w.word}
                    </h4>
                    {w.phonetic && (
                      <p className="text-xs sm:text-sm font-mono text-stone-700 dark:text-stone-300 mt-0.5 font-medium">
                        [{w.phonetic}]
                      </p>
                    )}
                  </div>

                  {/* Word Audio Button */}
                  <div className="flex-shrink-0">
                    <AudioPlayer src={w.word_audio_url} label="Listen" variant="mini" />
                  </div>
                </div>

                {/* Meanings Stack */}
                <div className="space-y-2 mt-3 pt-3 border-t border-stone-200 dark:border-stone-800 text-xs sm:text-sm">
                  {/* General / Tai Meaning */}
                  {w.meaning && (
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-1">
                      <span className="font-bold text-stone-500 dark:text-stone-400 sm:col-span-1">
                        Meaning:
                      </span>
                      <span className="text-black dark:text-white sm:col-span-3 font-medium">
                        {w.meaning}
                      </span>
                    </div>
                  )}

                  {/* Assamese Meaning */}
                  {w.assamese_meaning && (
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-1">
                      <span className="font-bold text-black dark:text-white sm:col-span-1">
                        Assamese:
                      </span>
                      <span className="text-black dark:text-white sm:col-span-3 font-medium">
                        {w.assamese_meaning}
                      </span>
                    </div>
                  )}

                  {/* English Meaning */}
                  {w.english_meaning && (
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-1">
                      <span className="font-bold text-stone-500 dark:text-stone-400 sm:col-span-1">
                        English:
                      </span>
                      <span className="text-black dark:text-white sm:col-span-3 font-medium">
                        {w.english_meaning}
                      </span>
                    </div>
                  )}
                </div>

                {/* Meaning audio if separate */}
                {w.meaning_audio_url && (
                  <div className="mt-3 flex items-center justify-end">
                    <AudioPlayer src={w.meaning_audio_url} label="Meaning Audio" variant="mini" />
                  </div>
                )}

                {/* Example sentence */}
                {w.example_sentence && (
                  <div className="mt-4 p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                        Example Sentence
                      </span>
                      {w.example_audio_url && (
                        <AudioPlayer src={w.example_audio_url} label="Listen Example" variant="mini" />
                      )}
                    </div>
                    <p className="text-xs sm:text-sm font-serif font-semibold text-black dark:text-white">
                      {w.example_sentence}
                    </p>
                    {w.example_assamese && (
                      <p className="text-xs text-stone-700 dark:text-stone-300 mt-1">
                        {w.example_assamese}
                      </p>
                    )}
                    {w.example_english && (
                      <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5 italic">
                        {w.example_english}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 rounded-2xl bg-white dark:bg-black border border-dashed border-stone-300 dark:border-stone-800 text-center text-xs text-stone-500">
            No specific vocabulary tokens cataloged for this page yet.
          </div>
        )}
      </section>

      {/* PAGE SUMMARY */}
      {pageData.summary && (
        <section className="bg-white dark:bg-black border border-stone-300 dark:border-stone-800 rounded-3xl p-5 sm:p-7 shadow-sm mb-8">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-stone-200 dark:border-stone-800">
            <h3 className="font-extrabold text-sm sm:text-base uppercase tracking-wider text-black dark:text-white">
              Page Summary
            </h3>
          </div>

          <p className={`text-stone-800 dark:text-stone-200 leading-relaxed mb-4 ${contentTextSizeClass}`}>
            {pageData.summary}
          </p>

          <AudioPlayer
            src={pageData.summary_audio_url}
            label="Listen Summary"
            subLabel="Oral synopsis for auditory learners"
            variant="compact"
          />
        </section>
      )}

      {/* Navigation: [ ← Previous ] [ Next → ] */}
      <nav aria-label="Page Navigation" className="flex items-center justify-between gap-3 pt-4 border-t border-stone-300 dark:border-stone-800">
        {pageData.previous_page ? (
          <button
            type="button"
            onClick={() => onSelectToken(pageData.previous_page!.qr_token)}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-white dark:bg-black border border-black dark:border-white text-xs sm:text-sm font-bold text-black dark:text-white hover:bg-stone-100 dark:hover:bg-stone-900 active:scale-98 transition shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>← Previous (Pg {pageData.previous_page.page_number})</span>
          </button>
        ) : (
          <div className="flex-1" />
        )}

        {pageData.next_page ? (
          <button
            type="button"
            onClick={() => onSelectToken(pageData.next_page!.qr_token)}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-black text-white hover:bg-stone-800 dark:bg-white dark:text-black dark:hover:bg-stone-200 text-xs sm:text-sm font-bold active:scale-98 transition shadow-xs border border-black dark:border-white"
          >
            <span>Next (Pg {pageData.next_page.page_number}) →</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <div className="flex-1" />
        )}
      </nav>

      {/* Lightbox Modal for Page Image */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 animate-fadeIn"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img
              src={lightboxImage}
              alt="High-resolution view"
              className="max-w-full max-h-[88vh] object-contain rounded-xl shadow-2xl"
            />
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute top-3 right-3 p-2.5 rounded-full bg-black/70 text-white hover:bg-black transition active:scale-95"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
