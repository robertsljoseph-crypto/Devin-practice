# Battleships // Radar Ops

Battleships vs. an AI commander or a friend online. Pure static HTML/CSS/JS — no build step, no server (online play is peer-to-peer WebRTC via PeerJS's public signaling).

Run locally: `python3 -m http.server -d battleships 8000` and open http://localhost:8000 (or just open `index.html`).

- Settings: grid size 6–14, fleet presets (Classic / Skirmish / Armada) or custom per-length counts, 3 AI levels (random / hunt-target / probability-density).
- Placement: drag-and-drop (mouse + touch), tap to select, tap again or **Rotate** to rotate, **Randomize**, **Clear**.
- Battle: hit/miss/sink animations, synthesized WebAudio sound effects (toggle in header), fleet trackers, end-of-game stats, adjustable pace.
- Online: host creates a room and shares the link/4-letter code; the friend opens it and both deploy. Host picks grid and fleet.
- Themes: Radar green / Amber CRT / Daylight (header button or settings, remembered).
- Help: **? HELP** opens a beginner's guide; difficulty meter explains Cadet / Captain / Admiral.
- PWA: installable (Add to Home Screen), runs full-screen, cached for offline play vs. the AI (`manifest.webmanifest`, `sw.js`).
