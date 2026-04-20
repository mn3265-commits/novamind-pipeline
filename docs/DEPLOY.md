# Deploying to Vercel

This project is a stock Next.js 14 app. Vercel auto-detects everything.

## One-time setup

1. Push the repo to GitHub.
2. Go to [vercel.com/new](https://vercel.com/new) and import the repo.
3. Framework preset should auto-detect as **Next.js**. Leave build settings at defaults.
4. (Optional) Add an environment variable:
   - Key: `ANTHROPIC_API_KEY`
   - Value: your key from [console.anthropic.com](https://console.anthropic.com)
5. Click **Deploy**. First build takes about 90 seconds.

## After deploy

Copy the Vercel URL into the top of `README.md` under "Live demo", commit, push. The URL now lives in your repo for anyone to click.

## Notes on the data store

The project uses a file-backed JSON store at `data/store.json`. On Vercel's serverless runtime, this file is writable within a single function invocation but does not persist between cold starts. Practically that means:

- The dashboard works normally inside one session.
- After a cold start, the store resets to empty and you'll need to trigger a pipeline run to re-populate it.

This is intentional for the demo. A production version would swap `src/lib/db/store.ts` for a Vercel Postgres or Upstash Redis client with no business-logic changes (the `db` object is the only surface the rest of the code touches).

## Re-seeding the live demo

The seed script is a local script (`npm run seed`) and does not run on Vercel. If you want the deployed demo to start with 30 contacts visible, the easiest path is to hit `/api/pipeline` once from the browser after deploy. That populates content packages, campaigns, metrics, and insights for the current session.
