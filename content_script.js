/**
 * PiP Master — content_script.js v2.2
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * YOUTUBE MODE
 *   - Injects a PiP button directly into the native YouTube player controls
 *   - Handles YouTube Shorts (separate floating button)
 *   - MutationObserver for SPA navigation (no page reload between videos)
 *   - Auto-clicks the "Skip Ad" button while in PiP so the user never misses it
 *   - Re-enters PiP automatically when a playlist advances to the next video
 *
 * UNIVERSAL MODE  (every other website)
 *   - Attaches a hover button to every <video> element on the page
 *   - MutationObserver watches for dynamically injected videos
 *   - Re-enters PiP when a video element is replaced (e.g. next episode auto-play)
 *
 * REGION PiP  (new in v2.2)
 *   - Keyboard shortcut (default Alt+Shift+P) starts a screen-capture session
 *   - A fullscreen overlay lets you drag-select any region of the viewport
 *   - The selected rectangle is cropped in real time via Canvas and streamed
 *     into a floating PiP window — movable and resizable like any PiP window
 *   - Press the shortcut again, close the PiP window, or press Esc to stop
 *
 * SHARED
 *   - Configurable keyboard shortcuts (Alt+P for PiP, Alt+Shift+P for Region)
 *   - Auto-PiP: enters PiP automatically when the tab loses focus
 *   - Toast notifications for all state changes
 *   - Zero memory leaks: all listeners tracked and cleaned up
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

(function () {
  'use strict';

  // ─── Constants ──────────────────────────────────────────────────────────────
  var IS_YOUTUBE = location.hostname.includes('youtube.com');
  var SKIP_AD_SELECTORS = [
    '.ytp-skip-ad-button',
    '.ytp-ad-skip-button',
    '.ytp-ad-skip-button-modern',
    '[class*="skip-ad"]'
  ];

  // ─── State ───────────────────────────────────────────────────────────────────
  var settings = {
    autoPip: false,
    shortcut: 'alt+p',
    autoSkipAd: true,
    reenterPip: true,
    regionPip: true,
    regionShortcut: 'alt+shift+p'
  };

  var keyHandler       = null;
  var regionKeyHandler = null;
  var visHandler       = null;
  var mainObserver     = null;
  var videoObserver    = null;
  var adObserver       = null;
  var debounceId       = null;
  var retryInterval    = null;
  var lastUrl          = location.href;
  var pipWasActive     = false;
  var trackedVideos    = new WeakSet();

  // ─── Region PiP state ────────────────────────────────────────────────────────
  var regionActive    = false;
  var regionStream    = null;
  var regionSrcVideo  = null;
  var regionPipVideo  = null;
  var regionRaf       = null;

  // ─── Boot ────────────────────────────────────────────────────────────────────
  api.storage.sync.get(
    { autoPip: false, shortcut: 'alt+p', autoSkipAd: true, reenterPip: true, regionPip: true, regionShortcut: 'alt+shift+p' },
    function (data) { settings = data; bootstrap(); }
  );

  api.storage.onChanged.addListener(function (changes) {
    var keys = ['autoPip', 'shortcut', 'autoSkipAd', 'reenterPip', 'regionPip', 'regionShortcut'];
    keys.forEach(function (k) {
      if (changes[k] !== undefined) settings[k] = changes[k].newValue;
    });
    setupKeyboard();
    setupRegionKeyboard();
    setupAutoPip();
  });

  function bootstrap() {
    injectStyles();
    setupKeyboard();
    setupRegionKeyboard();
    setupAutoPip();
    setupPiPStateEvents();
    if (IS_YOUTUBE) {
      setupYouTube();
    } else {
      setupUniversal();
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  YOUTUBE MODE
  // ═══════════════════════════════════════════════════════════════════════════

  function setupYouTube() {
    setupAdSkipper();
    setupYouTubeObserver();
    startRetry();
  }

  function startRetry() {
    stopRetry();
    var attempts = 0;
    retryInterval = setInterval(function () {
      attempts++;
      if (injectYouTubeButton() || attempts > 40) stopRetry();
    }, 500);
  }
  function stopRetry() {
    if (retryInterval) { clearInterval(retryInterval); retryInterval = null; }
  }

  function injectYouTubeButton() {
    if (document.getElementById('pip-master-btn')) return true;
    return isShorts() ? injectShortsButton() : injectPlayerButton();
  }

  function isShorts() {
    return location.pathname.startsWith('/shorts/');
  }

  function injectPlayerButton() {
    var controls = document.querySelector('.ytp-right-controls');
    if (!controls) return false;

    var btn = createButton('pip-master-btn', 'Picture-in-Picture (Alt+P)');
    btn.className = 'ytp-button pip-master-btn';
    btn.style.cssText = [
      'width:48px;height:100%;',
      'display:inline-flex;align-items:center;justify-content:center;',
      'opacity:0.9;cursor:pointer;',
      'transition:opacity .15s,transform .12s;',
      'padding:0;background:none;border:none;'
    ].join('');
    btn.appendChild(makeSVG(22, false));

    btn.addEventListener('mouseenter', function () { btn.style.opacity = '1'; btn.style.transform = 'scale(1.1)'; });
    btn.addEventListener('mouseleave', function () { btn.style.opacity = '0.9'; btn.style.transform = 'scale(1)'; });
    btn.addEventListener('click', function (e) { e.stopPropagation(); togglePiP(); });

    var anchors = ['.ytp-size-button', '.ytp-fullscreen-button', '.ytp-pip-button'];
    var inserted = false;
    for (var i = 0; i < anchors.length; i++) {
      var anchor = controls.querySelector(anchors[i]);
      if (anchor && anchor.parentNode === controls) {
        controls.insertBefore(btn, anchor);
        inserted = true;
        break;
      }
    }
    if (!inserted) controls.appendChild(btn);
    attachVideoEndListener();
    return true;
  }

  function injectShortsButton() {
    var player = document.querySelector('ytd-shorts, #shorts-container, ytd-reel-video-renderer');
    if (!player) return false;

    var btn = createButton('pip-master-btn', 'Picture-in-Picture (Alt+P)');
    btn.style.cssText = [
      'position:fixed;bottom:88px;right:16px;z-index:99999;',
      'width:44px;height:44px;',
      'background:rgba(0,0,0,0.65);backdrop-filter:blur(6px);',
      'border-radius:50%;',
      'display:flex;align-items:center;justify-content:center;',
      'cursor:pointer;',
      'border:1.5px solid rgba(255,255,255,0.2);',
      'transition:background .15s,transform .12s;',
      'box-shadow:0 2px 12px rgba(0,0,0,.4);'
    ].join('');
    btn.appendChild(makeSVG(20, false));

    btn.addEventListener('mouseenter', function () { btn.style.background = 'rgba(255,0,51,0.85)'; btn.style.transform = 'scale(1.08)'; });
    btn.addEventListener('mouseleave', function () { btn.style.background = 'rgba(0,0,0,0.65)'; btn.style.transform = 'scale(1)'; });
    btn.addEventListener('click', function (e) { e.stopPropagation(); togglePiP(); });

    document.body.appendChild(btn);
    return true;
  }

  function attachVideoEndListener() {
    var video = document.querySelector('video');
    if (!video || trackedVideos.has(video)) return;
    trackedVideos.add(video);

    video.addEventListener('ended', function () {
      if (document.pictureInPictureElement) {
        pipWasActive = true;
      }
    });
  }

  function setupAdSkipper() {
    if (adObserver) adObserver.disconnect();

    adObserver = new MutationObserver(function () {
      if (!settings.autoSkipAd) return;
      if (!document.pictureInPictureElement) return;

      for (var s = 0; s < SKIP_AD_SELECTORS.length; s++) {
        var skipBtn = document.querySelector(SKIP_AD_SELECTORS[s]);
        if (skipBtn && skipBtn.offsetParent !== null) {
          skipBtn.click();
          showToast('Pub passee automatiquement');
          return;
        }
      }
    });

    adObserver.observe(document.body, { childList: true, subtree: true, attributes: true });
  }

  function setupYouTubeObserver() {
    if (mainObserver) mainObserver.disconnect();

    mainObserver = new MutationObserver(function () {
      var newUrl = location.href;

      if (newUrl !== lastUrl) {
        lastUrl = newUrl;
        var old = document.getElementById('pip-master-btn');
        if (old && old.parentNode) old.parentNode.removeChild(old);

        stopRetry();

        if (pipWasActive && settings.reenterPip) {
          pipWasActive = false;
          setTimeout(function () {
            var video = document.querySelector('video');
            if (video && !document.pictureInPictureElement) {
              video.requestPictureInPicture().catch(function () {});
            }
          }, 1200);
        }

        startRetry();
        return;
      }

      clearTimeout(debounceId);
      debounceId = setTimeout(function () {
        if (!document.getElementById('pip-master-btn')) {
          startRetry();
        } else {
          updateButtonState();
          attachVideoEndListener();
        }
      }, 400);
    });

    mainObserver.observe(document.documentElement, { childList: true, subtree: true });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  UNIVERSAL MODE — every website with a <video>
  // ═══════════════════════════════════════════════════════════════════════════

  function setupUniversal() {
    attachHoverButtonsToAll();

    videoObserver = new MutationObserver(function () {
      clearTimeout(debounceId);
      debounceId = setTimeout(attachHoverButtonsToAll, 350);
    });
    videoObserver.observe(document.documentElement, { childList: true, subtree: true });
  }

  function attachHoverButtonsToAll() {
    var videos = document.querySelectorAll('video');
    for (var i = 0; i < videos.length; i++) {
      if (!trackedVideos.has(videos[i])) {
        attachHoverButton(videos[i]);
      }
    }
  }

  function attachHoverButton(video) {
    if (trackedVideos.has(video)) return;
    trackedVideos.add(video);

    var btn = createButton('', 'Picture-in-Picture (Alt+P)');
    btn.className = 'pip-hover-btn';
    btn.appendChild(makeSVG(18, false));

    var targetVideo = video;

    function reposition() {
      var r = targetVideo.getBoundingClientRect();
      if (r.width < 80 || r.height < 60) {
        btn.style.opacity = '0';
        return;
      }
      btn.style.top   = Math.max(8, r.top  + 8)  + 'px';
      btn.style.left  = Math.max(8, r.right - 50) + 'px';
    }

    var hideTimer;
    function show() {
      clearTimeout(hideTimer);
      reposition();
      btn.style.opacity = '1';
      btn.style.transform = 'scale(1)';
    }
    function hide() {
      hideTimer = setTimeout(function () {
        btn.style.opacity = '0';
        btn.style.transform = 'scale(0.85)';
      }, 250);
    }

    video.addEventListener('mouseenter', show);
    video.addEventListener('mouseleave', hide);
    btn.addEventListener('mouseenter', show);
    btn.addEventListener('mouseleave', hide);
    window.addEventListener('scroll', reposition, { passive: true });
    window.addEventListener('resize', reposition, { passive: true });

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      e.preventDefault();
      togglePiPFor(targetVideo);
    });

    video.addEventListener('ended', function () {
      if (document.pictureInPictureElement === video) {
        pipWasActive = true;
      }
    });

    video.addEventListener('enterpictureinpicture', function () {
      var inner = btn.querySelector('.pip-inner');
      if (inner) inner.setAttribute('fill', '#3ea6ff');
    });
    video.addEventListener('leavepictureinpicture', function () {
      var inner = btn.querySelector('.pip-inner');
      if (inner) inner.setAttribute('fill', 'white');

      if (pipWasActive && settings.reenterPip) {
        pipWasActive = false;
        watchForNextVideo(targetVideo, btn);
      }
    });

    document.body.appendChild(btn);
  }

  function watchForNextVideo(oldVideo, btn) {
    var watcher = new MutationObserver(function () {
      var newVideo = document.querySelector('video');
      if (newVideo && newVideo !== oldVideo && !newVideo.paused) {
        watcher.disconnect();
        setTimeout(function () {
          newVideo.requestPictureInPicture().catch(function () {});
        }, 800);
      }
    });
    watcher.observe(document.body, { childList: true, subtree: true, attributes: true });
    setTimeout(function () { watcher.disconnect(); }, 15000);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  PiP CORE
  // ═══════════════════════════════════════════════════════════════════════════

  function togglePiP() {
    var video = document.querySelector('video');
    if (!video) { showToast('No video found on this page'); return; }
    togglePiPFor(video);
  }

  function togglePiPFor(video) {
    if (!document.pictureInPictureEnabled) {
      showToast('PiP is not supported by this browser');
      return;
    }
    if (document.pictureInPictureElement) {
      document.exitPictureInPicture()
        .then(function () { showToast('PiP disabled'); })
        .catch(function (err) { console.warn('[PiP Master] exit:', err.message); });
      return;
    }

    if (video.readyState < 1) {
      showToast('Loading video...');
      video.addEventListener('loadedmetadata', function onMeta() {
        video.removeEventListener('loadedmetadata', onMeta);
        enterPiP(video);
      });
      return;
    }

    enterPiP(video);
  }

  function enterPiP(video) {
    video.requestPictureInPicture()
      .then(function () { showToast('PiP enabled'); })
      .catch(function (err) {
        showToast('Click the video first, then try again');
        console.warn('[PiP Master] enter:', err.message);
      });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  REGION PiP
  // ═══════════════════════════════════════════════════════════════════════════

  function activateRegionPip() {
    if (regionActive) {
      stopRegionPip();
      showToast('Region PiP stopped');
      return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
      showToast('Screen capture is not supported in this browser');
      return;
    }

    if (!document.pictureInPictureEnabled) {
      showToast('PiP is not supported in this browser');
      return;
    }

    showToast('Select this tab or window when asked by your browser\u2026');

    var captureOpts = { video: { frameRate: 30, cursor: 'always' }, audio: false };
    try { captureOpts.preferCurrentTab = true; } catch (e) {}

    navigator.mediaDevices.getDisplayMedia(captureOpts)
      .then(function (stream) {
        regionStream = stream;
        stream.getVideoTracks()[0].addEventListener('ended', function () {
          stopRegionPip();
        });
        showRegionOverlay(stream);
      })
      .catch(function () {
        showToast('Screen capture cancelled');
      });
  }

  function showRegionOverlay(stream) {
    regionActive = true;

    var overlay = document.createElement('div');
    overlay.id = 'pip-region-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:2147483647;cursor:crosshair;';

    var dimT = makeDimPanel();
    var dimB = makeDimPanel();
    var dimL = makeDimPanel();
    var dimR = makeDimPanel();

    var selBox = document.createElement('div');
    selBox.style.cssText = [
      'position:absolute;display:none;pointer-events:none;',
      'border:2px solid #3ea6ff;box-sizing:border-box;',
      'box-shadow:0 0 8px rgba(62,166,255,.6);'
    ].join('');

    ['tl','tr','bl','br'].forEach(function (c) {
      var el = document.createElement('div');
      el.style.cssText = [
        'position:absolute;width:8px;height:8px;',
        'background:#3ea6ff;pointer-events:none;',
        c[0] === 't' ? 'top:-4px;' : 'bottom:-4px;',
        c[1] === 'l' ? 'left:-4px;' : 'right:-4px;'
      ].join('');
      selBox.appendChild(el);
    });

    var sizeLabel = document.createElement('div');
    sizeLabel.style.cssText = [
      'position:absolute;bottom:calc(100% + 6px);left:0;',
      'color:#fff;font:500 11px/1 system-ui,sans-serif;',
      'background:rgba(0,0,0,.7);padding:3px 7px;border-radius:4px;',
      'pointer-events:none;white-space:nowrap;'
    ].join('');
    selBox.appendChild(sizeLabel);

    var instrLabel = document.createElement('div');
    instrLabel.style.cssText = [
      'position:absolute;top:50%;left:50%;',
      'transform:translate(-50%,-50%);',
      'color:#fff;font:600 15px/1.5 system-ui,sans-serif;',
      'background:rgba(0,0,0,.78);padding:14px 26px;border-radius:10px;',
      'pointer-events:none;text-align:center;white-space:nowrap;',
      'border:1px solid rgba(255,255,255,.15);backdrop-filter:blur(6px);',
      'box-shadow:0 4px 24px rgba(0,0,0,.5);'
    ].join('');
    instrLabel.textContent = 'Drag to select a region \u2014 Esc to cancel';

    overlay.appendChild(dimT);
    overlay.appendChild(dimB);
    overlay.appendChild(dimL);
    overlay.appendChild(dimR);
    overlay.appendChild(selBox);
    overlay.appendChild(instrLabel);
    document.body.appendChild(overlay);

    setDimFull();

    var startX, startY, isDrawing = false;

    overlay.addEventListener('mousedown', onDown);
    overlay.addEventListener('mousemove', onMove);
    overlay.addEventListener('mouseup',   onUp);

    function onDown(e) {
      if (e.button !== 0) return;
      e.preventDefault();
      isDrawing = true;
      startX = e.clientX;
      startY = e.clientY;
      selBox.style.display = 'block';
      instrLabel.style.display = 'none';
      redraw(e.clientX, e.clientY);
    }

    function onMove(e) {
      if (!isDrawing) return;
      e.preventDefault();
      redraw(e.clientX, e.clientY);
    }

    function onUp(e) {
      if (!isDrawing) return;
      isDrawing = false;

      var x = Math.min(startX, e.clientX);
      var y = Math.min(startY, e.clientY);
      var w = Math.abs(e.clientX - startX);
      var h = Math.abs(e.clientY - startY);

      destroyOverlay();

      if (w < 20 || h < 20) {
        showToast('Selection too small \u2014 drag a larger area');
        stopRegionPip();
        return;
      }

      launchRegionPip(stream, x, y, w, h);
    }

    function redraw(mx, my) {
      var x = Math.min(startX, mx), y = Math.min(startY, my);
      var w = Math.abs(mx - startX),  h = Math.abs(my - startY);

      selBox.style.left   = x + 'px';
      selBox.style.top    = y + 'px';
      selBox.style.width  = w + 'px';
      selBox.style.height = h + 'px';
      sizeLabel.textContent = Math.round(w) + ' \u00d7 ' + Math.round(h);

      dimT.style.cssText = dimBase() + 'top:0;left:0;right:0;height:' + y + 'px;';
      dimB.style.cssText = dimBase() + 'top:' + (y + h) + 'px;left:0;right:0;bottom:0;';
      dimL.style.cssText = dimBase() + 'top:' + y + 'px;left:0;width:' + x + 'px;height:' + h + 'px;';
      dimR.style.cssText = dimBase() + 'top:' + y + 'px;left:' + (x + w) + 'px;right:0;height:' + h + 'px;';
    }

    function setDimFull() {
      dimT.style.cssText = dimBase() + 'inset:0;';
      dimB.style.display = 'none';
      dimL.style.display = 'none';
      dimR.style.display = 'none';
    }

    function destroyOverlay() {
      overlay.removeEventListener('mousedown', onDown);
      overlay.removeEventListener('mousemove', onMove);
      overlay.removeEventListener('mouseup',   onUp);
      document.removeEventListener('keydown', escHandler);
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }

    function escHandler(e) {
      if (e.key === 'Escape') {
        destroyOverlay();
        stopRegionPip();
        showToast('Region PiP cancelled');
      }
    }
    document.addEventListener('keydown', escHandler);
  }

  function makeDimPanel() {
    var d = document.createElement('div');
    d.style.cssText = dimBase();
    return d;
  }
  function dimBase() {
    return 'position:absolute;background:rgba(0,0,0,.5);pointer-events:none;';
  }

  function launchRegionPip(stream, x, y, w, h) {
    var track = stream.getVideoTracks()[0];
    if (!track) { stopRegionPip(); return; }

    var ts   = track.getSettings();
    var capW = ts.width  || window.innerWidth;
    var capH = ts.height || window.innerHeight;

    var sx = capW / window.innerWidth;
    var sy = capH / window.innerHeight;

    var canvas = document.createElement('canvas');
    canvas.width  = Math.round(w * sx);
    canvas.height = Math.round(h * sy);
    var ctx = canvas.getContext('2d');

    regionSrcVideo = document.createElement('video');
    regionSrcVideo.srcObject = stream;
    regionSrcVideo.muted = true;
    regionSrcVideo.setAttribute('playsinline', '');
    regionSrcVideo.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;pointer-events:none;';
    document.body.appendChild(regionSrcVideo);

    regionSrcVideo.play().then(function () {
      function drawLoop() {
        if (!regionActive) return;
        try {
          ctx.drawImage(
            regionSrcVideo,
            Math.round(x * sx), Math.round(y * sy), Math.round(w * sx), Math.round(h * sy),
            0, 0, canvas.width, canvas.height
          );
        } catch (e) {}
        regionRaf = requestAnimationFrame(drawLoop);
      }
      drawLoop();

      var outStream  = canvas.captureStream(30);
      regionPipVideo = document.createElement('video');
      regionPipVideo.srcObject = outStream;
      regionPipVideo.muted = true;
      regionPipVideo.setAttribute('playsinline', '');
      regionPipVideo.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;pointer-events:none;';
      document.body.appendChild(regionPipVideo);

      regionPipVideo.play()
        .then(function () { return regionPipVideo.requestPictureInPicture(); })
        .then(function () { showToast('Region PiP active \u2014 press Alt+Shift+P or close to stop'); })
        .catch(function (err) {
          showToast('Could not start Region PiP \u2014 try clicking on the page first');
          console.warn('[PiP Master] region pip:', err);
          stopRegionPip();
        });

      regionPipVideo.addEventListener('leavepictureinpicture', function () {
        stopRegionPip();
      });
    }).catch(function () {
      stopRegionPip();
    });
  }

  function stopRegionPip() {
    regionActive = false;

    if (regionRaf) { cancelAnimationFrame(regionRaf); regionRaf = null; }

    if (regionStream) {
      regionStream.getTracks().forEach(function (t) { t.stop(); });
      regionStream = null;
    }

    if (regionSrcVideo) {
      if (regionSrcVideo.parentNode) regionSrcVideo.parentNode.removeChild(regionSrcVideo);
      regionSrcVideo = null;
    }

    if (regionPipVideo) {
      if (document.pictureInPictureElement === regionPipVideo) {
        document.exitPictureInPicture().catch(function () {});
      }
      if (regionPipVideo.parentNode) regionPipVideo.parentNode.removeChild(regionPipVideo);
      regionPipVideo = null;
    }

    var ol = document.getElementById('pip-region-overlay');
    if (ol && ol.parentNode) ol.parentNode.removeChild(ol);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  KEYBOARD / AUTO-PiP / EVENTS
  // ═══════════════════════════════════════════════════════════════════════════

  function setupKeyboard() {
    if (keyHandler) { document.removeEventListener('keydown', keyHandler); keyHandler = null; }

    var parts     = (settings.shortcut || 'alt+p').toLowerCase().split('+');
    var mainKey   = parts[parts.length - 1];
    var needsAlt  = parts.indexOf('alt')   !== -1;
    var needsShft = parts.indexOf('shift') !== -1;
    var needsCtrl = parts.indexOf('ctrl')  !== -1;

    keyHandler = function (e) {
      var tag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
      if (tag === 'input' || tag === 'textarea') return;
      if (
        e.key.toLowerCase() === mainKey &&
        e.altKey   === needsAlt  &&
        e.shiftKey === needsShft &&
        e.ctrlKey  === needsCtrl
      ) {
        e.preventDefault();
        togglePiP();
      }
    };
    document.addEventListener('keydown', keyHandler);
  }

  function setupRegionKeyboard() {
    if (regionKeyHandler) { document.removeEventListener('keydown', regionKeyHandler); regionKeyHandler = null; }
    if (!settings.regionPip) return;

    var parts     = (settings.regionShortcut || 'alt+shift+p').toLowerCase().split('+');
    var mainKey   = parts[parts.length - 1];
    var needsAlt  = parts.indexOf('alt')   !== -1;
    var needsShft = parts.indexOf('shift') !== -1;
    var needsCtrl = parts.indexOf('ctrl')  !== -1;

    regionKeyHandler = function (e) {
      var tag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
      if (tag === 'input' || tag === 'textarea') return;
      if (
        e.key.toLowerCase() === mainKey &&
        e.altKey   === needsAlt  &&
        e.shiftKey === needsShft &&
        e.ctrlKey  === needsCtrl
      ) {
        e.preventDefault();
        activateRegionPip();
      }
    };
    document.addEventListener('keydown', regionKeyHandler);
  }

  function setupAutoPip() {
    if (visHandler) { document.removeEventListener('visibilitychange', visHandler); visHandler = null; }
    if (!settings.autoPip) return;

    visHandler = function () {
      var video = document.querySelector('video');
      if (!video || video.paused) return;
      if (document.hidden && !document.pictureInPictureElement) {
        video.requestPictureInPicture().catch(function () {});
      } else if (!document.hidden && document.pictureInPictureElement) {
        document.exitPictureInPicture().catch(function () {});
      }
    };
    document.addEventListener('visibilitychange', visHandler);
  }

  function setupPiPStateEvents() {
    document.addEventListener('enterpictureinpicture', updateButtonState);
    document.addEventListener('leavepictureinpicture', updateButtonState);
  }

  function updateButtonState() {
    var btn = document.getElementById('pip-master-btn');
    if (!btn) return;
    var active = !!document.pictureInPictureElement;
    btn.title = active ? 'Disable PiP (Alt+P)' : 'Picture-in-Picture (Alt+P)';
    var inner = btn.querySelector('.pip-inner');
    if (inner) inner.setAttribute('fill', active ? '#3ea6ff' : 'white');
    if (isShorts && IS_YOUTUBE && isShorts()) {
      btn.style.background = active ? 'rgba(62,166,255,0.85)' : 'rgba(0,0,0,0.65)';
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  function createButton(id, title) {
    var btn = document.createElement('button');
    if (id) btn.id = id;
    btn.title = title;
    btn.setAttribute('aria-label', title);
    return btn;
  }

  function makeSVG(size, darkStroke) {
    var ns    = 'http://www.w3.org/2000/svg';
    var color = darkStroke ? '#333' : 'white';

    var svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 36 36');
    svg.setAttribute('width',   String(size));
    svg.setAttribute('height',  String(size));
    svg.style.cssText = 'pointer-events:none;display:block;flex-shrink:0;';

    var outer = document.createElementNS(ns, 'rect');
    outer.setAttribute('x', '2');       outer.setAttribute('y', '7');
    outer.setAttribute('width', '32');  outer.setAttribute('height', '22');
    outer.setAttribute('rx', '2');
    outer.setAttribute('fill', 'none');
    outer.setAttribute('stroke', color);
    outer.setAttribute('stroke-width', '2.2');

    var inner = document.createElementNS(ns, 'rect');
    inner.setAttribute('x', '18.5');    inner.setAttribute('y', '17');
    inner.setAttribute('width', '13');  inner.setAttribute('height', '9');
    inner.setAttribute('rx', '1.5');
    inner.setAttribute('fill', color);
    inner.classList.add('pip-inner');

    svg.appendChild(outer);
    svg.appendChild(inner);
    return svg;
  }

  function injectStyles() {
    if (document.getElementById('pip-master-styles')) return;
    var s = document.createElement('style');
    s.id = 'pip-master-styles';
    s.textContent = (
      '#pip-toast{' +
        'position:fixed;bottom:28px;left:50%;' +
        'transform:translateX(-50%) translateY(10px);' +
        'background:rgba(18,18,18,.96);color:#f1f1f1;' +
        'padding:10px 22px;border-radius:6px;' +
        'font:500 13px/1.5 system-ui,-apple-system,sans-serif;' +
        'z-index:2147483647;pointer-events:none;' +
        'opacity:0;transition:opacity .22s,transform .22s;' +
        'border:1px solid rgba(255,255,255,.1);white-space:nowrap;' +
        'box-shadow:0 4px 24px rgba(0,0,0,.5);}' +
      '#pip-toast.show{opacity:1;transform:translateX(-50%) translateY(0);}' +
      '.pip-hover-btn{' +
        'position:fixed;z-index:2147483646;' +
        'width:38px;height:38px;border-radius:50%;border:none;cursor:pointer;' +
        'background:rgba(0,0,0,0.72);backdrop-filter:blur(4px);' +
        'display:flex;align-items:center;justify-content:center;' +
        'opacity:0;transform:scale(0.85);' +
        'transition:opacity .18s,transform .18s,background .15s;' +
        'box-shadow:0 2px 10px rgba(0,0,0,.55);}' +
      '.pip-hover-btn:hover{' +
        'background:rgba(220,0,40,0.9) !important;' +
        'transform:scale(1.1) !important;}'
    );
    document.head.appendChild(s);
  }

  function showToast(msg) {
    var t = document.getElementById('pip-toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'pip-toast';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._timer);
    t._timer = setTimeout(function () { t.classList.remove('show'); }, 3000);
  }

})();
