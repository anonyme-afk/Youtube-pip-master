(function () {
  'use strict';

  var DEFAULTS = {
    autoPip:        false,
    shortcut:       'alt+p',
    autoSkipAd:     true,
    reenterPip:     true,
    regionPip:      true,
    regionShortcut: 'alt+shift+p'
  };

  var els = {
    autoPip:         document.getElementById('auto-pip-toggle'),
    autoSkip:        document.getElementById('auto-skip-toggle'),
    reenter:         document.getElementById('reenter-pip-toggle'),
    display:         document.getElementById('shortcut-display'),
    row:             document.getElementById('shortcut-row'),
    capture:         document.getElementById('shortcut-capture'),
    field:           document.getElementById('shortcut-field'),
    regionPip:       document.getElementById('region-pip-toggle'),
    regionDisplay:   document.getElementById('region-shortcut-display'),
    regionRow:       document.getElementById('region-shortcut-row'),
    regionCapture:   document.getElementById('region-shortcut-capture'),
    regionField:     document.getElementById('region-shortcut-field'),
    save:            document.getElementById('btn-save'),
    reset:           document.getElementById('btn-reset'),
    toast:           document.getElementById('save-toast')
  };

  var cur = Object.assign({}, DEFAULTS);
  var capturingMain   = false;
  var capturingRegion = false;

  api.storage.sync.get(DEFAULTS, function (data) { cur = data; render(); });

  function render() {
    els.autoPip.checked   = cur.autoPip;
    els.autoSkip.checked  = cur.autoSkipAd;
    els.reenter.checked   = cur.reenterPip;
    els.regionPip.checked = cur.regionPip;
    renderBadge(els.display,       cur.shortcut);
    renderBadge(els.regionDisplay, cur.regionShortcut);
  }

  function renderBadge(container, shortcut) {
    while (container.firstChild) container.removeChild(container.firstChild);
    var parts = (shortcut || '').toUpperCase().split('+');
    parts.forEach(function (k, i) {
      var b = document.createElement('span');
      b.className = 'key-badge'; b.textContent = k;
      container.appendChild(b);
      if (i < parts.length - 1) {
        var sep = document.createElement('span');
        sep.className = 'shortcut-sep'; sep.textContent = '+';
        container.appendChild(sep);
      }
    });
  }

  els.row.addEventListener('click', function () {
    capturingMain = !capturingMain;
    els.capture.classList.toggle('active', capturingMain);
    if (capturingMain) { els.field.value = ''; els.field.focus(); }
  });

  els.field.addEventListener('keydown', function (e) {
    e.preventDefault();
    var parts = [];
    if (e.ctrlKey)  parts.push('ctrl');
    if (e.altKey)   parts.push('alt');
    if (e.shiftKey) parts.push('shift');
    var key = e.key.toLowerCase();
    if (['control','alt','shift','meta'].includes(key)) return;
    parts.push(key);
    if (parts.length < 2) { els.field.placeholder = 'Add Ctrl, Alt or Shift...'; return; }
    var sc = parts.join('+');
    cur.shortcut = sc;
    renderBadge(els.display, sc);
    els.field.value = sc.toUpperCase().replace(/\+/g, ' + ');
    setTimeout(function () { capturingMain = false; els.capture.classList.remove('active'); }, 600);
  });

  els.regionRow.addEventListener('click', function () {
    capturingRegion = !capturingRegion;
    els.regionCapture.classList.toggle('active', capturingRegion);
    if (capturingRegion) { els.regionField.value = ''; els.regionField.focus(); }
  });

  els.regionField.addEventListener('keydown', function (e) {
    e.preventDefault();
    var parts = [];
    if (e.ctrlKey)  parts.push('ctrl');
    if (e.altKey)   parts.push('alt');
    if (e.shiftKey) parts.push('shift');
    var key = e.key.toLowerCase();
    if (['control','alt','shift','meta'].includes(key)) return;
    parts.push(key);
    if (parts.length < 2) { els.regionField.placeholder = 'Add Ctrl, Alt or Shift...'; return; }
    var sc = parts.join('+');
    cur.regionShortcut = sc;
    renderBadge(els.regionDisplay, sc);
    els.regionField.value = sc.toUpperCase().replace(/\+/g, ' + ');
    setTimeout(function () { capturingRegion = false; els.regionCapture.classList.remove('active'); }, 600);
  });

  els.autoPip.addEventListener('change',   function () { cur.autoPip      = els.autoPip.checked; });
  els.autoSkip.addEventListener('change',  function () { cur.autoSkipAd   = els.autoSkip.checked; });
  els.reenter.addEventListener('change',   function () { cur.reenterPip   = els.reenter.checked; });
  els.regionPip.addEventListener('change', function () { cur.regionPip    = els.regionPip.checked; });

  els.save.addEventListener('click', function () {
    api.storage.sync.set(cur, function () { showToast('Settings saved'); });
  });
  els.reset.addEventListener('click', function () {
    cur = Object.assign({}, DEFAULTS); render();
    api.storage.sync.set(cur); showToast('Reset to defaults');
  });

  function showToast(msg) {
    els.toast.textContent = msg;
    els.toast.classList.add('show');
    clearTimeout(els.toast._t);
    els.toast._t = setTimeout(function () { els.toast.classList.remove('show'); }, 2200);
  }
})();
