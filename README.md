# PiP Master — YouTube & All Websites

Picture-in-Picture for every website with a video, plus Region PiP to float any selected area of your screen.

[![Version](https://img.shields.io/badge/version-2.2.0-cc0000?style=flat-square)](https://github.com/anonyme-afk/Youtube-pip-master/releases)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-4285F4?style=flat-square)](https://developer.chrome.com/docs/extensions/mv3/)
[![Firefox](https://img.shields.io/badge/Firefox-109%2B-FF7139?style=flat-square)](https://addons.mozilla.org)
[![License](https://img.shields.io/badge/license-MIT-22c55e?style=flat-square)](LICENSE)

---

## Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [Region PiP](#region-pip)
4. [Installation](#installation)
5. [Settings](#settings)
6. [How It Works](#how-it-works)
7. [Project Structure](#project-structure)
8. [Changelog](#changelog)
9. [Browser Compatibility](#browser-compatibility)
10. [Known Limitations](#known-limitations)
11. [Contributing](#contributing)
12. [License](#license)

---

## Overview

PiP Master adds a Picture-in-Picture button directly into the YouTube player controls.
On every other website (Netflix, Twitch, Dailymotion, news sites, etc.), a floating button
appears when you hover over any video element.

**New in v2.2:** Region PiP lets you draw a selection rectangle over any part of the page
(like a screenshot tool) and stream that region into a floating, movable PiP window — no
video element required.

The extension requires no external services, collects no data, and has zero impact on page
load performance.

---

## Features

### YouTube

- Native-looking button injected into the YouTube player controls bar (next to the fullscreen button)
- Dedicated floating button for YouTube Shorts
- Survives SPA navigation: the button stays when you switch videos without a full page reload
- **Auto-skip ads while in PiP mode** — detects the "Skip Ad" button and clicks it automatically
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
| **Region PiP** | **Drag-select any screen area and float it — `Alt+Shift+P` (new in v2.2)** |
| Toast notifications | Discrete on-screen confirmations for every PiP state change |
| Firefox compatible | Works on Firefox 109+ via a `chrome.*` / `browser.*` compatibility shim |

---

## Region PiP

Region PiP lets you select any rectangular area of the current tab and float it in a
Picture-in-Picture window — just like a screen-region screenshot tool, but live and moveable.

### How to use

1. Press **`Alt+Shift+P`** (or your configured shortcut) on any page.
2. Your browser shows a screen-sharing dialog — select **"This Tab"** (Chrome) or
   the current browser window (Firefox) for the most accurate coordinate mapping.
3. An overlay appears. **Click and drag** to draw a rectangle over any area you want to float.
4. Release the mouse — the selected region starts streaming in a floating PiP window.
5. Move and resize the PiP window freely, just like any other PiP.
6. To stop: press **`Alt+Shift+P`** again, close the PiP window, or click the browser's
   "Stop sharing" button.

> **Tip:** Share "This Tab" (not "Entire Screen" or "Window") for pixel-perfect region
> alignment, since the coordinates are mapped relative to the viewport.

### Use cases

- Float a live chart, map, or dashboard while working in another tab
- Keep a live code diff or document section visible while typing elsewhere
- Watch a specific section of a long video (subtitles, annotations, speaker cam)
- Monitor a live score, ticker, or any updating element on a page

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

| Option | Default | Description |
|---|---|---|
| Auto-PiP | Off | Enters PiP automatically when you switch away from a tab with a playing video |
| Auto-Skip Ads | On | Clicks the YouTube "Skip Ad" button automatically while in PiP mode |
| Re-enter PiP on next video | On | Re-enters PiP when a playlist or autoplay starts the next video |
| Keyboard shortcut | `Alt+P` | Click the shortcut display to capture a new combination |
| **Enable Region PiP** | **On** | **Enables the drag-to-select region floating feature** |
| **Region PiP shortcut** | **`Alt+Shift+P`** | **Click to capture a new key combination for Region PiP** |

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


Region PiP (Alt+Shift+P)
    |
    getDisplayMedia() --> browser share dialog
    |
    User selects "This Tab" / browser window
    |
    Full-screen selection overlay appears
    |
    User drag-selects a rectangle
    |
    getVideoTracks()[0].getSettings() --> capture resolution
    |
    Scale CSS viewport coords --> capture pixel coords
    |
    Hidden <canvas> crops the frame on every requestAnimationFrame()
    |
    canvas.captureStream(30) --> hidden <video>
    |
    video.requestPictureInPicture() --> floating window
    |
    Press shortcut / close window / "Stop sharing" --> stopRegionPip()
```

**APIs used:**

- `HTMLVideoElement.requestPictureInPicture()` — enters PiP mode
- `Document.exitPictureInPicture()` — exits PiP mode
- `Document.pictureInPictureEnabled` — browser support check
- `HTMLVideoElement.readyState` — ensures metadata is loaded before requesting PiP
- `navigator.mediaDevices.getDisplayMedia()` — screen/tab capture for Region PiP
- `HTMLCanvasElement.captureStream()` — streams the cropped canvas as a video track
- `VideoTrack.getSettings()` — reads actual capture resolution for coordinate scaling
- `requestAnimationFrame()` — continuous frame cropping loop for Region PiP
- `MutationObserver` — watches DOM for SPA navigation and dynamic video injection
- `Page Visibility API` — Auto-PiP on tab switch
- `chrome.storage.sync` / `browser.storage.sync` — persists user settings

---

## Project Structure

```
pip-master/
├── manifest.json          Manifest V3 config — Chrome and Firefox
├── browser-compat.js      Shim that maps chrome.* to browser.* for Firefox
├── content_script.js      All extension logic (injection, PiP, region PiP, observers, ad skip)
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

### v2.2.0
- New: **Region PiP** — press `Alt+Shift+P` to activate a drag-to-select overlay on any page.
  Draw a rectangle over any screen area; that region is cropped in real time via Canvas API
  and streamed into a floating, movable PiP window. No video element required.
- New: Region PiP shortcut is fully configurable from the settings page (default `Alt+Shift+P`).
- New: Region PiP can be toggled on/off independently from the settings page.
- New: The selection overlay shows corner handles and a live size label (`W × H`) while dragging.
- New: Four dim panels animate around the selection to visually isolate the chosen area.
- Changed: version bumped to 2.2.0; settings page updated with a dedicated "Region PiP" card.

### v2.1.3
- Fixed: floating hover button not appearing on sites like Le Monde and any site where videos
  are inside positioned containers. Changed from `position: absolute` to `position: fixed`.

### v2.1.2
- Fixed: `requestPictureInPicture` crash when video metadata is not yet loaded.

### v2.1.1
- Fixed: unhandled Promise rejections — all async operations replaced with `.then().catch()`.

### v2.1.0
- New: Auto-Skip Ads, Re-enter PiP, Universal mode, settings page.

### v2.0.0
- New: Universal mode, Firefox compatibility, browser-compat.js shim.

### v1.0.0
- Initial release: YouTube button, Shorts button, keyboard shortcut, Auto-PiP, MutationObserver.

---

## Browser Compatibility

| Browser | Version | Status | Notes |
|---|---|---|---|
| Chrome | 88+ | Supported | Full feature set including Region PiP ("This Tab" share recommended) |
| Edge | 88+ | Supported | Same Chromium engine as Chrome |
| Firefox | 109+ | Supported | Via browser-compat.js shim; Region PiP works (share browser window) |
| Opera | 74+ | Likely compatible | Chromium-based, not formally tested |
| Brave | Any | Likely compatible | Chromium-based, not formally tested |
| Safari | — | Not supported | Requires macOS + Xcode + paid Apple Developer account |

---

## Known Limitations

- **Safari**: Out of scope — requires macOS, Xcode, and an Apple Developer account ($99/year).
- **DRM-protected content**: Disney+, Amazon Prime Video and similar platforms block PiP at
  the browser level. This is a browser restriction, not an extension bug.
- **Cross-origin iframes**: Videos inside cross-origin iframes cannot be controlled due to
  browser security policies.
- **Firefox temporary install**: Removed on browser close when loaded via `about:debugging`.
- **Region PiP coordinate accuracy**: Share "This Tab" (Chrome) for pixel-perfect alignment.
  When sharing the full screen, coordinate mapping depends on the browser window position and
  DPI scaling, which may introduce a small offset.
- **Region PiP on Firefox**: Firefox does not support the `preferCurrentTab` hint; manually
  choose the browser window for best results.

---

## Contributing

```bash
git clone https://github.com/anonyme-afk/Youtube-pip-master.git
cd Youtube-pip-master
git checkout -b feature/your-feature-name
git add .
git commit -m "feat: describe your change"
git push origin feature/your-feature-name
```

**Ideas for contributions:**
- i18n / localization support
- Configurable button position for universal mode
- Timer display in PiP window via Media Session API
- Support for sites with multiple simultaneous video elements
- Region PiP: "re-select region" button without restarting the share session

---

## License

MIT License — see [LICENSE](LICENSE) for full text.
Copyright (c) 2026 anonyme-afk

---

*If this extension is useful to you, consider leaving a star on the repository.*
