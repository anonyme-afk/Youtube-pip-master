# PiP Master — YouTube & All Websites

Picture-in-Picture for every website with a video, not just YouTube.

[![Version](https://img.shields.io/badge/version-2.1.2-cc0000?style=flat-square)](https://github.com/anonyme-afk/Youtube-pip-master/releases)
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
7. [Changelog](#changelog)
8. [Browser Compatibility](#browser-compatibility)
9. [Known Limitations](#known-limitations)
10. [Contributing](#contributing)
11. [License](#license)

---

## Overview

PiP Master adds a Picture-in-Picture button directly into the YouTube player controls.  
On every other website (Netflix, Twitch, Dailymotion, news sites, etc.), a floating button
appears when you hover over any video element — no configuration required.

The extension requires no external services, collects no data, and has zero impact on page
load performance.

---

## Features

### YouTube

- Native-looking button injected into the YouTube player controls bar (next to the fullscreen button)
- Dedicated floating button for YouTube Shorts
- Survives SPA navigation: the button stays when you switch videos without a full page reload
- **Auto-skip ads while in PiP mode** — detects the "Skip Ad" button and clicks it automatically
  so you never miss a skip while the video is floating
- **Playlist continuation** — when a video ends in PiP mode and the next one starts,
  PiP is re-entered automatically

### All Websites

- A small floating button appears in the top-right corner of any `<video>` element on hover
- Works on lazily-loaded videos (videos injected into the DOM after page load)
- Tracks video replacements (e.g. episode auto-play on streaming sites) and re-enters PiP

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

> Temporary add-ons are removed when Firefox closes. For a permanent installation,
> submit the extension to [addons.mozilla.org](https://addons.mozilla.org).

### Updating

Replace the files in your local folder with the new version, then go to
`chrome://extensions/` and click the refresh icon on the PiP Master card.

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
            Video replacement is detected for auto re-entry
                    |
                    v
          video.readyState >= 1 ?
            yes --> requestPictureInPicture()
            no  --> wait for "loadedmetadata" event, then retry
```

**APIs used:**

- `HTMLVideoElement.requestPictureInPicture()` — enters PiP mode
- `Document.exitPictureInPicture()` — exits PiP mode
- `Document.pictureInPictureEnabled` — browser support check
- `HTMLVideoElement.readyState` — ensures metadata is loaded before requesting PiP
- `MutationObserver` — watches DOM for SPA navigation and dynamic video injection
- `Page Visibility API` — Auto-PiP on tab switch
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

## Changelog

### v2.1.2
- Fixed: `requestPictureInPicture` crash when video metadata is not yet loaded.
  The extension now checks `video.readyState` and waits for the `loadedmetadata`
  event before retrying. Affected users who clicked the button immediately after
  a page load or video switch.

### v2.1.1
- Fixed: unhandled Promise rejections caused by `async/await` inside content scripts.
  All async operations replaced with explicit `.then().catch()` Promise chains.

### v2.1.0
- New: Auto-Skip Ads — automatically clicks the YouTube "Skip Ad" button while in PiP.
- New: Re-enter PiP — re-enters PiP automatically on playlist advancement and autoplay.
- New: Universal mode — floating hover button on every website with a `<video>` element.
- New: settings page with three configurable options.
- Changed: extension renamed to "PiP Master — YouTube & All Websites".
- Changed: `<all_urls>` host permission to support all websites.

### v2.0.0
- New: Universal mode (initial implementation).
- New: Firefox compatibility via `browser-compat.js` shim.
- New: `browser_specific_settings.gecko` with `data_collection_permissions` for AMO.
- Fixed: `insertBefore` crash when the fullscreen button was not a direct child of controls.

### v1.0.0
- Initial release.
- YouTube player button injection.
- YouTube Shorts floating button.
- Keyboard shortcut (Alt+P).
- Auto-PiP on tab switch.
- MutationObserver for SPA navigation.

---

## Browser Compatibility

| Browser | Version | Status | Notes |
|---|---|---|---|
| Chrome | 88+ | Supported | Full feature set |
| Edge | 88+ | Supported | Same Chromium engine as Chrome |
| Firefox | 109+ | Supported | Via browser-compat.js shim |
| Opera | 74+ | Likely compatible | Chromium-based, not formally tested |
| Brave | Any | Likely compatible | Chromium-based, not formally tested |
| Safari | — | Not supported | Requires macOS + Xcode + paid Apple Developer account |

---

## Known Limitations

- **Safari**: Converting to a Safari Web Extension requires macOS, Xcode, and an Apple
  Developer account ($99/year). Out of scope for this project.
- **DRM-protected content**: Some platforms (Disney+, Amazon Prime Video) block PiP on
  DRM-protected streams at the browser level. This is a browser restriction, not an
  extension bug.
- **Cross-origin iframes**: Videos embedded inside cross-origin iframes cannot be
  controlled due to browser security policies.
- **Firefox temporary install**: The extension is removed on browser close when loaded
  via `about:debugging`. A permanent installation requires AMO submission.

---

## Contributing

Contributions, bug reports, and feature requests are welcome.

```bash
# Clone
git clone https://github.com/anonyme-afk/Youtube-pip-master.git
cd Youtube-pip-master

# Create a branch
git checkout -b feature/your-feature-name

# Commit
git add .
git commit -m "feat: describe your change"

# Push and open a Pull Request
git push origin feature/your-feature-name
```

**Ideas for contributions:**
- i18n / localization support
- Configurable button position for universal mode
- Timer display in PiP window via Media Session API
- Support for sites with multiple simultaneous video elements

---

## License

MIT License — see [LICENSE](LICENSE) for full text.  
Copyright (c) 2026 anonyme-afk

---

*If this extension is useful to you, consider leaving a star on the repository.*
