# Al-Ferdous Quran Academy: Website

Plain HTML / CSS / JavaScript (no build framework). English at the root, Bangla in `bn/`.

## Netlify settings
- **Build command:** `node scripts/make-config.js` (writes the Supabase public settings from environment variables; harmless if they are not set)
- **Publish directory:** `.` (the repository root)
- Environment variables (optional until the Admin Panel is set up): `SUPABASE_URL`, `SUPABASE_ANON_KEY` (publishable key only; never a secret/service_role key)

## GitHub upload
Extract the ZIP and upload everything inside it to the root of your repository (`index.html` must be at the repository root). Connect the repository in Netlify with the settings above.

See `SETUP-BN.md` for the Admin Panel / Supabase setup (Bangla) and `docs/ADMIN-MANUAL-BN.md` for daily use.

---

```
AL-FERDOUS QURAN ACADEMY - WEBSITE (English + Bangla)

Upload this whole folder to your hosting (drag and drop).
- English site: index.html and the other pages in the main folder.
- Bangla site:  the bn/ folder (bn/index.html ...). Same pages, same design.
- The "বাংলা | English" button in the header switches language and remembers the choice.

Pages: Home, About, Courses, Why Us, Teachers, Learning Path (learning-journey.html), Worldwide (worldwide.html),
Videos, FAQ, Careers, Contact, Free Trial.

Social icons (WhatsApp, Facebook, Instagram, YouTube, Gmail) are under the child photo on the home page.
Links are set in the generator; to change them, edit the href values in index.html and bn/index.html.

Fonts: fonts/SolaimanLipi.ttf (Bangla), fonts/Al_Mushaf_Quran.ttf (Arabic).
Videos: add Facebook videos with admin-videos.html (English only, not linked in the menu), then replace js/videos.js.
Teacher photos: images/teachers/. Icons: images/icons/ (transparent PNG).

Video gallery: js/videos.js holds 8 cards with your earlier titles. Replace it with your own videos.js (or use admin-videos.html) to add the real video links and thumbnails.
Menu: "More" holds Learning Path, Worldwide and Careers.


SOCIAL ICON LINKS (WhatsApp, Facebook, Instagram, YouTube, Gmail)
- Open js/links.js and change the URL inside the quotes. Every icon on every page (English and Bangla) updates automatically.
- Save, then re-upload the folder (or ZIP) to your hosting.

VIDEO GALLERY (11 Facebook Reels)
- Open js/videos.js. Each entry has url, title, description, category and an optional thumbnail (image path or URL).
- Add or edit an entry to change a video. Do not edit video-gallery.html.

LEARNING PATH: 9 steps (Arabic Letters ... Salah Learning), rotating ring on learning-journey.html and bn/learning-journey.html.
MENU: Learning Path, Worldwide and Careers are inside the "More" dropdown.


ADMIN PANEL (Supabase + Netlify)
- Open https://YOUR-DOMAIN/admin/ . Full setup guide in Bangla: SETUP-BN.md. Daily use: docs/ADMIN-MANUAL-BN.md.
- Database setup SQL: supabase/schema.sql (run once in Supabase > SQL Editor).
- Netlify environment variables: SUPABASE_URL and SUPABASE_ANON_KEY (public anon key only). NEVER add a service_role key.
- Without these the website still works from its built-in content; /admin/ shows a setup message.
- Admin edits are stored in the database and appear on the live site after "Publish".
- Old files js/links.js, js/videos.js, content/content.js remain as the built-in defaults.

```
