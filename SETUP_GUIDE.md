# Creative Notes — launch checklist

## 1. Prepare your GitHub repository

Create a GitHub repository, then commit and push this project. Do not commit
`.env` files, service-account JSON files, or API keys; `.gitignore` already
excludes them.

## 2. Create Firebase project

1. Open Firebase Console and create a project.
2. Add a **Web** app and copy its configuration values.
3. In `auth.js`, replace the `REPLACE_WITH_...` Firebase values with the web
   app values: `apiKey`, `authDomain`, `projectId`, and `appId`.
4. Go to **Authentication** > **Sign-in method** and enable:
   - Email/Password
   - Google (choose your support email)
5. Go to **Authentication** > **Settings** > **Authorized domains**. Add your
   Cloudflare Pages domain after the first deploy, and add your custom domain
   if you use one.

## 3. Create and secure Firestore

1. In Firebase Console, open **Firestore Database** and create a database in
   **Production mode**.
2. Open the **Rules** tab.
3. Replace the rules with the contents of `firestore.rules` in this project.
4. Click **Publish**.

The app saves every signed-in user's data to `drift_notes/{userId}`. The rules
ensure users can read and write only their own document.

## 4. Deploy to Cloudflare Pages

1. Open Cloudflare Dashboard > **Workers & Pages** > **Create application** >
   **Pages**.
2. Connect your GitHub repository.
3. Use these build settings:

   | Setting | Value |
   | --- | --- |
   | Framework preset | None |
   | Build command | `bash build.sh` |
   | Build output directory | `dist` |
   | Root directory | Leave blank |

4. Deploy the project.
5. Open `https://YOUR-PROJECT.pages.dev/api/health`. It must show JSON with
   `"runtime":"cloudflare-pages"`.

## 5. Enable video/audio transcription (optional)

1. In Cloudflare Pages, open your project > **Settings** > **Variables and
   Secrets**.
2. Add `OPENAI_API_KEY` as an encrypted secret in both Preview and Production.
3. Optional: add `OPENAI_TRANSCRIPTION_MODEL`:
   - `gpt-4o-mini-transcribe` for lower cost.
   - `gpt-4o-transcribe` for higher transcription accuracy.
4. Redeploy after adding the secret.

Never add the OpenAI key to `auth.js`, Firebase, or a Git commit.

## 6. Finish authentication setup

After the first Pages deployment, return to Firebase Authentication and add
the exact `YOUR-PROJECT.pages.dev` hostname to Authorized domains. If you add
a custom domain in Cloudflare, add that hostname too.

## 7. Test before launch

1. Visit the Cloudflare Pages URL in an incognito window.
2. Create an account with email/password.
3. Sign out, then sign back in.
4. Confirm the user appears in Firebase Authentication > Users.
5. Create a note and confirm a `drift_notes` document appears in Firestore.
6. Test `/api/health` and one public YouTube lecture with captions.

## Launch safety

- Keep Firestore rules in production mode; never use allow-all rules.
- Add a monthly OpenAI spend limit in the OpenAI billing dashboard.
- Start with small transcription limits per user to prevent API abuse.
- Enable Firebase App Check after the initial launch to reduce unauthorized
  Firestore use.
