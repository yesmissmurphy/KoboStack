# Shelf — Stage 1

This is the first layer of the app: sign in by email, and add/remove the
Substacks you want tracked. It doesn't fetch posts or talk to Dropbox yet —
that comes in the next stage, once this part is live and working.

## 1. Set up Supabase

1. In your Supabase project, go to **SQL Editor → New query**.
2. Paste in the contents of `supabase-schema.sql` and click **Run**.
3. Go to **Project Settings → API**. You'll need two values from here in a
   moment: the **Project URL** and the **anon public** key.
4. Go to **Authentication → URL Configuration** and, once you know your
   Vercel domain (next section), add `https://your-app.vercel.app/auth/callback`
   to **Redirect URLs**.

## 2. Push this code to GitHub

1. Create a new repository on GitHub (e.g. `kobo-shelf`).
2. From inside this folder:
   ```
   git init
   git add .
   git commit -m "Stage 1: auth and substack list"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/kobo-shelf.git
   git push -u origin main
   ```

## 3. Deploy on Vercel

1. In Vercel, click **Add New → Project**, and import the GitHub repo you
   just pushed.
2. Before deploying, open **Environment Variables** and add:
   - `NEXT_PUBLIC_SUPABASE_URL` — the Project URL from Supabase
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — the anon public key from Supabase
3. Click **Deploy**.
4. Once it's live, copy the `https://your-app.vercel.app` URL and go back to
   Supabase's **Authentication → URL Configuration** to add the
   `/auth/callback` redirect URL mentioned in step 1.4, if you hadn't yet.

## 4. Test it

Visit your Vercel URL, enter your email, click the link that arrives, and you
should land on the dashboard. Add a Substack URL and confirm it appears in
the list.

Once this is confirmed working end to end, tell me and we'll move to
Stage 2: connecting Dropbox.
