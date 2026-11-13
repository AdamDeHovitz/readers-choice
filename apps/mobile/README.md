# Readers' Choice mobile app

The Expo (React Native) app for iOS, and later Android. It's a client of the
website: it reads and writes through the same operations, over
`POST /api/v1/<operation>`, and shares `@readers-choice/contract` (operation
schemas and types), `@readers-choice/core` (pure logic) and
`@readers-choice/tokens` (colors and type) with the web. See
`docs/architecture.md` for the layers and #75 for the plan.

## Run it

From the repo root (npm workspaces; Node 22, see `.nvmrc`):

```bash
npm install
npm run start -w @readers-choice/mobile      # Expo dev server; press i for the iOS Simulator, w for web
```

- **iOS Simulator** needs Xcode selected as the developer directory
  (`sudo xcode-select -s /Applications/Xcode.app/Contents/Developer`) and an iOS
  simulator runtime (`xcodebuild -downloadPlatform iOS`).
- **A real iPhone:** install Expo Go and scan the QR code the dev server prints.

The app talks to production (`https://readers-choice.dehovitz.com`) unless
you point it elsewhere. Against the local stack and seed users:

```bash
npm run dev:local                                              # website + API on :3000
EXPO_PUBLIC_API_URL=http://localhost:3000 npm run start -w @readers-choice/mobile
```

Sign in as `bob@example.test` / `password123` (see the verify-locally skill).
From a phone, use your computer's LAN address instead of `localhost`.

## Check it

```bash
npm run lint && npm run typecheck                  # repo-wide; covers this app
npm run export:ios -w @readers-choice/mobile       # bundle for iOS (CI's Mobile job)
npm run doctor -w @readers-choice/mobile           # dependency versions vs the Expo SDK
```

## Layout

```
app.config.ts      app name, bundle id (com.dehovitz.readerschoice), plugins
assets/            icon and splash, rendered from apps/web/app/icon.svg by
                   scripts/render-mobile-assets.mjs (rerun it when the icon changes)
src/app/           screens (Expo Router: one file per route)
                   (auth)/ signed-out screens, (app)/ signed-in screens; the
                   root layout's Stack.Protected guards pick one set
src/auth/          the session: sign-in, token refresh, sign-out (session.ts,
                   plain TypeScript with unit tests), keychain storage, useSession()
src/api/           where the API lives (EXPO_PUBLIC_API_URL), the query cache, and
                   useOperationQuery / useOperationMutation
src/features/      UI for one domain (clubs/, themes/, …), used by its screens
src/components/    shared UI built on the theme: Text, Screen, …
src/theme/         @readers-choice/tokens adapted for React Native: fonts, spacing, type
```

## Conventions

- **Colors and type come from `@/theme`**, which reads `@readers-choice/tokens`.
  Don't hard-code hex values or font names, and use `Text` from
  `@/components/text`, not React Native's `Text` (it defaults to the system font).
- **Fonts:** React Native selects a font file by family name, so each weight is
  its own family (`fontFamily.bodyBold`, not `fontWeight: "700"`). Import each
  weight from its own `@expo-google-fonts/<font>/<weight>` entry point, so
  only the weights in use are bundled.
- **Screens read with `useOperationQuery(contract, input)` and write with
  `useOperationMutation(contract)`** (`@/api/queries`). Queries are cached under
  their contract's `cacheKey`; a mutation refetches the keys the server reports
  stale, so screens stay in step without manual refreshes. The cache is cleared
  on sign-out.
- **Under the hooks, `sessions.call(contract, input)`** (`@/auth`). It
  adds the access token and refreshes it when needed, including the one-at-a-time
  rule the server requires (see `src/auth/session.ts`).
- **Logic that isn't UI goes in plain TypeScript modules with tests**
  (`*.test.ts`, run by `npm run test:run` as the `mobile` project). Keep React
  Native imports out of them so they run under Vitest.
- **Data comes only from `/api/v1`.** ESLint stops this app from importing the
  website's code, the database client, `server-only` or Node built-ins.
- **Versions follow the Expo SDK** (`npm run doctor`). The one exception is
  React: it's pinned to the web's version (`expo.install.exclude` in
  `package.json`), because two copies of React in one workspace break hooks.
