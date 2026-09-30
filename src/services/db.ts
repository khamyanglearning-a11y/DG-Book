import { Book, Page, Word, QRCodeRecord, PageWithDetails } from '../types';
import { supabase, isSupabaseConfigured } from './supabase';

const LOCAL_STORAGE_KEY_PREFIX = 'tai_dict_';

function getLocalData<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY_PREFIX + key);
    if (!raw) return defaultValue;
    return JSON.parse(raw);
  } catch (e) {
    return defaultValue;
  }
}

function setLocalData<T>(key: string, value: T): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY_PREFIX + key, JSON.stringify(value));
  } catch (e) {
    console.error('Local storage write error:', e);
  }
}

// Generate random uppercase alphanumeric token, e.g. "ABC123XYZ"
export function generateQrToken(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let token = '';
  for (let i = 0; i < 9; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

// ----------------------------------------------------------------------
// REALTIME SUBSCRIPTIONS
// ----------------------------------------------------------------------

/**
 * Subscribes to changes on any of the specified tables in Supabase in real-time.
 * Calls `onChanged` whenever an INSERT, UPDATE, or DELETE happens.
 */
export function subscribeToDatabaseChanges(
  tables: Array<'books' | 'pages' | 'words' | 'qr_codes'> = ['books', 'pages', 'words', 'qr_codes'],
  onChanged: () => void
): () => void {
  if (!isSupabaseConfigured || !supabase) return () => {};

  const channelName = `realtime_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  let channel = supabase.channel(channelName);

  tables.forEach((t) => {
    channel = channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: t },
      () => {
        onChanged();
      }
    );
  });

  channel.subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      // Realtime channel ready
    }
  });

  return () => {
    supabase?.removeChannel(channel);
  };
}

/**
 * Subscribes to real-time updates for a specific QR learning page.
 */
export function subscribeToLearningPage(
  qrToken: string,
  onUpdate: (page: PageWithDetails | null) => void
): () => void {
  if (!isSupabaseConfigured || !supabase) return () => {};

  const channelName = `page_token_${qrToken.trim().toLowerCase()}_${Date.now()}`;
  const channel = supabase
    .channel(channelName)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'pages' }, async () => {
      const updated = await getPageByQrToken(qrToken);
      onUpdate(updated);
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'words' }, async () => {
      const updated = await getPageByQrToken(qrToken);
      onUpdate(updated);
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'books' }, async () => {
      const updated = await getPageByQrToken(qrToken);
      onUpdate(updated);
    })
    .subscribe();

  return () => {
    supabase?.removeChannel(channel);
  };
}

// ----------------------------------------------------------------------
// BOOKS
// ----------------------------------------------------------------------
export async function getBooks(): Promise<Book[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('books')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data) {
        return data as Book[];
      }
    } catch (e) {
      console.warn('Supabase getBooks failed, fallback to local', e);
    }
  }

  // Fallback to local storage (no demo mock seed)
  return getLocalData<Book[]>('books', []);
}

export async function getBookById(id: string): Promise<Book | null> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('books')
        .select('*')
        .eq('id', id)
        .single();
      if (!error && data) return data as Book;
    } catch (e) {
      // fallback
    }
  }
  const books = await getBooks();
  return books.find((b) => b.id === id) || null;
}

export async function saveBook(book: Partial<Book> & { title: string }): Promise<Book> {
  const isNew = !book.id;
  const now = new Date().toISOString();

  if (isSupabaseConfigured && supabase) {
    try {
      if (isNew) {
        const { data, error } = await supabase
          .from('books')
          .insert({
            title: book.title,
            description: book.description || '',
            author: book.author || '',
            language: book.language || 'Tai Khamyang',
            cover_image_url: book.cover_image_url || '',
            created_at: now,
            updated_at: now,
          })
          .select()
          .single();
        if (!error && data) return data as Book;
        if (error) console.error('Supabase saveBook error:', error);
      } else {
        const { data, error } = await supabase
          .from('books')
          .update({
            title: book.title,
            description: book.description,
            author: book.author,
            language: book.language,
            cover_image_url: book.cover_image_url,
            updated_at: now,
          })
          .eq('id', book.id)
          .select()
          .single();
        if (!error && data) return data as Book;
        if (error) console.error('Supabase updateBook error:', error);
      }
    } catch (e) {
      console.warn('Supabase saveBook failed, using local save', e);
    }
  }

  // Local save
  const books = await getBooks();
  if (isNew) {
    const newBook: Book = {
      id: 'b_' + Date.now(),
      title: book.title,
      description: book.description || '',
      author: book.author || '',
      language: book.language || 'Tai Khamyang',
      cover_image_url: book.cover_image_url || '',
      created_at: now,
      updated_at: now,
    };
    books.unshift(newBook);
    setLocalData('books', books);
    return newBook;
  } else {
    const idx = books.findIndex((b) => b.id === book.id);
    if (idx !== -1) {
      books[idx] = {
        ...books[idx],
        ...book,
        updated_at: now,
      };
      setLocalData('books', books);
      return books[idx];
    }
    throw new Error('Book not found');
  }
}

export async function deleteBook(id: string): Promise<boolean> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase.from('books').delete().eq('id', id);
      if (!error) {
        return true;
      }
    } catch (e) {
      console.warn('Supabase deleteBook failed', e);
    }
  }

  // Local delete
  const books = (await getBooks()).filter((b) => b.id !== id);
  setLocalData('books', books);

  // Also remove cascaded pages
  const pages = getLocalData<Page[]>('pages', []).filter((p) => p.book_id !== id);
  setLocalData('pages', pages);
  return true;
}

// ----------------------------------------------------------------------
// PAGES & QR LOOKUP
// ----------------------------------------------------------------------
export async function getPages(): Promise<Page[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('pages')
        .select('*')
        .order('page_number', { ascending: true });
      if (!error && data) {
        return data as Page[];
      }
    } catch (e) {
      console.warn('Supabase getPages failed', e);
    }
  }

  return getLocalData<Page[]>('pages', []);
}

export async function getPagesByBook(bookId: string): Promise<Page[]> {
  const pages = await getPages();
  return pages.filter((p) => p.book_id === bookId).sort((a, b) => a.page_number - b.page_number);
}

export async function getPageById(id: string): Promise<Page | null> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('pages')
        .select('*')
        .eq('id', id)
        .single();
      if (!error && data) return data as Page;
    } catch (e) {
      // fallback
    }
  }
  const pages = await getPages();
  return pages.find((p) => p.id === id) || null;
}

export async function getPageByQrToken(qrToken: string): Promise<PageWithDetails | null> {
  const cleanToken = qrToken.trim();

  // Try Supabase first
  if (isSupabaseConfigured && supabase) {
    try {
      const { data: pageData, error } = await supabase
        .from('pages')
        .select('*, book:books(*)')
        .ilike('qr_token', cleanToken)
        .single();

      if (!error && pageData) {
        // Fetch words for this page
        const { data: wordsData } = await supabase
          .from('words')
          .select('*')
          .eq('page_id', pageData.id)
          .order('display_order', { ascending: true });

        // Fetch sibling pages for previous/next navigation
        const { data: siblingPages } = await supabase
          .from('pages')
          .select('id, page_number, qr_token')
          .eq('book_id', pageData.book_id)
          .order('page_number', { ascending: true });

        let prev = null;
        let next = null;
        if (siblingPages && siblingPages.length > 0) {
          const currentIdx = siblingPages.findIndex((p) => p.id === pageData.id);
          if (currentIdx > 0) prev = siblingPages[currentIdx - 1];
          if (currentIdx !== -1 && currentIdx < siblingPages.length - 1) {
            next = siblingPages[currentIdx + 1];
          }
        }

        // Increment scan count asynchronously in Supabase
        recordQrScan(cleanToken).catch(() => {});

        return {
          ...pageData,
          book: pageData.book,
          words: (wordsData || []) as Word[],
          previous_page: prev,
          next_page: next,
        };
      }
    } catch (e) {
      console.warn('Supabase getPageByQrToken failed', e);
    }
  }

  // Fallback to local store (for standalone/offline usage)
  const pages = await getPages();
  const page = pages.find((p) => p.qr_token.toUpperCase() === cleanToken.toUpperCase());
  if (!page) return null;

  const books = await getBooks();
  const book = books.find((b) => b.id === page.book_id);
  const words = await getWordsByPage(page.id);

  const bookPages = pages
    .filter((p) => p.book_id === page.book_id)
    .sort((a, b) => a.page_number - b.page_number);

  const currentIndex = bookPages.findIndex((p) => p.id === page.id);
  const previous_page = currentIndex > 0 ? {
    id: bookPages[currentIndex - 1].id,
    page_number: bookPages[currentIndex - 1].page_number,
    qr_token: bookPages[currentIndex - 1].qr_token,
  } : null;

  const next_page = currentIndex < bookPages.length - 1 ? {
    id: bookPages[currentIndex + 1].id,
    page_number: bookPages[currentIndex + 1].page_number,
    qr_token: bookPages[currentIndex + 1].qr_token,
  } : null;

  recordQrScan(cleanToken).catch(() => {});

  return {
    ...page,
    book,
    words,
    previous_page,
    next_page,
  };
}

export async function savePage(page: Partial<Page> & { book_id: string; page_number: number }): Promise<Page> {
  const isNew = !page.id;
  const now = new Date().toISOString();
  const qr_token = page.qr_token || generateQrToken();

  if (isSupabaseConfigured && supabase) {
    try {
      if (isNew) {
        const { data, error } = await supabase
          .from('pages')
          .insert({
            book_id: page.book_id,
            page_number: Number(page.page_number),
            page_title: page.page_title || '',
            page_image_url: page.page_image_url || '',
            page_text: page.page_text || '',
            full_page_audio_url: page.full_page_audio_url || '',
            summary: page.summary || '',
            summary_audio_url: page.summary_audio_url || '',
            qr_token: qr_token,
            created_at: now,
            updated_at: now,
          })
          .select()
          .single();

        if (!error && data) {
          // create or update qr_codes entry
          await supabase.from('qr_codes').upsert({
            page_id: data.id,
            token: qr_token,
            qr_url: `${window.location.origin}/learn/${qr_token}`,
          }, { onConflict: 'token' });
          return data as Page;
        }
        if (error) console.error('Supabase savePage insert error:', error);
      } else {
        const { data, error } = await supabase
          .from('pages')
          .update({
            book_id: page.book_id,
            page_number: Number(page.page_number),
            page_title: page.page_title,
            page_image_url: page.page_image_url,
            page_text: page.page_text,
            full_page_audio_url: page.full_page_audio_url,
            summary: page.summary,
            summary_audio_url: page.summary_audio_url,
            qr_token: qr_token,
            updated_at: now,
          })
          .eq('id', page.id)
          .select()
          .single();

        if (!error && data) {
          await supabase.from('qr_codes').upsert({
            page_id: data.id,
            token: qr_token,
            qr_url: `${window.location.origin}/learn/${qr_token}`,
          }, { onConflict: 'token' });
          return data as Page;
        }
        if (error) console.error('Supabase savePage update error:', error);
      }
    } catch (e) {
      console.warn('Supabase savePage error, falling back to local', e);
    }
  }

  // Local save
  const pages = await getPages();
  if (isNew) {
    const newPage: Page = {
      id: 'p_' + Date.now(),
      book_id: page.book_id,
      page_number: Number(page.page_number),
      page_title: page.page_title || '',
      page_image_url: page.page_image_url || '',
      page_text: page.page_text || '',
      full_page_audio_url: page.full_page_audio_url || '',
      summary: page.summary || '',
      summary_audio_url: page.summary_audio_url || '',
      qr_token: qr_token,
      created_at: now,
      updated_at: now,
    };
    pages.push(newPage);
    setLocalData('pages', pages);

    const qrCodes = getLocalData<QRCodeRecord[]>('qr_codes', []);
    qrCodes.push({
      id: 'qr_' + Date.now(),
      page_id: newPage.id,
      token: qr_token,
      qr_url: `${window.location.origin}/learn/${qr_token}`,
      scan_count: 0,
      created_at: now,
    });
    setLocalData('qr_codes', qrCodes);

    return newPage;
  } else {
    const idx = pages.findIndex((p) => p.id === page.id);
    if (idx !== -1) {
      pages[idx] = {
        ...pages[idx],
        ...page,
        updated_at: now,
      };
      setLocalData('pages', pages);
      return pages[idx];
    }
    throw new Error('Page not found');
  }
}

export async function deletePage(id: string): Promise<boolean> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase.from('pages').delete().eq('id', id);
      if (!error) return true;
    } catch (e) {
      console.warn('Supabase deletePage error', e);
    }
  }

  const pages = (await getPages()).filter((p) => p.id !== id);
  setLocalData('pages', pages);

  const words = (await getAllWords()).filter((w) => w.page_id !== id);
  setLocalData('words', words);

  const qrs = getLocalData<QRCodeRecord[]>('qr_codes', []).filter((q) => q.page_id !== id);
  setLocalData('qr_codes', qrs);

  return true;
}

export async function regeneratePageQrToken(pageId: string): Promise<string> {
  const newToken = generateQrToken();
  const page = await getPageById(pageId);
  if (!page) throw new Error('Page not found');

  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('pages').update({ qr_token: newToken }).eq('id', pageId);
      await supabase.from('qr_codes').delete().eq('page_id', pageId);
      await supabase.from('qr_codes').insert({
        page_id: pageId,
        token: newToken,
        qr_url: `${window.location.origin}/learn/${newToken}`,
      });
      return newToken;
    } catch (e) {
      console.warn('Supabase regeneratePageQrToken failed', e);
    }
  }

  // Local fallback
  const pages = await getPages();
  const idx = pages.findIndex((p) => p.id === pageId);
  if (idx !== -1) {
    pages[idx].qr_token = newToken;
    setLocalData('pages', pages);

    const qrs = getLocalData<QRCodeRecord[]>('qr_codes', []).filter((q) => q.page_id !== pageId);
    qrs.push({
      id: 'qr_' + Date.now(),
      page_id: pageId,
      token: newToken,
      qr_url: `${window.location.origin}/learn/${newToken}`,
      scan_count: 0,
      created_at: new Date().toISOString(),
    });
    setLocalData('qr_codes', qrs);
  }
  return newToken;
}

// ----------------------------------------------------------------------
// WORDS
// ----------------------------------------------------------------------
export async function getAllWords(): Promise<Word[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('words')
        .select('*')
        .order('display_order', { ascending: true });
      if (!error && data) return data as Word[];
    } catch (e) {
      console.warn('Supabase getAllWords failed', e);
    }
  }

  return getLocalData<Word[]>('words', []);
}

export async function getWordsByPage(pageId: string): Promise<Word[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('words')
        .select('*')
        .eq('page_id', pageId)
        .order('display_order', { ascending: true });
      if (!error && data) return data as Word[];
    } catch (e) {
      console.warn('Supabase getWordsByPage failed', e);
    }
  }

  const words = await getAllWords();
  return words.filter((w) => w.page_id === pageId).sort((a, b) => a.display_order - b.display_order);
}

export async function saveWord(word: Partial<Word> & { page_id: string; word: string; meaning: string }): Promise<Word> {
  const isNew = !word.id;
  const now = new Date().toISOString();

  if (isSupabaseConfigured && supabase) {
    try {
      if (isNew) {
        const { data, error } = await supabase
          .from('words')
          .insert({
            page_id: word.page_id,
            word: word.word,
            phonetic: word.phonetic || '',
            meaning: word.meaning,
            assamese_meaning: word.assamese_meaning || '',
            english_meaning: word.english_meaning || '',
            example_sentence: word.example_sentence || '',
            example_assamese: word.example_assamese || '',
            example_english: word.example_english || '',
            word_audio_url: word.word_audio_url || '',
            meaning_audio_url: word.meaning_audio_url || '',
            example_audio_url: word.example_audio_url || '',
            display_order: word.display_order ?? 0,
            created_at: now,
            updated_at: now,
          })
          .select()
          .single();
        if (!error && data) return data as Word;
        if (error) console.error('Supabase saveWord insert error:', error);
      } else {
        const { data, error } = await supabase
          .from('words')
          .update({
            word: word.word,
            phonetic: word.phonetic,
            meaning: word.meaning,
            assamese_meaning: word.assamese_meaning,
            english_meaning: word.english_meaning,
            example_sentence: word.example_sentence,
            example_assamese: word.example_assamese,
            example_english: word.example_english,
            word_audio_url: word.word_audio_url,
            meaning_audio_url: word.meaning_audio_url,
            example_audio_url: word.example_audio_url,
            display_order: word.display_order,
            updated_at: now,
          })
          .eq('id', word.id)
          .select()
          .single();
        if (!error && data) return data as Word;
        if (error) console.error('Supabase saveWord update error:', error);
      }
    } catch (e) {
      console.warn('Supabase saveWord failed', e);
    }
  }

  // Local save
  const words = await getAllWords();
  if (isNew) {
    const newWord: Word = {
      id: 'w_' + Date.now() + Math.random().toString(36).substring(2, 6),
      page_id: word.page_id,
      word: word.word,
      phonetic: word.phonetic || '',
      meaning: word.meaning,
      assamese_meaning: word.assamese_meaning || '',
      english_meaning: word.english_meaning || '',
      example_sentence: word.example_sentence || '',
      example_assamese: word.example_assamese || '',
      example_english: word.example_english || '',
      word_audio_url: word.word_audio_url || '',
      meaning_audio_url: word.meaning_audio_url || '',
      example_audio_url: word.example_audio_url || '',
      display_order: word.display_order ?? words.filter((w) => w.page_id === word.page_id).length + 1,
      created_at: now,
      updated_at: now,
    };
    words.push(newWord);
    setLocalData('words', words);
    return newWord;
  } else {
    const idx = words.findIndex((w) => w.id === word.id);
    if (idx !== -1) {
      words[idx] = {
        ...words[idx],
        ...word,
        updated_at: now,
      };
      setLocalData('words', words);
      return words[idx];
    }
    throw new Error('Word not found');
  }
}

export async function deleteWord(id: string): Promise<boolean> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase.from('words').delete().eq('id', id);
      if (!error) return true;
    } catch (e) {
      console.warn('Supabase deleteWord error', e);
    }
  }

  const words = (await getAllWords()).filter((w) => w.id !== id);
  setLocalData('words', words);
  return true;
}

export async function reorderWords(pageId: string, orderedWordIds: string[]): Promise<void> {
  const words = await getAllWords();
  orderedWordIds.forEach((id, index) => {
    const found = words.find((w) => w.id === id);
    if (found) {
      found.display_order = index + 1;
    }
  });
  setLocalData('words', words);

  if (isSupabaseConfigured && supabase) {
    try {
      for (let i = 0; i < orderedWordIds.length; i++) {
        await supabase
          .from('words')
          .update({ display_order: i + 1 })
          .eq('id', orderedWordIds[i]);
      }
    } catch (e) {
      console.warn('Supabase reorder failed', e);
    }
  }
}

// ----------------------------------------------------------------------
// QR SCANS & DASHBOARD STATS
// ----------------------------------------------------------------------
export async function recordQrScan(token: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.rpc('increment_qr_scan', { qr_token_input: token });
    } catch (e) {
      // ignore
    }
  }

  const qrs = getLocalData<QRCodeRecord[]>('qr_codes', []);
  const found = qrs.find((q) => q.token.toUpperCase() === token.toUpperCase());
  if (found) {
    found.scan_count = (found.scan_count || 0) + 1;
    setLocalData('qr_codes', qrs);
  }
}

export interface DashboardStats {
  totalBooks: number;
  totalPages: number;
  totalWords: number;
  totalQRCodes: number;
  audioAvailableRatio: number;
  recentPages: (Page & { book_title?: string })[];
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const books = await getBooks();
  const pages = await getPages();
  const words = await getAllWords();

  let totalAudioSlots = pages.length + words.length;
  let filledAudioSlots = 0;

  pages.forEach((p) => {
    if (p.full_page_audio_url && p.full_page_audio_url.trim().length > 0) filledAudioSlots++;
  });
  words.forEach((w) => {
    if (w.word_audio_url && w.word_audio_url.trim().length > 0) filledAudioSlots++;
  });

  const ratio = totalAudioSlots > 0 ? Math.round((filledAudioSlots / totalAudioSlots) * 100) : 0;

  const recentPages = [...pages]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5)
    .map((p) => {
      const book = books.find((b) => b.id === p.book_id);
      return {
        ...p,
        book_title: book?.title || 'Unknown Book',
      };
    });

  return {
    totalBooks: books.length,
    totalPages: pages.length,
    totalWords: words.length,
    totalQRCodes: pages.length,
    audioAvailableRatio: ratio,
    recentPages,
  };
}
