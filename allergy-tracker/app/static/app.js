const state = { meta: null, day: null, severities: {}, charts: {} };

const $ = (sel) => document.querySelector(sel);
const api = async (path, options = {}) => {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (res.status === 401) {
    $("#login").classList.remove("hidden");
    throw new Error("unauthorized");
  }
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail || res.statusText);
  return res.json();
};

const fmt = (value, unit = "") => (value === null || value === undefined ? "–" : `${value}${unit}`);

function showView(name) {
  document.querySelectorAll(".view").forEach((v) => v.classList.add("hidden"));
  $(`#view-${name}`).classList.remove("hidden");
  document.querySelectorAll("nav button").forEach((b) => b.classList.toggle("active", b.dataset.view === name));
  if (name === "history") loadHistory();
  if (name === "insights") loadInsights();
}

function renderSymptomInputs() {
  const list = $("#symptom-list");
  list.innerHTML = "";
  state.meta.symptoms.forEach(({ key, label }) => {
    const row = document.createElement("div");
    row.className = "symptom";
    row.innerHTML = `<span class="name">${label}</span><div class="levels" data-key="${key}">
      ${[0, 1, 2, 3].map((n) => `<button type="button" data-level="${n}">${n}</button>`).join("")}
    </div>`;
    list.appendChild(row);
  });
  list.querySelectorAll(".levels").forEach((group) => {
    group.addEventListener("click", (event) => {
      const button = event.target.closest("button");
      if (!button) return;
      const key = group.dataset.key;
      state.severities[key] = Number(button.dataset.level);
      paintSeverities();
    });
  });
}

function paintSeverities() {
  document.querySelectorAll(".levels").forEach((group) => {
    const value = state.severities[group.dataset.key] ?? 0;
    group.querySelectorAll("button").forEach((b) => b.classList.toggle("on", Number(b.dataset.level) === value));
  });
}

async function loadDay(date) {
  const day = await api(`/api/day/${date}`);
  state.day = day;
  state.severities = {};
  state.meta.symptoms.forEach(({ key }) => (state.severities[key] = day[key] ?? 0));
  paintSeverities();
  $("#outdoor").value = day.outdoor_minutes ?? 0;
  $("#medications").value = day.medications ?? "";
  $("#notes").value = day.notes ?? "";

  const badge = $("#pollen-badge");
  badge.textContent = day.pollen_index === null || day.pollen_index === undefined
    ? "No pollen data"
    : `Pollen ${day.pollen_index} · ${day.pollen_category}`;
  badge.classList.toggle("high", (day.pollen_index ?? 0) >= 7.3);

  $("#env-grid").innerHTML = [
    ["High", fmt(day.temp_max, "°F")],
    ["Low", fmt(day.temp_min, "°F")],
    ["Wind", fmt(day.wind_max, " mph")],
    ["Rain", fmt(day.precipitation, '"')],
    ["Humidity", fmt(day.humidity_mean ? Math.round(day.humidity_mean) : null, "%")],
    ["PM2.5", fmt(day.pm2_5)],
    ["Ozone", fmt(day.ozone)],
    ["Asthma idx", fmt(day.asthma_index)],
  ].map(([label, value]) => `<div><span>${label}</span><strong>${value}</strong></div>`).join("");

  const triggers = day.pollen_triggers || [];
  $("#env-triggers").innerHTML = triggers.length
    ? `Top pollens today: <b>${triggers.join(", ")}</b>`
    : "Top pollen contributors unavailable for this day.";
  $("#save-status").textContent = day.logged ? "Logged — you can update it any time." : "";
}

async function saveDay(event) {
  event.preventDefault();
  const date = $("#log-date").value;
  const payload = {
    ...state.severities,
    outdoor_minutes: Number($("#outdoor").value || 0),
    medications: $("#medications").value,
    notes: $("#notes").value,
  };
  $("#save-status").textContent = "Saving...";
  await api(`/api/day/${date}`, { method: "POST", body: JSON.stringify(payload) });
  $("#save-status").textContent = `Saved ${date}.`;
}

async function loadForecast() {
  const days = await api("/api/forecast");
  $("#forecast-list").innerHTML = days.length
    ? days.map((d) => `<div>${new Date(`${d.date}T12:00`).toLocaleDateString(undefined, { weekday: "short" })}
        <strong>${d.pollen_index ?? "–"}</strong>${d.category}</div>`).join("")
    : "<div>Forecast unavailable.</div>";
}

async function loadHistory() {
  const rows = await api("/api/history?days=120");
  const labels = rows.map((r) => r.date);
  const ctx = $("#history-chart");
  state.charts.history?.destroy();
  state.charts.history = new Chart(ctx, {
    data: {
      labels,
      datasets: [
        { type: "line", label: "Pollen index", data: rows.map((r) => r.pollen_index), borderColor: "#c0a03a", backgroundColor: "#c0a03a", spanGaps: true, yAxisID: "y1", tension: .3, pointRadius: 0 },
        { type: "bar", label: "Symptom score", data: rows.map((r) => r.score), backgroundColor: "#1f7a5a", yAxisID: "y" },
      ],
    },
    options: {
      responsive: true,
      interaction: { mode: "index", intersect: false },
      scales: {
        y: { beginAtZero: true, title: { display: true, text: "Symptom score" } },
        y1: { position: "right", beginAtZero: true, grid: { drawOnChartArea: false }, title: { display: true, text: "Pollen" } },
        x: { ticks: { maxTicksLimit: 8 } },
      },
    },
  });

  const recent = rows.slice(-30).reverse();
  $("#history-table").innerHTML = `
    <tr><th>Date</th><th>Score</th><th>Pollen</th><th>Top pollens</th><th>PM2.5</th><th>Meds</th></tr>
    ${recent.map((r) => `<tr>
      <td>${r.date}</td><td>${r.score ?? "–"}</td><td>${r.pollen_index ?? "–"}</td>
      <td>${(r.pollen_triggers || []).join(", ") || "–"}</td><td>${r.pm2_5 ?? "–"}</td><td>${r.medications || "–"}</td>
    </tr>`).join("")}`;
}

function barRow(label, value, max, suffix = "") {
  const pct = Math.min(Math.abs(value) / max, 1) * 100;
  return `<div class="bar-row"><span>${label}</span>
    <span class="bar"><i class="${value < 0 ? "neg" : ""}" style="width:${pct}%"></i></span>
    <span class="val">${value.toFixed(2)}${suffix}</span></div>`;
}

async function loadInsights() {
  const data = await api("/api/insights");
  $("#insight-summary").innerHTML = `
    <h2>${data.logged_days} days logged</h2>
    <p class="hint">${data.enough_data
      ? `Average symptom score ${data.mean_score} of 24.`
      : `Correlations appear once you have ${data.min_pairs} logged days (${data.logged_days} so far). Keep logging daily.`}</p>`;

  $("#correlations").innerHTML = data.correlations.length
    ? data.correlations.map((c) => barRow(`${c.label} (${c.lag_label})`, c.rho, 1)).join("")
    : "<p class='hint'>Not enough logged days yet.</p>";

  $("#triggers").innerHTML = data.triggers.length
    ? data.triggers.map((t) => barRow(`${t.name} (${t.days}d)`, t.delta_vs_overall, 8)).join("")
    : "<p class='hint'>Needs at least 3 logged days per allergen.</p>";

  $("#per-symptom").innerHTML = data.per_symptom.map((s) =>
    s.rho_pollen === null
      ? `<div class="bar-row"><span>${s.label}</span><span class="bar"></span><span class="val">–</span></div>`
      : barRow(s.label, s.rho_pollen, 1)).join("");

  const season = data.seasonality;
  state.charts.season?.destroy();
  state.charts.season = new Chart($("#season-chart"), {
    data: {
      labels: season.map((s) => s.month_name),
      datasets: [
        { type: "bar", label: "Avg symptom score", data: season.map((s) => s.mean_score), backgroundColor: "#1f7a5a" },
        { type: "line", label: "Avg pollen index", data: season.map((s) => s.mean_pollen), borderColor: "#c0a03a", yAxisID: "y1", tension: .3 },
      ],
    },
    options: { scales: { y: { beginAtZero: true }, y1: { position: "right", beginAtZero: true, grid: { drawOnChartArea: false } } } },
  });

  $("#worst-days").innerHTML = data.worst_days.length
    ? data.worst_days.map((d) => `<div class="bar-row"><span>${d.date}</span>
        <span>${(d.triggers || []).join(", ") || "–"}</span><span class="val">${d.score}</span></div>`).join("")
    : "<p class='hint'>No logs yet.</p>";
}

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

async function enablePush() {
  const status = $("#push-status");
  try {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      status.textContent = "This browser can't do push. On iPhone, add the app to your home screen first.";
      return;
    }
    const registration = await navigator.serviceWorker.register("/sw.js");
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      status.textContent = "Notifications blocked in browser settings.";
      return;
    }
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(state.meta.vapid_public_key),
    });
    await api("/api/push/subscribe", { method: "POST", body: JSON.stringify(subscription.toJSON()) });
    status.textContent = "Daily reminder enabled on this device.";
  } catch (err) {
    status.textContent = `Could not enable: ${err.message}`;
  }
}

function wireSettings() {
  const select = $("#reminder-hour");
  select.innerHTML = Array.from({ length: 24 }, (_, h) =>
    `<option value="${h}">${new Date(2020, 0, 1, h).toLocaleTimeString([], { hour: "numeric" })}</option>`).join("");
  select.value = state.meta.reminder_hour;
  select.addEventListener("change", async () => {
    await api("/api/settings/reminder", { method: "POST", body: JSON.stringify({ hour: Number(select.value) }) });
    $("#push-status").textContent = `Reminder set for ${select.options[select.selectedIndex].text}.`;
  });
  $("#enable-push").addEventListener("click", enablePush);
  $("#test-push").addEventListener("click", async () => {
    const result = await api("/api/push/test", { method: "POST" });
    $("#push-status").textContent = `Sent to ${result.sent} of ${result.subscriptions} device(s).`;
  });
  $("#refresh-data").addEventListener("click", async () => {
    $("#data-status").textContent = "Refreshing...";
    const result = await api("/api/refresh", { method: "POST" });
    $("#data-status").textContent = `Updated ${result.days_updated} days.${result.errors.length ? ` Issues: ${result.errors.join("; ")}` : ""}`;
    loadDay($("#log-date").value);
  });
  $("#backfill-data").addEventListener("click", async () => {
    $("#data-status").textContent = "Backfilling (this takes a minute)...";
    const result = await api("/api/backfill", { method: "POST" });
    $("#data-status").textContent = `Backfilled ${result.days_updated} days.`;
  });
}

async function boot() {
  state.meta = await api("/api/me");
  if (!state.meta.authenticated) {
    $("#login").classList.remove("hidden");
    return;
  }
  $("#login").classList.add("hidden");
  $("#zip-label").textContent = state.meta.zip;
  renderSymptomInputs();
  wireSettings();
  $("#log-date").value = state.meta.today;
  await loadDay(state.meta.today);
  loadForecast();
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
}

document.querySelectorAll("nav button").forEach((b) => b.addEventListener("click", () => showView(b.dataset.view)));
$("#log-form").addEventListener("submit", saveDay);
$("#log-date").addEventListener("change", (e) => loadDay(e.target.value));
$("#login-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await api("/api/login", { method: "POST", body: JSON.stringify({ passcode: $("#passcode").value }) });
    $("#login").classList.add("hidden");
    boot();
  } catch (err) {
    $("#login-error").textContent = "Wrong passcode";
  }
});

boot();
