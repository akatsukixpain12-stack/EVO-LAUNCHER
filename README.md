<p align="center">
  <img src="app/assets/images/SealCircle.png" width="150px" alt="EVO Launcher">
</p>

<h1 align="center">EVO LAUNCHER</h1>
<h3 align="center">Minecraft Edition</h3>

<p align="center">The next-generation modded Minecraft launcher — built for performance, style, and control.</p>

---

## Download

Download the latest installer from the [Releases](https://github.com/akatsukixpain12-stack/EVO-LAUNCHER/releases) page:

| Platform | File |
| -------- | ---- |
| Windows x64 | `EVO Launcher-setup-X.X.X.exe` |
| macOS x64 | `EVO Launcher-setup-X.X.X-x64.dmg` |
| macOS arm64 | `EVO Launcher-setup-X.X.X-arm64.dmg` |
| Linux x64 | `EVO Launcher-setup-X.X.X.AppImage` |

---

## Features

* **Full Account Management** — Microsoft (OAuth 2.0), Mojang, Ely.by, and Offline authentication. Switch accounts instantly.
* **Ely.by Authentication** — Play using your free Ely.by account with full skin support via authlib-injector.
* **Offline Mode** — Play without any account using a local username.
* **Smart Asset Management** — Auto-downloads and validates all mods and files before launch.
* **Automatic Java** — Detects and installs the right Java version for you.
* **Performance Settings** — Motion blur, FPS boost presets, entity culling, fast render, smooth FPS, FPS cap.
* **Built-in News Feed** — Stay updated without leaving the launcher.
* **Auto-Updates** — The launcher keeps itself current.
* **Mojang Status Monitor** — Live service status built in.

---

## Authentication Options

### Microsoft (OAuth 2.0)
Login with your Microsoft account to play with your official Minecraft profile.

### Mojang (Legacy)
Login with a Mojang account (email + password).

### Ely.by (Free)
Login with your [Ely.by](https://ely.by/) account. Ely.by provides free Minecraft accounts with full skin support. The launcher automatically downloads and injects [authlib-injector](https://github.com/yushijinhun/authlib-injector) to authenticate with the Ely.by auth server.

### Offline Mode
Play without any authentication. Just enter a username and go.

---

## Development Setup

### Requirements

* [Node.js v22](https://nodejs.org/) — download and install before anything else.
* [Git](https://git-scm.com/) — needed to clone the repo.
* npm (comes with Node.js)

---

### Step 1 — Clone the repo

```console
git clone https://github.com/akatsukixpain12-stack/EVO-LAUNCHER.git
cd EVO-LAUNCHER
```

### Step 2 — Install dependencies

```console
npm install
```

### Step 3 — Run in development mode

```console
npm start
```

The launcher window will open. That's it.

---

### Step 4 — Build an installer (optional)

To build a distributable installer for your platform:

```console
# Windows (.exe installer)
npm run dist:win

# macOS (.dmg)
npm run dist:mac

# Linux (.AppImage)
npm run dist:linux
```

The output will be in the `dist/` folder.

---

## Adding Your Logo

Place your logo file at:
```
app/assets/images/EvoLogo.png
```
Also copy it to `build/icon.png` — this is used for the installer icon.

---

## Console / DevTools

```
Ctrl + Shift + I
```

---

## Performance Tab

Open Settings → **Performance** to access:

- **Motion Blur** with intensity slider
- **FPS Boost** with Balanced / Performance / Max FPS presets
- **Entity Culling** — skip off-screen entities
- **Fast Render** — reduce GPU overhead
- **Smooth FPS** — eliminate frame stutters
- **FPS Cap** — limit max FPS (30–300)

---

## License

UNLICENSED — All rights reserved © EVO Launcher
