# ClassConnect Mobile App

The [Expo](https://expo.dev) / React Native companion app for ClassConnect — a management system for coaching institutes. Teachers manage students, batches, attendance, fees, tests, timetables, and study material; students view their dashboard, scores, attendance, fees, and the leaderboard.

## Backends

The app talks to **two separate backends**:

| Env variable | Default | Used for |
| --- | --- | --- |
| `EXPO_PUBLIC_TUITIONHUB_API_URL` | `https://tuitionhub.vercel.app/api/v1` | Everything authenticated: login, students, batches, attendance, fees, tests, reports (the Tuition Hub server) |
| `EXPO_PUBLIC_CLASSCONNECT_API_URL` | `https://classconnects.vercel.app/api` | The public Solutions Hub tab (the ClassConnect SaaS server) |

Both are optional — the production defaults above are used when unset. To point at a local backend, set them in `.env`:

```env
EXPO_PUBLIC_TUITIONHUB_API_URL=http://localhost:3000/api/v1
EXPO_PUBLIC_CLASSCONNECT_API_URL=https://classconnects.vercel.app/api
```

> Note: these are two different servers. Do not point both variables at the same host.

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

Open it in a [development build](https://docs.expo.dev/develop/development-builds/introduction/), an [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/), an [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/), or [Expo Go](https://expo.dev/go).

## Project structure

- `src/app/` — screens, using [Expo Router](https://docs.expo.dev/router/introduction) file-based routing
  - `index.tsx` — login (student / teacher)
  - `(tabs)/` — the main app: dashboard, students, attendance, fees, tests, timetable, syllabus, content, reports, solutions, and more
- `src/api/client.ts` — axios client for the Tuition Hub API (attaches the JWT from SecureStore / localStorage)
- `src/context/` — auth and theme providers
- `src/components/` — shared UI (glass cards, inputs, buttons, background decor)

## Auth

Login posts to `/auth/student/login` or `/auth/teacher/login` on the Tuition Hub API and stores the returned JWT in `expo-secure-store` (native) or `localStorage` (web). The token is attached as a `Bearer` header on every request.

## Type checking

```bash
npx tsc --noEmit
```
