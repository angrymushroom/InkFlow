## Cursor Cloud specific instructions

InkFlow is a purely client-side Vue 3 + Vite SPA (Snowflake Method writing app). There is **no backend**, no database server, and no Docker. All data is stored in the browser via IndexedDB (Dexie.js).

### Running the app

- `npm run dev` starts the Vite dev server on port 5173 (with `--open` flag by default).
- `npm run build` produces a production build in `dist/`.
- `npm run preview` serves the production build locally.

See `README.md` for full details.

### Notes

- The project has no linter or test framework configured. There are no `lint`, `test`, or `typecheck` scripts in `package.json`.
- AI features (Gemini/OpenAI expand) require user-supplied API keys entered in the app's Export/Settings page; no environment secrets are needed.
- The Vite config (`vite.config.js`) sets `host: true` so the dev server is accessible on all interfaces.
