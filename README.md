# OntarioU Helper

A website that helps Ontario high school students plan their university applications. See [design.md](design.md) for the full plan.

## Run locally

```bash
npm install      # first time only
npm run dev      # open http://127.0.0.1:5173
```

## Other commands

```bash
npm test         # run unit tests
npm run build    # production build into dist/
npm run scrape   # update src/data/programs.json from university websites (~10 min)
```

## Accounts (Firebase)

Browsing programs works without this. Logging in, onboarding and the profile need a Firebase project. Menu names in the Firebase console change
over time — if you can't find something, type its name (e.g. "Authentication") into the console's search bar.

1. Go to [console.firebase.google.com](https://console.firebase.google.com) → **Add project** (Google Analytics not needed).
2. **Authentication → Get started**, then enable **Email/Password** and **Google**.
3. **Authentication → Settings → Authorized domains → Add domain**: `127.0.0.1` (only `localhost` is there by default).
4. **Firestore Database → Create database** → production mode → location `northamerica-northeast2 (Toronto)`.
5. **Firestore → Rules**: replace everything with the contents of [firestore.rules](firestore.rules) and click **Publish**.
6. **Project settings (⚙) → General → Your apps → Web (</>)** → register the app, then copy the `firebaseConfig` values
   into a new file `.env.local`, using [.env.example](.env.example) as the template.
7. Restart `npm run dev`.

`.env.local` is git-ignored. The values in it aren't secret (they end up in the website's JavaScript anyway); the
Firestore rules are what stop people reading each other's data.

## Scraper

`scraper/` downloads program pages from university websites and turns them into `src/data/programs.json`.

```bash
npm run scrape                       # all universities
npm run scrape -- waterloo           # one university
npm run scrape -- --limit 5          # quick test: 5 pages each, nothing written
```

- It obeys robots.txt, waits 1.5 s between requests, and caches pages in `scraper/.cache` for 6 days.
- If a university's results look broken (e.g. far fewer programs than last time), its old data is kept.
- Each run writes `scraper/last-report.md` listing changes and programs that need review.
- Manual fixes go in `scraper/overrides.json`.
- To add a university, copy an adapter in `scraper/universities/`, adjust the selectors, and add it to `index.js`.
  `node scraper/tools/inspect.js page.html` prints a page's headings to help find the right selectors.

## Progress

- [x] Phase 1 — Navbar, routing, Programs search, program detail pages
- [x] Phase 2 — Scraper for Waterloo, UofT, Western (McMaster pending — see design.md)
- [ ] Phase 3 — Accounts, onboarding, profile & marks (code done; needs a Firebase project to test)
- [ ] Phase 4 — Eligibility, top-6 average, safety/match/reach, favourites (code done; needs a Firebase project to test)
- [ ] Phase 5 — Calendar, extracurriculars, dashboard (code done; needs a Firebase project to test)
- [ ] Phase 6 — Deploy + weekly auto-scrape
- [ ] Phase 7 — More universities, tips, polish
