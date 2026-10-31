# Folio & Hearth — Cozy Book Club Tracker

A 5-page website built from your design export. Warm "hygge" styling, works on
phones and computers, and is ready to deploy on Vercel.

## The pages

| File            | Page name in the menu | What it is                         |
|-----------------|-----------------------|------------------------------------|
| `index.html`    | The Hearth            | Home / daily reading dashboard     |
| `bookshelf.html`| The Sanctuary         | Your personal bookshelf tracker    |
| `discovery.html`| Curated Nook          | Book discovery + taste quiz        |
| `community.html`| The Tea Table         | Book club community hub            |
| `workshop.html` | Ink & Quill           | Writers' workshop drafts           |

All navigation between these pages works. Images are saved locally in
`assets/img/`, so nothing depends on external links that could disappear.

## Preview it on your computer (local preview)

You need to run a small web server (opening the file directly can block some
features). From inside this project folder, run **one** of these:

**Option A — Python (already installed on most computers):**
```
python3 -m http.server 8080
```
Then open this in your browser:  http://localhost:8080

**Option B — Node (if you have it installed):**
```
npx serve .
```

To stop the preview, press `Ctrl` + `C` in the terminal.

### Check it looks good on a phone
1. Open the preview in Chrome or Firefox on your computer.
2. Press `F12` to open Developer Tools, then click the **phone/tablet icon**
   (Device Toolbar). Pick a phone size. The menu turns into a bottom bar with
   Hearth / Shelf / Nook / Tea / Quill.

## Deploy to Vercel

This is a plain static site (just HTML + images), so Vercel needs no build
settings.

**Easiest — through GitHub:**
1. Create a GitHub repository and upload this folder's contents.
2. Go to https://vercel.com/new and import that repository.
3. Leave the framework preset as is (it auto-detects a static site) and click
   **Deploy**. Done.

**Or — with the Vercel command line:**
```
npm i -g vercel
vercel        # first run links/creates the project
vercel --prod # publishes it live
```

Vercel will give you a live `*.vercel.app` link.

## What works (interactive features)

All buttons now do something real, and your choices are saved in the browser
(`localStorage`), so they survive a refresh. One shared script,
`assets/app.js`, powers everything.

- **Every page:** the header search box filters the books/posts/drafts as you
  type; the "42m read today" pill updates live; a friendly toast message pops up
  at the bottom to confirm each action.
- **The Hearth (home):** "Log 15 min read" adds to your daily minutes;
  "Update Page" advances your page number, the "% bound" label, and the progress
  bar; the margin-note box saves and displays your line; teacup, RSVP, and Queue
  buttons toggle and persist; "Add to Almanac" downloads a real `.ics` calendar
  file.
- **The Sanctuary (bookshelf):** the shelf pills (All / Currently Reading /
  Finished / Held Close / Nightstand / Wishlist) and the Mood / Format / Rating
  dropdowns actually filter the cards; "Sort" cycles order; the grid/list button
  changes layout; "Add Volume" saves a new book card; "Move to…" re-shelves a
  book; "Ex Libris Print" opens the print view.
- **Curated Nook:** the taste quiz updates your match; "Roll for an Unexpected
  Journey" cycles recommendations; Reserve / Nightstand / chips all respond.
- **The Tea Table (community):** the tabs filter the posts; "Join table",
  teacup upvotes, and "Slip into Reading List" toggle; "Add whisper" lets you
  post.
- **Ink & Quill (workshop):** the format pills filter drafts; "Share a New
  Manuscript" saves a draft card; Pledge / Publish / Join buttons respond.

## Notes for later
- The only browser console message is a Tailwind "use-in-production" **warning**
  (not an error). The site uses Tailwind's CDN for simplicity, and it works fine
  on Vercel. If you ever want a compiled CSS build, that's a small upgrade.
- Data is saved in your own browser only (no server). To share books between
  people or keep them after clearing browser data, you'd add a backend — left
  out on purpose to keep this simple and free to host.
