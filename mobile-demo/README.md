# Phone demo

A copy of SleepStory that runs entirely in the browser, so anyone can open every page on their own phone from a link or a QR code. It is built from the app's own code in `../src`, and nothing there is changed for it (DEMO-13, decision #32).

**Live:** https://sonyaaat.github.io/sleepstory/

## How it works

- **Same screens.** The page files in `app/` only hand over to the app's own pages and layouts (`lib/real-page.tsx`, `lib/demo-layout.tsx`), so the demo looks and behaves like the app.
- **No server.** The three modules that need one are swapped at build time (`next.config.ts`) for browser versions with the same functions:
  - `lib/actions.ts` for `src/app/actions.ts`
  - `lib/queries.ts` for `src/db/queries.ts`
  - `lib/session.ts` for `src/db/session.ts`
- **Data on the phone.** Maya's 8 weeks come from the same generator (`src/db/demo-data.ts`) and are kept in the browser's storage (`lib/store.ts`). Each phone has its own copy. **Reset** and **New tester** work as in the app.
- **The story.** A public page can't hold the AI key, so the app's rule-based reader reads the story in the browser (`lib/extract.ts`). Its answers go through the same checks as the model's and are shown the same way. Nothing is sent anywhere.
- **Not included:** the self-hosted AI model and the session log (DEMO-11). Voice input depends on the phone's browser.

## Commands (from the repo root)

```bash
npm run demo:dev                                    # http://localhost:3001
npm run demo:build                                  # static site in mobile-demo/out
npm run demo:deploy                                 # build and publish to the live link
```

The live link is GitHub Pages on this repo, served from the `gh-pages` branch (Settings → Pages → Deploy from a branch → `gh-pages`). The deploy script builds with the repo name as the base path and adds a commit on top of `gh-pages` (never a force push). `npm run demo:deploy -- --repo <owner>/<repo>` publishes to another repo's `gh-pages` instead.

## When the app changes

Run `npm run demo:deploy` again. Changes to pages and components come through on their own. If `src/app/actions.ts`, `src/db/queries.ts` or `src/db/session.ts` change, make the same change in `lib/`.
