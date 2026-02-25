# InkFlow

A Snowflake Method writing app: capture ideas, build your story spine, characters, outline, and write scenes. Optional AI expand (Gemini or OpenAI). Data stays in your browser; export/import as JSON. No account required.

- **Ideas** — Plot, character, world, scene cards; expand with AI
- **Story** — One sentence → setup, three disasters, ending
- **Characters** — One-sentence + goal, motivation, conflict, epiphany
- **Outline** — Chapters and scenes; link to POV character
- **Write** — Scene editor with prose
- **Export** — Backup JSON, language, AI settings (API key stored locally)

## Run locally

```bash
npm install
npm run dev
```

## Deploy (e.g. Vercel)

See [DEPLOY.md](DEPLOY.md). Build: `npm run build` → output: `dist/`.

## Sync to GitHub

**Push this project to [InkFlow](https://github.com/angrymushroom/InkFlow):**

From the project root (`InkFlow/InkFlow`):

```bash
# Add GitHub repo as remote (run once)
git remote add origin https://github.com/angrymushroom/InkFlow.git

# First push (empty repo)
git push -u origin main
```

If you already have an `origin` pointing elsewhere, use a different remote name:

```bash
git remote add inkflow https://github.com/angrymushroom/InkFlow.git
git push -u inkflow main
```

GitHub may ask for your username and password; use a [personal access token](https://github.com/settings/tokens) instead of a password if you use 2FA. After this, use `git push` to update the repo.

## Tech

Vue 3, Vite, Vue Router, Dexie (IndexedDB). Optional AI: Google Gemini or OpenAI.
