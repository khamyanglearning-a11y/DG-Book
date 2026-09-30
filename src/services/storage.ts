import { supabase, isSupabaseConfigured } from './supabase';

export type BucketName = 'book-covers' | 'page-images' | 'audio' | 'qr-codes';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
const ALLOWED_AUDIO_TYPES = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/ogg',
  'audio/m4a',
  'audio/webm',
  'audio/aac',
  'audio/x-m4a'
];

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_AUDIO_SIZE = 25 * 1024 * 1024; // 25MB

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

export async function uploadFile(
  bucket: BucketName,
  path: string,
  file: File,
  onProgress?: (percent: number) => void
): Promise<UploadResult> {
  // Validate file
  const isAudioBucket = bucket === 'audio';
  
  if (isAudioBucket) {
    if (!ALLOWED_AUDIO_TYPES.includes(file.type) && !file.name.match(/\.(mp3|wav|ogg|m4a|webm|aac)$/i)) {
      return {
        success: false,
        error: 'Invalid audio format. Please upload MP3, WAV, OGG, M4A, or AAC.'
      };
    }
    if (file.size > MAX_AUDIO_SIZE) {
      return {
        success: false,
        error: `Audio file exceeds maximum size limit of 25MB. Current size: ${(file.size / (1024 * 1024)).toFixed(1)}MB.`
      };
    }
  } else {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type) && !file.name.match(/\.(jpg|jpeg|png|webp|svg)$/i)) {
      return {
        success: false,
        error: 'Invalid image format. Please upload JPG, PNG, WEBP, or SVG.'
      };
    }
    if (file.size > MAX_IMAGE_SIZE) {
      return {
        success: false,
        error: `Image file exceeds maximum size limit of 10MB. Current size: ${(file.size / (1024 * 1024)).toFixed(1)}MB.`
      };
    }
  }

  onProgress?.(30);

  // If Supabase is connected, upload to Supabase storage bucket
  if (isSupabaseConfigured && supabase) {
    try {
      const cleanPath = path.replace(/^\/+/, '');
      const { data, error } = await supabase.storage.from(bucket).upload(cleanPath, file, {
        cacheControl: '3600',
        upsert: true,
      });

      if (error) {
        console.warn('Supabase storage upload error, falling back to local data URL:', error.message);
        // Fall back to data URL
      } else if (data) {
        onProgress?.(90);
        const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(cleanPath);
        onProgress?.(100);
        return {
          success: true,
          url: publicData.publicUrl,
        };
      }
    } catch (err: any) {
      console.warn('Supabase storage exception:', err);
    }
  }

  // Standalone / Offline fallback: Convert file to Base64 Data URL so uploaded media is immediately usable
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      onProgress?.(100);
      resolve({
        success: true,
        url: reader.result as string,
      });
    };
    reader.onerror = () => {
      resolve({
        success: false,
        error: 'Failed to read local file into preview store.',
      });
    };
    reader.readAsDataURL(file);
  });
}
