const TOOLS = [
  { id: "slack",      name: "Slack",         icon: "💬" },
  { id: "gcal",       name: "Google Agenda", icon: "📅" },
  { id: "sheets",     name: "Google Sheets", icon: "📊" },
  { id: "databricks", name: "Databricks",    icon: "⚡" }
];

function fmt(min) {
  if (min < 60) return `${min}min`;
  return `${Math.floor(min / 60)}h${min % 60 > 0 ? ` ${min % 60}min` : ""}`;
}

async function render() {
  const today = new Date().toISOString().split("T")[0];
  const data = await chrome.storage.local.get("sessions");
  const sessions = (data.sessions || []).filter(s => s.date === today);

  const totals = {};
  TOOLS.forEach(t => totals[t.id] = 0);
  sessions.forEach(s => { if (totals[s.tool] !== undefined) totals[s.tool] += s.duration; });

  const container = document.getElementById("tools");
  container.innerHTML = "";

  TOOLS.forEach(t => {
    const div = document.createElement("div");
    div.className = `tool ${t.id}`;
    div.innerHTML = `
      <div class="tool-name">${t.icon} ${t.name}</div>
      <div class="tool-time">${totals[t.id] > 0 ? fmt(totals[t.id]) : "—"}</div>
    `;
    container.appendChild(div);
  });

  const total = Object.values(totals).reduce((a, b) => a + b, 0);
  document.getElementById("footer").textContent = `Total hoje: ${fmt(total)} · ${sessions.length} sessões`;
}

render();
