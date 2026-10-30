# OntarioU Helper

A website that helps Ontario high school students plan their university applications. See [design.md](design.md) for the full plan.

## Run locally

```bash
npm install      # first time only
npm run dev      # open http://localhost:5173
```

## Other commands

```bash
npm test         # run unit tests
npm run build    # production build into dist/
npm run scrape   # update src/data/programs.json from university websites (~10 min)
```

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
- [ ] Phase 3 — Accounts, onboarding, profile & marks
- [ ] Phase 4 — Eligibility, safety/match/reach, favourites
- [ ] Phase 5 — Calendar, extracurriculars, dashboard
- [ ] Phase 6 — Deploy + weekly auto-scrape
- [ ] Phase 7 — More universities, tips, polish
