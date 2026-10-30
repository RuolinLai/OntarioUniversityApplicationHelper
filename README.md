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

## Deploy (Firebase Hosting + GitHub Actions)

The site is published at **https://onuniversityapplicationhelper.web.app**.

- `.github/workflows/deploy.yml` — every push to `main`: run the tests, build, and publish to Firebase Hosting.
- `.github/workflows/scrape.yml` — every Sunday 07:00 UTC: run the scraper. If `programs.json` changed, it commits the new data
  and redeploys. If a university's results looked broken, that university keeps last week's data, the run fails, and
  GitHub emails you. Both workflows can also be started by hand: **Actions → (workflow) → Run workflow**.

One-time setup:

1. **Service account.** Open [Google Cloud → IAM → Service accounts](https://console.cloud.google.com/iam-admin/serviceaccounts?project=onuniversityapplicationhelper)
   → **Create service account** (name it `github-deploy`) and give it these roles: **Firebase Hosting Admin**, **API Keys Viewer**,
   **Firebase Authentication Admin**, **Cloud Run Viewer**. Then open it → **Keys → Add key → Create new key → JSON**. A file downloads.
2. **GitHub secret.** In the GitHub repo: **Settings → Secrets and variables → Actions → Secrets → New repository secret**.
   Name `FIREBASE_SERVICE_ACCOUNT`, value: the whole contents of the JSON file. Then delete the file from your computer.
3. **GitHub variables.** Same page, **Variables** tab: add the six `VITE_FIREBASE_...` entries with the same values as `.env.local`.
4. **Workflow permissions.** **Settings → Actions → General → Workflow permissions**: choose **Read and write permissions**
   (the scraper needs this to commit new data).
5. Push to `main`, or run **Actions → Deploy → Run workflow**.

`yourproject.web.app` and `yourproject.firebaseapp.com` are already in Firebase Auth's authorized domains, so login works on the
live site without extra steps. Firestore rules aren't deployed by the workflow: after editing [firestore.rules](firestore.rules),
paste it into **Firestore → Rules** again (or run `npx firebase-tools deploy --only firestore:rules`).

GitHub turns off scheduled workflows after 60 days without commits. The weekly data commits normally prevent that; if it happens,
re-enable it on the Actions tab.

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
- [ ] Phase 6 — Deploy + weekly auto-scrape (workflows written; needs the one-time setup above)
- [ ] Phase 7 — More universities, tips, polish
