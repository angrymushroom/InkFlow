# Deploy InkFlow on Vercel

You can host the app on Vercel for free and use it on your phone (Chrome or any browser) at a `*.vercel.app` URL. No custom domain required.

## Prerequisites

- A [Vercel](https://vercel.com) account (sign up with GitHub, GitLab, or email).
- Your project in a Git repo (GitHub, GitLab, or Bitbucket).

## Option A: Deploy with Vercel CLI

1. **Install Vercel CLI** (one-time):
   ```bash
   npm i -g vercel
   ```

2. **From the project root**:
   ```bash
   npm run build
   vercel
   ```

3. **First time:** Log in when prompted and answer:
   - Set up and deploy? **Y**
   - Which scope? Your account
   - Link to existing project? **N**
   - Project name? (Enter or use default)
   - In which directory is your code? **./** (default)

4. Vercel will build and give you a URL like `https://your-project-xxx.vercel.app`. Open it on your phone or desktop.

5. **Later deployments:** From the same folder run:
   ```bash
   vercel --prod
   ```
   to deploy to production.

## Option B: Deploy with GitHub (recommended)

1. **Push your code** to a GitHub repository.

2. Go to [vercel.com](https://vercel.com) → **Add New** → **Project**.

3. **Import** your repo. Vercel will detect Vite and set:
   - Build Command: `npm run build`
   - Output Directory: `dist`

4. Click **Deploy**. When it finishes, you get a URL like `https://your-repo-name.vercel.app`.

5. Every push to the main branch will trigger a new deployment (you can change this in Project Settings).

## After deploy

- **URL:** Use the provided `https://something.vercel.app` link. On your phone, open it in Chrome (or any browser) and optionally **Add to Home Screen** for an app-like shortcut.
- **Data:** All data (story, ideas, characters, etc.) is stored **only in the browser** (IndexedDB) on the device you use. It does not sync between devices. Use **Export → Download backup** to save a JSON file and **Import** on another device if needed.
- **HTTPS:** Vercel serves over HTTPS, so the app and API keys (entered by you) are sent over a secure connection.

## No custom domain

You don’t need a domain. The default `*.vercel.app` URL is enough. If you add a custom domain later, you can set it in the Vercel project **Settings → Domains**.
