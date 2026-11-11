(() => {
  "use strict";

  const STORAGE_KEY = "astrocare.wellness.v1";
  const $ = (id) => document.getElementById(id);
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const values = { heart: [68, 72, 70, 75, 73, 71, 72, 74, 69, 73, 71, 72] };
  let vitalState = { heart: 72, oxygen: 98, systolic: 120, diastolic: 80, temperature: 36.8 };
  let elapsedSeconds = (14 * 60 * 60) + (32 * 60) + 8;

  function tickMissionClock() {
    elapsedSeconds += 1;
    const hours = String(Math.floor(elapsedSeconds / 3600) % 24).padStart(2, "0");
    const minutes = String(Math.floor(elapsedSeconds / 60) % 60).padStart(2, "0");
    const seconds = String(elapsedSeconds % 60).padStart(2, "0");
    $("missionClock").textContent = `DAY 090 · ${hours}:${minutes}:${seconds}`;
  }

  function statusFor(id, state) {
    const node = $(id);
    if (!node) return;
    node.className = "signal" + (state === "critical" ? " critical" : state === "warning" ? " warning" : "");
    node.textContent = "● " + (state === "critical" ? "Threshold crossed" : state === "warning" ? "Near demo threshold" : "In demo range");
  }

  function updateAlert() {
    const { heart, oxygen, systolic, temperature } = vitalState;
    const critical = heart < 55 || heart > 100 || oxygen < 95 || systolic > 140 || temperature > 37.8;
    const warning = !critical && (heart > 90 || oxygen === 95 || systolic > 130 || temperature > 37.5);
    const state = critical ? "critical" : warning ? "warning" : "normal";
    const box = $("healthAlert");
    box.className = "alert-state" + (state === "normal" ? "" : " " + state);
    $("alertSymbol").textContent = critical ? "!" : warning ? "△" : "✓";
    $("alertTitle").textContent = critical ? "Demo threshold crossed" : warning ? "Demo reading needs review" : "All systems nominal";
    const triggers = [];
    if (heart < 55 || heart > 100) triggers.push("heart rate");
    if (oxygen < 95) triggers.push("oxygen saturation");
    if (temperature > 37.8) triggers.push("temperature");
    if (systolic > 140) triggers.push("systolic pressure");
    $("alertMessage").textContent = triggers.length
      ? "Simulated " + triggers.join(", ") + " crossed the displayed demo threshold."
      : warning ? "At least one simulated value is near its displayed demo threshold. No diagnosis is implied."
        : "Simulated readings are within the demonstration thresholds.";
    $("alertCount").textContent = triggers.length;
    statusFor("heartStatus", heart < 55 || heart > 100 ? "critical" : heart > 90 ? "warning" : "normal");
    statusFor("oxygenStatus", oxygen < 95 ? "critical" : oxygen === 95 ? "warning" : "normal");
    statusFor("tempStatus", temperature > 37.8 ? "critical" : temperature > 37.5 ? "warning" : "normal");
    statusFor("pressureStatus", systolic > 140 ? "critical" : systolic > 130 ? "warning" : "normal");
  }

  function renderVitals() {
    $("heartRate").textContent = vitalState.heart;
    $("oxygen").textContent = vitalState.oxygen;
    $("temperature").textContent = vitalState.temperature.toFixed(1);
    $("pressure").textContent = vitalState.systolic + "/" + vitalState.diastolic;
    $("chartLatest").textContent = "Latest: " + vitalState.heart + " bpm";
    updateAlert();
    drawChart();
  }

  function updateVitals() {
    // Keep ordinary ticks in plausible demo bands; occasional boundary values make alerts visible in a demo.
    vitalState.heart = Math.round(66 + Math.random() * 29);
    vitalState.oxygen = Math.round(95 + Math.random() * 4);
    vitalState.systolic = Math.round(112 + Math.random() * 25);
    vitalState.diastolic = Math.round(70 + Math.random() * 16);
    vitalState.temperature = Number((36.3 + Math.random() * 1.3).toFixed(1));
    values.heart.push(vitalState.heart);
    if (values.heart.length > 12) values.heart.shift();
    renderVitals();
  }

  function drawChart() {
    const canvas = $("healthChart");
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(rect.width * ratio);
    canvas.height = Math.round(rect.height * ratio);
    const ctx = canvas.getContext("2d");
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    const width = rect.width, height = rect.height;
    const pad = { left: 31, right: 9, top: 12, bottom: 22 };
    const plotW = width - pad.left - pad.right, plotH = height - pad.top - pad.bottom;
    const min = 50, max = 110;
    ctx.clearRect(0, 0, width, height);
    ctx.font = "9px Segoe UI, Arial";
    ctx.textBaseline = "middle";
    [50, 65, 80, 95, 110].forEach((value) => {
      const y = pad.top + (max - value) / (max - min) * plotH;
      ctx.strokeStyle = "#1d3349"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(width - pad.right, y); ctx.stroke();
      ctx.fillStyle = "#71899b"; ctx.textAlign = "right"; ctx.fillText(String(value), pad.left - 7, y);
    });
    const points = values.heart.map((value, index) => ({
      x: pad.left + index / Math.max(values.heart.length - 1, 1) * plotW,
      y: pad.top + (max - clamp(value, min, max)) / (max - min) * plotH
    }));
    if (points.length) {
      const gradient = ctx.createLinearGradient(0, pad.top, 0, height - pad.bottom);
      gradient.addColorStop(0, "rgba(65,199,213,.23)"); gradient.addColorStop(1, "rgba(65,199,213,0)");
      ctx.beginPath(); ctx.moveTo(points[0].x, height - pad.bottom);
      points.forEach((point) => ctx.lineTo(point.x, point.y));
      ctx.lineTo(points[points.length - 1].x, height - pad.bottom); ctx.closePath(); ctx.fillStyle = gradient; ctx.fill();
      ctx.beginPath(); points.forEach((point, index) => index ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y));
      ctx.strokeStyle = "#58d4df"; ctx.lineWidth = 2; ctx.lineJoin = "round"; ctx.stroke();
      const last = points[points.length - 1]; ctx.beginPath(); ctx.arc(last.x, last.y, 3.5, 0, Math.PI * 2); ctx.fillStyle = "#a5f4f3"; ctx.fill();
    }
    ctx.fillStyle = "#71899b"; ctx.textAlign = "left"; ctx.textBaseline = "alphabetic"; ctx.fillText("SAMPLES", pad.left, height - 3);
    ctx.textAlign = "right"; ctx.fillText("NOW", width - pad.right, height - 3);
  }

  function getEntries() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(parsed) ? parsed.filter((entry) => entry && typeof entry === "object") : [];
    } catch (error) { return []; }
  }

  function renderHistory() {
    const list = $("wellnessHistory");
    const entries = getEntries().slice(-8).reverse();
    list.replaceChildren();
    if (!entries.length) {
      const empty = document.createElement("p"); empty.className = "empty-state"; empty.textContent = "Your saved check-ins will appear here."; list.append(empty); return;
    }
    entries.forEach((entry) => {
      const row = document.createElement("div"); row.className = "history-entry";
      const detail = document.createElement("div");
      const mood = document.createElement("strong"); mood.textContent = entry.mood || "Check-in";
      const summary = document.createElement("span"); summary.textContent = (entry.sleep ?? "—") + " h sleep · stress " + (entry.stress ?? "—") + "/5";
      const date = document.createElement("time"); date.textContent = entry.date || "Saved locally";
      detail.append(mood, summary); row.append(detail, date); list.append(row);
    });
  }

  function saveAssessment(event) {
    event.preventDefault();
    const mood = $("mood").value;
    const sleep = Number($("sleep").value);
    const stressNode = document.querySelector('input[name="stress"]:checked');
    const message = $("wellnessMessage");
    if (!mood || !Number.isFinite(sleep) || sleep < 0 || sleep > 24 || !stressNode) {
      message.className = "form-message error";
      message.textContent = "Choose a mood, sleep duration from 0–24 hours, and a stress level."; return;
    }
    const now = new Date();
    const record = { mood, sleep, stress: Number(stressNode.value), isoDate: now.toISOString(), date: now.toLocaleString() };
    try {
      const entries = getEntries(); entries.push(record);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(-100)));
      message.className = "form-message"; message.textContent = "Check-in saved on this device.";
      renderHistory();
    } catch (error) {
      message.className = "form-message error";
      message.textContent = "Local storage is unavailable in this browser session.";
    }
  }

  function updateTimeline() {
    const day = Number($("missionSlider").value);
    const percent = ((day - 1) / 179) * 100;
    $("missionDay").innerHTML = String(day).padStart(3, "0") + " <small>/ 180</small>";
    $("milestoneCurrent").textContent = "Day " + day;
    $("missionSlider").style.background = `linear-gradient(90deg,#4bc8d8 0%,#4bc8d8 ${percent}%,#23394b ${percent}%,#23394b 100%)`;
    let note;
    if (day < 30) note = "Early adaptation · Crew acclimatization and baseline health checks.";
    else if (day < 75) note = "Science operations · Routine exercise and scheduled wellness check-ins.";
    else if (day < 130) note = "Mid-mission operations · Routine health check-in scheduled.";
    else if (day < 165) note = "Return preparation · Review crew wellness and mission readiness.";
    else note = "Final approach · Simulated return-to-Earth preparations.";
    $("missionMessage").textContent = note;
  }

  function printReport() {
    const report = $("report");
    report.dataset.day = $("missionSlider").value;
    report.dataset.heart = vitalState.heart;
    report.dataset.oxygen = vitalState.oxygen;
    report.dataset.temperature = vitalState.temperature.toFixed(1);
    report.dataset.pressure = vitalState.systolic + "/" + vitalState.diastolic;
    const latest = getEntries().slice(-1)[0];
    report.dataset.wellness = latest ? `${latest.mood}, ${latest.sleep} hours sleep, stress ${latest.stress}/5` : "No check-in saved";
    window.print();
  }

  function setActiveNav() {
    const links = [...document.querySelectorAll(".nav-link")];
    const sections = links.map((link) => document.querySelector(link.getAttribute("href"))).filter(Boolean);
    if (!("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (entry.isIntersecting) links.forEach((link) => link.classList.toggle("active", link.hash === "#" + entry.target.id));
    }), { rootMargin: "-15% 0px -72% 0px" });
    sections.forEach((section) => observer.observe(section));
  }

  document.addEventListener("DOMContentLoaded", () => {
    renderVitals(); renderHistory(); updateTimeline(); setActiveNav();
    tickMissionClock();
    $("wellnessForm").addEventListener("submit", saveAssessment);
    $("missionSlider").addEventListener("input", updateTimeline);
    $("printReport").addEventListener("click", printReport);
    window.addEventListener("resize", drawChart);
    window.setInterval(updateVitals, 4000);
    window.setInterval(tickMissionClock, 1000);
  });
})();
