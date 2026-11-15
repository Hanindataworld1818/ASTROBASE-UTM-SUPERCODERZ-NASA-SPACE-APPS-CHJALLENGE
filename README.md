# AstroBase: Junior Astronaut Mission Trainer

A browser game for learning how lunar and Martian outposts balance power, life support, crops, communications, and radiation shielding.

## Deploy to Netlify

1. Push this project to a Git provider and import it into Netlify.
2. Netlify reads netlify.toml: build command npm run build, publish directory dist, and serverless API functions under netlify/functions.
3. Add server-side environment variables in Netlify before deploying:
   - GEMINI_API_KEY enables Gemini mission events, music, and uploaded-audio transcription. Keep it private; never add it to a VITE_ variable.
   - NASA_API_KEY enables keyed NASA DONKI and APOD requests. If absent, the app uses archive/fallback content where available.
4. Redeploy after adding or changing environment variables.
5. Configure Firebase Authentication authorized domains for the Netlify site. Deploy Firestore rules from firestore.rules with firebase deploy --only firestore:rules, and restrict the Firebase web API key to the necessary Firebase APIs and site referrers.

The GEMINI_API_KEY and NASA_API_KEY are read only by server code. .env.example contains blank placeholders. Do not commit .env files or real credentials.

## Local development

Use Node.js 22, then run npm install and npm run dev.

The local Express server serves the Vite app and supports live-transcription WebSockets. On Netlify, APIs run as serverless functions; WebSocket upgrades are not part of that adapter. The recording flow avoids the WebSocket there and submits the recording to the HTTP transcription function when stopped.

## Deployment and security notes

- The AI endpoints enforce input size checks and a best-effort per-instance request limit; Netlify also applies a per-IP and per-domain function rate limit. Monitor function and Gemini usage after launch.
- The seven-Sol game uses simplified, curated values. Live NASA feeds are reference panels and do not replace the fixed gameplay schedule.
- Firebase web configuration is client-side by design. Firestore rules, domain restrictions, and API-key restrictions are essential.
