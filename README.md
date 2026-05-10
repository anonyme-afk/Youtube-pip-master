# PiP Master — YouTube & All Websites

Picture-in-Picture for every website with a video, not just YouTube.

[![Version](https://img.shields.io/badge/version-2.1.0-cc0000?style=flat-square)](https://github.com/anonyme-afk/Youtube-pip-master/releases)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-4285F4?style=flat-square)](https://developer.chrome.com/docs/extensions/mv3/)
[![Firefox](https://img.shields.io/badge/Firefox-109%2B-FF7139?style=flat-square)](https://addons.mozilla.org)
[![License](https://img.shields.io/badge/license-MIT-22c55e?style=flat-square)](LICENSE)

---

## Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [Installation](#installation)
4. [Settings](#settings)
5. [How It Works](#how-it-works)
6. [Project Structure](#project-structure)
7. [Browser Compatibility](#browser-compatibility)
8. [Known Limitations](#known-limitations)
9. [Contributing](#contributing)
10. [License](#license)

---

## Overview

PiP Master adds a Picture-in-Picture button directly into the YouTube player controls.  
On every other website (Netflix, Twitch, Dailymotion, news sites, etc.), a floating button appears when you hover over any video element — no configuration required.

The extension requires no external services, collects no data, and has zero impact on page load performance.

---

## Features

### YouTube

- Native-looking button injected into the YouTube player controls bar (next to the fullscreen button)
- Dedicated floating button for YouTube Shorts
- Survives SPA navigation: the button stays when you switch videos without a full page reload
- **Auto-skip ads while in PiP mode** — detects the "Skip Ad" button and clicks it automatically so you never miss a skip while the video is floating
- **Playlist continuation** — when a video ends in PiP mode and the next one starts, PiP is re-entered automatically

### All Websites

- A small floating button appears in the top-right corner of any `<video>` element when you hover over it
- Works on lazily-loaded videos (videos injected into the DOM after page load)
- Tracks video replacements (e.g. episode auto-play on streaming sites) and re-enters PiP automatically

### General

| Feature | Description |
|---|---|
| Keyboard shortcut | Default `Alt+P`, fully configurable from the settings page |
| Auto-PiP | When you leave a tab with a playing video, PiP activates automatically |
| Re-enter PiP | Stays in floating mode across playlist advancement and autoplay |
| Toast notifications | Discrete on-screen confirmations for every PiP state change |
| Firefox compatible | Works on Firefox 109+ via a `chrome.*` / `browser.*` compatibility shim |

---

## Installation

### Chrome and Edge

1. Download the repository: **Code > Download ZIP**
2. Extract the ZIP to a permanent folder on your computer
3. Open `chrome://extensions/` (Chrome) or `edge://extensions/` (Edge)
4. Enable **Developer mode** (top-right toggle)
5. Click **Load unpacked**
6. Select the extracted folder

The extension icon appears in the browser toolbar. Click it to open settings.

### Firefox (temporary, for testing)

1. Download and extract the ZIP
2. Open `about:debugging#/runtime/this-firefox`
3. Click **Load Temporary Add-on**
4. Select the `manifest.json` file inside the extracted folder

Note: temporary add-ons are removed when Firefox closes. For a permanent installation, the extension must be submitted to [addons.mozilla.org](https://addons.mozilla.org).

### Updating

Replace the files in your local folder with the new version, then go to `chrome://extensions/` and click the refresh icon on the PiP Master card.

---

## Settings

Click the extension icon in the browser toolbar to open the settings page.

| Option | Default | Description |
|---|---|---|
| Auto-PiP | Off | Enters PiP automatically when you switch away from a tab with a playing video |
| Auto-Skip Ads | On | Clicks the YouTube "Skip Ad" button automatically while in PiP mode |
| Re-enter PiP on next video | On | Re-enters PiP when a playlist or autoplay starts the next video |
| Keyboard shortcut | `Alt+P` | Click the shortcut display to capture a new combination |

---

## How It Works

```
Page load
    |
    +-- youtube.com?
    |       |
    |       +-- /shorts  -->  fixed floating button (bottom-right)
    |       |
    |       +-- /watch   -->  button injected into .ytp-right-controls
    |                         MutationObserver handles SPA navigation
    |                         AdSkipper watches for skip buttons while in PiP
    |                         Video end listener triggers PiP re-entry on next video
    |
    +-- any other site
            |
            MutationObserver scans for <video> elements
            Each video gets an on-hover floating button
            Video replacement is detected for auto-reentry
                    |
                    v
          HTMLVideoElement.requestPictureInPicture()
          (native browser Web API, no third-party code)
```

**APIs used:**

- `HTMLVideoElement.requestPictureInPicture()` — enters PiP mode
- `Document.exitPictureInPicture()` — exits PiP mode
- `Document.pictureInPictureEnabled` — browser support check
- `MutationObserver` — watches DOM changes for SPA navigation and dynamic video injection
- `Page Visibility API` (`document.visibilitychange`) — Auto-PiP on tab switch
- `chrome.storage.sync` / `browser.storage.sync` — persists user settings

---

## Project Structure

```
pip-master/
├── manifest.json          Manifest V3 config — Chrome and Firefox
├── browser-compat.js      Shim that maps chrome.* to browser.* for Firefox
├── content_script.js      All extension logic (injection, PiP, observers, ad skip)
├── options.html           Settings page UI
├── options.js             Settings page logic
├── LICENSE                MIT
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

---

## Browser Compatibility

| Browser | Version | Status | Notes |
|---|---|---|---|
| Chrome | 88+ | Supported | Full feature set |
| Edge | 88+ | Supported | Same Chromium engine |
| Firefox | 109+ | Supported | Via browser-compat.js shim |
| Safari | — | Not supported | Requires macOS + Xcode + paid Apple Developer account |
| Opera | 74+ | Likely compatible | Based on Chromium, not tested |
| Brave | Any | Likely compatible | Based on Chromium, not tested |

The extension uses only standard Web Extension APIs (Manifest V3) and the native PiP Web API. No browser-specific workarounds outside of the `chrome.*` / `browser.*` shim for Firefox.

---

## Known Limitations

- **Safari**: Converting to a Safari Web Extension requires macOS, Xcode, and an Apple Developer account. Out of scope for this project.
- **DRM-protected content**: Some streaming platforms (Disney+, Amazon Prime) block PiP on DRM-protected streams at the browser level. This is a browser restriction, not an extension bug.
- **Firefox temporary install**: The extension is removed on browser close when loaded via `about:debugging`. A permanent installation requires AMO submission.
- **iFrame videos**: Videos embedded inside cross-origin iframes cannot be controlled due to browser security policies.

---

## Contributing

Contributions, bug reports, and feature requests are welcome.

```bash
# Clone
git clone https://github.com/anonyme-afk/Youtube-pip-master.git
cd Youtube-pip-master

# Create a branch
git checkout -b feature/your-feature-name

# Commit your changes
git add .
git commit -m "feat: describe your change"

# Push and open a Pull Request
git push origin feature/your-feature-name
```

Please keep commits atomic and write clear commit messages.

**Ideas for contributions:**
- i18n / localization support
- Configurable button position for universal mode
- Timer display in PiP window via Media Session API
- Edge Cases: sites with multiple simultaneous video elements

---

## License

MIT License — see [LICENSE](LICENSE) for full text.

Copyright (c) 2026 anonyme-afk

---

*If this extension is useful to you, consider leaving a star on the repository.*
