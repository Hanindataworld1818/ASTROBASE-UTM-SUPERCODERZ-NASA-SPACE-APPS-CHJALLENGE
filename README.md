# AstroBase: Junior Astronaut Mission Trainer

## About the project

**AstroBase** is an educational browser game created for the NASA Space Apps Challenge project **Build a Junior Astronaut Mission Trainer**. It invites young learners to manage a lunar or Martian outpost over a seven-Sol mission and see how decisions about power, life support, food, communications, radiation protection, and science affect crew survival.

Players explore an interactive outpost, operate station activities and mini-games, complete science challenges, and respond to mission events. The game presents trade-offs through play—for example, allocating power to shielding can affect other systems, while dust and solar-weather events can change mission conditions. Its scenarios use simplified, curated game values for learning; they are not a mission-planning tool or a real-time simulation of an operational NASA mission.

## About the team

**Team:** UTM SUPERCODERZ

**Team members:**

- Han Yao Hui
- Lee Jun Feng
- Tan Yi Kun
- Goh Zhi Xin

## What the current project includes

- Selectable Moon and Mars outpost settings and a seven-Sol survival mission.
- Resource and engineering trade-offs involving power, oxygen, food, radiation exposure, and science.
- Interactive outpost stations and activities for areas such as life support, space farming, EVA/rover work, communications, and astronaut nutrition.
- Learning activities, quizzes, mission logs, debriefs, and in-game rewards.
- NASA data and imagery panels, including space-weather events, astronomy imagery, Mars imagery, space-biology research search, radiation data, and planetary maps.
- Optional Gemini-powered mission events, music, and recorded-audio transcription when a server-side Gemini key is configured.

Some feeds use live external services and may fall back to curated or archive content when a service is unavailable or a key is not configured. The core gameplay also uses curated values; live NASA panels are for educational reference and do not automatically replace the game's fixed mission schedule.

## Technologies

- React and TypeScript
- Vite
- Express for the local API server
- Netlify Functions with `serverless-http` for deployed API routes
- Firebase Authentication and Firestore
- Google Gemini API for optional AI features

## NASA and related data sources

The server includes integrations or proxies for these sources:

- [NASA DONKI](https://ccmc.gsfc.nasa.gov/tools/DONKI/): space-weather event information.
- [NASA APOD](https://apod.nasa.gov/apod/astropix.html): Astronomy Picture of the Day.
- [NASA Mars Rover Photos API](https://api.nasa.gov/): rover imagery.
- [NASA Open Science Data Repository (OSDR)](https://osdr.nasa.gov/): space-biology study search and RadLab radiation data.
- [NASA Moon Trek](https://trek.nasa.gov/moon/) and [NASA Mars Trek](https://trek.nasa.gov/mars/): planetary map imagery.
- Canadian Space Agency food and nutrition materials are referenced in some educational content.

Availability and display of external data depend on the providers' services and applicable API access. See the source code for the specific endpoints and fallback behavior used by the current build.

## Run locally

Requirements: Node.js 22 and npm.

```bash
npm install
npm run dev
```

The local Express server serves the app and supports live-transcription WebSockets. To run a production frontend build locally:

```bash
npm run build
npm run preview
```

Type-check the project with:

```bash
npm run lint
```

## Deploy to Netlify

The included `netlify.toml` configures the build command, publish folder, API function directory, and `/api/*` routing.

1. Push the project to a Git provider and import the repository into Netlify.
2. Set the build command to `npm run build` and publish directory to `dist` if Netlify does not detect the included configuration.
3. Add the required server-side environment variables in Netlify:
   - `GEMINI_API_KEY` enables Gemini-powered event generation, music, and recorded-audio transcription. Keep it private; do not use a `VITE_` prefix.
   - `NASA_API_KEY` enables keyed NASA DONKI and APOD requests. It is optional; some content has fallback behavior when it is absent.
4. Redeploy after adding or changing environment variables.
5. Add the Netlify domain to Firebase Authentication's authorized domains. Deploy the included Firestore rules with `firebase deploy --only firestore:rules` after reviewing them for your Firebase project.
6. Restrict the Firebase web API key to the Firebase APIs and website referrers needed by this app.

Netlify Functions do not provide the local live WebSocket route. In the Netlify build, the recording flow submits the completed recording to the HTTP transcription endpoint instead.

## Security notes

- Keep `GEMINI_API_KEY` and `NASA_API_KEY` in server-side environment settings. Never commit real values or expose them through frontend `VITE_` variables.
- `.env.example` contains blank placeholders. Keep local `.env` files private; they are ignored by Git.
- Firebase web configuration is included in the browser app by design. Protect the project with Firebase Authentication settings, restricted API-key referrers/APIs, and correctly deployed Firestore rules.
- API request-size checks and rate limits help reduce abuse, but do not guarantee a fixed provider bill. Monitor Netlify and Gemini usage after deployment.

## Current limitations

- AI features require a valid Gemini key and can be unavailable if the provider or quota is unavailable.
- NASA live data availability depends on external services and, for some endpoints, a NASA API key. Fallback content may be shown.
- The local live-transcription experience uses WebSockets; Netlify uses recorded-audio submission instead.
- Mission outcomes and resource values are educational abstractions, not operational engineering guidance.
- No public demo or source repository URL is included here. Add the team's actual links when they are ready to share.
