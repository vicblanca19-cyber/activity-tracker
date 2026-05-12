import { useState, useEffect, useRef } from "react";

const C = {
  marsala: "#69022D", marsalaLight: "#A0034A",
  acqua: "#91F5CD", acquaDark: "#469D81",
  creme: "#FDF8F1", cremeDeep: "#F5EDE3",
  pink: "#FF63AA", pinkLight: "#FFC1DD", pinkPale: "#FFF2F8",
  green: "#003636", greenMid: "#236A5C",
};

const TOOLS = [
  { id: "slack",      name: "Slack",         icon: "💬", color: C.marsala,   bg: "#F9F0F4" },
  { id: "gcal",       name: "Google Agenda", icon: "📅", color: C.pink,      bg: C.pinkPale },
  { id: "reuniao",    name: "Em Reunião",    icon: "🎥", color: "#7C3AED",   bg: "#F5F0FF" },
  { id: "sheets",     name: "Google Sheets", icon: "📊", color: C.greenMid,  bg: "#F0FAF6" },
  { id: "databricks", name: "Databricks",    icon: "⚡", color: C.acquaDark, bg: "#EDFDF6" },
];

const MOCK_SESSIONS = [
  { tool: "slack",      title: "# geral",              duration: 15,  date: "2026-05-12", time: "08:30" },
  { tool: "gcal",       title: "Planejamento semana",   duration: 10,  date: "2026-05-12", time: "08:50" },
  { tool: "reuniao",    title: "Weekly Standup",        duration: 30,  date: "2026-05-12", time: "09:00" },
  { tool: "sheets",     title: "KPIs Q2",              duration: 72,  date: "2026-05-12", time: "09:35" },
  { tool: "slack",      title: "# data-team",          duration: 20,  date: "2026-05-12", time: "10:47" },
  { tool: "databricks", title: "ETL Pipeline v3",       duration: 95,  date: "2026-05-12", time: "11:10" },
  { tool: "reuniao",    title: "Alinhamento Q2",        duration: 45,  date: "2026-05-12", time: "14:00" },
  { tool: "sheets",     title: "KPIs Q2",              duration: 40,  date: "2026-05-12", time: "14:50" },
  { tool: "gcal",       title: "Agenda semana",        duration: 10,  date: "2026-05-12", time: "15:35" },
  { tool: "slack",      title: "# data-team",          duration: 15,  date: "2026-05-12", time: "15:50" },

  { tool: "slack",      title: "# geral",              duration: 20,  date: "2026-05-11", time: "08:40" },
  { tool: "reuniao",    title: "Weekly Standup",        duration: 30,  date: "2026-05-11", time: "09:00" },
  { tool: "sheets",     title: "KPIs Q2",              duration: 68,  date: "2026-05-11", time: "09:35" },
  { tool: "slack",      title: "# data-team",          duration: 20,  date: "2026-05-11", time: "10:43" },
  { tool: "databricks", title: "ETL Pipeline v3",       duration: 88,  date: "2026-05-11", time: "11:10" },
  { tool: "reuniao",    title: "1:1 com gestor",        duration: 60,  date: "2026-05-11", time: "15:00" },

  { tool: "slack",      title: "# general",            duration: 40,  date: "2026-05-08", time: "08:30" },
  { tool: "reuniao",    title: "Planejamento Sprint",   duration: 90,  date: "2026-05-08", time: "10:00" },
  { tool: "sheets",     title: "Relatório Semanal",    duration: 110, date: "2026-05-08", time: "11:40" },
  { tool: "databricks", title: "Data Review",           duration: 60,  date: "2026-05-08", time: "14:00" },

  { tool: "slack",      title: "# data-team",          duration: 35,  date: "2026-05-07", time: "09:00" },
  { tool: "reuniao",    title: "Weekly Standup",        duration: 30,  date: "2026-05-07", time: "10:00" },
  { tool: "databricks", title: "ETL Pipeline v2",       duration: 120, date: "2026-05-07", time: "11:00" },
  { tool: "sheets",     title: "KPIs Q1 Final",        duration: 50,  date: "2026-05-07", time: "14:00" },
];

function fmt(min) {
  if (!min || min < 1) return "—";
  if (min < 60) return `${min}min`;
  return `${Math.floor(min / 60)}h${min % 60 > 0 ? ` ${min % 60}min` : ""}`;
}
function getTool(id) { return TOOLS.find(t => t.id === id) || TOOLS[0]; }
function totalByTool(tool, list) { return list.filter(s => s.tool === tool).reduce((a, s) => a + s.duration, 0); }
function timeToMin(t) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [sessions, setSessions] = useState(MOCK_SESSIONS);
  const [activeTimer, setActiveTimer] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [activeTitle, setActiveTitle] = useState("");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [goals, setGoals] = useState({ slack: 60, gcal: 60, reuniao: 120, sheets: 120, databricks: 180 });
  const [compareView, setCompareView] = useState("bar");
  const [selectedDate, setSelectedDate] = useState("2026-05-12");
  const [hoveredSession, setHoveredSession] = useState(null);
  const intervalRef = useRef(null);
  const chatRef = useRef(null);

  useEffect(() => {
    if (activeTimer) intervalRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    else clearInterval(intervalRef.current);
    return () => clearInterval(intervalRef.current);
  }, [activeTimer]);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages]);

  function startTimer(toolId) {
    if (activeTimer) stopTimer();
    setActiveTimer(toolId);
    setElapsed(0);
    setActiveTitle(getTool(toolId).name);
  }

  function stopTimer() {
    if (!activeTimer) return;
    const mins = Math.max(1, Math.round(elapsed / 60));
    const today = new Date().toISOString().split("T")[0];
    const now = new Date().toTimeString().slice(0, 5);
    setSessions(s => [...s, { tool: activeTimer, title: activeTitle, duration: mins, date: today, time: now }]);
    setActiveTimer(null);
    setElapsed(0);
  }

  const todaySessions = sessions.filter(s => s.date === new Date().toISOString().split("T")[0]);
  const allDates = [...new Set(sessions.map(s => s.date))].sort().reverse();

  async function sendMessage(msg) {
    if (!msg.trim()) return;
    const userMsg = { role: "user", text: msg };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    const summary = TOOLS.map(t => {
      const total = totalByTool(t.id, sessions);
      const byDay = {};
      sessions.filter(s => s.tool === t.id).forEach(s => { byDay[s.date] = (byDay[s.date] || 0) + s.duration; });
      return `${t.name}: ${fmt(total)} total. Por dia: ${JSON.stringify(byDay)}`;
    }).join("\n");
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: `Você é especialista em automação de produtividade. Dados:\n${summary}\nProponha automações ESPECÍFICAS com ferramentas reais. Responda em português.`,
          messages: newMessages.map(m => ({ role: m.role === "user" ? "user" : "assistant", content: m.text }))
        })
      });
      const data = await res.json();
      setMessages(m => [...m, { role: "assistant", text: data.content?.[0]?.text || "Erro." }]);
    } catch {
      setMessages(m => [...m, { role: "assistant", text: "Erro de conexão." }]);
    }
    setLoading(false);
  }

  const tabs = [
    { id: "dashboard",   label: "Dashboard",   icon: "🏠" },
    { id: "timeline",    label: "Timeline",    icon: "🕐" },
    { id: "reunioes",    label: "Reuniões",    icon: "🎥" },
    { id: "comparativo", label: "Comparativo", icon: "📈" },
    { id: "timer",       label: "Timer",       icon: "⏱️" },
    { id: "goals",       label: "Metas",       icon: "🎯" },
    { id: "ai",          label: "IA",          icon: "🤖" },
  ];

  // ── TIMELINE helpers ──
  const DAY_START = 8 * 60;  // 08:00
  const DAY_END   = 19 * 60; // 19:00
  const DAY_SPAN  = DAY_END - DAY_START;
  const TIMELINE_H = 520;

  const timelineSessions = sessions
    .filter(s => s.date === selectedDate)
    .map(s => ({ ...s, startMin: timeToMin(s.time) }))
    .sort((a, b) => a.startMin - b.startMin);

  function pct(min) { return Math.max(0, Math.min(100, ((min - DAY_START) / DAY_SPAN) * 100)); }
  function widthPct(dur) { return Math.min(100, (dur / DAY_SPAN) * 100); }

  const hours = Array.from({ length: 12 }, (_, i) => i + 8);

  // ── COMPARATIVO ──
  const compareDates = allDates.slice(0, 7).reverse();
  const maxMinutes = Math.max(...compareDates.map(d => {
    const ds = sessions.filter(s => s.date === d);
    return TOOLS.reduce((a, t) => a + totalByTool(t.id, ds), 0);
  }), 1);
  function shortDate(d) {
    return new Date(d + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "short", day: "numeric" });
  }

  // ── REUNIÕES ──
  const meetingSessions = sessions.filter(s => s.tool === "reuniao");
  const meetingByTitle = {};
  meetingSessions.forEach(s => {
    if (!meetingByTitle[s.title]) meetingByTitle[s.title] = { count: 0, total: 0 };
    meetingByTitle[s.title].count++;
    meetingByTitle[s.title].total += s.duration;
  });
  const meetingTotal = meetingSessions.reduce((a, s) => a + s.duration, 0);

  return (
    <div style={{ fontFamily: "Inter, sans-serif", background: C.creme, minHeight: "100vh", color: C.green }}>
      {/* Header */}
      <div style={{ background: C.marsala, color: "white", padding: "14px 20px", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ background: C.acqua, borderRadius: 10, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17 }}>⚡</div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 15 }}>Activity Tracker</div>
          <div style={{ fontSize: 11, color: C.pinkLight }}>AI Automation Advisor</div>
        </div>
        {activeTimer && (
          <div style={{ marginLeft: "auto", background: C.pink, borderRadius: 20, padding: "4px 14px", fontSize: 13, color: "white", fontWeight: 700 }}>
            ● {getTool(activeTimer).icon} {Math.floor(elapsed/60)}:{String(elapsed%60).padStart(2,"0")}
          </div>
        )}
      </div>

      {/* Nav */}
      <div style={{ background: "white", borderBottom: `2px solid ${C.pinkLight}`, display: "flex", overflowX: "auto" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: "11px 13px", border: "none", background: "none", cursor: "pointer",
            borderBottom: tab === t.id ? `3px solid ${C.marsala}` : "3px solid transparent",
            fontWeight: tab === t.id ? 700 : 400, fontSize: 12,
            color: tab === t.id ? C.marsala : "#999", whiteSpace: "nowrap",
            display: "flex", alignItems: "center", gap: 4
          }}>{t.icon} {t.label}</button>
        ))}
      </div>

      <div style={{ padding: 18, maxWidth: 900, margin: "0 auto" }}>

        {/* ── DASHBOARD ── */}
        {tab === "dashboard" && (
          <div>
            <h2 style={{ marginBottom: 14, fontSize: 17, color: C.marsala }}>
              Hoje — {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
            </h2>
            <div style={{ background: "#F5F0FF", border: "1.5px solid #7C3AED44", borderRadius: 14, padding: "14px 18px", marginBottom: 14, display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ fontSize: 30 }}>🎥</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, color: "#7C3AED", fontSize: 14 }}>Em Reunião hoje</div>
                <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>
                  {todaySessions.filter(s => s.tool === "reuniao").map(s => s.title).join(" · ") || "Nenhuma reunião ainda"}
                </div>
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#7C3AED" }}>{fmt(totalByTool("reuniao", todaySessions))}</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 10, marginBottom: 14 }}>
              {TOOLS.filter(t => t.id !== "reuniao").map(t => {
                const total = totalByTool(t.id, todaySessions);
                const pct2 = Math.min(100, Math.round((total / goals[t.id]) * 100));
                return (
                  <div key={t.id} style={{ background: "white", borderRadius: 12, padding: 14, border: `1.5px solid ${C.pinkLight}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <span style={{ fontWeight: 700, fontSize: 13 }}>{t.icon} {t.name}</span>
                      <span style={{ fontSize: 13, color: t.color, fontWeight: 800 }}>{fmt(total)}</span>
                    </div>
                    <div style={{ background: C.cremeDeep, borderRadius: 6, height: 7 }}>
                      <div style={{ width: `${pct2}%`, background: `linear-gradient(90deg,${t.color},${C.acqua})`, height: 7, borderRadius: 6 }} />
                    </div>
                    <div style={{ fontSize: 11, color: "#bbb", marginTop: 4 }}>{pct2}% da meta</div>
                  </div>
                );
              })}
            </div>
            <div style={{ background: "white", borderRadius: 12, padding: 14, border: `1.5px solid ${C.pinkLight}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <h3 style={{ margin: 0, fontSize: 13, color: C.marsala }}>⏱️ Sessões de hoje</h3>
                <button onClick={() => { setSelectedDate("2026-05-12"); setTab("timeline"); }}
                  style={{ background: "none", border: `1px solid ${C.pinkLight}`, borderRadius: 8, padding: "4px 10px", cursor: "pointer", fontSize: 11, color: C.marsala, fontWeight: 600 }}>
                  Ver timeline →
                </button>
              </div>
              {todaySessions.length === 0 && <div style={{ color: "#ccc", fontSize: 13 }}>Nenhuma sessão ainda.</div>}
              {todaySessions.map((s, i) => {
                const t = getTool(s.tool);
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: i < todaySessions.length-1 ? `1px solid ${C.cremeDeep}` : "none" }}>
                    <div style={{ background: t.bg, borderRadius: 7, padding: "5px 9px", fontSize: 14 }}>{t.icon}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{s.title}</div>
                      <div style={{ fontSize: 11, color: "#ccc" }}>{s.time}</div>
                    </div>
                    <span style={{ fontSize: 13, color: t.color, fontWeight: 700 }}>{fmt(s.duration)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── TIMELINE ── */}
        {tab === "timeline" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div>
                <h2 style={{ fontSize: 17, color: C.marsala, margin: 0 }}>🕐 Linha do Tempo</h2>
                <p style={{ color: "#aaa", fontSize: 12, margin: "2px 0 0" }}>Visualização hora a hora do seu dia</p>
              </div>
              <select value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
                style={{ border: `1.5px solid ${C.pinkLight}`, borderRadius: 8, padding: "7px 12px", fontSize: 13, color: C.green, background: "white", cursor: "pointer", fontWeight: 600 }}>
                {allDates.map(d => (
                  <option key={d} value={d}>
                    {new Date(d + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "short" })}
                  </option>
                ))}
              </select>
            </div>

            {/* Legend */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
              {TOOLS.map(t => (
                <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 5, background: "white", borderRadius: 8, padding: "4px 10px", border: `1px solid ${C.pinkLight}`, fontSize: 11 }}>
                  <div style={{ width: 9, height: 9, borderRadius: 2, background: t.color }} />
                  {t.icon} {t.name}
                </div>
              ))}
            </div>

            {/* Timeline */}
            <div style={{ background: "white", borderRadius: 14, padding: "20px 16px", border: `1.5px solid ${C.pinkLight}`, overflowX: "auto" }}>
              <div style={{ position: "relative", minWidth: 600 }}>

                {/* Hour labels + grid lines */}
                <div style={{ position: "relative", height: TIMELINE_H }}>
                  {hours.map(h => {
                    const left = `${((h * 60 - DAY_START) / DAY_SPAN) * 100}%`;
                    return (
                      <div key={h} style={{ position: "absolute", left, top: 0, bottom: 0, display: "flex", flexDirection: "column" }}>
                        <div style={{ fontSize: 10, color: "#bbb", fontWeight: 600, marginBottom: 4, whiteSpace: "nowrap" }}>{h}h</div>
                        <div style={{ width: 1, flex: 1, background: h === 12 ? "#e0d0e8" : "#f0f0f0" }} />
                      </div>
                    );
                  })}

                  {/* Session blocks — stacked by tool row */}
                  {TOOLS.map((t, ti) => {
                    const toolSessions = timelineSessions.filter(s => s.tool === t.id);
                    const rowTop = 24 + ti * 86;
                    return (
                      <div key={t.id}>
                        {/* Row label */}
                        <div style={{ position: "absolute", left: 0, top: rowTop, fontSize: 11, color: "#bbb", fontWeight: 600, whiteSpace: "nowrap", zIndex: 2 }}>
                          {t.icon}
                        </div>
                        {/* Row background */}
                        <div style={{ position: "absolute", left: "3%", right: 0, top: rowTop + 2, height: 68, background: ti % 2 === 0 ? "#fafafa" : "white", borderRadius: 8 }} />
                        {/* Session blocks */}
                        {toolSessions.map((s, si) => {
                          const leftPct = pct(s.startMin);
                          const wPct = widthPct(s.duration);
                          const isHovered = hoveredSession === `${t.id}-${si}`;
                          return (
                            <div key={si}
                              onMouseEnter={() => setHoveredSession(`${t.id}-${si}`)}
                              onMouseLeave={() => setHoveredSession(null)}
                              style={{
                                position: "absolute",
                                left: `calc(3% + ${leftPct}% * 0.97)`,
                                width: `calc(${wPct}% * 0.97)`,
                                top: rowTop + 6,
                                height: 56,
                                background: isHovered ? t.color : t.color + "CC",
                                borderRadius: 8,
                                padding: "5px 8px",
                                cursor: "pointer",
                                overflow: "hidden",
                                zIndex: isHovered ? 10 : 3,
                                boxShadow: isHovered ? `0 4px 14px ${t.color}66` : "none",
                                transition: "all 0.15s",
                                minWidth: 6,
                              }}>
                              {wPct > 4 && (
                                <>
                                  <div style={{ fontSize: 10, fontWeight: 700, color: "white", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.title}</div>
                                  <div style={{ fontSize: 9, color: "rgba(255,255,255,0.85)", marginTop: 2 }}>{s.time} · {fmt(s.duration)}</div>
                                </>
                              )}
                              {/* Tooltip */}
                              {isHovered && (
                                <div style={{
                                  position: "absolute", bottom: "110%", left: "50%", transform: "translateX(-50%)",
                                  background: "#1a1a2e", color: "white", borderRadius: 8, padding: "7px 12px",
                                  fontSize: 11, whiteSpace: "nowrap", zIndex: 20, pointerEvents: "none",
                                  boxShadow: "0 4px 12px #0003"
                                }}>
                                  <div style={{ fontWeight: 700 }}>{t.icon} {s.title}</div>
                                  <div style={{ color: "#aaa", marginTop: 2 }}>🕐 {s.time} &nbsp;·&nbsp; ⏱ {fmt(s.duration)}</div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                        {toolSessions.length === 0 && (
                          <div style={{ position: "absolute", left: "3%", top: rowTop + 22, fontSize: 10, color: "#ddd" }}>sem atividade</div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Current time indicator for today */}
                {selectedDate === new Date().toISOString().split("T")[0] && (() => {
                  const now = new Date();
                  const nowMin = now.getHours() * 60 + now.getMinutes();
                  if (nowMin < DAY_START || nowMin > DAY_END) return null;
                  return (
                    <div style={{ position: "absolute", left: `calc(3% + ${pct(nowMin)}% * 0.97)`, top: 0, bottom: 0, width: 2, background: C.pink, zIndex: 15, borderRadius: 2 }}>
                      <div style={{ position: "absolute", top: -6, left: "50%", transform: "translateX(-50%)", background: C.pink, color: "white", fontSize: 9, borderRadius: 4, padding: "1px 5px", whiteSpace: "nowrap", fontWeight: 700 }}>agora</div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Day summary */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginTop: 14 }}>
              {(() => {
                const ds = sessions.filter(s => s.date === selectedDate);
                const total = ds.reduce((a, s) => a + s.duration, 0);
                const firstSession = ds.sort((a, b) => timeToMin(a.time) - timeToMin(b.time))[0];
                const lastSession = ds.sort((a, b) => timeToMin(b.time) - timeToMin(a.time))[0];
                return [
                  { label: "Total rastreado", value: fmt(total), icon: "⏱️" },
                  { label: "Primeiro registro", value: firstSession?.time || "—", icon: "🌅" },
                  { label: "Último registro", value: lastSession ? `${lastSession.time}` : "—", icon: "🌙" },
                ].map((c, i) => (
                  <div key={i} style={{ background: "white", borderRadius: 12, padding: 14, border: `1.5px solid ${C.pinkLight}`, textAlign: "center" }}>
                    <div style={{ fontSize: 20 }}>{c.icon}</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: C.marsala, margin: "4px 0" }}>{c.value}</div>
                    <div style={{ fontSize: 11, color: "#aaa" }}>{c.label}</div>
                  </div>
                ));
              })()}
            </div>

            {/* Session list */}
            <div style={{ background: "white", borderRadius: 12, padding: 14, border: `1.5px solid ${C.pinkLight}`, marginTop: 14 }}>
              <h3 style={{ margin: "0 0 10px", fontSize: 13, color: C.marsala }}>📋 Sessões do dia</h3>
              {timelineSessions.map((s, i) => {
                const t = getTool(s.tool);
                const endMin = s.startMin + s.duration;
                const endH = Math.floor(endMin / 60);
                const endM = endMin % 60;
                const endTime = `${String(endH).padStart(2,"0")}:${String(endM).padStart(2,"0")}`;
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: i < timelineSessions.length-1 ? `1px solid ${C.cremeDeep}` : "none" }}>
                    <div style={{ background: t.bg, borderRadius: 7, padding: "5px 9px", fontSize: 14 }}>{t.icon}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{s.title}</div>
                      <div style={{ fontSize: 11, color: "#bbb" }}>{s.time} → {endTime}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 13, color: t.color, fontWeight: 700 }}>{fmt(s.duration)}</div>
                      <div style={{ fontSize: 10, color: "#ccc" }}>{t.name}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── REUNIÕES ── */}
        {tab === "reunioes" && (
          <div>
            <h2 style={{ marginBottom: 4, fontSize: 17, color: C.marsala }}>🎥 Análise de Reuniões</h2>
            <p style={{ color: "#aaa", fontSize: 13, marginBottom: 14 }}>Rastreado via Google Calendar</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 16 }}>
              {[
                { label: "Total geral", value: fmt(meetingTotal), icon: "⏱️" },
                { label: "Reuniões únicas", value: Object.keys(meetingByTitle).length, icon: "📋" },
                { label: "Média por dia", value: fmt(Math.round(meetingTotal / Math.max(allDates.length, 1))), icon: "📅" },
              ].map((c, i) => (
                <div key={i} style={{ background: "white", borderRadius: 12, padding: 14, border: "1.5px solid #7C3AED33", textAlign: "center" }}>
                  <div style={{ fontSize: 20 }}>{c.icon}</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "#7C3AED", margin: "4px 0" }}>{c.value}</div>
                  <div style={{ fontSize: 11, color: "#aaa" }}>{c.label}</div>
                </div>
              ))}
            </div>
            <div style={{ background: "white", borderRadius: 12, padding: 16, border: `1.5px solid ${C.pinkLight}`, marginBottom: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: C.marsala, marginBottom: 12 }}>⏱️ Por dia</div>
              {allDates.slice(0, 7).map(d => {
                const ds = sessions.filter(s => s.date === d && s.tool === "reuniao");
                const total = ds.reduce((a, s) => a + s.duration, 0);
                return (
                  <div key={d} style={{ marginBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                      <span style={{ fontWeight: 600 }}>{shortDate(d)}</span>
                      <span style={{ color: "#7C3AED", fontWeight: 700 }}>{fmt(total)}</span>
                    </div>
                    <div style={{ background: C.cremeDeep, borderRadius: 6, height: 8 }}>
                      <div style={{ width: `${Math.min(100, Math.round((total / 480) * 100))}%`, background: "linear-gradient(90deg,#7C3AED,#A78BFA)", height: 8, borderRadius: 6 }} />
                    </div>
                    <div style={{ fontSize: 10, color: "#ccc", marginTop: 2 }}>{ds.map(s => s.title).join(" · ") || "Sem reuniões"}</div>
                  </div>
                );
              })}
            </div>
            <div style={{ background: "white", borderRadius: 12, padding: 16, border: `1.5px solid ${C.pinkLight}` }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: C.marsala, marginBottom: 12 }}>🔁 Recorrentes</div>
              {Object.entries(meetingByTitle).sort((a, b) => b[1].total - a[1].total).map(([title, info]) => (
                <div key={title} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: `1px solid ${C.cremeDeep}` }}>
                  <div style={{ background: "#F5F0FF", borderRadius: 8, padding: "6px 10px", fontSize: 15 }}>🎥</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{title}</div>
                    <div style={{ fontSize: 11, color: "#bbb" }}>{info.count}x · {fmt(Math.round(info.total / info.count))} por sessão</div>
                  </div>
                  <div style={{ fontWeight: 800, color: "#7C3AED", fontSize: 14 }}>{fmt(info.total)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── COMPARATIVO ── */}
        {tab === "comparativo" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div>
                <h2 style={{ fontSize: 17, color: C.marsala, margin: 0 }}>📈 Comparativo</h2>
                <p style={{ color: "#aaa", fontSize: 12, margin: "2px 0 0" }}>Últimos 7 dias</p>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                {["bar", "table"].map(v => (
                  <button key={v} onClick={() => setCompareView(v)} style={{
                    padding: "6px 12px", borderRadius: 8, border: `1.5px solid ${C.pinkLight}`,
                    background: compareView === v ? C.marsala : "white",
                    color: compareView === v ? "white" : C.green,
                    cursor: "pointer", fontSize: 12, fontWeight: 600
                  }}>{v === "bar" ? "📊 Gráfico" : "📋 Tabela"}</button>
                ))}
              </div>
            </div>

            {compareView === "bar" && (
              <div>
                <div style={{ background: "white", borderRadius: 14, padding: 20, border: `1.5px solid ${C.pinkLight}`, marginBottom: 12 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "flex-end", height: 180 }}>
                    {compareDates.map(d => {
                      const ds = sessions.filter(s => s.date === d);
                      const totalDay = TOOLS.reduce((a, t) => a + totalByTool(t.id, ds), 0);
                      const barH = Math.round((totalDay / maxMinutes) * 160);
                      return (
                        <div key={d} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                          <div style={{ fontSize: 10, color: C.marsala, fontWeight: 700 }}>{fmt(totalDay)}</div>
                          <div style={{ width: "100%", height: barH, display: "flex", flexDirection: "column-reverse", borderRadius: "6px 6px 0 0", overflow: "hidden", minHeight: 4 }}>
                            {TOOLS.map(t => {
                              const val = totalByTool(t.id, ds);
                              const h = totalDay > 0 ? Math.round((val / totalDay) * barH) : 0;
                              return h > 0 ? <div key={t.id} style={{ width: "100%", height: h, background: t.color, opacity: 0.85 }} /> : null;
                            })}
                          </div>
                          <div style={{ fontSize: 10, color: "#aaa", textAlign: "center" }}>{shortDate(d)}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                  {TOOLS.map(t => (
                    <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 5, background: "white", borderRadius: 8, padding: "5px 10px", border: `1px solid ${C.pinkLight}`, fontSize: 11 }}>
                      <div style={{ width: 9, height: 9, borderRadius: 2, background: t.color }} />
                      {t.icon} {t.name}
                    </div>
                  ))}
                </div>
                {TOOLS.map(t => {
                  const vals = compareDates.map(d => totalByTool(t.id, sessions.filter(s => s.date === d)));
                  const maxV = Math.max(...vals, 1);
                  return (
                    <div key={t.id} style={{ background: "white", borderRadius: 12, padding: 14, border: `1.5px solid ${C.pinkLight}`, marginBottom: 8 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: t.color }}>{t.icon} {t.name}</div>
                      <div style={{ display: "flex", gap: 6, alignItems: "flex-end", height: 48 }}>
                        {vals.map((v, i) => (
                          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                            <div style={{ width: "100%", height: Math.max(4, Math.round((v / maxV) * 42)), background: t.color, borderRadius: "4px 4px 0 0", opacity: 0.8 }} />
                            <div style={{ fontSize: 9, color: "#bbb" }}>{shortDate(compareDates[i]).split(" ")[0]}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {compareView === "table" && (
              <div style={{ background: "white", borderRadius: 14, border: `1.5px solid ${C.pinkLight}`, overflow: "hidden" }}>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: C.marsala, color: "white" }}>
                        <th style={{ padding: "10px 14px", textAlign: "left" }}>Ferramenta</th>
                        {compareDates.map(d => <th key={d} style={{ padding: "10px 10px", textAlign: "center" }}>{shortDate(d)}</th>)}
                        <th style={{ padding: "10px 10px", textAlign: "center" }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {TOOLS.map((t, ti) => {
                        const vals = compareDates.map(d => totalByTool(t.id, sessions.filter(s => s.date === d)));
                        return (
                          <tr key={t.id} style={{ background: ti % 2 === 0 ? C.creme : "white" }}>
                            <td style={{ padding: "10px 14px", fontWeight: 600, color: t.color }}>{t.icon} {t.name}</td>
                            {vals.map((v, i) => <td key={i} style={{ padding: "10px 10px", textAlign: "center", color: v > 0 ? t.color : "#ddd", fontWeight: v > 0 ? 700 : 400 }}>{v > 0 ? fmt(v) : "—"}</td>)}
                            <td style={{ padding: "10px 10px", textAlign: "center", fontWeight: 800, color: C.marsala }}>{fmt(vals.reduce((a, b) => a + b, 0))}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── TIMER ── */}
        {tab === "timer" && (
          <div>
            <h2 style={{ marginBottom: 4, fontSize: 17, color: C.marsala }}>⏱️ Timer Manual</h2>
            <p style={{ color: "#aaa", fontSize: 13, marginBottom: 14 }}>Use quando a extensão não estiver ativa</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 10, marginBottom: 14 }}>
              {TOOLS.map(t => (
                <button key={t.id} onClick={() => activeTimer === t.id ? stopTimer() : startTimer(t.id)}
                  style={{ background: activeTimer === t.id ? t.color : "white", color: activeTimer === t.id ? "white" : C.green, border: `2px solid ${activeTimer === t.id ? t.color : C.pinkLight}`, borderRadius: 14, padding: "16px 14px", cursor: "pointer", fontWeight: 700, fontSize: 13, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, transition: "all 0.2s" }}>
                  <span style={{ fontSize: 24 }}>{t.icon}</span>
                  {t.name}
                  {activeTimer === t.id && <span style={{ fontSize: 18, fontWeight: 800 }}>{Math.floor(elapsed/60)}:{String(elapsed%60).padStart(2,"0")}</span>}
                  <span style={{ fontSize: 11, opacity: 0.8 }}>{activeTimer === t.id ? "⏹ Parar" : "▶ Iniciar"}</span>
                </button>
              ))}
            </div>
            {activeTimer && (
              <div style={{ background: C.pinkPale, borderRadius: 14, padding: 18, textAlign: "center", border: `1.5px solid ${C.pinkLight}` }}>
                <div style={{ fontWeight: 700, color: C.marsala }}>{getTool(activeTimer).icon} {getTool(activeTimer).name}</div>
                <div style={{ fontSize: 34, fontWeight: 800, margin: "8px 0", color: C.marsala }}>{Math.floor(elapsed/60)}:{String(elapsed%60).padStart(2,"0")}</div>
                <button onClick={stopTimer} style={{ background: C.marsala, color: "white", border: "none", borderRadius: 10, padding: "11px 26px", cursor: "pointer", fontWeight: 700 }}>⏹ Finalizar</button>
              </div>
            )}
          </div>
        )}

        {/* ── GOALS ── */}
        {tab === "goals" && (
          <div>
            <h2 style={{ marginBottom: 4, fontSize: 17, color: C.marsala }}>🎯 Metas Diárias</h2>
            <p style={{ color: "#aaa", fontSize: 13, marginBottom: 14 }}>Tempo ideal por ferramenta por dia</p>
            {TOOLS.map(t => {
              const total = totalByTool(t.id, todaySessions);
              const goal = goals[t.id];
              const p = Math.min(100, Math.round((total / goal) * 100));
              return (
                <div key={t.id} style={{ background: "white", borderRadius: 14, padding: 18, marginBottom: 10, border: `1.5px solid ${C.pinkLight}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <span style={{ fontWeight: 700, fontSize: 14 }}>{t.icon} {t.name}</span>
                    <span style={{ color: p >= 100 ? C.acquaDark : t.color, fontWeight: 800 }}>{fmt(total)} / {fmt(goal)}</span>
                  </div>
                  <div style={{ background: C.cremeDeep, borderRadius: 8, height: 10, marginBottom: 12 }}>
                    <div style={{ width: `${p}%`, background: p >= 100 ? `linear-gradient(90deg,${C.acquaDark},${C.acqua})` : `linear-gradient(90deg,${t.color},${C.pink})`, height: 10, borderRadius: 8 }} />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 12, color: "#aaa" }}>Meta:</span>
                    <input type="range" min="15" max="480" step="15" value={goal} onChange={e => setGoals(g => ({ ...g, [t.id]: Number(e.target.value) }))} style={{ flex: 1, accentColor: C.marsala }} />
                    <span style={{ fontSize: 13, fontWeight: 700, minWidth: 44, color: C.marsala }}>{fmt(goal)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── AI ── */}
        {tab === "ai" && (
          <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 200px)" }}>
            <h2 style={{ marginBottom: 4, fontSize: 17, color: C.marsala }}>🤖 AI Automation Advisor</h2>
            <p style={{ color: "#aaa", fontSize: 13, marginBottom: 10 }}>Analisa seus padrões e propõe automações específicas</p>
            {messages.length === 0 && (
              <div style={{ background: "white", borderRadius: 14, padding: 16, marginBottom: 10, border: `1.5px solid ${C.pinkLight}` }}>
                <div style={{ fontWeight: 700, marginBottom: 10, color: C.marsala }}>💡 Sugestões</div>
                {["Analise meu histórico e me diga o que posso automatizar", "Estou em muitas reuniões — como otimizar?", "Como automatizar relatórios no Google Sheets?", "Como agendar jobs no Databricks automaticamente?"]
                  .map((s, i) => (
                    <button key={i} onClick={() => sendMessage(s)} style={{ display: "block", width: "100%", textAlign: "left", background: C.creme, border: `1px solid ${C.pinkLight}`, borderRadius: 8, padding: "9px 12px", marginBottom: 6, cursor: "pointer", fontSize: 13, color: C.green }}>→ {s}</button>
                  ))}
                <button onClick={() => sendMessage("Analise meu histórico completo incluindo reuniões e diga quais tarefas são mais repetitivas e como automatizá-las.")}
                  style={{ background: `linear-gradient(135deg,${C.marsala},${C.marsalaLight})`, color: "white", border: "none", borderRadius: 10, padding: "12px 20px", cursor: "pointer", fontWeight: 700, width: "100%", marginTop: 4, fontSize: 13 }}>
                  🔍 Análise Automática Completa
                </button>
              </div>
            )}
            <div ref={chatRef} style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10, marginBottom: 10 }}>
              {messages.map((m, i) => (
                <div key={i} style={{ alignSelf: m.role === "user" ? "flex-end" : "flex-start", background: m.role === "user" ? C.marsala : "white", color: m.role === "user" ? "white" : C.green, borderRadius: 12, padding: "11px 14px", maxWidth: "85%", fontSize: 13, lineHeight: 1.7, border: m.role === "assistant" ? `1.5px solid ${C.pinkLight}` : "none", whiteSpace: "pre-wrap" }}>{m.text}</div>
              ))}
              {loading && <div style={{ alignSelf: "flex-start", background: "white", borderRadius: 12, padding: "11px 14px", border: `1.5px solid ${C.pinkLight}`, color: "#aaa", fontSize: 13 }}>🤖 Analisando...</div>}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && !loading && sendMessage(input)} placeholder="Pergunte sobre automações..." style={{ flex: 1, borderRadius: 10, border: `1.5px solid ${C.pinkLight}`, padding: "11px 14px", fontSize: 13, outline: "none", background: "white", color: C.green }} />
              <button onClick={() => sendMessage(input)} disabled={loading || !input.trim()} style={{ background: C.marsala, color: "white", border: "none", borderRadius: 10, padding: "0 18px", cursor: "pointer", fontWeight: 700, fontSize: 16 }}>➤</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
