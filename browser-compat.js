/**
 * browser-compat.js
 * ------------------
 * Compatibility shim between Chrome (chrome.*) and Firefox (browser.*).
 * Exposes a unified `api` variable used throughout the extension.
 * Must be loaded before any other extension script.
 */
var api = (function () {
  if (typeof browser !== 'undefined' && browser.storage) return browser;
  if (typeof chrome  !== 'undefined' && chrome.storage)  return chrome;
  throw new Error('[PiP Everywhere] No WebExtension API found.');
}());
