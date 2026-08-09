# PumpFun Signal

A React Native (Expo) app that watches Solana on-chain for new pump.fun
token launches in real time and pushes a risk-scored alert for each one.

**This is an alert/research tool, not an auto-trading bot.** It never
signs transactions or moves funds — it just tells you what launched and
flags common rug/honeypot red flags so you can decide manually.

## How it works

- `src/services/pumpFunListener.ts` subscribes to the pump.fun program's
  logs over a Solana RPC WebSocket and detects "Create" instructions the
  moment they land on-chain.
- `src/services/riskScorer.ts` pulls holder distribution and creator
  wallet history for each new mint and produces an explainable 0–100
  risk score.
- `src/services/notifications.ts` fires a local push notification per
  launch.
- Everything is on-device — no backend server required.

---

## Building the APK entirely from your phone

This project uses **Expo + EAS Build**, which compiles the native Android
app in Expo's cloud. You never touch Android Studio, Gradle, or the
Android SDK — your phone just needs to send a build command and later
download the finished APK.

### 1. Get a terminal on your phone

Install **Termux** from F-Droid (not the outdated Play Store version):
https://f-droid.org/packages/com.termux/

Then in Termux:
```bash
pkg update && pkg upgrade
pkg install nodejs-lts git
```

### 2. Get the project onto your phone

Easiest: create a free GitHub repo, upload this project's files to it from
the GitHub mobile app or web UI (works fine from a phone browser), then in
Termux:
```bash
git clone https://github.com/<your-username>/pumpfun-signal.git
cd pumpfun-signal
```

(Alternatively, transfer the folder via any file-sharing app into
Termux's storage and `cd` into it — GitHub is just the easiest path to
avoid manual file transfer.)

### 3. Install dependencies

```bash
npm install
```

### 4. Create a free Expo account and log in

Sign up at https://expo.dev (free tier includes EAS Build minutes — enough
for personal use). Then:
```bash
npx eas-cli login
```

### 5. Configure the project for EAS Build

```bash
npx eas-cli build:configure
```
This links the project to your Expo account and finalizes `eas.json`
(already included, but this step confirms your project ID).

Copy the project ID it prints into `app.json` → `expo.extra.eas.projectId`.

### 6. Set your Solana RPC endpoint

Public RPC endpoints rate-limit hard and will miss launches during busy
periods. Get a free-tier key from **Helius**, **QuickNode**, or **Triton**
(all have free tiers, signup works fine from mobile browser) and either:
- hardcode it in `src/utils/constants.ts` → `DEFAULT_RPC_WSS`, or
- leave the default and set it later from the app's Settings screen (gear
  icon) once installed.

### 7. Trigger the cloud build

```bash
npx eas-cli build --platform android --profile preview
```

This uploads your code to Expo's build servers, compiles a real signed
APK there, and gives you a **download link** (also viewable anytime at
https://expo.dev under your project's Builds tab). Typical build time:
5–15 minutes. You can close Termux while it builds — check the link from
your phone browser when it's done.

### 8. Install the APK

Open the download link on your phone, download the `.apk`, and tap it to
install. You'll need to allow "install unknown apps" for your browser in
Android settings the first time — standard for any APK not from the Play
Store.

---

## Iterating after the first build

Once step 4–5 are done once, future rebuilds after code changes are just:
```bash
git pull   # if you edited on desktop/another device
npx eas-cli build --platform android --profile preview
```

For fast iteration without a full rebuild each time, you can also run
`npx expo start` in Termux and open the project in the **Expo Go** app on
your phone — instant reload for JS changes. Note: Expo Go can preview UI
and most logic, but for testing real push notifications and the full
native build you'll still want the EAS-built APK.

## Known limitations / next steps

- **`getCreatorPastLaunches`** in `riskScorer.ts` is stubbed — reliably
  tracking a wallet's full pump.fun history needs a paid indexer (e.g.
  Helius DAS API). Wire in your API key there for the full serial-creator
  signal.
- **Instruction parsing** in `pumpFunListener.ts` assumes your RPC
  returns parsed instruction data. Some providers need an IDL passed to
  decode `name`/`symbol`/`uri` args for Anchor programs — if those fields
  come back empty, fall back to fetching the mint's Metaplex metadata
  account directly.
- Consider a **watchlist / mute list** so repeat-offender wallets are
  auto-flagged HIGH regardless of other factors.
- The risk score is heuristic, not a guarantee — treat pump.fun tokens as
  extremely high risk regardless of score.
