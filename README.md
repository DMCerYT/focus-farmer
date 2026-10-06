# Focus Farmer

A Next.js app built from the `with-supabase` starter. Focus sessions earn coins after REAP; coins buy penguins through the egg gacha.

## Set up

1. Create a Supabase project and run [`supabase/schema.sql`](supabase/schema.sql) in its SQL Editor.
2. Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from **Project Settings → API**. Never put a service role key in this file.
3. In **Authentication → URL Configuration**, set the site URL to `http://localhost:3000` for local use and add `http://localhost:3000/auth/confirm` as a redirect URL. Add equivalent production URLs when deploying.
4. In **Authentication → Email Templates → Confirm signup**, use a confirmation link with the token hash callback:

   ```html
   <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email">Confirm your email</a>
   ```

   Keep email confirmation enabled. The app asks new users to verify their email before logging in.
5. Run `npm install` and `npm run dev`.

The app can show its title screen without Supabase credentials, but authentication and saved progress require steps 1–4. The original art and music are in `assets/`; copies in `public/assets/` are served by Next.js.

## Data and timers

- `progress` stores one balance and lifetime completed session count per auth user. `pets` stores every hatch, including duplicates. `focus_sessions` stores start/end times, settings, and the claimed reward.
- All tables use row level security with read access limited to the signed-in owner. The database functions `start_focus`, `reap_focus`, and `pull_egg` perform writes as transactions. `reap_focus` locks the session row so the same harvest cannot award twice. `pull_egg` deducts 10 coins only when the user has enough.
- Focus timers resume after refresh from their database end time. The timer display mode affects only the displayed clock. Expiry does not grant coins until REAP is pressed.
- Break timers resume after refresh from a per-user local storage end time. Outfit, music settings, and walkthrough completion are also saved per user in local storage. Back to Focus cancels a break.
- The page shifts to an animated pastel background after the first completed harvest.

## Checks

`npm run build` and `npm run lint` validate the app. Live auth and database flows require a configured Supabase project.
