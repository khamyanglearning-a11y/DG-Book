import React, { useState, useEffect } from 'react';
import { 
  Book, 
  Page, 
  Word, 
  QRCodeRecord, 
  TaiLanguage 
} from '../types';
import { 
  getBooks, 
  saveBook, 
  deleteBook, 
  getPages, 
  savePage, 
  deletePage, 
  getWordsByPage, 
  saveWord, 
  deleteWord, 
  reorderWords, 
  getDashboardStats, 
  DashboardStats, 
  regeneratePageQrToken,
  subscribeToDatabaseChanges
} from '../services/db';
import { logoutAdmin } from '../services/auth';
import { uploadFile } from '../services/storage';
import { isSupabaseConfigured, supabaseUrl, updateCustomSupabaseCredentials, supabaseProjectId } from '../services/supabase';
import { QRCardGenerator } from '../components/QRCardGenerator';
import { AudioPlayer } from '../components/AudioPlayer';
import {
  LayoutDashboard,
  BookOpen,
  FileText,
  Languages,
  QrCode,
  Volume2,
  Database,
  LogOut,
  Plus,
  Trash2,
  Edit2,
  Eye,
  CheckCircle2,
  Circle,
  Upload,
  ArrowUpDown,
  Search,
  Check,
  ChevronRight,
  ExternalLink,
  RefreshCw,
  Sliders,
  AlertTriangle,
  Copy
} from 'lucide-react';

interface AdminDashboardProps {
  onLogout: () => void;
  onNavigateHome: () => void;
  onViewLearningPage: (token: string) => void;
}

type TabType = 'overview' | 'books' | 'pages' | 'words' | 'qrcodes' | 'supabase';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onLogout,
  onNavigateHome,
  onViewLearningPage,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [pages, setPages] = useState<Page[]>([]);
  const [words, setWords] = useState<Word[]>([]);
  const [selectedBookId, setSelectedBookId] = useState<string>('');
  const [selectedPageId, setSelectedPageId] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');

  // Modals & Forms
  const [editingBook, setEditingBook] = useState<Partial<Book> | null>(null);
  const [editingPage, setEditingPage] = useState<Partial<Page> | null>(null);
  const [editingWord, setEditingWord] = useState<Partial<Word> | null>(null);
  const [qrModalPage, setQrModalPage] = useState<Page | null>(null);

  // Upload Progress
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  // Supabase Custom Config Form
  const [configUrl, setConfigUrl] = useState(supabaseUrl);
  const [configKey, setConfigKey] = useState('');
  const [copiedSql, setCopiedSql] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [bList, pList, dStats] = await Promise.all([
        getBooks(),
        getPages(),
        getDashboardStats(),
      ]);
      setBooks(bList);
      setPages(pList);
      setStats(dStats);

      if (bList.length > 0 && !selectedBookId) {
        setSelectedBookId(bList[0].id);
      }
    } catch (e) {
      console.error('Failed to load admin data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Listen to real-time changes from other tabs or physical scans
    const unsubscribe = subscribeToDatabaseChanges(
      ['books', 'pages', 'words', 'qr_codes'],
      () => {
        loadData();
      }
    );

    return () => {
      unsubscribe();
    };
  }, []);

  // When selectedPageId changes, load its words
  useEffect(() => {
    if (selectedPageId) {
      getWordsByPage(selectedPageId).then((wList) => setWords(wList));
    } else {
      setWords([]);
    }
  }, [selectedPageId]);

  // When book selection changes, default to first page
  useEffect(() => {
    if (selectedBookId) {
      const bookPages = pages.filter((p) => p.book_id === selectedBookId);
      if (bookPages.length > 0 && !bookPages.some((p) => p.id === selectedPageId)) {
        setSelectedPageId(bookPages[0].id);
      }
    }
  }, [selectedBookId, pages]);

  // -------------------------------------------------------------
  // BOOK ACTIONS
  // -------------------------------------------------------------
  const handleSaveBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBook || !editingBook.title) return;
    try {
      setUploadStatus('Saving book details...');
      await saveBook(editingBook as any);
      setEditingBook(null);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to save book');
    } finally {
      setUploadStatus(null);
    }
  };

  const handleDeleteBook = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this book? All associated pages and words will also be removed.')) {
      await deleteBook(id);
      await loadData();
    }
  };

  // -------------------------------------------------------------
  // PAGE ACTIONS
  // -------------------------------------------------------------
  const handleSavePage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPage || !editingPage.book_id || editingPage.page_number === undefined) return;
    try {
      setUploadStatus('Saving page and generating QR token...');
      await savePage(editingPage as any);
      setEditingPage(null);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to save page');
    } finally {
      setUploadStatus(null);
    }
  };

  const handleDeletePage = async (id: string) => {
    if (window.confirm('Delete this page and all its vocabulary?')) {
      await deletePage(id);
      await loadData();
    }
  };

  const handleRegenerateQr = async (pageId: string) => {
    try {
      const newToken = await regeneratePageQrToken(pageId);
      await loadData();
      if (qrModalPage && qrModalPage.id === pageId) {
        setQrModalPage({ ...qrModalPage, qr_token: newToken });
      }
      alert(`QR Token successfully regenerated: ${newToken}`);
    } catch (e: any) {
      alert(e.message || 'Failed to regenerate QR');
    }
  };

  // -------------------------------------------------------------
  // WORD ACTIONS
  // -------------------------------------------------------------
  const handleSaveWord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWord || !editingWord.word || !editingWord.meaning) return;
    try {
      setUploadStatus('Saving word...');
      await saveWord({
        ...editingWord,
        page_id: selectedPageId,
      } as any);
      setEditingWord(null);
      const wList = await getWordsByPage(selectedPageId);
      setWords(wList);
      const dStats = await getDashboardStats();
      setStats(dStats);
    } catch (err: any) {
      alert(err.message || 'Failed to save word');
    } finally {
      setUploadStatus(null);
    }
  };

  const handleDeleteWord = async (id: string) => {
    if (window.confirm('Delete this word?')) {
      await deleteWord(id);
      const wList = await getWordsByPage(selectedPageId);
      setWords(wList);
      const dStats = await getDashboardStats();
      setStats(dStats);
    }
  };

  // Move word up/down
  const handleMoveWord = async (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= words.length) return;
    const reordered = [...words];
    const temp = reordered[index];
    reordered[index] = reordered[targetIdx];
    reordered[targetIdx] = temp;
    setWords(reordered);
    await reorderWords(selectedPageId, reordered.map((w) => w.id));
  };

  // -------------------------------------------------------------
  // FILE UPLOAD HANDLER
  // -------------------------------------------------------------
  const handleFileUpload = async (
    bucket: 'book-covers' | 'page-images' | 'audio',
    path: string,
    file: File,
    onSuccess: (url: string) => void
  ) => {
    setUploadStatus(`Uploading ${file.name}...`);
    try {
      const res = await uploadFile(bucket, path, file);
      if (res.success && res.url) {
        onSuccess(res.url);
      } else {
        alert(res.error || 'Upload failed');
      }
    } catch (err: any) {
      alert(err.message || 'Upload exception');
    } finally {
      setUploadStatus(null);
    }
  };

  const filteredPages = pages.filter((p) => {
    if (selectedBookId && p.book_id !== selectedBookId) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        p.page_number.toString().includes(q) ||
        p.page_title?.toLowerCase().includes(q) ||
        p.qr_token.toLowerCase().includes(q) ||
        p.page_text.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const selectedBook = books.find((b) => b.id === selectedBookId);
  const selectedPage = pages.find((p) => p.id === selectedPageId);

  return (
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white flex flex-col md:flex-row pb-16 md:pb-0">
      {/* DESKTOP SIDEBAR */}
      <aside className="w-full md:w-64 bg-white dark:bg-black border-r border-black/10 dark:border-white/15 p-4 flex flex-col justify-between shrink-0">
        <div>
          {/* Header */}
          <div className="flex items-center gap-2.5 px-2 py-3 mb-4 border-b border-black/10 dark:border-white/15">
            <div className="w-9 h-9 rounded-xl bg-black text-white dark:bg-white dark:text-black flex items-center justify-center font-serif font-bold text-base border border-black dark:border-white">
              တ
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight">Admin Console</h2>
              <span className="text-[10px] text-stone-500 dark:text-stone-400">Tai Digital Dictionary</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab('overview')}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition ${
                activeTab === 'overview'
                  ? 'bg-black text-white dark:bg-white dark:text-black shadow-xs border border-black dark:border-white'
                  : 'text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-900'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => setActiveTab('books')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition ${
                activeTab === 'books'
                  ? 'bg-black text-white dark:bg-white dark:text-black shadow-xs border border-black dark:border-white'
                  : 'text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <BookOpen className="w-4 h-4" />
                <span>Books</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700">
                {books.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('pages')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition ${
                activeTab === 'pages'
                  ? 'bg-black text-white dark:bg-white dark:text-black shadow-xs border border-black dark:border-white'
                  : 'text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <FileText className="w-4 h-4" />
                <span>Pages</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700">
                {pages.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('words')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition ${
                activeTab === 'words'
                  ? 'bg-black text-white dark:bg-white dark:text-black shadow-xs border border-black dark:border-white'
                  : 'text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Languages className="w-4 h-4" />
                <span>Words</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700">
                {stats?.totalWords || 0}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('qrcodes')}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition ${
                activeTab === 'qrcodes'
                  ? 'bg-black text-white dark:bg-white dark:text-black shadow-xs border border-black dark:border-white'
                  : 'text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-900'
              }`}
            >
              <QrCode className="w-4 h-4" />
              <span>QR Codes</span>
            </button>

            <button
              onClick={() => setActiveTab('supabase')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition ${
                activeTab === 'supabase'
                  ? 'bg-black text-white dark:bg-white dark:text-black shadow-xs border border-black dark:border-white'
                  : 'text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Database className="w-4 h-4" />
                <span>Supabase Setup</span>
              </div>
              <span
                className={`w-2 h-2 rounded-full ${
                  isSupabaseConfigured ? 'bg-black dark:bg-white' : 'border border-stone-400 dark:border-stone-500'
                }`}
              />
            </button>
          </nav>
        </div>

        {/* Footer actions */}
        <div className="pt-4 border-t border-black/10 dark:border-white/15 space-y-2">
          <button
            onClick={onNavigateHome}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-900 transition"
          >
            <Eye className="w-4 h-4" />
            <span>Public Site</span>
          </button>

          <button
            onClick={onLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-black dark:text-white hover:bg-stone-100 dark:hover:bg-stone-900 transition font-bold"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* MOBILE BOTTOM NAVIGATION */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-black/95 backdrop-blur-md border-t border-black/10 dark:border-white/15 flex items-center justify-around p-2">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex flex-col items-center gap-1 p-2 rounded-xl text-[10px] font-bold ${
            activeTab === 'overview' ? 'text-black dark:text-white font-black' : 'text-stone-400'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Dash</span>
        </button>
        <button
          onClick={() => setActiveTab('books')}
          className={`flex flex-col items-center gap-1 p-2 rounded-xl text-[10px] font-bold ${
            activeTab === 'books' ? 'text-black dark:text-white font-black' : 'text-stone-400'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Books</span>
        </button>
        <button
          onClick={() => setActiveTab('pages')}
          className={`flex flex-col items-center gap-1 p-2 rounded-xl text-[10px] font-bold ${
            activeTab === 'pages' ? 'text-black dark:text-white font-black' : 'text-stone-400'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Pages</span>
        </button>
        <button
          onClick={() => setActiveTab('words')}
          className={`flex flex-col items-center gap-1 p-2 rounded-xl text-[10px] font-bold ${
            activeTab === 'words' ? 'text-black dark:text-white font-black' : 'text-stone-400'
          }`}
        >
          <Languages className="w-4 h-4" />
          <span>Words</span>
        </button>
        <button
          onClick={() => setActiveTab('qrcodes')}
          className={`flex flex-col items-center gap-1 p-2 rounded-xl text-[10px] font-bold ${
            activeTab === 'qrcodes' ? 'text-black dark:text-white font-black' : 'text-stone-400'
          }`}
        >
          <QrCode className="w-4 h-4" />
          <span>QR</span>
        </button>
      </div>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto max-w-5xl">
        {/* Upload status banner */}
        {uploadStatus && (
          <div className="mb-4 px-4 py-2.5 rounded-xl bg-black text-white dark:bg-white dark:text-black text-xs font-bold flex items-center gap-2 border border-black dark:border-white shadow-xs">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>{uploadStatus}</span>
          </div>
        )}

        {/* -------------------------------------------------------------
            TAB: OVERVIEW
        ------------------------------------------------------------- */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold font-serif text-black dark:text-white">Admin Overview</h1>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Real-time catalog metrics and audio publication status
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditingBook({})}
                  className="px-3.5 py-2 rounded-xl bg-black text-white dark:bg-white dark:text-black text-xs font-bold hover:bg-stone-800 dark:hover:bg-stone-200 active:scale-95 transition flex items-center gap-1.5 border border-black dark:border-white shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>New Book</span>
                </button>
                <button
                  onClick={() => setEditingPage({ book_id: selectedBookId || books[0]?.id })}
                  className="px-3.5 py-2 rounded-xl bg-white dark:bg-black text-black dark:text-white text-xs font-bold hover:bg-stone-100 dark:hover:bg-stone-900 active:scale-95 transition flex items-center gap-1.5 border border-black dark:border-white shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>New Page</span>
                </button>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 rounded-3xl bg-white dark:bg-black border border-stone-300 dark:border-stone-800 shadow-xs">
                <span className="text-[11px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider block">
                  Total Books
                </span>
                <span className="text-3xl font-black font-mono text-black dark:text-white mt-1 block">
                  {stats?.totalBooks || 0}
                </span>
                <span className="text-[10px] text-stone-500 mt-1 block">Cataloged texts</span>
              </div>

              <div className="p-4 rounded-3xl bg-white dark:bg-black border border-stone-300 dark:border-stone-800 shadow-xs">
                <span className="text-[11px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider block">
                  Total Pages
                </span>
                <span className="text-3xl font-black font-mono text-black dark:text-white mt-1 block">
                  {stats?.totalPages || 0}
                </span>
                <span className="text-[10px] text-stone-500 mt-1 block">With QR tokens</span>
              </div>

              <div className="p-4 rounded-3xl bg-white dark:bg-black border border-stone-300 dark:border-stone-800 shadow-xs">
                <span className="text-[11px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider block">
                  Total Words
                </span>
                <span className="text-3xl font-black font-mono text-black dark:text-white mt-1 block">
                  {stats?.totalWords || 0}
                </span>
                <span className="text-[10px] text-stone-500 mt-1 block">Glossary entries</span>
              </div>

              <div className="p-4 rounded-3xl bg-white dark:bg-black border border-stone-300 dark:border-stone-800 shadow-xs">
                <span className="text-[11px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider block">
                  Audio Coverage
                </span>
                <span className="text-3xl font-black font-mono text-black dark:text-white mt-1 block">
                  {stats?.audioAvailableRatio || 0}%
                </span>
                <span className="text-[10px] text-stone-500 mt-1 block">Voice recorded</span>
              </div>
            </div>

            {/* Quick Supabase Status Card */}
            <div className="p-4 rounded-3xl bg-white dark:bg-black border border-stone-300 dark:border-stone-800 shadow-xs flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center border border-stone-300 dark:border-stone-700 ${
                    isSupabaseConfigured
                      ? 'bg-black text-white dark:bg-white dark:text-black'
                      : 'bg-stone-100 text-black dark:bg-stone-900 dark:text-white'
                  }`}
                >
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-black dark:text-white flex items-center gap-2">
                    <span>Database Status:</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        isSupabaseConfigured
                          ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white'
                          : 'bg-stone-100 text-stone-700 dark:bg-stone-900 dark:text-stone-300 border-stone-300 dark:border-stone-700'
                      }`}
                    >
                      {isSupabaseConfigured ? '● Connected to Supabase' : '○ Standalone / Preview Mode'}
                    </span>
                  </h4>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                    {isSupabaseConfigured
                      ? `Supabase Endpoint: ${supabaseUrl}`
                      : 'Running with local resilient repository. Connect your Supabase project in the setup tab.'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setActiveTab('supabase')}
                className="px-3 py-1.5 rounded-xl border border-stone-300 dark:border-stone-700 text-xs font-bold hover:bg-stone-100 dark:hover:bg-stone-800 transition"
              >
                Configure
              </button>
            </div>

            {/* Recently Added Pages */}
            <div className="bg-white dark:bg-black border border-stone-300 dark:border-stone-800 rounded-3xl p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-black dark:text-white">
                  Recently Updated Pages
                </h3>
                <button
                  onClick={() => setActiveTab('pages')}
                  className="text-xs text-black dark:text-white font-bold underline hover:opacity-85"
                >
                  View All Pages
                </button>
              </div>

              <div className="divide-y divide-stone-200 dark:divide-stone-800">
                {stats?.recentPages?.map((p) => (
                  <div key={p.id} className="py-3 flex items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-black text-white dark:bg-white dark:text-black text-[10px] font-bold">
                          Pg {p.page_number}
                        </span>
                        <span className="text-xs font-bold text-black dark:text-white">
                          {p.book_title}
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                        Token: <span className="font-mono">{p.qr_token}</span> •{' '}
                        {p.full_page_audio_url ? '● Audio attached' : '○ No audio'}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onViewLearningPage(p.qr_token)}
                        className="p-1.5 rounded-lg text-stone-500 hover:text-black dark:hover:text-white transition"
                        title="View Learning Page"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setQrModalPage(p)}
                        className="p-1.5 rounded-lg text-stone-500 hover:text-black dark:hover:text-white transition"
                        title="Print / View QR"
                      >
                        <QrCode className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* -------------------------------------------------------------
            TAB: BOOKS MANAGEMENT
        ------------------------------------------------------------- */}
        {activeTab === 'books' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold font-serif text-black dark:text-white">Book Catalog</h2>
                <p className="text-xs text-stone-500 dark:text-stone-400">Manage published Tai language books and manuscripts</p>
              </div>
              <button
                onClick={() => setEditingBook({})}
                className="px-3.5 py-2 rounded-xl bg-black text-white dark:bg-white dark:text-black text-xs font-bold hover:bg-stone-800 dark:hover:bg-stone-200 active:scale-95 transition flex items-center gap-1.5 border border-black dark:border-white shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Add Book</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {books.map((b) => (
                <div
                  key={b.id}
                  className="bg-white dark:bg-black border border-stone-300 dark:border-stone-800 rounded-3xl p-5 shadow-xs flex flex-col justify-between"
                >
                  <div className="flex gap-4">
                    {b.cover_image_url ? (
                      <img
                        src={b.cover_image_url}
                        alt={b.title}
                        className="w-20 h-28 object-cover rounded-xl shadow-xs border border-stone-300 dark:border-stone-700 shrink-0"
                      />
                    ) : (
                      <div className="w-20 h-28 rounded-xl bg-stone-100 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 flex items-center justify-center text-stone-500 shrink-0">
                        <BookOpen className="w-8 h-8" />
                      </div>
                    )}
                    <div>
                      <span className="px-2 py-0.5 rounded-full bg-stone-100 text-black dark:bg-stone-900 dark:text-white border border-stone-300 dark:border-stone-700 text-[10px] font-bold">
                        {b.language}
                      </span>
                      <h3 className="font-bold text-base text-black dark:text-white mt-1 line-clamp-2">
                        {b.title}
                      </h3>
                      {b.author && (
                        <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">By {b.author}</p>
                      )}
                      <p className="text-xs text-stone-600 dark:text-stone-400 mt-2 line-clamp-2">
                        {b.description}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between text-xs">
                    <span className="text-stone-500 dark:text-stone-400 text-[11px] font-medium">
                      {pages.filter((p) => p.book_id === b.id).length} Pages Cataloged
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setSelectedBookId(b.id);
                          setActiveTab('pages');
                        }}
                        className="p-1.5 rounded-lg text-black dark:text-white hover:bg-stone-100 dark:hover:bg-stone-900 transition"
                        title="View Pages"
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setEditingBook(b)}
                        className="p-1.5 rounded-lg text-black dark:text-white hover:bg-stone-100 dark:hover:bg-stone-900 transition"
                        title="Edit Book"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteBook(b.id)}
                        className="p-1.5 rounded-lg text-stone-500 hover:text-black dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-900 transition"
                        title="Delete Book"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* -------------------------------------------------------------
            TAB: PAGES MANAGEMENT
        ------------------------------------------------------------- */}
        {activeTab === 'pages' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold font-serif text-black dark:text-white">Page Directory</h2>
                <p className="text-xs text-stone-500 dark:text-stone-400">Attach physical QR codes and digital lessons to pages</p>
              </div>

              <button
                onClick={() => setEditingPage({ book_id: selectedBookId || books[0]?.id })}
                className="px-3.5 py-2 rounded-xl bg-black text-white dark:bg-white dark:text-black text-xs font-bold hover:bg-stone-800 dark:hover:bg-stone-200 active:scale-95 transition flex items-center gap-1.5 border border-black dark:border-white shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Add New Page</span>
              </button>
            </div>

            {/* Filter controls */}
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Book filter dropdown */}
              <div className="sm:w-64">
                <select
                  value={selectedBookId}
                  onChange={(e) => setSelectedBookId(e.target.value)}
                  className="w-full py-2.5 px-3 rounded-xl bg-white dark:bg-black border border-stone-300 dark:border-stone-800 text-xs font-bold text-black dark:text-white focus:outline-hidden"
                >
                  <option value="">All Books</option>
                  {books.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Search query */}
              <div className="flex-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                  <Search className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by page number, title, or token..."
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-white dark:bg-black border border-stone-300 dark:border-stone-800 text-xs text-black dark:text-white placeholder-stone-400 focus:outline-hidden"
                />
              </div>
            </div>

            {/* Pages Table / List */}
            <div className="bg-white dark:bg-black border border-stone-300 dark:border-stone-800 rounded-3xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50 dark:bg-stone-900 text-stone-600 dark:text-stone-400 font-bold uppercase tracking-wider border-b border-stone-200 dark:border-stone-800">
                    <tr>
                      <th className="px-4 py-3">Page</th>
                      <th className="px-4 py-3">Book & Title</th>
                      <th className="px-4 py-3">QR Token</th>
                      <th className="px-4 py-3">Audio Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200 dark:divide-stone-800">
                    {filteredPages.map((p) => {
                      const book = books.find((b) => b.id === p.book_id);
                      const hasAudio = Boolean(p.full_page_audio_url && p.full_page_audio_url.trim().length > 0);

                      return (
                        <tr key={p.id} className="hover:bg-stone-50 dark:hover:bg-stone-900/60 transition">
                          <td className="px-4 py-3 font-mono font-bold text-black dark:text-white">
                            <span className="px-2 py-1 rounded-md bg-stone-100 dark:bg-stone-900 border border-stone-200 dark:border-stone-800">
                              Pg {p.page_number}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-bold text-black dark:text-white">
                              {p.page_title || `Page ${p.page_number}`}
                            </div>
                            <div className="text-[11px] text-stone-500">{book?.title || 'Unknown'}</div>
                          </td>
                          <td className="px-4 py-3 font-mono">
                            <span className="px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-900 text-[11px] font-bold text-black dark:text-white border border-stone-200 dark:border-stone-800">
                              {p.qr_token}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {hasAudio ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-black text-white dark:bg-white dark:text-black border border-black dark:border-white">
                                <span className="w-1.5 h-1.5 rounded-full bg-white dark:bg-black" />
                                Audio Available
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-stone-100 dark:bg-stone-900 text-stone-500 border border-stone-200 dark:border-stone-800">
                                <span className="w-1.5 h-1.5 rounded-full bg-stone-400" />
                                Audio Missing
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setSelectedPageId(p.id);
                                  setActiveTab('words');
                                }}
                                className="p-1.5 rounded-lg text-black dark:text-white hover:bg-stone-100 dark:hover:bg-stone-900 transition"
                                title="Manage Words"
                              >
                                <Languages className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setQrModalPage(p)}
                                className="p-1.5 rounded-lg text-black dark:text-white hover:bg-stone-100 dark:hover:bg-stone-900 transition"
                                title="QR Code"
                              >
                                <QrCode className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => onViewLearningPage(p.qr_token)}
                                className="p-1.5 rounded-lg text-black dark:text-white hover:bg-stone-100 dark:hover:bg-stone-900 transition"
                                title="View Learning Page"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setEditingPage(p)}
                                className="p-1.5 rounded-lg text-black dark:text-white hover:bg-stone-100 dark:hover:bg-stone-900 transition"
                                title="Edit Page"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeletePage(p.id)}
                                className="p-1.5 rounded-lg text-stone-500 hover:text-black dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-900 transition"
                                title="Delete Page"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* -------------------------------------------------------------
            TAB: WORDS MANAGEMENT
        ------------------------------------------------------------- */}
        {activeTab === 'words' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold font-serif text-black dark:text-white">Vocabulary & Word Cards</h2>
                <p className="text-xs text-stone-500 dark:text-stone-400">Manage definitions, Assamese translations, and word audio</p>
              </div>

              <button
                disabled={!selectedPageId}
                onClick={() => setEditingWord({ page_id: selectedPageId, display_order: words.length + 1 })}
                className="px-3.5 py-2 rounded-xl bg-black text-white dark:bg-white dark:text-black text-xs font-bold hover:bg-stone-800 dark:hover:bg-stone-200 active:scale-95 transition flex items-center gap-1.5 border border-black dark:border-white shadow-xs disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                <span>Add Word</span>
              </button>
            </div>

            {/* Page Selector Bar */}
            <div className="bg-white dark:bg-black border border-stone-300 dark:border-stone-800 rounded-2xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="font-bold text-stone-500 dark:text-stone-400">Active Page:</span>
                <select
                  value={selectedPageId}
                  onChange={(e) => setSelectedPageId(e.target.value)}
                  className="py-1.5 px-3 rounded-xl bg-stone-100 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 font-bold text-black dark:text-white"
                >
                  {pages.map((p) => {
                    const b = books.find((x) => x.id === p.book_id);
                    return (
                      <option key={p.id} value={p.id}>
                        Page {p.page_number} ({b?.title || 'Book'})
                      </option>
                    );
                  })}
                </select>
              </div>

              {selectedPage && (
                <div className="text-stone-500 dark:text-stone-400 font-mono text-[11px]">
                  Token: <strong className="text-black dark:text-white">{selectedPage.qr_token}</strong> • {words.length} Words Registered
                </div>
              )}
            </div>

            {/* Words List */}
            {words.length > 0 ? (
              <div className="space-y-3">
                {words.map((w, index) => {
                  const hasWordAudio = Boolean(w.word_audio_url && w.word_audio_url.trim().length > 0);

                  return (
                    <div
                      key={w.id}
                      className="bg-white dark:bg-black border border-stone-300 dark:border-stone-800 rounded-3xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="flex items-start gap-3">
                        {/* Order pill */}
                        <span className="w-7 h-7 rounded-xl bg-stone-100 dark:bg-stone-900 text-black dark:text-white font-mono text-xs font-bold flex items-center justify-center shrink-0 border border-stone-200 dark:border-stone-800">
                          {index + 1}
                        </span>

                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-xl font-bold font-serif text-black dark:text-white">
                              {w.word}
                            </h4>
                            {w.phonetic && (
                              <span className="text-xs font-mono text-stone-600 dark:text-stone-400">
                                [{w.phonetic}]
                              </span>
                            )}
                            {hasWordAudio ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-black dark:text-white bg-stone-100 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 px-2 py-0.5 rounded-full">
                                <Volume2 className="w-3 h-3" /> Audio
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-stone-400 bg-stone-100 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 px-2 py-0.5 rounded-full">
                                No audio
                              </span>
                            )}
                          </div>

                          <div className="mt-1 text-xs text-stone-700 dark:text-stone-300 space-y-0.5">
                            <div>
                              <strong>Meaning:</strong> {w.meaning}
                            </div>
                            {w.assamese_meaning && (
                              <div className="text-black dark:text-white font-medium">
                                <strong>Assamese:</strong> {w.assamese_meaning}
                              </div>
                            )}
                            {w.english_meaning && (
                              <div>
                                <strong>English:</strong> {w.english_meaning}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Word Actions & Reordering */}
                      <div className="flex items-center justify-end gap-1.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-200 dark:border-stone-800">
                        <button
                          disabled={index === 0}
                          onClick={() => handleMoveWord(index, 'up')}
                          className="p-1.5 rounded-lg text-stone-500 hover:text-black dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-900 disabled:opacity-30 transition"
                          title="Move Up"
                        >
                          ▲
                        </button>
                        <button
                          disabled={index === words.length - 1}
                          onClick={() => handleMoveWord(index, 'down')}
                          className="p-1.5 rounded-lg text-stone-500 hover:text-black dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-900 disabled:opacity-30 transition"
                          title="Move Down"
                        >
                          ▼
                        </button>
                        <button
                          onClick={() => setEditingWord(w)}
                          className="p-1.5 rounded-lg text-black dark:text-white hover:bg-stone-100 dark:hover:bg-stone-900 transition"
                          title="Edit Word"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteWord(w.id)}
                          className="p-1.5 rounded-lg text-stone-500 hover:text-black dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-900 transition"
                          title="Delete Word"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 rounded-3xl bg-white dark:bg-black border border-dashed border-stone-300 dark:border-stone-800 text-center text-xs text-stone-500">
                No words added for this page yet. Click "Add Word" above to add important vocabulary.
              </div>
            )}
          </div>
        )}

        {/* -------------------------------------------------------------
            TAB: QR CODES MANAGEMENT
        ------------------------------------------------------------- */}
        {activeTab === 'qrcodes' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold font-serif text-black dark:text-white">Physical QR Codes</h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Generate high-resolution PNG printable cards to physically attach onto book pages
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {pages.map((p) => {
                const book = books.find((b) => b.id === p.book_id);
                return (
                  <QRCardGenerator
                    key={p.id}
                    token={p.qr_token}
                    bookTitle={book?.title || 'Tai Speaking Book'}
                    pageNumber={p.page_number}
                    showRegenerate={true}
                    onRegenerate={() => handleRegenerateQr(p.id)}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* -------------------------------------------------------------
            TAB: SUPABASE SETUP
        ------------------------------------------------------------- */}
        {activeTab === 'supabase' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold font-serif text-black dark:text-white">Supabase Setup & SQL Schema</h2>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Connected to <strong className="text-black dark:text-white font-mono">DG book</strong> ({supabaseProjectId}). Run this SQL in your Supabase SQL Editor.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={`https://supabase.com/dashboard/project/${supabaseProjectId}/sql`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 rounded-xl bg-black text-white dark:bg-white dark:text-black text-xs font-bold flex items-center gap-1.5 hover:bg-stone-800 dark:hover:bg-stone-200 transition shadow-xs"
                >
                  <span>Open Supabase SQL Editor</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            {/* Live Connection Card */}
            <div className="bg-white dark:bg-black border border-stone-300 dark:border-stone-800 rounded-3xl p-6 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-black dark:bg-white animate-pulse" />
                  <h3 className="text-sm font-bold text-black dark:text-white uppercase tracking-wider">
                    Database & Realtime Status
                  </h3>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-stone-100 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-[10px] font-mono font-bold text-black dark:text-white">
                  {isSupabaseConfigured ? 'REALTIME CONNECTED' : 'LOCAL FALLBACK'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-2xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800">
                  <span className="text-[10px] text-stone-500 dark:text-stone-400 uppercase font-mono block mb-1">Project Name</span>
                  <strong className="text-black dark:text-white">DG book</strong>
                </div>
                <div className="p-3 rounded-2xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800">
                  <span className="text-[10px] text-stone-500 dark:text-stone-400 uppercase font-mono block mb-1">Project ID</span>
                  <strong className="text-black dark:text-white font-mono">{supabaseProjectId}</strong>
                </div>
                <div className="p-3 rounded-2xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800">
                  <span className="text-[10px] text-stone-500 dark:text-stone-400 uppercase font-mono block mb-1">Realtime Publication</span>
                  <strong className="text-black dark:text-white font-mono">books, pages, words, qr_codes</strong>
                </div>
              </div>
            </div>

            {/* SQL Script Card with 1-Click Copy */}
            <div className="bg-white dark:bg-black border border-stone-300 dark:border-stone-800 rounded-3xl p-6 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-base font-bold text-black dark:text-white">
                    Production SQL Schema (Realtime + RLS + Storage)
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    Creates all 4 tables, enables Row Level Security, configures Realtime broadcast, and prepares 4 storage buckets.
                  </p>
                </div>

                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => {
                      const sqlContent = `-- ==============================================================================
-- PROJECT: DG book (Supabase Project ID: ${supabaseProjectId})
-- APPLICATION: Tai Digital Dictionary
-- SQL MIGRATION SCRIPT (Production Ready)
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.books (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    author TEXT DEFAULT '',
    language TEXT DEFAULT 'Tai Khamyang',
    cover_image_url TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.pages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
    page_number INTEGER NOT NULL,
    page_title TEXT DEFAULT '',
    page_image_url TEXT DEFAULT '',
    page_text TEXT DEFAULT '',
    full_page_audio_url TEXT DEFAULT '',
    summary TEXT DEFAULT '',
    summary_audio_url TEXT DEFAULT '',
    qr_token TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_book_page UNIQUE (book_id, page_number)
);

CREATE TABLE IF NOT EXISTS public.words (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    page_id UUID NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
    word TEXT NOT NULL,
    phonetic TEXT DEFAULT '',
    meaning TEXT DEFAULT '',
    assamese_meaning TEXT DEFAULT '',
    english_meaning TEXT DEFAULT '',
    example_sentence TEXT DEFAULT '',
    example_assamese TEXT DEFAULT '',
    example_english TEXT DEFAULT '',
    word_audio_url TEXT DEFAULT '',
    meaning_audio_url TEXT DEFAULT '',
    example_audio_url TEXT DEFAULT '',
    display_order INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.qr_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    page_id UUID NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    qr_url TEXT NOT NULL,
    qr_image_url TEXT DEFAULT '',
    scan_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pages_qr_token ON public.pages(qr_token);
CREATE INDEX IF NOT EXISTS idx_pages_book_id ON public.pages(book_id);
CREATE INDEX IF NOT EXISTS idx_pages_page_num ON public.pages(page_number);
CREATE INDEX IF NOT EXISTS idx_words_page_id ON public.words(page_id);
CREATE INDEX IF NOT EXISTS idx_words_display_order ON public.words(display_order);
CREATE INDEX IF NOT EXISTS idx_qr_codes_token ON public.qr_codes(token);

ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.words ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read books" ON public.books;
DROP POLICY IF EXISTS "Allow all write books" ON public.books;
DROP POLICY IF EXISTS "Public read pages" ON public.pages;
DROP POLICY IF EXISTS "Allow all write pages" ON public.pages;
DROP POLICY IF EXISTS "Public read words" ON public.words;
DROP POLICY IF EXISTS "Allow all write words" ON public.words;
DROP POLICY IF EXISTS "Public read qr_codes" ON public.qr_codes;
DROP POLICY IF EXISTS "Allow all write qr_codes" ON public.qr_codes;

CREATE POLICY "Public read books" ON public.books FOR SELECT USING (true);
CREATE POLICY "Public read pages" ON public.pages FOR SELECT USING (true);
CREATE POLICY "Public read words" ON public.words FOR SELECT USING (true);
CREATE POLICY "Public read qr_codes" ON public.qr_codes FOR SELECT USING (true);

CREATE POLICY "Allow all write books" ON public.books FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all write pages" ON public.pages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all write words" ON public.words FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all write qr_codes" ON public.qr_codes FOR ALL USING (true) WITH CHECK (true);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'books'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.books;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'pages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.pages;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'words'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.words;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'qr_codes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.qr_codes;
  END IF;
END $$;

INSERT INTO storage.buckets (id, name, public)
VALUES 
    ('book-covers', 'book-covers', true),
    ('page-images', 'page-images', true),
    ('audio', 'audio', true),
    ('qr-codes', 'qr-codes', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public read storage book-covers" ON storage.objects;
DROP POLICY IF EXISTS "Public insert storage book-covers" ON storage.objects;
DROP POLICY IF EXISTS "Public update storage book-covers" ON storage.objects;
DROP POLICY IF EXISTS "Public delete storage book-covers" ON storage.objects;

DROP POLICY IF EXISTS "Public read storage page-images" ON storage.objects;
DROP POLICY IF EXISTS "Public insert storage page-images" ON storage.objects;
DROP POLICY IF EXISTS "Public update storage page-images" ON storage.objects;
DROP POLICY IF EXISTS "Public delete storage page-images" ON storage.objects;

DROP POLICY IF EXISTS "Public read storage audio" ON storage.objects;
DROP POLICY IF EXISTS "Public insert storage audio" ON storage.objects;
DROP POLICY IF EXISTS "Public update storage audio" ON storage.objects;
DROP POLICY IF EXISTS "Public delete storage audio" ON storage.objects;

DROP POLICY IF EXISTS "Public read storage qr-codes" ON storage.objects;
DROP POLICY IF EXISTS "Public insert storage qr-codes" ON storage.objects;
DROP POLICY IF EXISTS "Public update storage qr-codes" ON storage.objects;
DROP POLICY IF EXISTS "Public delete storage qr-codes" ON storage.objects;

CREATE POLICY "Public read storage book-covers" ON storage.objects FOR SELECT USING (bucket_id = 'book-covers');
CREATE POLICY "Public insert storage book-covers" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'book-covers');
CREATE POLICY "Public update storage book-covers" ON storage.objects FOR UPDATE USING (bucket_id = 'book-covers');
CREATE POLICY "Public delete storage book-covers" ON storage.objects FOR DELETE USING (bucket_id = 'book-covers');

CREATE POLICY "Public read storage page-images" ON storage.objects FOR SELECT USING (bucket_id = 'page-images');
CREATE POLICY "Public insert storage page-images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'page-images');
CREATE POLICY "Public update storage page-images" ON storage.objects FOR UPDATE USING (bucket_id = 'page-images');
CREATE POLICY "Public delete storage page-images" ON storage.objects FOR DELETE USING (bucket_id = 'page-images');

CREATE POLICY "Public read storage audio" ON storage.objects FOR SELECT USING (bucket_id = 'audio');
CREATE POLICY "Public insert storage audio" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'audio');
CREATE POLICY "Public update storage audio" ON storage.objects FOR UPDATE USING (bucket_id = 'audio');
CREATE POLICY "Public delete storage audio" ON storage.objects FOR DELETE USING (bucket_id = 'audio');

CREATE POLICY "Public read storage qr-codes" ON storage.objects FOR SELECT USING (bucket_id = 'qr-codes');
CREATE POLICY "Public insert storage qr-codes" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'qr-codes');
CREATE POLICY "Public update storage qr-codes" ON storage.objects FOR UPDATE USING (bucket_id = 'qr-codes');
CREATE POLICY "Public delete storage qr-codes" ON storage.objects FOR DELETE USING (bucket_id = 'qr-codes');`;

                      navigator.clipboard.writeText(sqlContent);
                      setCopiedSql(true);
                      setTimeout(() => setCopiedSql(false), 2500);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-black text-white dark:bg-white dark:text-black text-xs font-bold flex items-center gap-1.5 hover:bg-stone-800 dark:hover:bg-stone-200 transition shadow-xs"
                  >
                    {copiedSql ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Copied SQL!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Complete SQL</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Code viewer box */}
              <div className="bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 max-h-72 overflow-y-auto font-mono text-[11px] leading-relaxed text-stone-800 dark:text-stone-200">
                <pre className="whitespace-pre">
{`-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. BOOKS TABLE
CREATE TABLE IF NOT EXISTS public.books (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    author TEXT DEFAULT '',
    language TEXT DEFAULT 'Tai Khamyang',
    cover_image_url TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. PAGES TABLE
CREATE TABLE IF NOT EXISTS public.pages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
    page_number INTEGER NOT NULL,
    page_title TEXT DEFAULT '',
    page_image_url TEXT DEFAULT '',
    page_text TEXT DEFAULT '',
    full_page_audio_url TEXT DEFAULT '',
    summary TEXT DEFAULT '',
    summary_audio_url TEXT DEFAULT '',
    qr_token TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_book_page UNIQUE (book_id, page_number)
);

-- 3. WORDS TABLE
CREATE TABLE IF NOT EXISTS public.words (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    page_id UUID NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
    word TEXT NOT NULL,
    phonetic TEXT DEFAULT '',
    meaning TEXT DEFAULT '',
    assamese_meaning TEXT DEFAULT '',
    english_meaning TEXT DEFAULT '',
    example_sentence TEXT DEFAULT '',
    example_assamese TEXT DEFAULT '',
    example_english TEXT DEFAULT '',
    word_audio_url TEXT DEFAULT '',
    meaning_audio_url TEXT DEFAULT '',
    example_audio_url TEXT DEFAULT '',
    display_order INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. QR CODES TABLE
CREATE TABLE IF NOT EXISTS public.qr_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    page_id UUID NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    qr_url TEXT NOT NULL,
    qr_image_url TEXT DEFAULT '',
    scan_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. REALTIME PUBLICATION
ALTER PUBLICATION supabase_realtime ADD TABLE public.books;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.words;
ALTER PUBLICATION supabase_realtime ADD TABLE public.qr_codes;`}
                </pre>
              </div>
            </div>

            {/* Credentials inspection */}
            <div className="bg-white dark:bg-black border border-stone-300 dark:border-stone-800 rounded-3xl p-6 shadow-xs">
              <h3 className="text-base font-bold text-black dark:text-white mb-2">
                Active Supabase Connection Parameters
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 mb-4 leading-relaxed">
                Currently connected to your Supabase project:
              </p>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-black dark:text-white mb-1">
                    Supabase Project URL
                  </label>
                  <input
                    type="text"
                    value={configUrl}
                    onChange={(e) => setConfigUrl(e.target.value)}
                    placeholder="https://your-project.supabase.co"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-xs text-black dark:text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-black dark:text-white mb-1">
                    Supabase Public Anon Key
                  </label>
                  <input
                    type="password"
                    value={configKey || 'sb_publishable_pamD6Tau-T1fHkfUvbli9g_mDF9scZa'}
                    onChange={(e) => setConfigKey(e.target.value)}
                    placeholder="eyJhbGciOi..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-xs text-black dark:text-white font-mono"
                  />
                </div>

                <div className="pt-2 flex gap-3">
                  <button
                    onClick={() => updateCustomSupabaseCredentials(configUrl, configKey)}
                    className="px-4 py-2.5 rounded-xl bg-black text-white dark:bg-white dark:text-black text-xs font-bold hover:bg-stone-800 dark:hover:bg-stone-200 active:scale-95 transition border border-black dark:border-white shadow-xs"
                  >
                    Save & Reconnect
                  </button>
                  <button
                    onClick={() => updateCustomSupabaseCredentials('', '')}
                    className="px-4 py-2.5 rounded-xl bg-stone-100 dark:bg-stone-900 text-black dark:text-white border border-stone-300 dark:border-stone-700 text-xs font-bold hover:bg-stone-200 dark:hover:bg-stone-800 transition"
                  >
                    Reset Defaults
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* -------------------------------------------------------------
          MODAL: EDIT / ADD BOOK
      ------------------------------------------------------------- */}
      {editingBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="w-full max-w-lg bg-white dark:bg-black rounded-3xl p-6 shadow-2xl border border-stone-300 dark:border-stone-800 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold font-serif mb-4 text-black dark:text-white">
              {editingBook.id ? 'Edit Book' : 'Add New Book'}
            </h3>

            <form onSubmit={handleSaveBook} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-black dark:text-white mb-1">
                  Book Title *
                </label>
                <input
                  type="text"
                  required
                  value={editingBook.title || ''}
                  onChange={(e) => setEditingBook({ ...editingBook, title: e.target.value })}
                  placeholder="e.g. Tai Khamyang Speaking Book"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-black dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-black dark:text-white mb-1">
                  Tai Language Branch
                </label>
                <select
                  value={editingBook.language || 'Tai Khamyang'}
                  onChange={(e) => setEditingBook({ ...editingBook, language: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-black dark:text-white font-medium"
                >
                  <option value="Tai Khamyang">Tai Khamyang</option>
                  <option value="Tai Ahom">Tai Ahom</option>
                  <option value="Tai Phake">Tai Phake</option>
                  <option value="Tai Khamti">Tai Khamti</option>
                  <option value="Tai Aiton">Tai Aiton</option>
                  <option value="Tai Turung">Tai Turung</option>
                  <option value="Other Tai">Other Tai</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-black dark:text-white mb-1">
                  Author / Publication Committee
                </label>
                <input
                  type="text"
                  value={editingBook.author || ''}
                  onChange={(e) => setEditingBook({ ...editingBook, author: e.target.value })}
                  placeholder="e.g. Tai Cultural Heritage Council"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-black dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-black dark:text-white mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={editingBook.description || ''}
                  onChange={(e) => setEditingBook({ ...editingBook, description: e.target.value })}
                  placeholder="Summary of this book..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-black dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-black dark:text-white mb-1">
                  Cover Image
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editingBook.cover_image_url || ''}
                    onChange={(e) => setEditingBook({ ...editingBook, cover_image_url: e.target.value })}
                    placeholder="URL or upload below"
                    className="flex-1 px-3.5 py-2 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-black dark:text-white font-mono text-[11px]"
                  />
                  <label className="px-3 py-2 rounded-xl bg-stone-100 dark:bg-stone-900 hover:bg-stone-200 dark:hover:bg-stone-800 border border-stone-300 dark:border-stone-700 text-black dark:text-white cursor-pointer font-bold flex items-center gap-1">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) {
                          handleFileUpload('book-covers', `cover-${Date.now()}-${f.name}`, f, (url) => {
                            setEditingBook({ ...editingBook, cover_image_url: url });
                          });
                        }
                      }}
                    />
                  </label>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-stone-200 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => setEditingBook(null)}
                  className="px-4 py-2.5 rounded-xl text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-900 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl bg-black text-white hover:bg-stone-800 dark:bg-white dark:text-black dark:hover:bg-stone-200 font-bold border border-black dark:border-white shadow-xs"
                >
                  Save Book
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          MODAL: EDIT / ADD PAGE
      ------------------------------------------------------------- */}
      {editingPage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="w-full max-w-xl bg-white dark:bg-black rounded-3xl p-6 shadow-2xl border border-stone-300 dark:border-stone-800 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold font-serif mb-4 text-black dark:text-white">
              {editingPage.id ? 'Edit Page' : 'Add New Book Page'}
            </h3>

            <form onSubmit={handleSavePage} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-black dark:text-white mb-1">
                    Book *
                  </label>
                  <select
                    required
                    value={editingPage.book_id || ''}
                    onChange={(e) => setEditingPage({ ...editingPage, book_id: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-black dark:text-white font-bold"
                  >
                    {books.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-black dark:text-white mb-1">
                    Page Number *
                  </label>
                  <input
                    type="number"
                    required
                    value={editingPage.page_number ?? ''}
                    onChange={(e) => setEditingPage({ ...editingPage, page_number: Number(e.target.value) })}
                    placeholder="e.g. 25"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-black dark:text-white font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-black dark:text-white mb-1">
                  Page Title / Topic
                </label>
                <input
                  type="text"
                  value={editingPage.page_title || ''}
                  onChange={(e) => setEditingPage({ ...editingPage, page_title: e.target.value })}
                  placeholder="e.g. Daily Greetings and Respectful Salutations"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-black dark:text-white"
                />
              </div>

              {/* Page Image */}
              <div>
                <label className="block font-bold text-black dark:text-white mb-1">
                  Page Image
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editingPage.page_image_url || ''}
                    onChange={(e) => setEditingPage({ ...editingPage, page_image_url: e.target.value })}
                    placeholder="URL or upload image"
                    className="flex-1 px-3.5 py-2 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-black dark:text-white font-mono text-[11px]"
                  />
                  <label className="px-3 py-2 rounded-xl bg-stone-100 dark:bg-stone-900 hover:bg-stone-200 dark:hover:bg-stone-800 border border-stone-300 dark:border-stone-700 text-black dark:text-white cursor-pointer font-bold flex items-center gap-1">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) {
                          handleFileUpload('page-images', `page-${Date.now()}-${f.name}`, f, (url) => {
                            setEditingPage({ ...editingPage, page_image_url: url });
                          });
                        }
                      }}
                    />
                  </label>
                </div>
              </div>

              {/* Page Text Area */}
              <div>
                <label className="block font-bold text-black dark:text-white mb-1">
                  Page Text / Content (Large Text Area)
                </label>
                <textarea
                  rows={5}
                  value={editingPage.page_text || ''}
                  onChange={(e) => setEditingPage({ ...editingPage, page_text: e.target.value })}
                  placeholder="Enter the complete text content of this page..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-black dark:text-white font-serif leading-relaxed"
                />
              </div>

              {/* Full Page Audio */}
              <div>
                <label className="block font-bold text-black dark:text-white mb-1">
                  Full Page Audio
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editingPage.full_page_audio_url || ''}
                    onChange={(e) => setEditingPage({ ...editingPage, full_page_audio_url: e.target.value })}
                    placeholder="Audio URL or upload MP3/WAV/OGG"
                    className="flex-1 px-3.5 py-2 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-black dark:text-white font-mono text-[11px]"
                  />
                  <label className="px-3 py-2 rounded-xl bg-stone-100 dark:bg-stone-900 hover:bg-stone-200 dark:hover:bg-stone-800 border border-stone-300 dark:border-stone-700 text-black dark:text-white cursor-pointer font-bold flex items-center gap-1">
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Upload Audio</span>
                    <input
                      type="file"
                      accept="audio/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) {
                          handleFileUpload('audio', `page-audio-${Date.now()}-${f.name}`, f, (url) => {
                            setEditingPage({ ...editingPage, full_page_audio_url: url });
                          });
                        }
                      }}
                    />
                  </label>
                </div>
              </div>

              {/* Summary */}
              <div>
                <label className="block font-bold text-black dark:text-white mb-1">
                  Page Summary (Large Text Area)
                </label>
                <textarea
                  rows={3}
                  value={editingPage.summary || ''}
                  onChange={(e) => setEditingPage({ ...editingPage, summary: e.target.value })}
                  placeholder="Administrator summary of the lesson on this page..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-black dark:text-white"
                />
              </div>

              {/* Summary Audio */}
              <div>
                <label className="block font-bold text-black dark:text-white mb-1">
                  Summary Audio
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editingPage.summary_audio_url || ''}
                    onChange={(e) => setEditingPage({ ...editingPage, summary_audio_url: e.target.value })}
                    placeholder="Summary audio URL"
                    className="flex-1 px-3.5 py-2 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-black dark:text-white font-mono text-[11px]"
                  />
                  <label className="px-3 py-2 rounded-xl bg-stone-100 dark:bg-stone-900 hover:bg-stone-200 dark:hover:bg-stone-800 border border-stone-300 dark:border-stone-700 text-black dark:text-white cursor-pointer font-bold flex items-center gap-1">
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Upload</span>
                    <input
                      type="file"
                      accept="audio/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) {
                          handleFileUpload('audio', `summary-audio-${Date.now()}-${f.name}`, f, (url) => {
                            setEditingPage({ ...editingPage, summary_audio_url: url });
                          });
                        }
                      }}
                    />
                  </label>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-stone-200 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => setEditingPage(null)}
                  className="px-4 py-2.5 rounded-xl text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-900 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl bg-black text-white hover:bg-stone-800 dark:bg-white dark:text-black dark:hover:bg-stone-200 font-bold border border-black dark:border-white shadow-xs"
                >
                  Save Page
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          MODAL: EDIT / ADD WORD
      ------------------------------------------------------------- */}
      {editingWord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="w-full max-w-lg bg-white dark:bg-black rounded-3xl p-6 shadow-2xl border border-stone-300 dark:border-stone-800 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold font-serif mb-4 text-black dark:text-white">
              {editingWord.id ? 'Edit Word' : 'Add Important Word'}
            </h3>

            <form onSubmit={handleSaveWord} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-black dark:text-white mb-1">
                    Tai Word (Native Script) *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingWord.word || ''}
                    onChange={(e) => setEditingWord({ ...editingWord, word: e.target.value })}
                    placeholder="e.g. မႂ်ႇသုင်ၶႃႈ"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-black dark:text-white font-serif text-base"
                  />
                </div>

                <div>
                  <label className="block font-bold text-black dark:text-white mb-1">
                    Phonetic / Transliteration
                  </label>
                  <input
                    type="text"
                    value={editingWord.phonetic || ''}
                    onChange={(e) => setEditingWord({ ...editingWord, phonetic: e.target.value })}
                    placeholder="e.g. Mai-sung kha"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-black dark:text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-black dark:text-white mb-1">
                  General Meaning *
                </label>
                <input
                  type="text"
                  required
                  value={editingWord.meaning || ''}
                  onChange={(e) => setEditingWord({ ...editingWord, meaning: e.target.value })}
                  placeholder="Primary definition / nuance"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-black dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-black dark:text-white mb-1">
                    Assamese Meaning
                  </label>
                  <input
                    type="text"
                    value={editingWord.assamese_meaning || ''}
                    onChange={(e) => setEditingWord({ ...editingWord, assamese_meaning: e.target.value })}
                    placeholder="নমস্কাৰ / মঙ্গল হওক"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-black dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-black dark:text-white mb-1">
                    English Meaning
                  </label>
                  <input
                    type="text"
                    value={editingWord.english_meaning || ''}
                    onChange={(e) => setEditingWord({ ...editingWord, english_meaning: e.target.value })}
                    placeholder="Hello / Auspicious blessing"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-black dark:text-white"
                  />
                </div>
              </div>

              {/* Example sentence */}
              <div>
                <label className="block font-bold text-black dark:text-white mb-1">
                  Example Sentence
                </label>
                <input
                  type="text"
                  value={editingWord.example_sentence || ''}
                  onChange={(e) => setEditingWord({ ...editingWord, example_sentence: e.target.value })}
                  placeholder="Tai example sentence"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-black dark:text-white font-serif"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  value={editingWord.example_assamese || ''}
                  onChange={(e) => setEditingWord({ ...editingWord, example_assamese: e.target.value })}
                  placeholder="Example in Assamese"
                  className="w-full px-3.5 py-2 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-black dark:text-white text-[11px]"
                />
                <input
                  type="text"
                  value={editingWord.example_english || ''}
                  onChange={(e) => setEditingWord({ ...editingWord, example_english: e.target.value })}
                  placeholder="Example in English"
                  className="w-full px-3.5 py-2 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-black dark:text-white text-[11px]"
                />
              </div>

              {/* Word Audio */}
              <div>
                <label className="block font-bold text-black dark:text-white mb-1">
                  Word Audio (Pronunciation)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editingWord.word_audio_url || ''}
                    onChange={(e) => setEditingWord({ ...editingWord, word_audio_url: e.target.value })}
                    placeholder="Audio URL or upload below"
                    className="flex-1 px-3.5 py-2 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-black dark:text-white font-mono text-[11px]"
                  />
                  <label className="px-3 py-2 rounded-xl bg-stone-100 dark:bg-stone-900 hover:bg-stone-200 dark:hover:bg-stone-800 border border-stone-300 dark:border-stone-700 text-black dark:text-white cursor-pointer font-bold flex items-center gap-1">
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Upload</span>
                    <input
                      type="file"
                      accept="audio/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) {
                          handleFileUpload('audio', `word-${Date.now()}-${f.name}`, f, (url) => {
                            setEditingWord({ ...editingWord, word_audio_url: url });
                          });
                        }
                      }}
                    />
                  </label>
                </div>
              </div>

              {/* Example Audio */}
              <div>
                <label className="block font-bold text-black dark:text-white mb-1">
                  Example Sentence Audio (Optional)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editingWord.example_audio_url || ''}
                    onChange={(e) => setEditingWord({ ...editingWord, example_audio_url: e.target.value })}
                    placeholder="Example audio URL"
                    className="flex-1 px-3.5 py-2 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-black dark:text-white font-mono text-[11px]"
                  />
                  <label className="px-3 py-2 rounded-xl bg-stone-100 dark:bg-stone-900 hover:bg-stone-200 dark:hover:bg-stone-800 border border-stone-300 dark:border-stone-700 text-black dark:text-white cursor-pointer font-bold flex items-center gap-1">
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Upload</span>
                    <input
                      type="file"
                      accept="audio/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) {
                          handleFileUpload('audio', `example-${Date.now()}-${f.name}`, f, (url) => {
                            setEditingWord({ ...editingWord, example_audio_url: url });
                          });
                        }
                      }}
                    />
                  </label>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-stone-200 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => setEditingWord(null)}
                  className="px-4 py-2.5 rounded-xl text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-900 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl bg-black text-white hover:bg-stone-800 dark:bg-white dark:text-black dark:hover:bg-stone-200 font-bold border border-black dark:border-white shadow-xs"
                >
                  Save Word
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          MODAL: QR CODE CARD PREVIEW
      ------------------------------------------------------------- */}
      {qrModalPage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="w-full max-w-md bg-white dark:bg-black rounded-3xl p-6 shadow-2xl border border-stone-300 dark:border-stone-800 max-h-[95vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold font-serif text-black dark:text-white">Printable Page QR Card</h3>
              <button
                onClick={() => setQrModalPage(null)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-black dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            <QRCardGenerator
              token={qrModalPage.qr_token}
              bookTitle={books.find((b) => b.id === qrModalPage.book_id)?.title || 'Tai Speaking Book'}
              pageNumber={qrModalPage.page_number}
              showRegenerate={true}
              onRegenerate={() => handleRegenerateQr(qrModalPage.id)}
            />
          </div>
        </div>
      )}
    </div>
  );
};
