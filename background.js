const CLIENT_ID = "598357292473-anuq7polohu72eh4s45lnu689g4e4vgv.apps.googleusercontent.com";
const SCOPES = "https://www.googleapis.com/auth/calendar.readonly";

const TOOLS = {
  "app.slack.com": "slack",
  "docs.google.com/spreadsheets": "sheets",
  "databricks.com": "databricks"
};

const MEETING_URL_PATTERNS = [/meet\.google\.com/];
const MEETING_TITLE_PATTERNS = [
  /meet\.google\.com/i,
  /você está em uma chamada/i,
  /you're in a call/i,
  /google meet/i,
];

let activeSession = null;
let startTime = null;
let activeTitle = "";

// ── AUTH ──────────────────────────────────────────────
async function getAuthToken() {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive: true, scopes: [SCOPES] }, token => {
      if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
      else resolve(token);
    });
  });
}

// ── CALENDAR API ──────────────────────────────────────
async function fetchTodayEvents() {
  try {
    const token = await getAuthToken();
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();

    const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${startOfDay}&timeMax=${endOfDay}&singleEvents=true&orderBy=startTime`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const data = await res.json();
    const events = (data.items || []).map(e => ({
      title: e.summary || "Sem título",
      start: e.start?.dateTime || e.start?.date,
      end: e.end?.dateTime || e.end?.date,
      duration: e.start?.dateTime
        ? Math.round((new Date(e.end.dateTime) - new Date(e.start.dateTime)) / 60000)
        : 0,
      isOnline: !!(e.hangoutLink || (e.conferenceData?.entryPoints?.length > 0)),
      location: e.location || "",
    }));

    await chrome.storage.local.set({ calendarEvents: events, calendarUpdated: Date.now() });
    console.log(`[ActivityTracker] ${events.length} eventos carregados do Calendar`);
    return events;
  } catch (e) {
    console.error("[ActivityTracker] Erro ao buscar Calendar:", e);
    return [];
  }
}

// Busca reunião ativa agora no Calendar
async function getCurrentMeetingTitle() {
  const data = await chrome.storage.local.get("calendarEvents");
  const events = data.calendarEvents || [];
  const now = new Date();
  const current = events.find(e => {
    if (!e.start || !e.end) return false;
    const start = new Date(e.start);
    const end = new Date(e.end);
    return now >= start && now <= end;
  });
  return current ? current.title : null;
}

// ── TAB DETECTION ─────────────────────────────────────
function detectTool(url, title) {
  if (!url) return null;
  if (MEETING_URL_PATTERNS.some(p => p.test(url))) return "reuniao";
  if (title && MEETING_TITLE_PATTERNS.some(p => p.test(title))) return "reuniao";
  if (url.includes("calendar.google.com")) return "gcal";
  for (const [domain, tool] of Object.entries(TOOLS)) {
    if (url.includes(domain)) return tool;
  }
  return null;
}

async function saveSession(tool, title, duration) {
  if (duration < 1) return;
  const data = await chrome.storage.local.get("sessions");
  const sessions = data.sessions || [];

  // Se for reunião, tenta pegar o nome real do Calendar
  let finalTitle = title;
  if (tool === "reuniao") {
    const meetingTitle = await getCurrentMeetingTitle();
    if (meetingTitle) finalTitle = meetingTitle;
  }

  // Para Sheets, limpa o sufixo "— Google Sheets"
  if (tool === "sheets") {
    finalTitle = finalTitle.replace(/\s*[-–]\s*Google Sheets$/i, "").trim();
  }
  // Para Slack, limpa o sufixo "- Slack"
  if (tool === "slack") {
    finalTitle = finalTitle.replace(/\s*[-–]\s*Slack$/i, "").trim();
  }
  // Para Databricks, limpa o sufixo "- Databricks"
  if (tool === "databricks") {
    finalTitle = finalTitle.replace(/\s*[-–]\s*Databricks$/i, "").trim();
  }

  sessions.push({
    tool,
    title: finalTitle || tool,
    duration,
    date: new Date().toISOString().split("T")[0],
    time: new Date().toTimeString().slice(0, 5),
    timestamp: Date.now()
  });

  await chrome.storage.local.set({ sessions: sessions.slice(-500) });
}

async function handleTabChange(tab) {
  const tool = detectTool(tab.url, tab.title);
  const now = Date.now();

  if (activeSession && startTime) {
    const duration = Math.round((now - startTime) / 60000);
    await saveSession(activeSession, activeTitle, duration);
  }

  activeSession = tool;
  startTime = tool ? now : null;
  activeTitle = tab.title || "";
}

// ── LISTENERS ─────────────────────────────────────────
chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  try { handleTabChange(await chrome.tabs.get(tabId)); } catch (e) {}
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.active) handleTabChange(tab);
  if (changeInfo.title && tab.active) handleTabChange({ ...tab, title: changeInfo.title });
});

chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) return;
  try {
    const [tab] = await chrome.tabs.query({ active: true, windowId });
    if (tab) handleTabChange(tab);
  } catch (e) {}
});

// ── ALARMS ────────────────────────────────────────────
chrome.alarms.create("heartbeat", { periodInMinutes: 5 });
chrome.alarms.create("syncCalendar", { periodInMinutes: 15 });

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "heartbeat" && activeSession && startTime) {
    const now = Date.now();
    const duration = Math.round((now - startTime) / 60000);
    await saveSession(activeSession, activeTitle, duration);
    startTime = now;
  }
  if (alarm.name === "syncCalendar") {
    await fetchTodayEvents();
  }
});

// ── INIT ──────────────────────────────────────────────
// Busca eventos ao iniciar e adiciona o manifest necessário
chrome.runtime.onInstalled.addListener(() => {
  fetchTodayEvents();
});

chrome.runtime.onStartup.addListener(() => {
  fetchTodayEvents();
});

// Permite que o popup solicite sincronização manual
chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  if (msg.action === "syncCalendar") {
    fetchTodayEvents().then(events => reply({ ok: true, count: events.length }));
    return true;
  }
  if (msg.action === "getCalendarEvents") {
    chrome.storage.local.get("calendarEvents").then(d => reply({ events: d.calendarEvents || [] }));
    return true;
  }
});
