export type TaiLanguage = 
  | 'Tai Khamyang'
  | 'Tai Ahom'
  | 'Tai Phake'
  | 'Tai Khamti'
  | 'Tai Aiton'
  | 'Tai Turung'
  | 'Other Tai';

export interface Book {
  id: string;
  title: string;
  description: string;
  author: string;
  language: TaiLanguage | string;
  cover_image_url: string;
  created_at: string;
  updated_at: string;
}

export interface Page {
  id: string;
  book_id: string;
  page_number: number;
  page_title?: string;
  page_image_url: string;
  page_text: string;
  full_page_audio_url?: string;
  summary: string;
  summary_audio_url?: string;
  qr_token: string;
  created_at: string;
  updated_at: string;
}

export interface Word {
  id: string;
  page_id: string;
  word: string;
  phonetic?: string;
  meaning: string;
  assamese_meaning?: string;
  english_meaning?: string;
  example_sentence?: string;
  example_assamese?: string;
  example_english?: string;
  word_audio_url?: string;
  meaning_audio_url?: string;
  example_audio_url?: string;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface QRCodeRecord {
  id: string;
  page_id: string;
  token: string;
  qr_url: string;
  qr_image_url?: string;
  scan_count?: number;
  created_at: string;
}

export interface PageWithDetails extends Page {
  book?: Book;
  words: Word[];
  previous_page?: {
    id: string;
    page_number: number;
    qr_token: string;
  } | null;
  next_page?: {
    id: string;
    page_number: number;
    qr_token: string;
  } | null;
}

export type TextSize = 'small' | 'medium' | 'large';

export interface AppSettings {
  darkMode: boolean;
  textSize: TextSize;
  audioSpeed: number; // 0.75, 1, 1.25
  autoPlayAudio: boolean;
}
