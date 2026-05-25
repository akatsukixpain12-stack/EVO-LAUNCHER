<p align="center">
  <img src="app/assets/images/SealCircle.png" width="150px" alt="EVO LAUNCHER">
</p>

<h1 align="center">EVO LAUNCHER</h1>

<p align="center">Free, open-source Minecraft launcher with Microsoft, Ely.by, and Offline authentication.<br>Modern dark UI, built-in mod management, and FPS optimization.</p>

<p align="center">
  <a href="https://akatsukixpain12-stack.github.io/EVO-LAUNCHER/">Website</a> •
  <a href="https://github.com/akatsukixpain12-stack/EVO-LAUNCHER/releases">Download</a> •
  <a href="https://github.com/akatsukixpain12-stack/EVO-LAUNCHER/issues">Issues</a>
</p>

---

## Download

Download the latest installer from the [Releases](https://github.com/akatsukixpain12-stack/EVO-LAUNCHER/releases) page or visit the [website](https://akatsukixpain12-stack.github.io/EVO-LAUNCHER/):

| Platform | File |
| -------- | ---- |
| Windows x64 | `EVO LAUNCHER-setup-X.X.X.exe` |
| macOS x64 | `EVO LAUNCHER-setup-X.X.X-x64.dmg` |
| macOS arm64 | `EVO LAUNCHER-setup-X.X.X-arm64.dmg` |
| Linux x64 | `EVO LAUNCHER-setup-X.X.X.AppImage` |

---

## Features

* **4 Authentication Methods** — Microsoft (OAuth 2.0), Mojang, Ely.by (free), and Offline mode
* **Ely.by Authentication** — Play using your free Ely.by account with full skin support via authlib-injector
* **Offline Mode** — Play without any account using a local username
* **Modern Dark UI** — FastClient-inspired dark theme with orange accent colors
* **Smart Asset Management** — Auto-downloads and validates all mods and files before launch
* **Automatic Java** — Detects and installs the right Java version for you
* **Built-in News Feed** — Stay updated without leaving the launcher
* **Auto-Updates** — The launcher keeps itself current
* **Mojang Status Monitor** — Live service status built in
* **Cross-Platform** — Windows, macOS, and Linux support

---

## Authentication Options

### Microsoft (OAuth 2.0)
Login with your Microsoft account to play with your official Minecraft profile.

### Ely.by (Free)
Login with your [Ely.by](https://ely.by/) account. Ely.by provides free Minecraft accounts with full skin support. The launcher automatically downloads and injects [authlib-injector](https://github.com/yushijinhun/authlib-injector) to authenticate with the Ely.by auth server.

### Mojang (Legacy)
Login with a Mojang account (email + password).

### Offline Mode
Play without any authentication. Just enter a username and go.

---

## Development Setup

### Requirements

* [Node.js v22](https://nodejs.org/)
* [Git](https://git-scm.com/)

### Quick Start

```console
git clone https://github.com/akatsukixpain12-stack/EVO-LAUNCHER.git
cd EVO-LAUNCHER
npm install
npm start
```

### Build Installer

```console
# Windows (.exe)
npm run dist:win

# macOS (.dmg)
npm run dist:mac

# Linux (.AppImage)
npm run dist:linux
```

Output goes to `dist/`.

---

## Creating a Release

Push a version tag to trigger the GitHub Actions release workflow:

```console
git tag v2.3.0
git push origin v2.3.0
```

This automatically builds installers for Windows, macOS, and Linux and publishes them as a GitHub Release.

---

## Console / DevTools

```
Ctrl + Shift + I
```

---

## License

UNLICENSED — All rights reserved © EVO LAUNCHER
