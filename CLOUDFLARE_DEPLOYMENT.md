# Cloudflare Pages deployment

Deploy this repository as a Cloudflare Pages project.

1. Connect the repository in **Workers & Pages**.
2. Set the build command to `sh build.sh`.
3. Set the build output directory to `dist`.
4. Add `OPENAI_API_KEY` as an encrypted Pages secret if uploaded video/audio transcription is required.
5. Deploy, then check `https://YOUR_DOMAIN/api/health`. It should return JSON with `"runtime":"cloudflare-pages"`.

Firebase Authentication and Cloud Firestore are used directly by the browser.
Configure the Firebase web app values in `auth.js` before production use.

The `functions/api` directory supplies the same-origin video APIs:

- `/api/online-video-transcript` for public YouTube captions.
- `/api/transcribe` for uploaded audio/video using the OpenAI transcription API.

Cloudflare Function logs are available in Workers & Pages for diagnosing an API failure.
