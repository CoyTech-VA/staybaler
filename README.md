# StayBaler Beach Resort

One fictional seaside resort in Baler, Aurora, with six room types and six activities. This replaces the previous multi-hotel directory. All offers, rates, photos, schedules, and capacities are mock content. No real booking, payment, or activity reservation is made.

## Run locally

Install Node.js 24 LTS, open a terminal here, then run:

```powershell
npm ci
Copy-Item .env.example .env.local
npm run dev
```

Open http://localhost:3000. Use cp instead of Copy-Item on macOS/Linux. No accounts or credentials are needed locally. Production: npm run build, then npm start. Stop dev before using the same port. Verification: npm test and npm run typecheck.

## Rooms and activities

Rooms: Garden King, Ocean Deluxe, Poolside Twin, Family Suite, Beachfront Cabana, and Barkada Loft. Filter by guest capacity and room style, sort by sample price, and open room details. Dates are planning inputs only.

Activities: surf lessons, pool access, sunrise yoga, a coastal outing, seaside dinner, and an evening gathering. Filter by category and expand details for sample timing, inclusions, and conditions.

## Project structure

- data/resort.ts: the single resort, room records, and activity records.
- components/resort.tsx: room cards, filters, date search, room availability UI, and activities.
- app/rooms and app/rooms/[slug]: room listing and detail pages.
- app/activities: resort activity offers.
- app/api/rooms and app/api/activities: read-only data APIs.
- app/api/hotels: compatibility response containing only the single resort.
- components/chat.tsx and lib/chat-api.ts: chat UI and separate POST transport.
- app/api/chat: optional server-side webhook forwarding.
- app/stays and app/explore: redirects from the old directory to rooms and activities.
- app/globals.css: responsive layout and Tailwind theme.
- render.yaml: Node web service configuration.

Room fields include id, slug, name, type, price, guests, size, bed, view, image, description, and amenities. Activity fields include slug, name, category, duration, price, unit, image, description, and note. Images are illustrative Unsplash URLs.

## Chat configuration

In .env.local beside package.json, add NEXT_PUBLIC_CHAT_API_URL=https://your-n8n-domain.com/webhook/staybaler-chat for direct browser POSTs. Rebuild on Render after changing public variables. The URL is visible to visitors, must support CORS, and must never contain a secret.

For server forwarding, leave NEXT_PUBLIC_CHAT_API_URL empty and set N8N_CHAT_WEBHOOK_URL and optionally N8N_WEBHOOK_SECRET. The server sends the latter as X-Webhook-Secret; configure matching n8n header authentication. Add durable rate limiting and appropriate authentication before public paid AI use. The existing endpoint is a transport, not a complete abuse-protection service.

Chat sends message, localStorage sessionId, and context containing page, resort, and property (the selected room context, or null). The property field is retained for compatibility with the previous payload. Room context names include the resort name. Responses use {success:true, reply:"...", recommendations:[{name:"Garden King",slug:"garden-king"}]}; recommendation slugs now point to /rooms/[slug]. Configure n8n hotel-search tools to use /api/rooms and activity tools to use /api/activities. Use the production webhook URL on an active workflow. No endpoint means an honest unavailable message, not simulated AI.

## Accounts and future persistence

GitHub and Render accounts are required only for the requested hosted workflow. Supabase is optional; this version uses data/resort.ts directly. n8n and a model provider are optional until chat is connected. No Vercel, maps, payment, or email account is needed.

The former multi-hotel Supabase schema is no longer used. For future persistence, create resorts, rooms (with resort_id), and activities (with resort_id) tables. Enable RLS and grant public SELECT only on public demonstration data. Keep inquiries in separate private tables. Add a repository reading those tables, then pass records into components; do not re-enable the old hotels-table switch. Public publishable keys obey RLS; secret/service-role keys stay server-only. See [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).

## GitHub, step by step

1. Create an account at https://github.com and verify your email.
2. Install Git. Select **New repository**, name it `staybaler`, choose visibility. For the command-line path, leave it empty (do not initialize a README).
3. Open a terminal in this project folder. Confirm `.env.local`, `node_modules`, and `.next` are ignored by `.gitignore`.
4. Run these commands, replacing YOUR-USERNAME:

```sh
git init
git add .
git status
git commit -m "Build StayBaler discovery website"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/staybaler.git
git push -u origin main
```

5. Complete Git's browser authentication prompt. If Git requests your identity, configure `git config user.name "Your Name"` and `git config user.email "your-email@example.com"` in this repository, then retry the commit.
6. Refresh GitHub and confirm `package.json`, the app folder, and `package-lock.json` are at the repository root.

For later updates, use `git add .`, `git commit -m "Describe your change"`, and `git push`.

### Web upload alternative

Extract `staybaler-source.zip` into a folder. On GitHub choose **Add file → Upload files** and upload the extracted contents, preserving folders. Upload source files, not the ZIP as the application. Do not upload node_modules, .next, .env.local, or secrets. Ensure `.gitignore` and `.env.example` are included (hidden files can be missed). Commit changes in the web form. A browser upload is limited to 25 MiB per file; use Git for larger or ongoing changes. [GitHub upload documentation](https://docs.github.com/en/repositories/working-with-files/managing-files/adding-a-file-to-a-repository).

## Render deployment, step by step

This is a normal Node.js web service with server routes, not a static export.

1. Sign up at https://render.com and connect GitHub.
2. Choose **New → Web Service**, authorize access to `staybaler`, and select the repository.
3. Set branch to `main`, runtime to Node, and Root Directory blank if package.json is at the repository root. If you uploaded a containing folder, set Root Directory to that folder.
4. Choose the Free instance if available for your account and region.
5. Build command: `npm ci && npm run build`. `npm install && npm run build` also works, but ci uses the included lockfile reproducibly.
6. Start command: `npm start`. The script runs `next start -H 0.0.0.0`; Next reads Render's supplied PORT variable. Do not configure a static publish directory.
7. Add `NODE_VERSION=24.18.0` and `HOTEL_DATA_SOURCE=mock` under Environment. No Supabase or chat credentials are needed initially.
8. Click Deploy/Create Web Service. Read build logs and open the resulting onrender.com URL when ready.
9. Check homepage, `/rooms`, a property detail route, `/activities`, and `/api/rooms`. Chat should show unavailable until connected.
10. Add optional environment variables separately under Environment. Rebuild for public variables. Never assume Render reads your local .env.local.

An optional `render.yaml` is included for **New → Blueprint**. Do not create both a Blueprint and a manually configured service unless you intend two services. If you later convert to `output: 'export'`, API routes and runtime data need redesign, and Render Static Site uses an output directory rather than npm start. Do not mix those instructions with this Node configuration. [Official Next.js deployment guide](https://render.com/docs/deploy-nextjs-app).


## Hosting limits and troubleshooting

Render free services may sleep after inactivity; verify current quotas and pricing at https://render.com/docs/free. Supabase and AI services have separate limits and possible charges. Local runtime files are not persistent storage on Render.

If a build fails, run npm ci and npm run typecheck and inspect the first build error. If Render cannot locate package.json, fix Root Directory. If chat fails, check webhook activation, JSON response shape, CORS, and server secret configuration. Public environment changes require rebuilding. Room availability is intentionally unconnected, and no real contact address is configured for this fictional resort.
