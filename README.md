# FinTrack

**Your money is spread across several banks and cards, and no single app shows it all without handing your data to a third party. FinTrack is a personal finance tracker you host yourself.**

More about the project: <https://hmsk.life/tools/fintrack/>

## Features

- **Accounts**: track any number of current accounts and credit cards, each with a color. Balances come from your bank via TrueLayer and are read-only. All amounts are in GBP (£).
- **Credit cards**: optional 0% rate end date, statement day and payment due day per card, shown on the Accounts page and sortable (0% ending soonest, payment due soonest, next statement).
- **Transactions**: imported from your bank via TrueLayer; search, filter by account, month and type, and delete them.
- **Dashboard**: total balance, income vs. expenses over the last 6 months, spending by category, recent transactions; pick which accounts to include.
- **Categories and budgets**: default categories on sign-up, your own categories, and a monthly budget per category.
- **CSV export** of your transactions.
- **Bank sync (TrueLayer)**: link an account to your bank through TrueLayer open banking and pull up to the last 89 days of transactions and the balance, on demand or daily. This is the only source of transactions and balances.
- Email + password accounts (multiple users per instance, each sees only their own data).

## Screenshots

![Dashboard](docs/screenshot-dashboard.png)

*Demo data, all names fictional.*

## Quick start

### Option A: Docker Compose (app + PostgreSQL)

```bash
git clone <this repo> fintrack && cd fintrack
cp .env.example .env
# edit .env: set NEXTAUTH_SECRET (openssl rand -base64 32) and NEXTAUTH_URL
docker compose up -d --build     # first build takes about 2 minutes
```

Open <http://localhost:3000> and register your first user. Docker Compose refuses to start while `NEXTAUTH_SECRET` is empty. To use another port, set `APP_PORT` (and `NEXTAUTH_URL` to match). `--build` also rebuilds the image after a `git pull`; the app needs about 100 MB of RAM including Postgres. The database schema is created automatically on start; data lives in the `fintrack-db` Docker volume. `DATABASE_URL` in `.env` is ignored here, compose points the app at its own Postgres container (set `POSTGRES_PASSWORD` in `.env` to change the default password).

### Option B: Node.js + any PostgreSQL

Requirements: Node.js 20.9+ (24 LTS recommended) and a PostgreSQL database (local, or a free hosted one such as [Neon](https://neon.tech)).

```bash
npm install
cp .env.example .env      # set DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL
npm run db:push           # creates the tables
# upgrading an existing database? run the data migrations around db:push, like docker-entrypoint.sh does:
#   npx prisma db execute --schema prisma/schema.prisma --file prisma/data-migrations/before-push.sql   (before)
#   npx prisma db execute --schema prisma/schema.prisma --file prisma/data-migrations/after-push.sql    (after)
npm run build
npm start                 # http://localhost:3000
```

For development use `npm run dev`. `npm run typecheck` runs the TypeScript checks.

The build uses Next.js `output: 'standalone'`; you can also run `node .next/standalone/server.js` after copying `.next/static` to `.next/standalone/.next/static`.

## Configuration

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | yes | | PostgreSQL connection string. Hosted providers usually need `?sslmode=require`. |
| `NEXTAUTH_SECRET` | yes | | Random secret that signs sessions. `openssl rand -base64 32` |
| `NEXTAUTH_URL` | yes | `http://localhost:3000` | Public URL of the app, no trailing slash. |
| `TRUELAYER_CLIENT_ID` | yes | | Enables bank sync (together with the secret). |
| `TRUELAYER_CLIENT_SECRET` | yes | | Enables bank sync (together with the ID). |
| `TRUELAYER_ENV` | no | `sandbox` | `sandbox` (test banks) or `live` (real banks). |
| `TRUELAYER_PROVIDERS` | no | sandbox: `uk-cs-mock uk-ob-all uk-oauth-all`, live: `uk-ob-all uk-oauth-all` | Banks offered in the TrueLayer picker, e.g. add `de-ob-all de-oauth-all`. |
| `BANK_SYNC_TIME` | no | `06:00` | Daily automatic sync of all linked accounts (UK time, `HH:MM`); `off` disables it. Failed syncs show a banner in the app. |
| `CRON_SECRET` | no | | Enables `GET /api/cron/sync-banks` (sync all linked accounts from an external scheduler), protected by `Authorization: Bearer <CRON_SECRET>`. |
| `POSTGRES_PASSWORD` | no (compose only) | `fintrack` | Password of the bundled Postgres container. |
| `APP_PORT` | no (compose only) | `3000` | Host port for the app. |
| `SKIP_DB_PUSH` | no (Docker only) | `false` | Set `true` to skip the automatic `prisma db push` on container start. |

### Bank sync with TrueLayer

Transactions and balances only come from TrueLayer. Without TrueLayer keys the "Connect Bank" buttons are hidden and accounts stay empty.

1. Create an app in the [TrueLayer console](https://console.truelayer.com) and add `<NEXTAUTH_URL>/api/banking/callback` as an allowed redirect URI.
2. Set `TRUELAYER_CLIENT_ID` and `TRUELAYER_CLIENT_SECRET`. Start with `TRUELAYER_ENV=sandbox` (mock bank `uk-cs-mock`), switch to `live` with live credentials when ready.
3. On the Accounts page use **Connect Bank** on an account. All linked accounts sync automatically every day at `BANK_SYNC_TIME` (06:00 UK time by default, or right after start-up if that run was missed); use **Sync now** any time. Failed syncs show a red banner on every page with the bank's error, and the details go to the container log.
4. Alternatively, set `BANK_SYNC_TIME=off` and `CRON_SECRET` and call the endpoint from any scheduler, e.g. a crontab line:
   ```
   0 6 * * * curl -fsS -H "Authorization: Bearer YOUR_CRON_SECRET" https://your-host/api/cron/sync-banks
   ```

Bank access tokens are stored in your database; protect it accordingly.

## Privacy

FinTrack is self-hosted: your financial data stays in your own database on your own server. The app itself sends no telemetry and has no third-party analytics. The only outside calls are to TrueLayer for bank sync, and your browser loads bank logos from TrueLayer's asset host. The fonts (Newsreader, Public Sans; SIL Open Font License) are self-hosted in `public/fonts/`.

## Tech stack

Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4 (light and dark theme), Prisma 6 + PostgreSQL, NextAuth (credentials), Recharts.

## License

[MIT](LICENSE) © 2026 Hafiz Muhammad Sharoz Khalid
