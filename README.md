# Sovereign Loyalty — The Greatest Loyalty Card

> The Sovereign Retention Engine. Works on any phone — iPhone, Android, doesn't matter.

## Quick Start (60 seconds)

### Option 1: Open in Browser (Easiest)

**→ [LIVE DEMO](https://intellimira.github.io/sovereign-loyalty/) ←**

Open that link on your phone. That's it. Tap "Add to Home Screen" to install it as an app.

### Option 2: Run Locally

```bash
git clone https://github.com/intellimira/sovereign-loyalty.git
cd sovereign-loyalty
python3 serve.py
```

Then open the URL shown in your terminal on your phone (same WiFi).

---

## What You're Looking At

| Tab | What It Does |
|-----|-------------|
| 💳 **Pass** | Customer loyalty card — QR code, tier badge, stamps, secret rewards |
| 📡 **Door** | Staff scanner — award stamps, camera QR scan, haptic feedback |
| 🍺 **Staff** | Vibe profiles — drink prefs, visit patterns, reward redemption |
| 📊 **CRM** | Merchant dashboard — KPIs, live feed, AI tactical advisory |

## Features

- **Works offline** — no internet needed after first load
- **Installable** — "Add to Home Screen" on iPhone & Android
- **No account needed** — demo data pre-loaded
- **Camera QR scan** — uses device camera
- **Haptic feedback** — phone vibrates on stamp award
- **Full loyalty engine** — tiers, stamps, rewards, analytics
- **IntelliGrow AI** — smart recommendations based on your data

## Tech Stack

- Pure HTML/CSS/JavaScript — no frameworks, no build step
- localStorage for data — no server required
- Service Worker for offline support
- PWA manifest for home screen install
- ADS v1.0 (Antigravity Design System)

## File Structure

```
├── index.html      ← The entire app (single page)
├── engine.js       ← Loyalty engine (tiers, stamps, rewards)
├── sw.js           ← Service worker (offline support)
├── manifest.json   ← PWA manifest (installable)
├── serve.py        ← Python demo server
└── icons/          ← PWA icons
```

## The Demo Flow

1. **Pass** — See a customer's loyalty card. Switch members with the dropdown.
2. **Door** — Award a stamp. Feel the vibration. Watch the stats update.
3. **Staff** — Look up a customer. See their drink prefs. Redeem a reward.
4. **CRM** — View live KPIs. Read the AI advisory. Check the activity feed.

Reset everything with the "↻ RESET DEMO DATA" button at the bottom of the CRM tab.

---

*Built by MIRA · Shadow Ops · Leeds, UK*
