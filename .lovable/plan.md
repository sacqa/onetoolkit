## Order of execution

I'll ship in 3 rounds. Round A is fully unblocked and biggest leverage; Rounds B and C need your decisions/credentials before I start.

---

### Round A — ship now (no external creds needed)

1. **Admin Panel** (`/admin`, RLS-gated to `app_role='admin'`)
   - `_admin/route.tsx` layout: server fn `requireAdmin` that throws if `has_role(uid,'admin')` is false. Frontend gate is cosmetic — RLS is the real gate.
   - **Users tab**: list profiles + role; promote/demote via secure RPC `set_user_role(target_uuid, role)` (security-definer, admin-only).
   - **Content tab**: WYSIWYG (TipTap) writing `title/description/body/faq` to `page_content`. Public pages (About, Contact, Privacy, Terms, Cookies) render DB content when present, else fallback.
   - **Settings tab**: numeric/boolean controls writing to `app_settings` for `daily_upscale_limit`, `max_file_mb`, `file_ttl_minutes`.
   - **AdSense tab**: Publisher ID + 4 slot IDs + enabled toggle, stored in `app_settings.key='adsense'`.
   - Promote the first user — I'll add a one-time server fn that promotes the currently signed-in user if zero admins exist, so you can self-onboard.

2. **GA4 + Cookie consent banner**
   - Reads `VITE_GA_ID` (publishable). Loads `gtag.js` only after consent.
   - Bottom-sheet banner with Accept / Reject / Manage. Choice persisted in `localStorage`.
   - Note: spec said `NEXT_PUBLIC_GA_ID`; this is TanStack/Vite, so the equivalent is `VITE_GA_ID`. I'll wire that and put the value in `.env.example`.

3. **AdSense slots**
   - `<AdSlot placement="header|in-content|sidebar|footer" />` reads pub ID + slot IDs from `app_settings`. Renders nothing if disabled, no slot ID, or consent not granted. AdSense script loaded lazily after consent + with valid pub ID. `ads.txt` already exists — I'll populate from settings.

4. **Passport tool — add real background removal**
   - Add `@imgly/background-removal` (WASM, fully client-side, ~30MB lazy chunk).
   - "Remove background" toggle; runs once per upload, caches the cutout, composites onto chosen background color.

5. **Currency Converter** — spec says 7-day trend; mine currently shows 30. Add a `7 / 30 / 90` toggle, default 30.

---

### Round B — needs your decision

6. **PDF ↔ Word converter** — needs an external API. Pick one:
   - **CloudConvert** — 25 free min/day, $9/mo for 500 min. Great fidelity. Per-file webhook.
   - **ConvertAPI** — 250 free conversions/mo, $9/mo for 1500. Simpler sync API.

   I'll build: upload UI (drag-drop, <50MB, single file), TanStack server fn that proxies to the chosen provider, stores the result in Supabase Storage bucket `conversions`, returns a signed URL with 1-hour expiry. A cron (`pg_cron` daily) deletes objects older than 1 hour from `user_files` + storage. Progress states: queued → converting → ready → expired.

   **Action you need to take**: pick provider, then I'll request the API key via `add_secret`.

---

### Round C — needs the Replicate connector linked

7. **AI Image Upscaler** — Real-ESRGAN via Replicate.
   - I'll prompt you to link the Replicate connector (`standard_connectors--connect`). No raw API key flow.
   - Server route at `/api/upscale` (TanStack server fn, not Supabase Edge Function — the spec said edge function but on this stack server fns are the correct equivalent; flagging the deviation per your rule #3).
   - 2× and 4× scale, before/after slider (`react-compare-slider`), original + result saved to storage with 1-hour TTL.
   - **Daily limit**: read `app_settings.daily_upscale_limit` (default 5) → check `tool_usage` count for current user today → 429 if exceeded, with friendly UI message and reset time.

---

## Deviations from brief I will flag in the final notes

- `NEXT_PUBLIC_GA_ID` → `VITE_GA_ID` (this is TanStack Start + Vite, not Next.js).
- AI Upscaler runs in a **TanStack server function**, not a Supabase Edge Function — same auth/RLS guarantees, correct primitive for this stack.
- Vercel deploy: still keep `cloudflare` preset in `vite.config.ts` for the Lovable preview; I'll add a `VERCEL.md` deploy doc and a one-line preset swap, but won't break the preview by switching it pre-launch.

---

## What I need from you to start

1. **Approve this plan** (or trim scope).
2. **Pick the PDF↔Word provider**: CloudConvert or ConvertAPI?
3. **Confirm I can prompt you to link the Replicate connector** when I get to Round C.
4. **Optional now**: paste your GA4 Measurement ID (`G-XXXXXXX`) — otherwise I'll leave it blank and you can fill it later in `.env`. AdSense pub/slot IDs you'll add through the admin panel after Round A ships.

Once you reply with those, I'll execute Round A in one go, then Round B, then Round C.