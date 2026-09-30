-- ==============================================================================
-- PROJECT: DG book (Supabase Project ID: cwgyywwehgrncqphfwsi)
-- APPLICATION: Tai Digital Dictionary
-- SQL MIGRATION SCRIPT (Production Ready)
--
-- Instructions:
-- 1. Open Supabase Dashboard: https://supabase.com/dashboard/project/cwgyywwehgrncqphfwsi/sql
-- 2. Click "New query"
-- 3. Paste this entire SQL script and click "Run"
-- ==============================================================================

-- 0. Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. BOOKS TABLE
-- ------------------------------------------------------------------------------
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

-- ------------------------------------------------------------------------------
-- 2. PAGES TABLE
-- ------------------------------------------------------------------------------
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

-- ------------------------------------------------------------------------------
-- 3. WORDS TABLE
-- ------------------------------------------------------------------------------
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

-- ------------------------------------------------------------------------------
-- 4. QR CODES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.qr_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    page_id UUID NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    qr_url TEXT NOT NULL,
    qr_image_url TEXT DEFAULT '',
    scan_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ------------------------------------------------------------------------------
-- 5. ADMIN PROFILES TABLE (Optional Supabase Auth Integration)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE,
    role TEXT DEFAULT 'admin' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ------------------------------------------------------------------------------
-- 6. INDEXES FOR LIGHTNING FAST QR LOOKUPS & SEARCH
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_pages_qr_token ON public.pages(qr_token);
CREATE INDEX IF NOT EXISTS idx_pages_book_id ON public.pages(book_id);
CREATE INDEX IF NOT EXISTS idx_pages_page_num ON public.pages(page_number);
CREATE INDEX IF NOT EXISTS idx_words_page_id ON public.words(page_id);
CREATE INDEX IF NOT EXISTS idx_words_display_order ON public.words(display_order);
CREATE INDEX IF NOT EXISTS idx_qr_codes_token ON public.qr_codes(token);

-- ------------------------------------------------------------------------------
-- 7. ENABLE ROW LEVEL SECURITY (RLS)
-- ------------------------------------------------------------------------------
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.words ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_profiles ENABLE ROW LEVEL SECURITY;

-- Clean existing policies so this script can be executed repeatedly
DROP POLICY IF EXISTS "Public read books" ON public.books;
DROP POLICY IF EXISTS "Allow all write books" ON public.books;
DROP POLICY IF EXISTS "Public read pages" ON public.pages;
DROP POLICY IF EXISTS "Allow all write pages" ON public.pages;
DROP POLICY IF EXISTS "Public read words" ON public.words;
DROP POLICY IF EXISTS "Allow all write words" ON public.words;
DROP POLICY IF EXISTS "Public read qr_codes" ON public.qr_codes;
DROP POLICY IF EXISTS "Allow all write qr_codes" ON public.qr_codes;

-- Public can read all books, pages, words, qr_codes
CREATE POLICY "Public read books" ON public.books FOR SELECT USING (true);
CREATE POLICY "Public read pages" ON public.pages FOR SELECT USING (true);
CREATE POLICY "Public read words" ON public.words FOR SELECT USING (true);
CREATE POLICY "Public read qr_codes" ON public.qr_codes FOR SELECT USING (true);

-- Allow write operations for the app
CREATE POLICY "Allow all write books" ON public.books FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all write pages" ON public.pages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all write words" ON public.words FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all write qr_codes" ON public.qr_codes FOR ALL USING (true) WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 8. ENABLE REALTIME BROADCAST
-- This lets public users on phone and admin dashboard receive instant live updates
-- ------------------------------------------------------------------------------
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

-- ------------------------------------------------------------------------------
-- 9. SUPABASE STORAGE BUCKETS (FOR COVERS, PAGE PICTURES, AUDIO & QR)
-- ------------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES 
    ('book-covers', 'book-covers', true),
    ('page-images', 'page-images', true),
    ('audio', 'audio', true),
    ('qr-codes', 'qr-codes', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage RLS policies
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

-- Allow public read of all buckets
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
CREATE POLICY "Public delete storage qr-codes" ON storage.objects FOR DELETE USING (bucket_id = 'qr-codes');

-- ==============================================================================
-- DONE! Your "DG book" Supabase database is now completely initialized and ready!
-- ==============================================================================
