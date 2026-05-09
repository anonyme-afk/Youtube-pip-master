/**
 * YouTube PiP Master — content_script.js v4
 */

(function () {
  'use strict';

  let settings      = { autoPip: false, shortcut: 'alt+p' };
  let keyHandler    = null;
  let visHandler    = null;
  let mainObserver  = null;
  let debounceId    = null;
  let retryInterval = null;
  let lastUrl       = location.href;

  // ── Démarrage ─────────────────────────────────────────────────────────────
  chrome.storage.sync.get({ autoPip: false, shortcut: 'alt+p' }, (data) => {
    settings = data;
    bootstrap();
  });

  chrome.storage.onChanged.addListener((changes) => {
    if (changes.autoPip  !== undefined) settings.autoPip  = changes.autoPip.newValue;
    if (changes.shortcut !== undefined) settings.shortcut = changes.shortcut.newValue;
    setupKeyboard();
    setupAutoPip();
  });

  function bootstrap() {
    setupKeyboard();
    setupAutoPip();
    setupPiPEvents();
    setupObserver();
    startRetry();
  }

  // ── Détection Shorts ───────────────────────────────────────────────────────
  function isShorts() {
    return location.pathname.startsWith('/shorts/');
  }

  // ── Retry d'injection ──────────────────────────────────────────────────────
  function startRetry() {
    stopRetry();
    let attempts = 0;
    retryInterval = setInterval(() => {
      attempts++;
      if (injectButton() || attempts > 40) stopRetry();
    }, 500);
  }

  function stopRetry() {
    if (retryInterval) { clearInterval(retryInterval); retryInterval = null; }
  }

  // ── Injection principale ───────────────────────────────────────────────────
  function injectButton() {
    if (document.getElementById('pip-master-btn')) return true;
    return isShorts() ? injectShortsButton() : injectPlayerButton();
  }

  // ── Bouton barre de contrôle (vidéos normales) ─────────────────────────────
  function injectPlayerButton() {
    const controls = document.querySelector('.ytp-right-controls');
    if (!controls) return false;

    const btn = makeBtn();
    btn.className = 'ytp-button pip-master-btn';
    btn.style.cssText = `
      width:48px; height:100%;
      display:inline-flex; align-items:center; justify-content:center;
      opacity:0.9; cursor:pointer;
      transition:opacity .15s,transform .12s;
      padding:0; background:none; border:none;
    `;
    btn.innerHTML = svgIcon(22);

    btn.addEventListener('mouseenter', () => { btn.style.opacity='1'; btn.style.transform='scale(1.1)'; });
    btn.addEventListener('mouseleave', () => { btn.style.opacity='0.9'; btn.style.transform='scale(1)'; });
    btn.addEventListener('click', (e) => { e.stopPropagation(); togglePiP(); });

    // Insérer avant le premier bouton trouvé parmi ces candidats
    const candidates = ['.ytp-size-button', '.ytp-fullscreen-button', '.ytp-pip-button'];
    let inserted = false;
    for (const sel of candidates) {
      const anchor = controls.querySelector(sel);
      if (anchor && anchor.parentNode === controls) {
        controls.insertBefore(btn, anchor);
        inserted = true;
        break;
      }
    }
    if (!inserted) controls.appendChild(btn);
    return true;
  }

  // ── Bouton flottant (Shorts) ───────────────────────────────────────────────
  function injectShortsButton() {
    // Les Shorts n'ont pas de barre .ytp-right-controls exploitable
    // On vérifie juste que le player Shorts est présent
    const shortsPlayer = document.querySelector('ytd-shorts, #shorts-container, ytd-reel-video-renderer');
    if (!shortsPlayer) return false;

    const btn = makeBtn();
    btn.style.cssText = `
      position:fixed;
      bottom:88px; right:16px;
      z-index:99999;
      width:44px; height:44px;
      background:rgba(0,0,0,0.6);
      backdrop-filter:blur(6px);
      border-radius:50%;
      display:flex; align-items:center; justify-content:center;
      cursor:pointer;
      border:1.5px solid rgba(255,255,255,0.2);
      transition:background .15s,transform .12s,border-color .15s;
      box-shadow:0 2px 12px rgba(0,0,0,.4);
    `;
    btn.innerHTML = svgIcon(20);

    btn.addEventListener('mouseenter', () => {
      btn.style.background = 'rgba(255,0,51,0.85)';
      btn.style.transform = 'scale(1.08)';
      btn.style.borderColor = 'transparent';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.background = 'rgba(0,0,0,0.6)';
      btn.style.transform = 'scale(1)';
      btn.style.borderColor = 'rgba(255,255,255,0.2)';
    });
    btn.addEventListener('click', (e) => { e.stopPropagation(); togglePiP(); });

    document.body.appendChild(btn);
    return true;
  }

  function makeBtn() {
    const btn = document.createElement('button');
    btn.id = 'pip-master-btn';
    btn.title = 'Picture-in-Picture (Alt+P)';
    btn.setAttribute('aria-label', 'Picture-in-Picture');
    return btn;
  }

  function svgIcon(size) {
    return `<svg viewBox="0 0 36 36" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg" style="pointer-events:none;display:block">
      <rect x="2" y="7" width="32" height="22" rx="2" fill="none" stroke="white" stroke-width="2"/>
      <rect id="pip-inner-rect" x="18.5" y="17" width="13" height="9" rx="1.5" fill="white"/>
    </svg>`;
  }

  // ── Toggle PiP ─────────────────────────────────────────────────────────────
  async function togglePiP() {
    const video = document.querySelector('video');
    if (!video) { showToast('❌ Aucune vidéo trouvée'); return; }
    if (!document.pictureInPictureEnabled) { showToast('❌ PiP non supporté par ce navigateur'); return; }
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        showToast('⏹ PiP désactivé');
      } else {
        await video.requestPictureInPicture();
        showToast('▶ PiP activé');
      }
    } catch (err) {
      showToast('❌ Cliquez d\'abord sur la vidéo puis réessayez');
      console.warn('[PiP Master]', err.message);
    }
  }

  // ── Raccourci clavier ──────────────────────────────────────────────────────
  function setupKeyboard() {
    if (keyHandler) { document.removeEventListener('keydown', keyHandler); keyHandler = null; }
    const parts   = (settings.shortcut || 'alt+p').toLowerCase().split('+');
    const mainKey = parts[parts.length - 1];
    const needsAlt = parts.includes('alt'), needsShift = parts.includes('shift'), needsCtrl = parts.includes('ctrl');

    keyHandler = (e) => {
      const tag = document.activeElement?.tagName?.toLowerCase();
      if (['input','textarea','search'].includes(tag)) return;
      if (e.key.toLowerCase()===mainKey && e.altKey===needsAlt && e.shiftKey===needsShift && e.ctrlKey===needsCtrl) {
        e.preventDefault(); togglePiP();
      }
    };
    document.addEventListener('keydown', keyHandler);
  }

  // ── Auto-PiP ───────────────────────────────────────────────────────────────
  function setupAutoPip() {
    if (visHandler) { document.removeEventListener('visibilitychange', visHandler); visHandler = null; }
    if (!settings.autoPip) return;
    visHandler = async () => {
      const video = document.querySelector('video');
      if (!video || video.paused) return;
      try {
        if (document.hidden && !document.pictureInPictureElement) await video.requestPictureInPicture();
        else if (!document.hidden && document.pictureInPictureElement) await document.exitPictureInPicture();
      } catch (e) {}
    };
    document.addEventListener('visibilitychange', visHandler);
  }

  // ── Mise à jour visuelle ───────────────────────────────────────────────────
  function setupPiPEvents() {
    document.addEventListener('enterpictureinpicture', updateBtnState);
    document.addEventListener('leavepictureinpicture', updateBtnState);
  }

  function updateBtnState() {
    const btn = document.getElementById('pip-master-btn');
    if (!btn) return;
    const active = !!document.pictureInPictureElement;
    btn.title = active ? 'Désactiver PiP (Alt+P)' : 'Picture-in-Picture (Alt+P)';
    const innerRect = btn.querySelector('#pip-inner-rect');
    if (innerRect) innerRect.setAttribute('fill', active ? '#3ea6ff' : 'white');
    if (isShorts()) btn.style.background = active ? 'rgba(62,166,255,0.85)' : 'rgba(0,0,0,0.6)';
  }

  // ── MutationObserver ───────────────────────────────────────────────────────
  function setupObserver() {
    if (mainObserver) mainObserver.disconnect();
    mainObserver = new MutationObserver(() => {
      const newUrl = location.href;
      if (newUrl !== lastUrl) {
        lastUrl = newUrl;
        document.getElementById('pip-master-btn')?.remove();
        stopRetry();
        startRetry();
        return;
      }
      clearTimeout(debounceId);
      debounceId = setTimeout(() => {
        if (!document.getElementById('pip-master-btn')) startRetry();
        else updateBtnState();
      }, 400);
    });
    mainObserver.observe(document.documentElement, { childList: true, subtree: true });
  }

  // ── Toast ──────────────────────────────────────────────────────────────────
  function showToast(msg) {
    if (!document.getElementById('pip-style')) {
      const s = document.createElement('style');
      s.id = 'pip-style';
      s.textContent = `
        #pip-toast{position:fixed;bottom:28px;left:50%;transform:translateX(-50%) translateY(8px);
        background:rgba(22,22,22,.93);color:#fff;padding:10px 22px;border-radius:6px;
        font:500 13px/1.4 system-ui,sans-serif;z-index:2147483647;pointer-events:none;
        opacity:0;transition:opacity .25s,transform .25s;border:1px solid rgba(255,255,255,.08);
        white-space:nowrap;box-shadow:0 4px 20px rgba(0,0,0,.45);}
        #pip-toast.on{opacity:1;transform:translateX(-50%) translateY(0);}
      `;
      document.head.appendChild(s);
    }
    let t = document.getElementById('pip-toast');
    if (!t) { t = document.createElement('div'); t.id = 'pip-toast'; document.body.appendChild(t); }
    t.textContent = msg;
    t.classList.add('on');
    clearTimeout(t._h);
    t._h = setTimeout(() => t.classList.remove('on'), 3000);
  }

})();
