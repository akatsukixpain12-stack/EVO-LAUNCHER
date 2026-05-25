<p align="center">
  <img src="app/assets/images/EvoLogo.png" width="250px" alt="EVO Launcher">
</p>

<p align="center">
  <img src="https://readme-typing-svg.herokuapp.com?font=Fira+Code&weight=700&size=35&pause=1000&color=0078D4&center=true&vCenter=true&width=435&lines=EVO+LAUNCHER;MINECRAFT+EDITION" alt="Typing SVG" />
</p>

<p align="center">
  <a href="https://github.com/akatsukixpain12-stack/EVO-LAUNCHER/releases/latest">
    <img src="https://img.shields.io/badge/ALL-RELEASES-grey?style=for-the-badge&logo=github" height="45">
  </a>
  <a href="https://github.com/akatsukixpain12-stack/EVO-LAUNCHER/releases/latest">
    <img src="https://img.shields.io/badge/MOBILE-APK-3DDC84?style=for-the-badge&logo=android&logoColor=white" height="45">
  </a>
</p>

<p align="center">The next-generation modded Minecraft launcher â€” built for performance, style, and control.</p>

---

## Features

* ðŸ”’ **Full Account Management** â€” Microsoft (OAuth 2.0) + Mojang authentication. Switch accounts instantly.
* ðŸ“‚ **Smart Asset Management** â€” Auto-downloads and validates all mods and files before launch.
* â˜• **Automatic Java** â€” Detects and installs the right Java version for you.
* âš¡ **Performance Settings** â€” Motion blur, FPS boost presets, entity culling, fast render, smooth FPS, FPS cap.
* ðŸ“° **Built-in News Feed** â€” Stay updated without leaving the launcher.
* ðŸ”„ **Auto-Updates** â€” The launcher keeps itself current.
* ðŸŒ **Mojang Status Monitor** â€” Live service status built in.

---

## Installation

### Requirements

* [Node.js v22](https://nodejs.org/) â€” download and install before anything else.
* [Git](https://git-scm.com/) â€” needed to clone the repo.
* npm (comes with Node.js)

---

### Step 1 â€” Clone the repo

```console
git clone https://github.com/akatsukixpain12-stack/EVO-LAUNCHER.git
cd EVO-LAUNCHER
```

### Step 2 â€” Install dependencies

```console
npm install
```

### Step 3 â€” Run in development mode

```console
npm start
```

The launcher window will open. That's it.

---

### Step 4 â€” Build an installer (optional)

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

| Platform | Output file |
| -------- | ----------- |
| Windows x64 | `dist/EVO Launcher-setup-2.2.1.exe` |
| macOS x64 | `dist/EVO Launcher-setup-2.2.1-x64.dmg` |
| macOS arm64 | `dist/EVO Launcher-setup-2.2.1-arm64.dmg` |
| Linux x64 | `dist/EVO Launcher-setup-2.2.1.AppImage` |

---

## Adding Your Logo

Place your logo file at:
```
app/assets/images/EvoLogo.png
```
Also copy it to `build/icon.png` â€” this is used for the installer icon.

---

## Console / DevTools

```
Ctrl + Shift + I
```

---

## Performance Tab

Open Settings â†’ **âš¡ Performance** to access:

- **Motion Blur** with intensity slider
- **FPS Boost** with Balanced / Performance / Max FPS presets
- **Entity Culling** â€” skip off-screen entities
- **Fast Render** â€” reduce GPU overhead
- **Smooth FPS** â€” eliminate frame stutters
- **FPS Cap** â€” limit max FPS (30â€“300)

---

## License

UNLICENSED â€” All rights reserved Â© EVO Launcher
