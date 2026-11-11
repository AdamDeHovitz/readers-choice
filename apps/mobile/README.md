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
- **Data comes only from `/api/v1`.** ESLint stops this app from importing the
  website's code, the database client, `server-only` or Node built-ins.
- **Versions follow the Expo SDK** (`npm run doctor`). The one exception is
  React: it's pinned to the web's version (`expo.install.exclude` in
  `package.json`), because two copies of React in one workspace break hooks.
