# TAI DIGITAL DICTIONARY
### Physical Book QR-Code Companion & Language Revitalization Platform

Tai Digital Dictionary is a mobile-first digital learning companion built for physical books in Tai languages (Tai Khamyang, Tai Phake, Tai Ahom, Tai Khamti, Tai Aiton, Tai Turung).

Physical books are printed with individual, unique QR codes attached to each page. When students, elders, or language enthusiasts scan the page code with their smartphone camera, the application instantly opens the exact digital page with:
- High-resolution page image & reference text
- Full-page native speaker audio recitation
- Important vocabulary words with Tai script, phonetic pronunciation, Assamese meanings, and English definitions
- Manually recorded voice pronunciations for words, meanings, and example sentences
- Administrator-curated page summaries with dedicated audio
- Previous / Next page book navigation

**Public learners require NO registration or login.** Only the administrator can authenticate to catalog books, pages, words, and print QR codes.

---

## Architecture & Technology Stack

- **Frontend:** React 19, TypeScript, Tailwind CSS v4, Lucide Icons
- **Backend / Database:** Supabase (PostgreSQL with Row Level Security)
- **File Storage:** Supabase Storage (`book-covers`, `page-images`, `audio`, `qr-codes`)
- **QR Engine:** Canvas-based high-resolution QR generator (`qrcode`) & real-time camera scanner (`jsqr`)
- **PWA:** Service worker caching, offline state detector, Web App Manifest
- **Hosting:** Netlify ready (`netlify.toml` with SPA redirects)

---

## 12-Step Setup Guide

### 1. Create a Supabase Project
1. Log in to [supabase.com](https://supabase.com) and click **New Project**.
2. Select your preferred geographical region and set a secure database password.

### 2. Run Database Schema
1. In your Supabase Dashboard, open the **SQL Editor** in the left sidebar.
2. Open `/supabase/schema.sql` from this repository.
3. Paste the SQL script into the editor and click **Run**.
4. This creates all tables (`books`, `pages`, `words`, `qr_codes`, `admin_profiles`), indexes, RLS policies, storage bucket configurations, and seeds initial data for *Tai Khamyang Speaking Book (Page 25 & 26)*.

### 3. Verify Storage Buckets
In the **Storage** section of Supabase, verify the following public buckets:
- `book-covers`
- `page-images`
- `audio`
- `qr-codes`

### 4. Configure Administrator Authentication
1. Go to **Authentication -> Users** in Supabase.
2. Invite or create your administrator account (e.g., `6901543900@taidictionary.org` or your preferred email).
3. In development / initial test mode, the admin login credentials are:
   - **Username:** `6901543900`
   - **Password:** `936581`

### 5. Set Environment Variables
Copy `.env.example` to `.env`:
```bash
VITE_SUPABASE_URL="https://YOUR_PROJECT_ID.supabase.co"
VITE_SUPABASE_ANON_KEY="YOUR_PUBLIC_ANON_KEY"
```
*Note: In the Admin Dashboard under "Supabase Setup", you can also test or update your credentials live in the UI.*

### 6. Run Locally
```bash
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) on your desktop or mobile browser.

### 7. Test Admin Login
1. Click **⚙ Settings** at the bottom of the home screen.
2. Tap **🔐 Admin Login**.
3. Enter username `6901543900` and password `936581`.
4. You will be redirected to the **Admin Dashboard**.

### 8. Add First Book
1. From the Admin Dashboard, click **Books -> Add Book**.
2. Enter the title (e.g., *Tai Khamyang Speaking Book*), select language branch, enter author, and optionally upload a cover photo.

### 9. Add First Page
1. Go to **Pages -> Add New Page**.
2. Select the book and enter the physical page number (e.g. `25`).
3. Upload the page photo and write the page text and summary.
4. Upload full-page audio (`.mp3` or `.wav`).
5. A unique QR token (e.g., `ABC123XYZ`) is generated automatically.

### 10. Add Important Words
1. Go to **Words** and select your page.
2. Click **Add Word**.
3. Enter the word in native Tai script (e.g. `မႂ်ႇသုင်ၶႃႈ`), transliteration (`Mai-sung kha`), Assamese meaning (`নমস্কাৰ`), English meaning (`Hello / Auspicious blessing`), and upload pronunciation audio.

### 11. Generate and Print Page QR Code
1. Go to **QR Codes** in the Admin Dashboard.
2. Select the page card:
   - **[ Download PNG ]**: Downloads a 300-DPI printable sticker card with book title, page number, QR code, and cutting borders.
   - **[ Print QR ]**: Launches direct browser printing formatted for clean book insertion.
3. Physically paste the QR sticker on the corresponding book page.

### 12. Deploy to Netlify
1. Push your repository to GitHub or GitLab.
2. In Netlify, click **Add new site -> Import an existing project**.
3. Build command: `npm run build`
4. Publish directory: `dist`
5. Under **Environment variables**, set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
6. Deploy! The included `netlify.toml` automatically handles SPA routing so `/learn/:token` and `/admin` reload seamlessly.

---

## Physical QR Code Printing Recommendation

For optimal scanning reliability on low-cost Android smartphone cameras in rural classrooms:
- **Print Size:** Minimum 35mm x 35mm (approx 1.4 inches).
- **Background:** Crisp white paper with strong black ink contrast.
- **Placement:** Place at the bottom margin or top-right corner of the physical book page.
