# 🎬 YouTube PiP Master

> Extension Chrome qui ajoute un bouton **Picture-in-Picture** natif directement dans le lecteur YouTube — vidéos classiques et Shorts.

![Version](https://img.shields.io/badge/version-1.0.0-red?style=flat-square)
![Manifest](https://img.shields.io/badge/Manifest-V3-blue?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)
![Platform](https://img.shields.io/badge/Chrome-Extension-yellow?style=flat-square&logo=googlechrome)

---

## ✨ Fonctionnalités

- 🖼️ **Bouton intégré** directement dans la barre de contrôle YouTube
- 📱 **Compatible Shorts** — bouton flottant dédié
- ⌨️ **Raccourci clavier** configurable (défaut : `Alt + P`)
- 🔄 **Auto-PiP** — bascule automatiquement quand vous changez d'onglet
- 🧭 **Navigation SPA** — le bouton reste présent quand vous changez de vidéo sans recharger
- 🎨 **Design natif** — s'intègre au style officiel de YouTube
- ⚡ **Zéro latence** — aucun impact sur le chargement des vidéos

---

## 🚀 Installation

### Méthode 1 — Via le code source

```bash
git clone https://github.com/anonyme-afk/Youtube-pip-master.git
```

1. Ouvrir **Chrome** → `chrome://extensions/`
2. Activer le **Mode développeur** (en haut à droite)
3. Cliquer sur **"Charger l'extension décompressée"**
4. Sélectionner le dossier `Youtube-pip-master`

### Méthode 2 — Télécharger le ZIP

1. **Code → Download ZIP** sur cette page
2. Extraire le ZIP
3. Suivre les étapes 1 à 4 ci-dessus

---

## ⚙️ Configuration

Cliquer sur l'icône de l'extension dans Chrome pour accéder aux paramètres :

| Option | Description | Défaut |
|---|---|---|
| **Auto-PiP** | Active PiP automatiquement au changement d'onglet | Désactivé |
| **Raccourci clavier** | Combinaison personnalisable | `Alt + P` |

---

## 📁 Structure du projet

```
Youtube-pip-master/
├── manifest.json        # Config Manifest V3
├── content_script.js    # Injection bouton + logique PiP
├── options.html         # Interface paramètres
├── options.js           # Logique paramètres
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

---

## 🛠️ Comment ça marche

```
YouTube (SPA)
    │
    ▼
MutationObserver détecte le lecteur prêt
    │
    ├── Vidéo classique → bouton dans .ytp-right-controls
    └── Shorts          → bouton flottant (bas à droite)
                               │
                               ▼
                    video.requestPictureInPicture()
```

**Technologies :** Manifest V3 · PiP API · MutationObserver · Page Visibility API · chrome.storage.sync

---

## ⚠️ Compatibilité

| Navigateur | Support |
|---|---|
| Chrome 88+ | ✅ |
| Edge 88+ | ✅ (même moteur Chromium) |
| Firefox | ❌ |
| Safari | ❌ |

---

## 📜 Licence

MIT — libre d'utilisation, modification et distribution.

---

<p align="center">Fait avec ❤️ par <a href="https://github.com/anonyme-afk">anonyme-afk</a></p>
