# AI Meeting Summary

AI Meeting Summary is a cross-platform Expo app that helps users record meetings, capture transcript text, and generate concise summary bullets after each session.

The product is based on the `stitch/` design screens and implemented as a full React Native + Expo Router application with real state management and persistence.

## What This App Does

- Starts and tracks live meeting recordings with timer and active session UI.
- Captures transcript content from microphone speech recognition (web and native path).
- Generates summary bullets from transcript content when recording is stopped.
- Stores meeting history with searchable and sortable list views.
- Supports favorites and per-meeting detail pages.
- Optionally saves raw audio locally with configurable retention policy.

## Main Screens

- `Home`: Start recording, search meetings, filter by status, sort by date, open meeting detail.
- `Recording`: Live timer, transcript controls, stop flow, and raw audio capture.
- `Summary`: Displays latest generated summary and supports voice playback on web.
- `Favorites`: Quick access to favorited meetings with search.
- `Settings`: Recording preferences, including local raw audio save and retention days.
- `Meeting Detail`: Per-meeting summary, transcript, and saved recording playback.

## Tech Stack

- Expo + React Native + TypeScript
- Expo Router (file-based navigation)
- AsyncStorage for local persistence
- `@react-native-voice/voice` for native speech recognition path
- Browser Speech Recognition + Speech Synthesis for web voice features
- `expo-av` for recording/playback
- `expo-file-system` for local file handling on device

## Local Data and Privacy

- Meetings, summaries, transcript text, favorites, and preferences are stored locally.
- Raw audio saving is optional and controlled in `Settings`.
- Retention policy can be set to `7`, `30`, or `90` days.
- Expired saved recordings are cleaned up automatically.

## Run the Project

1. Install dependencies:

```bash
npm install
```

2. Start Expo:

```bash
npm run start
```

3. Launch target platform:

- Web: `npm run web`
- Android: `npm run android`
- iOS: `npm run ios`

## Notes

- Native voice features require a native build/dev client workflow.
- Web raw audio recording uses browser media APIs; behavior depends on browser microphone permissions.
- For linting:

```bash
npm run lint
```
