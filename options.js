/**
 * YouTube PiP Master — options.js
 * Gestion de la page de paramètres
 */

(function () {
  'use strict';

  const DEFAULTS = { autoPip: false, shortcut: 'alt+p' };

  // ── Éléments DOM ──────────────────────────────────────────────────────────
  const autoPipToggle    = document.getElementById('auto-pip-toggle');
  const shortcutDisplay  = document.getElementById('shortcut-display');
  const shortcutRow      = document.getElementById('shortcut-row');
  const shortcutCapture  = document.getElementById('shortcut-capture');
  const shortcutField    = document.getElementById('shortcut-field');
  const btnSave          = document.getElementById('btn-save');
  const btnReset         = document.getElementById('btn-reset');
  const saveToast        = document.getElementById('save-toast');

  let currentSettings = { ...DEFAULTS };
  let capturingShortcut = false;

  // ── Chargement initial ────────────────────────────────────────────────────
  chrome.storage.sync.get(DEFAULTS, (data) => {
    currentSettings = data;
    renderSettings();
  });

  // ── Rendu ─────────────────────────────────────────────────────────────────
  function renderSettings() {
    autoPipToggle.checked = currentSettings.autoPip;
    renderShortcutBadge(currentSettings.shortcut);
  }

  function renderShortcutBadge(shortcut) {
    const parts = shortcut.toUpperCase().split('+');
    shortcutDisplay.innerHTML = parts
      .map((k, i) =>
        `<span class="key-badge">${k}</span>${i < parts.length - 1 ? '<span class="shortcut-sep">+</span>' : ''}`
      )
      .join('');
  }

  // ── Capture raccourci ─────────────────────────────────────────────────────
  shortcutRow.addEventListener('click', () => {
    capturingShortcut = !capturingShortcut;
    shortcutCapture.classList.toggle('active', capturingShortcut);
    if (capturingShortcut) {
      shortcutField.value = '';
      shortcutField.placeholder = 'Appuyez sur votre combinaison…';
      shortcutField.focus();
    }
  });

  shortcutField.addEventListener('keydown', (e) => {
    e.preventDefault();

    const parts = [];
    if (e.ctrlKey)  parts.push('ctrl');
    if (e.altKey)   parts.push('alt');
    if (e.shiftKey) parts.push('shift');

    const key = e.key.toLowerCase();
    // Ignorer les modificateurs seuls
    if (['control','alt','shift','meta'].includes(key)) return;

    parts.push(key);

    if (parts.length < 2) {
      shortcutField.value = '';
      shortcutField.placeholder = 'Ajoutez Ctrl, Alt ou Shift…';
      return;
    }

    const shortcut = parts.join('+');
    currentSettings.shortcut = shortcut;
    renderShortcutBadge(shortcut);
    shortcutField.value = shortcut.toUpperCase().replace(/\+/g, ' + ');

    // Fermer après 600ms
    setTimeout(() => {
      capturingShortcut = false;
      shortcutCapture.classList.remove('active');
    }, 600);
  });

  // ── Auto-PiP toggle ───────────────────────────────────────────────────────
  autoPipToggle.addEventListener('change', () => {
    currentSettings.autoPip = autoPipToggle.checked;
  });

  // ── Sauvegarde ────────────────────────────────────────────────────────────
  btnSave.addEventListener('click', () => {
    chrome.storage.sync.set(currentSettings, () => {
      showToast();
    });
  });

  // ── Réinitialisation ──────────────────────────────────────────────────────
  btnReset.addEventListener('click', () => {
    currentSettings = { ...DEFAULTS };
    renderSettings();
    chrome.storage.sync.set(currentSettings);
    showToast('↺ Réinitialisation effectuée');
  });

  // ── Toast ─────────────────────────────────────────────────────────────────
  function showToast(msg) {
    saveToast.textContent = msg || '✓ Paramètres sauvegardés';
    saveToast.classList.add('show');
    clearTimeout(saveToast._t);
    saveToast._t = setTimeout(() => saveToast.classList.remove('show'), 2400);
  }

})();
