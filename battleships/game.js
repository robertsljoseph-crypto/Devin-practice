(() => {
  "use strict";

  // ---------------------------------------------------------------- constants
  const SHIP_NAMES = { 5: "Carrier", 4: "Battleship", 3: "Cruiser", 2: "Destroyer", 1: "Patrol Boat" };
  const PRESETS = {
    classic: { 5: 1, 4: 1, 3: 2, 2: 1, 1: 0 },
    skirmish: { 5: 0, 4: 0, 3: 2, 2: 1, 1: 0 },
    armada: { 5: 1, 4: 2, 3: 2, 2: 2, 1: 2 },
  };
  const MAX_FILL = 0.4;
  const AI_DELAY = 750;
  const STORAGE_KEY = "battleships.settings.v1";

  // ---------------------------------------------------------------- helpers
  const $ = (sel) => document.querySelector(sel);
  const el = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  };
  const rnd = (n) => Math.floor(Math.random() * n);
  const key = (r, c) => r * 100 + c;
  const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

  // ---------------------------------------------------------------- sound
  const Sound = (() => {
    let ctx = null;
    let enabled = localStorage.getItem("battleships.sound") !== "off";
    const ac = () => {
      if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === "suspended") ctx.resume();
      return ctx;
    };
    const tone = (freq, dur, type = "square", vol = 0.08, slideTo = null) => {
      if (!enabled) return;
      const c = ac();
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, c.currentTime);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, c.currentTime + dur);
      g.gain.setValueAtTime(vol, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
      o.connect(g).connect(c.destination);
      o.start();
      o.stop(c.currentTime + dur);
    };
    const noise = (dur, vol = 0.2, lowpass = 800) => {
      if (!enabled) return;
      const c = ac();
      const buf = c.createBuffer(1, c.sampleRate * dur, c.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
      const src = c.createBufferSource();
      src.buffer = buf;
      const f = c.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.value = lowpass;
      const g = c.createGain();
      g.gain.value = vol;
      src.connect(f).connect(g).connect(c.destination);
      src.start();
    };
    return {
      get enabled() { return enabled; },
      toggle() {
        enabled = !enabled;
        localStorage.setItem("battleships.sound", enabled ? "on" : "off");
        if (enabled) this.click();
        return enabled;
      },
      click: () => tone(880, 0.05, "square", 0.04),
      place: () => tone(440, 0.08, "triangle", 0.06, 660),
      fire: () => tone(1200, 0.25, "sawtooth", 0.05, 200),
      miss: () => { tone(220, 0.2, "sine", 0.08, 110); noise(0.15, 0.05, 600); },
      hit: () => { noise(0.4, 0.3, 1200); tone(110, 0.3, "square", 0.1, 40); },
      sunk: () => { noise(0.8, 0.35, 500); [600, 500, 400, 300].forEach((f, i) => setTimeout(() => tone(f, 0.25, "square", 0.08), i * 120)); },
      win: () => [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.3, "triangle", 0.1), i * 150)),
      lose: () => [400, 350, 300, 200].forEach((f, i) => setTimeout(() => tone(f, 0.4, "sawtooth", 0.08), i * 220)),
    };
  })();

  // ---------------------------------------------------------------- fleet model
  class Ship {
    constructor(id, len) {
      this.id = id;
      this.len = len;
      this.name = SHIP_NAMES[len] || `Vessel-${len}`;
      this.row = -1;
      this.col = -1;
      this.horiz = true;
      this.placed = false;
      this.hits = 0;
    }
    cells(row = this.row, col = this.col, horiz = this.horiz) {
      const out = [];
      for (let i = 0; i < this.len; i++) out.push(horiz ? [row, col + i] : [row + i, col]);
      return out;
    }
    get sunk() { return this.hits >= this.len; }
  }

  class Board {
    constructor(n) {
      this.n = n;
      this.ships = [];
      this.occ = new Map(); // key -> ship
      this.shots = new Map(); // key -> "hit" | "miss"
    }
    inBounds(r, c) { return r >= 0 && c >= 0 && r < this.n && c < this.n; }
    canPlace(ship, row, col, horiz) {
      return ship.cells(row, col, horiz).every(([r, c]) => {
        if (!this.inBounds(r, c)) return false;
        const other = this.occ.get(key(r, c));
        return !other || other === ship;
      });
    }
    lift(ship) {
      if (!ship.placed) return;
      ship.cells().forEach(([r, c]) => this.occ.delete(key(r, c)));
      ship.placed = false;
    }
    place(ship, row, col, horiz) {
      this.lift(ship);
      if (!this.canPlace(ship, row, col, horiz)) return false;
      ship.row = row; ship.col = col; ship.horiz = horiz; ship.placed = true;
      ship.cells().forEach(([r, c]) => this.occ.set(key(r, c), ship));
      return true;
    }
    clear() { this.ships.forEach((s) => this.lift(s)); }
    randomize() {
      this.clear();
      const order = [...this.ships].sort((a, b) => b.len - a.len);
      for (let attempt = 0; attempt < 50; attempt++) {
        let ok = true;
        for (const s of order) {
          let placed = false;
          for (let t = 0; t < 200 && !placed; t++) {
            const horiz = Math.random() < 0.5;
            const r = rnd(horiz ? this.n : this.n - s.len + 1);
            const c = rnd(horiz ? this.n - s.len + 1 : this.n);
            placed = this.place(s, r, c, horiz);
          }
          if (!placed) { ok = false; break; }
        }
        if (ok) return true;
        this.clear();
      }
      return false;
    }
    get allPlaced() { return this.ships.every((s) => s.placed); }
    fire(r, c) {
      const k = key(r, c);
      if (this.shots.has(k)) return null;
      const ship = this.occ.get(k);
      if (ship) {
        ship.hits++;
        this.shots.set(k, "hit");
        return { result: ship.sunk ? "sunk" : "hit", ship };
      }
      this.shots.set(k, "miss");
      return { result: "miss", ship: null };
    }
    get remaining() { return this.ships.filter((s) => !s.sunk).length; }
    get allSunk() { return this.ships.every((s) => s.sunk); }
  }

  const buildShips = (fleet) => {
    const ships = [];
    let id = 0;
    [5, 4, 3, 2, 1].forEach((len) => { for (let i = 0; i < (fleet[len] || 0); i++) ships.push(new Ship(id++, len)); });
    return ships;
  };

  // ---------------------------------------------------------------- AI
  class AI {
    constructor(board, level, fleet) {
      this.board = board; // the player's board it fires at
      this.level = level;
      this.targets = []; // adjacent candidates around unsunk hits
      this.fleetLens = buildShips(fleet).map((s) => s.len);
      this.unsunkLens = [...this.fleetLens];
    }
    unshot() {
      const out = [];
      for (let r = 0; r < this.board.n; r++) for (let c = 0; c < this.board.n; c++) if (!this.board.shots.has(key(r, c))) out.push([r, c]);
      return out;
    }
    liveHits() {
      // hits belonging to ships not yet sunk
      const out = [];
      for (const [k, v] of this.board.shots) {
        if (v !== "hit") continue;
        const r = Math.floor(k / 100), c = k % 100;
        if (!this.board.occ.get(k).sunk) out.push([r, c]);
      }
      return out;
    }
    pick() {
      const live = this.liveHits();
      if (this.level === "easy") {
        const u = this.unshot();
        return u[rnd(u.length)];
      }
      if (this.level === "hard") return this.densityPick(live);
      // normal: hunt / target
      if (live.length) {
        const cand = this.adjacentCandidates(live);
        if (cand.length) return cand[rnd(cand.length)];
      }
      const minLen = Math.min(...this.unsunkLens, 2);
      let u = this.unshot();
      const parity = u.filter(([r, c]) => (r + c) % minLen === 0);
      if (parity.length) u = parity;
      return u[rnd(u.length)];
    }
    adjacentCandidates(live) {
      const b = this.board;
      const set = new Set(live.map(([r, c]) => key(r, c)));
      const lineCands = [];
      const cands = [];
      for (const [r, c] of live) {
        const horizLine = set.has(key(r, c - 1)) || set.has(key(r, c + 1));
        const vertLine = set.has(key(r - 1, c)) || set.has(key(r + 1, c));
        for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
          // walk along run of live hits then take first unshot cell
          let rr = r + dr, cc = c + dc;
          while (set.has(key(rr, cc))) { rr += dr; cc += dc; }
          if (!b.inBounds(rr, cc) || b.shots.has(key(rr, cc))) continue;
          const inLine = (dr === 0 && horizLine) || (dc === 0 && vertLine);
          (inLine ? lineCands : cands).push([rr, cc]);
        }
      }
      return lineCands.length ? lineCands : cands;
    }
    densityPick(live) {
      const b = this.board, n = b.n;
      const density = new Float64Array(n * n);
      const liveSet = new Set(live.map(([r, c]) => key(r, c)));
      const shotOk = (r, c) => { const s = b.shots.get(key(r, c)); return !s || (s === "hit" && liveSet.has(key(r, c))); };
      for (const len of this.unsunkLens) {
        for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) for (const horiz of [true, false]) {
          const cells = [];
          let ok = true, overlap = 0;
          for (let i = 0; i < len; i++) {
            const rr = horiz ? r : r + i, cc = horiz ? c + i : c;
            if (!b.inBounds(rr, cc) || !shotOk(rr, cc)) { ok = false; break; }
            if (liveSet.has(key(rr, cc))) overlap++;
            cells.push([rr, cc]);
          }
          if (!ok) continue;
          const w = live.length ? (overlap ? 1 + overlap * 25 : 0.05) : 1;
          for (const [rr, cc] of cells) if (!b.shots.has(key(rr, cc))) density[rr * n + cc] += w;
        }
      }
      let best = -1, picks = [];
      for (let i = 0; i < density.length; i++) {
        if (density[i] > best) { best = density[i]; picks = [i]; }
        else if (density[i] === best) picks.push(i);
      }
      if (best <= 0) { const u = this.unshot(); return u[rnd(u.length)]; }
      const i = picks[rnd(picks.length)];
      return [Math.floor(i / n), i % n];
    }
    notifySunk(len) {
      const i = this.unsunkLens.indexOf(len);
      if (i >= 0) this.unsunkLens.splice(i, 1);
    }
  }

  // ---------------------------------------------------------------- state
  const state = {
    settings: { n: 10, fleet: { ...PRESETS.classic }, preset: "classic", level: "normal" },
    player: null,
    enemy: null,
    ai: null,
    turn: "player",
    busy: false,
    over: false,
    stats: { shots: 0, hits: 0, enemyShots: 0, enemyHits: 0, started: 0 },
    selectedShip: null,
  };

  const screens = {
    show(id) {
      document.querySelectorAll(".screen").forEach((s) => s.classList.toggle("active", s.id === `screen-${id}`));
      window.scrollTo(0, 0);
    },
  };

  // ---------------------------------------------------------------- settings screen
  const loadSettings = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (saved && saved.n && saved.fleet) state.settings = { ...state.settings, ...saved };
    } catch (_) { /* ignore */ }
  };
  const saveSettings = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(state.settings));

  const fleetCells = () => Object.entries(state.settings.fleet).reduce((a, [len, q]) => a + len * q, 0);
  const fleetCount = () => Object.values(state.settings.fleet).reduce((a, q) => a + q, 0);

  const validateSettings = () => {
    const { n, fleet } = state.settings;
    if (fleetCount() === 0) return "Fleet needs at least one ship.";
    for (const len of Object.keys(fleet)) if (fleet[len] > 0 && +len > n) return `A ${SHIP_NAMES[len]} won't fit on a ${n}×${n} grid.`;
    if (fleetCells() > n * n * MAX_FILL) return `Fleet too crowded: ${fleetCells()} cells on ${n * n}. Max ${Math.floor(n * n * MAX_FILL)}.`;
    const probe = new Board(n);
    probe.ships = buildShips(fleet);
    if (!probe.randomize()) return "That fleet can't be arranged on this grid.";
    return null;
  };

  const renderSettings = () => {
    const s = state.settings;
    $("#board-size").value = s.n;
    $("#board-size-out").innerHTML = `${s.n} &times; ${s.n}`;
    document.querySelectorAll("#fleet-presets .chip").forEach((c) => c.classList.toggle("active", c.dataset.preset === s.preset));
    document.querySelectorAll("#ai-levels .chip").forEach((c) => c.classList.toggle("active", c.dataset.level === s.level));
    const rows = $("#fleet-rows");
    rows.innerHTML = "";
    [5, 4, 3, 2, 1].forEach((len) => {
      const row = el("div", "fleet-row");
      const name = el("span", null, SHIP_NAMES[len]);
      const prev = el("span", "preview");
      for (let i = 0; i < len; i++) prev.appendChild(el("i"));
      name.appendChild(document.createTextNode(" "));
      const label = el("span");
      label.appendChild(name);
      label.appendChild(el("span", "len", ` (${len})`));
      const minus = el("button", null, "−");
      const qty = el("span", "qty", String(s.fleet[len] || 0));
      const plus = el("button", null, "+");
      minus.disabled = !s.fleet[len];
      plus.disabled = (s.fleet[len] || 0) >= 6;
      minus.onclick = () => { s.fleet[len]--; s.preset = "custom"; Sound.click(); renderSettings(); };
      plus.onclick = () => { s.fleet[len] = (s.fleet[len] || 0) + 1; s.preset = "custom"; Sound.click(); renderSettings(); };
      row.append(label, prev, minus, qty, plus);
      rows.appendChild(row);
    });
    $("#fleet-cells").textContent = `${fleetCount()} ships · ${fleetCells()} / ${s.n * s.n} cells`;
    const err = validateSettings();
    const warn = $("#settings-warn");
    warn.hidden = !err;
    warn.textContent = err || "";
    $("#to-placement").disabled = !!err;
    saveSettings();
  };

  const bindSettings = () => {
    $("#board-size").addEventListener("input", (e) => { state.settings.n = +e.target.value; renderSettings(); });
    $("#fleet-presets").addEventListener("click", (e) => {
      const chip = e.target.closest(".chip");
      if (!chip) return;
      const p = chip.dataset.preset;
      state.settings.preset = p;
      if (PRESETS[p]) state.settings.fleet = { ...PRESETS[p] };
      Sound.click();
      renderSettings();
    });
    $("#ai-levels").addEventListener("click", (e) => {
      const chip = e.target.closest(".chip");
      if (!chip) return;
      state.settings.level = chip.dataset.level;
      Sound.click();
      renderSettings();
    });
    $("#to-placement").addEventListener("click", () => { Sound.click(); startPlacement(); });
  };

  // ---------------------------------------------------------------- board rendering
  const buildGrid = (container, n) => {
    container.innerHTML = "";
    container.style.setProperty("--n", n);
    const cells = [];
    for (let r = 0; r < n; r++) {
      const row = [];
      for (let c = 0; c < n; c++) {
        const cell = el("div", "cell");
        cell.dataset.r = r;
        cell.dataset.c = c;
        cell.setAttribute("aria-label", `${String.fromCharCode(65 + r)}${c + 1}`);
        container.appendChild(cell);
        row.push(cell);
      }
      cells.push(row);
    }
    return cells;
  };

  const paintShips = (cells, board, { showShips = true } = {}) => {
    cells.flat().forEach((c) => { c.className = "cell"; delete c.dataset.ship; });
    if (showShips) {
      for (const s of board.ships) {
        if (!s.placed) continue;
        s.cells().forEach(([r, c]) => {
          cells[r][c].classList.add("ship");
          cells[r][c].dataset.ship = s.id;
          if (state.selectedShip === s) cells[r][c].classList.add("selected");
        });
      }
    }
    for (const [k, v] of board.shots) {
      const r = Math.floor(k / 100), c = k % 100;
      cells[r][c].classList.add(v);
      if (v === "hit" && board.occ.get(k).sunk) cells[r][c].classList.add("sunk", "ship");
    }
  };

  // ---------------------------------------------------------------- placement screen
  let placeCells = [];
  const placeBoardEl = $("#place-board");
  const dockEl = $("#dock");
  const ghost = $("#drag-ghost");
  let dockOrient = true; // orientation for ships in dock
  let drag = null;

  const startPlacement = () => {
    const { n, fleet } = state.settings;
    state.player = new Board(n);
    state.player.ships = buildShips(fleet);
    state.selectedShip = null;
    placeCells = buildGrid(placeBoardEl, n);
    renderPlacement();
    screens.show("placement");
  };

  const renderPlacement = () => {
    const b = state.player;
    paintShips(placeCells, b);
    dockEl.innerHTML = "";
    const unplaced = b.ships.filter((s) => !s.placed);
    if (!unplaced.length) dockEl.appendChild(el("div", "dock-empty", "All vessels deployed. Ready to engage."));
    for (const s of unplaced) {
      const d = el("div", "dock-ship" + (s.horiz ? "" : " vertical") + (state.selectedShip === s ? " selected" : ""));
      d.dataset.ship = s.id;
      d.title = `${s.name} (${s.len})`;
      for (let i = 0; i < s.len; i++) d.appendChild(el("i"));
      dockEl.appendChild(d);
    }
    $("#start-btn").disabled = !b.allPlaced;
  };

  const cellMetrics = () => {
    const first = placeCells[0][0].getBoundingClientRect();
    const second = placeCells[0][1] ? placeCells[0][1].getBoundingClientRect() : null;
    const pitch = second ? second.left - first.left : first.width + 2;
    return { size: first.width, pitch, originX: first.left, originY: first.top };
  };

  const pointToCell = (x, y) => {
    const m = cellMetrics();
    const c = Math.floor((x - m.originX) / m.pitch);
    const r = Math.floor((y - m.originY) / m.pitch);
    return { r, c };
  };

  const clearPreview = () => placeCells.flat().forEach((c) => c.classList.remove("preview-ok", "preview-bad"));

  const showPreview = (ship, row, col, horiz) => {
    clearPreview();
    const ok = state.player.canPlace(ship, row, col, horiz);
    ship.cells(row, col, horiz).forEach(([r, c]) => {
      if (state.player.inBounds(r, c)) placeCells[r][c].classList.add(ok ? "preview-ok" : "preview-bad");
    });
    return ok;
  };

  const buildGhost = (ship, horiz) => {
    const m = cellMetrics();
    ghost.innerHTML = "";
    ghost.style.gridTemplateColumns = horiz ? `repeat(${ship.len}, ${m.size}px)` : `${m.size}px`;
    ghost.style.setProperty("--cell", `${m.size}px`);
    for (let i = 0; i < ship.len; i++) ghost.appendChild(el("i"));
    ghost.hidden = false;
  };

  const moveGhost = (x, y) => {
    const m = cellMetrics();
    const off = drag.grab * m.pitch + m.size / 2;
    ghost.style.left = `${x - (drag.horiz ? off : m.size / 2)}px`;
    ghost.style.top = `${y - (drag.horiz ? m.size / 2 : off)}px`;
  };

  const onPointerDown = (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    const dockShip = e.target.closest(".dock-ship");
    const cell = e.target.closest("#place-board .cell");
    let ship = null, grab = 0;
    if (dockShip) {
      ship = state.player.ships[+dockShip.dataset.ship];
      const segs = [...dockShip.children];
      grab = Math.max(0, segs.findIndex((seg) => { const r = seg.getBoundingClientRect(); return ship.horiz ? e.clientX < r.right : e.clientY < r.bottom; }));
    } else if (cell && cell.dataset.ship != null) {
      ship = state.player.ships[+cell.dataset.ship];
      grab = ship.horiz ? +cell.dataset.c - ship.col : +cell.dataset.r - ship.row;
    }
    if (!ship) return;
    e.preventDefault();
    drag = {
      ship, grab, horiz: ship.horiz, startX: e.clientX, startY: e.clientY, moved: false,
      prev: ship.placed ? { row: ship.row, col: ship.col, horiz: ship.horiz } : null,
      pointerId: e.pointerId,
    };
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
  };

  const onPointerMove = (e) => {
    if (!drag || e.pointerId !== drag.pointerId) return;
    if (!drag.moved) {
      if (Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) < 6) return;
      drag.moved = true;
      state.player.lift(drag.ship);
      state.selectedShip = drag.ship;
      renderPlacement();
      buildGhost(drag.ship, drag.horiz);
    }
    moveGhost(e.clientX, e.clientY);
    const { r, c } = pointToCell(e.clientX, e.clientY);
    const row = drag.horiz ? r : r - drag.grab;
    const col = drag.horiz ? c - drag.grab : c;
    drag.target = { row, col };
    showPreview(drag.ship, row, col, drag.horiz);
  };

  const onPointerUp = (e) => {
    if (!drag || e.pointerId !== drag.pointerId) return;
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
    window.removeEventListener("pointercancel", onPointerUp);
    const d = drag;
    drag = null;
    ghost.hidden = true;
    clearPreview();
    if (!d.moved) {
      // tap: select; second tap on selected ship rotates
      if (state.selectedShip === d.ship) rotateShip(d.ship);
      else { state.selectedShip = d.ship; Sound.click(); }
      renderPlacement();
      return;
    }
    const b = state.player;
    const placed = d.target && b.place(d.ship, d.target.row, d.target.col, d.horiz);
    if (placed) Sound.place();
    else if (d.prev) b.place(d.ship, d.prev.row, d.prev.col, d.prev.horiz);
    renderPlacement();
  };

  const rotateShip = (ship) => {
    const b = state.player;
    if (!ship.placed) { ship.horiz = !ship.horiz; Sound.click(); return true; }
    const horiz = !ship.horiz;
    // try pivoting around the ship's origin, then shift back into bounds / free space
    const tries = [];
    for (let shift = 0; shift < ship.len; shift++) {
      tries.push(horiz ? [ship.row, ship.col - shift] : [ship.row - shift, ship.col]);
    }
    const prev = { row: ship.row, col: ship.col, horiz: ship.horiz };
    b.lift(ship);
    for (const [r, c] of tries) if (b.place(ship, r, c, horiz)) { Sound.place(); return true; }
    b.place(ship, prev.row, prev.col, prev.horiz);
    placeBoardEl.classList.add("shake");
    setTimeout(() => placeBoardEl.classList.remove("shake"), 400);
    return false;
  };

  const bindPlacement = () => {
    placeBoardEl.addEventListener("pointerdown", onPointerDown);
    dockEl.addEventListener("pointerdown", onPointerDown);
    $("#rotate-btn").addEventListener("click", () => {
      const s = state.selectedShip || state.player.ships.find((x) => !x.placed);
      if (!s) return;
      state.selectedShip = s;
      rotateShip(s);
      renderPlacement();
    });
    $("#random-btn").addEventListener("click", () => { state.player.randomize(); state.selectedShip = null; Sound.place(); renderPlacement(); });
    $("#clear-btn").addEventListener("click", () => { state.player.clear(); state.selectedShip = null; Sound.click(); renderPlacement(); });
    $("#back-settings").addEventListener("click", () => screens.show("settings"));
    $("#start-btn").addEventListener("click", () => { if (state.player.allPlaced) startBattle(); });
  };

  // ---------------------------------------------------------------- battle screen
  let enemyCells = [], ownCells = [];
  const enemyBoardEl = $("#enemy-board");
  const ownBoardEl = $("#own-board");

  const startBattle = () => {
    const { n, fleet, level } = state.settings;
    state.enemy = new Board(n);
    state.enemy.ships = buildShips(fleet);
    state.enemy.randomize();
    state.ai = new AI(state.player, level, fleet);
    state.turn = "player";
    state.busy = false;
    state.over = false;
    state.stats = { shots: 0, hits: 0, enemyShots: 0, enemyHits: 0, started: Date.now() };
    enemyCells = buildGrid(enemyBoardEl, n);
    ownCells = buildGrid(ownBoardEl, n);
    renderBattle();
    setMessage("Select a target on the enemy grid.");
    setTurn("player");
    screens.show("battle");
  };

  const renderFleetList = (ul, board) => {
    ul.innerHTML = "";
    [...board.ships].sort((a, b) => b.len - a.len).forEach((s) => {
      const li = el("li", s.sunk ? "sunk" : "");
      for (let i = 0; i < s.len; i++) li.appendChild(el("i"));
      li.appendChild(document.createTextNode(s.name));
      ul.appendChild(li);
    });
  };

  const renderBattle = () => {
    paintShips(enemyCells, state.enemy, { showShips: state.over });
    paintShips(ownCells, state.player);
    $("#enemy-remaining").textContent = `${state.enemy.remaining} / ${state.enemy.ships.length} afloat`;
    $("#own-remaining").textContent = `${state.player.remaining} / ${state.player.ships.length} afloat`;
    renderFleetList($("#enemy-fleet"), state.enemy);
    renderFleetList($("#own-fleet"), state.player);
  };

  const setMessage = (text, cls = "") => { const m = $("#message"); m.textContent = text; m.className = `message ${cls}`; };
  const setTurn = (who) => {
    const t = $("#turn-indicator");
    t.textContent = who === "player" ? "YOUR TURN" : "ENEMY FIRING…";
    t.className = `turn ${who === "player" ? "you" : "enemy"}`;
    enemyBoardEl.classList.toggle("disabled", who !== "player");
    enemyBoardEl.classList.toggle("sweep", who !== "player");
  };

  const fx = (cell, kind) => {
    const f = el("span", kind === "miss" ? "splash" : "boom");
    cell.appendChild(f);
    setTimeout(() => f.remove(), 700);
  };

  const coord = (r, c) => `${String.fromCharCode(65 + r)}${c + 1}`;

  const playerFire = async (r, c) => {
    if (state.busy || state.over || state.turn !== "player") return;
    const res = state.enemy.fire(r, c);
    if (!res) return;
    state.busy = true;
    state.stats.shots++;
    Sound.fire();
    await sleep(180);
    if (res.result === "miss") { Sound.miss(); setMessage(`${coord(r, c)} — Miss.`); }
    else {
      state.stats.hits++;
      if (res.result === "sunk") { Sound.sunk(); setMessage(`${coord(r, c)} — You sank the enemy ${res.ship.name}!`, "sunk"); }
      else { Sound.hit(); setMessage(`${coord(r, c)} — Direct hit!`, "hit"); }
    }
    fx(enemyCells[r][c], res.result);
    renderBattle();
    if (state.enemy.allSunk) return endGame(true);
    state.turn = "enemy";
    setTurn("enemy");
    await sleep(AI_DELAY);
    await enemyTurn();
  };

  const enemyTurn = async () => {
    const [r, c] = state.ai.pick();
    const res = state.player.fire(r, c);
    state.stats.enemyShots++;
    Sound.fire();
    await sleep(200);
    if (res.result === "miss") { Sound.miss(); setMessage(`Enemy fires at ${coord(r, c)} — splash.`); }
    else {
      state.stats.enemyHits++;
      ownBoardEl.classList.add("shake");
      setTimeout(() => ownBoardEl.classList.remove("shake"), 400);
      if (res.result === "sunk") { Sound.sunk(); state.ai.notifySunk(res.ship.len); setMessage(`Enemy fires at ${coord(r, c)} — your ${res.ship.name} is sunk!`, "sunk"); }
      else { Sound.hit(); setMessage(`Enemy fires at ${coord(r, c)} — you're hit!`, "hit"); }
    }
    fx(ownCells[r][c], res.result);
    renderBattle();
    if (state.player.allSunk) return endGame(false);
    await sleep(400);
    state.turn = "player";
    state.busy = false;
    setTurn("player");
  };

  const endGame = async (won) => {
    state.over = true;
    state.busy = true;
    renderBattle();
    setTurn(won ? "player" : "enemy");
    setMessage(won ? "Enemy fleet destroyed." : "Your fleet has been lost.", won ? "sunk" : "hit");
    won ? Sound.win() : Sound.lose();
    await sleep(1600);
    const st = state.stats;
    const secs = Math.round((Date.now() - st.started) / 1000);
    $("#over-title").textContent = won ? "VICTORY" : "DEFEAT";
    $("#over-title").className = won ? "" : "defeat";
    $("#over-sub").textContent = won
      ? `You sank all ${state.enemy.ships.length} enemy vessels in ${st.shots} shots.`
      : `The enemy sank your fleet in ${st.enemyShots} shots. ${state.enemy.remaining} of theirs remained.`;
    const acc = (h, s) => (s ? Math.round((100 * h) / s) : 0);
    $("#over-stats").innerHTML = `
      <dt>Your shots</dt><dd>${st.shots}</dd>
      <dt>Your accuracy</dt><dd>${acc(st.hits, st.shots)}%</dd>
      <dt>Enemy shots</dt><dd>${st.enemyShots}</dd>
      <dt>Enemy accuracy</dt><dd>${acc(st.enemyHits, st.enemyShots)}%</dd>
      <dt>Duration</dt><dd>${Math.floor(secs / 60)}m ${secs % 60}s</dd>
      <dt>Grid / Commander</dt><dd>${state.settings.n}×${state.settings.n} / ${$("#ai-levels .chip.active").textContent}</dd>`;
    screens.show("over");
  };

  const bindBattle = () => {
    enemyBoardEl.addEventListener("click", (e) => {
      const cell = e.target.closest(".cell");
      if (!cell) return;
      playerFire(+cell.dataset.r, +cell.dataset.c);
    });
    $("#play-again").addEventListener("click", () => { Sound.click(); startPlacement(); });
    $("#over-settings").addEventListener("click", () => screens.show("settings"));
    $("#restart-btn").addEventListener("click", () => { Sound.click(); screens.show("settings"); });
    const st = $("#sound-toggle");
    const paint = () => { st.classList.toggle("muted", !Sound.enabled); st.textContent = Sound.enabled ? "SFX ON" : "SFX OFF"; };
    st.addEventListener("click", () => { Sound.toggle(); paint(); });
    paint();
  };

  // ---------------------------------------------------------------- init
  loadSettings();
  bindSettings();
  bindPlacement();
  bindBattle();
  renderSettings();
})();
