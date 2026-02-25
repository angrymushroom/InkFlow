# Start with a clean Git history (no Wavemaker history)

Use these steps when you want to upload InkFlow to GitHub with **no old commits** — only one initial commit.

## Option A: Same repo (https://github.com/angrymushroom/InkFlow)

1. **Back up anything you need** from the current repo (you already have the code).

2. **Remove the old Git history and create one fresh commit:**
   ```bash
   cd /Users/gaobotao/Documents/Projects/InkFlow/InkFlow

   # Remove old history
   rm -rf .git

   # Start fresh
   git init
   git add .
   git commit -m "InkFlow: Snowflake Method writing app (initial)"
   git branch -M main

   # Point to your GitHub repo (use origin for default remote)
   git remote add origin https://github.com/angrymushroom/InkFlow.git

   # Overwrite the repo on GitHub with this single commit (destroys old history there too)
   git push -u origin main --force
   ```

3. After this, the GitHub repo will have only one commit and no Wavemaker history.

## Option B: New repo

1. Create a **new empty repo** on GitHub (e.g. `InkFlow` or another name).

2. Run the same steps as above, but use the new repo URL in `git remote add origin <new-repo-url>`.

3. Push: `git push -u origin main` (no `--force` needed for a brand‑new empty repo).

## Note

- `--force` in Option A **replaces** the entire history on GitHub. Anyone who cloned the old repo will need to re-clone or reset.
- After this, use normal `git add`, `git commit`, `git push` for future updates.
