# Battleships // Radar Ops

Single-player Battleships vs. an AI commander. Pure static HTML/CSS/JS — no build step, no dependencies.

Run locally: `python3 -m http.server -d battleships 8000` and open http://localhost:8000 (or just open `index.html`).

- Settings: grid size 6–14, fleet presets (Classic / Skirmish / Armada) or custom per-length counts, 3 AI levels (random / hunt-target / probability-density).
- Placement: drag-and-drop (mouse + touch), tap to select, tap again or **Rotate** to rotate, **Randomize**, **Clear**.
- Battle: hit/miss/sink animations, synthesized WebAudio sound effects (toggle in header), fleet trackers, end-of-game stats.
