import { useState, useEffect, useMemo, useRef, useCallback } from "react";

/* ============================================================
   FIFA WORLD CUP 2026 — INTERACTIVE MATCH SCHEDULE
   All 104 matches · kickoffs stored as Argentina time (UTC-3)
   ============================================================ */

const ART = "-03:00"; // all kickoffs stored at UTC-3
const k = (d, t) => new Date(`2026-${d}T${t}:00${ART}`).getTime();

/* ---------- Teams (FIFA ranking · April 2026) ---------- */
const TEAMS = {
  MEX: { name: "Mexico", flag: "🇲🇽", rank: 15 },
  RSA: { name: "South Africa", flag: "🇿🇦", rank: 60 },
  KOR: { name: "South Korea", flag: "🇰🇷", rank: 25 },
  CZE: { name: "Czechia", flag: "🇨🇿", rank: 41 },
  CAN: { name: "Canada", flag: "🇨🇦", rank: 30 },
  BIH: { name: "Bosnia & Herz.", flag: "🇧🇦", rank: 65 },
  QAT: { name: "Qatar", flag: "🇶🇦", rank: 55 },
  SUI: { name: "Switzerland", flag: "🇨🇭", rank: 19 },
  BRA: { name: "Brazil", flag: "🇧🇷", rank: 6 },
  MAR: { name: "Morocco", flag: "🇲🇦", rank: 8 },
  HAI: { name: "Haiti", flag: "🇭🇹", rank: 83 },
  SCO: { name: "Scotland", flag: "🟦", rank: 43 },
  USA: { name: "USA", flag: "🇺🇸", rank: 16 },
  PAR: { name: "Paraguay", flag: "🇵🇾", rank: 40 },
  AUS: { name: "Australia", flag: "🇦🇺", rank: 27 },
  TUR: { name: "Türkiye", flag: "🇹🇷", rank: 22 },
  GER: { name: "Germany", flag: "🇩🇪", rank: 10 },
  CUW: { name: "Curaçao", flag: "🇨🇼", rank: 82 },
  CIV: { name: "Ivory Coast", flag: "🇨🇮", rank: 34 },
  ECU: { name: "Ecuador", flag: "🇪🇨", rank: 23 },
  NED: { name: "Netherlands", flag: "🇳🇱", rank: 7 },
  JPN: { name: "Japan", flag: "🇯🇵", rank: 18 },
  SWE: { name: "Sweden", flag: "🇸🇪", rank: 38 },
  TUN: { name: "Tunisia", flag: "🇹🇳", rank: 44 },
  BEL: { name: "Belgium", flag: "🇧🇪", rank: 9 },
  EGY: { name: "Egypt", flag: "🇪🇬", rank: 29 },
  IRN: { name: "Iran", flag: "🇮🇷", rank: 21 },
  NZL: { name: "New Zealand", flag: "🇳🇿", rank: 85 },
  ESP: { name: "Spain", flag: "🇪🇸", rank: 2 },
  CPV: { name: "Cape Verde", flag: "🇨🇻", rank: 69 },
  KSA: { name: "Saudi Arabia", flag: "🇸🇦", rank: 61 },
  URU: { name: "Uruguay", flag: "🇺🇾", rank: 17 },
  FRA: { name: "France", flag: "🇫🇷", rank: 1 },
  SEN: { name: "Senegal", flag: "🇸🇳", rank: 14 },
  IRQ: { name: "Iraq", flag: "🇮🇶", rank: 57 },
  NOR: { name: "Norway", flag: "🇳🇴", rank: 31 },
  ARG: { name: "Argentina", flag: "🇦🇷", rank: 3 },
  ALG: { name: "Algeria", flag: "🇩🇿", rank: 28 },
  AUT: { name: "Austria", flag: "🇦🇹", rank: 24 },
  JOR: { name: "Jordan", flag: "🇯🇴", rank: 63 },
  POR: { name: "Portugal", flag: "🇵🇹", rank: 5 },
  COD: { name: "DR Congo", flag: "🇨🇩", rank: 46 },
  UZB: { name: "Uzbekistan", flag: "🇺🇿", rank: 50 },
  COL: { name: "Colombia", flag: "🇨🇴", rank: 13 },
  ENG: { name: "England", flag: "🇬🇧", rank: 4 },
  CRO: { name: "Croatia", flag: "🇭🇷", rank: 11 },
  GHA: { name: "Ghana", flag: "🇬🇭", rank: 74 },
  PAN: { name: "Panama", flag: "🇵🇦", rank: 33 },
};
const NAME_TO_KEY = Object.fromEntries(Object.entries(TEAMS).map(([key, t]) => [t.name.toLowerCase(), key]));
const ALIASES = {
  "united states": "USA", "south korea": "KOR", "korea republic": "KOR", "czech republic": "CZE",
  "bosnia and herzegovina": "BIH", "bosnia & herzegovina": "BIH", "bosnia": "BIH", "turkey": "TUR",
  "turkiye": "TUR", "côte d'ivoire": "CIV", "cote d'ivoire": "CIV", "dr congo": "COD",
  "democratic republic of congo": "COD", "democratic republic of the congo": "COD", "curacao": "CUW",
  "cabo verde": "CPV", "ir iran": "IRN",
};
const teamKeyFromName = (n) => {
  if (!n) return null;
  const s = String(n).trim().toLowerCase();
  return NAME_TO_KEY[s] || ALIASES[s] || null;
};

const GROUPS = {
  A: ["MEX", "RSA", "KOR", "CZE"], B: ["CAN", "BIH", "QAT", "SUI"], C: ["BRA", "MAR", "HAI", "SCO"],
  D: ["USA", "PAR", "AUS", "TUR"], E: ["GER", "CUW", "CIV", "ECU"], F: ["NED", "JPN", "SWE", "TUN"],
  G: ["BEL", "EGY", "IRN", "NZL"], H: ["ESP", "CPV", "KSA", "URU"], I: ["FRA", "SEN", "IRQ", "NOR"],
  J: ["ARG", "ALG", "AUT", "JOR"], K: ["POR", "COD", "UZB", "COL"], L: ["ENG", "CRO", "GHA", "PAN"],
};

/* ---------- Venues ---------- */
const VENUES = {
  azteca: { stadium: "Estadio Azteca", city: "Mexico City, Mexico" },
  akron: { stadium: "Estadio Akron", city: "Guadalajara, Mexico" },
  bbva: { stadium: "Estadio BBVA", city: "Monterrey, Mexico" },
  bmo: { stadium: "BMO Field", city: "Toronto, Canada" },
  bcplace: { stadium: "BC Place", city: "Vancouver, Canada" },
  sofi: { stadium: "SoFi Stadium", city: "Los Angeles, USA" },
  levis: { stadium: "Levi's Stadium", city: "San Francisco Bay Area, USA" },
  lumen: { stadium: "Lumen Field", city: "Seattle, USA" },
  att: { stadium: "AT&T Stadium", city: "Dallas, USA" },
  nrg: { stadium: "NRG Stadium", city: "Houston, USA" },
  arrowhead: { stadium: "Arrowhead Stadium", city: "Kansas City, USA" },
  mbs: { stadium: "Mercedes-Benz Stadium", city: "Atlanta, USA" },
  hardrock: { stadium: "Hard Rock Stadium", city: "Miami, USA" },
  metlife: { stadium: "MetLife Stadium", city: "New York / New Jersey, USA" },
  lff: { stadium: "Lincoln Financial Field", city: "Philadelphia, USA" },
  gillette: { stadium: "Gillette Stadium", city: "Boston, USA" },
};

/* ---------- All 104 matches (kickoffs in UTC-3) ---------- */
// Group stage: { id, st (stage), g (group), h, a, v (venue), t }
const GS = [
  ["g1","MD1","A","MEX","RSA","azteca","06-11","16:00"],["g2","MD1","A","KOR","CZE","akron","06-11","23:00"],
  ["g3","MD1","B","CAN","BIH","bmo","06-12","16:00"],["g4","MD1","D","USA","PAR","sofi","06-12","22:00"],
  ["g5","MD1","B","QAT","SUI","levis","06-13","16:00"],["g6","MD1","C","BRA","MAR","metlife","06-13","19:00"],
  ["g7","MD1","C","HAI","SCO","gillette","06-13","22:00"],["g8","MD1","D","AUS","TUR","bcplace","06-14","01:00"],
  ["g9","MD1","E","GER","CUW","nrg","06-14","14:00"],["g10","MD1","F","NED","JPN","att","06-14","17:00"],
  ["g11","MD1","E","CIV","ECU","lff","06-14","20:00"],["g12","MD1","F","SWE","TUN","bbva","06-14","23:00"],
  ["g13","MD1","H","ESP","CPV","mbs","06-15","13:00"],["g14","MD1","G","BEL","EGY","lumen","06-15","16:00"],
  ["g15","MD1","H","KSA","URU","hardrock","06-15","19:00"],["g16","MD1","G","IRN","NZL","sofi","06-15","22:00"],
  ["g17","MD1","I","FRA","SEN","metlife","06-16","16:00"],["g18","MD1","I","IRQ","NOR","gillette","06-16","19:00"],
  ["g19","MD1","J","ARG","ALG","arrowhead","06-16","22:00"],["g20","MD1","J","AUT","JOR","levis","06-17","01:00"],
  ["g21","MD1","K","POR","COD","nrg","06-17","14:00"],["g22","MD1","L","ENG","CRO","att","06-17","17:00"],
  ["g23","MD1","L","GHA","PAN","bmo","06-17","20:00"],["g24","MD1","K","UZB","COL","azteca","06-17","23:00"],
  ["g25","MD2","A","CZE","RSA","mbs","06-18","13:00"],["g26","MD2","B","SUI","BIH","sofi","06-18","16:00"],
  ["g27","MD2","B","CAN","QAT","bcplace","06-18","19:00"],["g28","MD2","A","MEX","KOR","akron","06-18","22:00"],
  ["g29","MD2","D","USA","AUS","lumen","06-19","16:00"],["g30","MD2","C","SCO","MAR","gillette","06-19","19:00"],
  ["g31","MD2","C","BRA","HAI","lff","06-19","22:00"],["g32","MD2","D","TUR","PAR","levis","06-20","01:00"],
  ["g33","MD2","F","NED","SWE","nrg","06-20","14:00"],["g34","MD2","E","GER","CIV","bmo","06-20","17:00"],
  ["g35","MD2","E","ECU","CUW","arrowhead","06-20","21:00"],["g36","MD2","F","TUN","JPN","bbva","06-21","01:00"],
  ["g37","MD2","H","ESP","KSA","mbs","06-21","13:00"],["g38","MD2","G","BEL","IRN","sofi","06-21","16:00"],
  ["g39","MD2","H","URU","CPV","hardrock","06-21","19:00"],["g40","MD2","G","NZL","EGY","bcplace","06-21","22:00"],
  ["g41","MD2","J","ARG","AUT","att","06-22","14:00"],["g42","MD2","I","FRA","IRQ","lff","06-22","18:00"],
  ["g43","MD2","I","NOR","SEN","metlife","06-22","21:00"],["g44","MD2","J","JOR","ALG","levis","06-23","00:00"],
  ["g45","MD2","K","POR","UZB","nrg","06-23","14:00"],["g46","MD2","L","ENG","GHA","gillette","06-23","17:00"],
  ["g47","MD2","L","PAN","CRO","bmo","06-23","20:00"],["g48","MD2","K","COL","COD","akron","06-23","23:00"],
  ["g49","MD3","B","SUI","CAN","bcplace","06-24","16:00"],["g50","MD3","B","BIH","QAT","lumen","06-24","16:00"],
  ["g51","MD3","C","SCO","BRA","hardrock","06-24","19:00"],["g52","MD3","C","MAR","HAI","mbs","06-24","19:00"],
  ["g53","MD3","A","CZE","MEX","azteca","06-24","22:00"],["g54","MD3","A","RSA","KOR","bbva","06-24","22:00"],
  ["g55","MD3","E","ECU","GER","metlife","06-25","17:00"],["g56","MD3","E","CUW","CIV","lff","06-25","17:00"],
  ["g57","MD3","F","JPN","SWE","att","06-25","20:00"],["g58","MD3","F","TUN","NED","arrowhead","06-25","20:00"],
  ["g59","MD3","D","TUR","USA","sofi","06-25","23:00"],["g60","MD3","D","PAR","AUS","levis","06-25","23:00"],
  ["g61","MD3","I","NOR","FRA","gillette","06-26","16:00"],["g62","MD3","I","SEN","IRQ","bmo","06-26","16:00"],
  ["g63","MD3","H","CPV","KSA","nrg","06-26","21:00"],["g64","MD3","H","URU","ESP","akron","06-26","21:00"],
  ["g65","MD3","G","EGY","IRN","lumen","06-27","00:00"],["g66","MD3","G","NZL","BEL","bcplace","06-27","00:00"],
  ["g67","MD3","L","PAN","ENG","metlife","06-27","18:00"],["g68","MD3","L","CRO","GHA","lff","06-27","18:00"],
  ["g69","MD3","K","COL","POR","hardrock","06-27","20:30"],["g70","MD3","K","COD","UZB","mbs","06-27","20:30"],
  ["g71","MD3","J","ALG","AUT","arrowhead","06-27","23:00"],["g72","MD3","J","JOR","ARG","att","06-27","23:00"],
].map(([id, st, g, h, a, v, d, t]) => ({ id, st, g, h, a, v, ko: k(d, t) }));

// Knockout slots: pos = group position, third = best-3rd pool, w/l = winner/loser of match n
const P = (pos, g) => ({ t: "pos", pos, g });
const T3 = (gs) => ({ t: "third", gs });
const W = (n) => ({ t: "w", n });
const L = (n) => ({ t: "l", n });
// side: which half of the bracket the match sits on ("L" feeds Semifinal 1, "R" feeds Semifinal 2)
const KO = [
  // Round of 32 — official FIFA match numbers 73–88
  { id: "73", st: "R32", side: "L", hs: P(2, "A"), as: P(2, "B"), v: "sofi", ko: k("06-28", "16:00") },
  { id: "76", st: "R32", side: "R", hs: P(1, "C"), as: P(2, "F"), v: "nrg", ko: k("06-29", "14:00") },
  { id: "74", st: "R32", side: "L", hs: P(1, "E"), as: T3("ABCDF"), v: "gillette", ko: k("06-29", "17:30") },
  { id: "75", st: "R32", side: "L", hs: P(1, "F"), as: P(2, "C"), v: "bbva", ko: k("06-29", "22:00") },
  { id: "78", st: "R32", side: "R", hs: P(2, "E"), as: P(2, "I"), v: "att", ko: k("06-30", "14:00") },
  { id: "77", st: "R32", side: "L", hs: P(1, "I"), as: T3("CDFGH"), v: "metlife", ko: k("06-30", "18:00") },
  { id: "79", st: "R32", side: "R", hs: P(1, "A"), as: T3("CEFHI"), v: "azteca", ko: k("06-30", "22:00") },
  { id: "80", st: "R32", side: "R", hs: P(1, "L"), as: T3("EHIJK"), v: "mbs", ko: k("07-01", "13:00") },
  { id: "82", st: "R32", side: "L", hs: P(1, "G"), as: T3("AEHIJ"), v: "lumen", ko: k("07-01", "17:00") },
  { id: "81", st: "R32", side: "L", hs: P(1, "D"), as: T3("BEFIJ"), v: "levis", ko: k("07-01", "21:00") },
  { id: "84", st: "R32", side: "L", hs: P(1, "H"), as: P(2, "J"), v: "sofi", ko: k("07-02", "16:00") },
  { id: "83", st: "R32", side: "L", hs: P(2, "K"), as: P(2, "L"), v: "bmo", ko: k("07-02", "20:00") },
  { id: "85", st: "R32", side: "R", hs: P(1, "B"), as: T3("EFGIJ"), v: "bcplace", ko: k("07-03", "00:00") },
  { id: "88", st: "R32", side: "R", hs: P(2, "D"), as: P(2, "G"), v: "att", ko: k("07-03", "15:00") },
  { id: "86", st: "R32", side: "R", hs: P(1, "J"), as: P(2, "H"), v: "hardrock", ko: k("07-03", "19:00") },
  { id: "87", st: "R32", side: "R", hs: P(1, "K"), as: T3("DEIJL"), v: "arrowhead", ko: k("07-03", "22:30") },
  // Round of 16 — matches 89–96
  { id: "90", st: "R16", side: "L", hs: W(73), as: W(75), v: "nrg", ko: k("07-04", "14:00") },
  { id: "89", st: "R16", side: "L", hs: W(74), as: W(77), v: "lff", ko: k("07-04", "18:00") },
  { id: "91", st: "R16", side: "R", hs: W(76), as: W(78), v: "metlife", ko: k("07-05", "17:00") },
  { id: "92", st: "R16", side: "R", hs: W(79), as: W(80), v: "azteca", ko: k("07-05", "21:00") },
  { id: "93", st: "R16", side: "L", hs: W(83), as: W(84), v: "att", ko: k("07-06", "16:00") },
  { id: "94", st: "R16", side: "L", hs: W(81), as: W(82), v: "lumen", ko: k("07-06", "21:00") },
  { id: "95", st: "R16", side: "R", hs: W(86), as: W(88), v: "mbs", ko: k("07-07", "13:00") },
  { id: "96", st: "R16", side: "R", hs: W(85), as: W(87), v: "bcplace", ko: k("07-07", "17:00") },
  // Quarterfinals — matches 97–100
  { id: "97", st: "QF", side: "L", hs: W(89), as: W(90), v: "gillette", ko: k("07-09", "17:00") },
  { id: "98", st: "QF", side: "L", hs: W(93), as: W(94), v: "sofi", ko: k("07-10", "16:00") },
  { id: "99", st: "QF", side: "R", hs: W(91), as: W(92), v: "hardrock", ko: k("07-11", "18:00") },
  { id: "100", st: "QF", side: "R", hs: W(95), as: W(96), v: "arrowhead", ko: k("07-11", "22:00") },
  // Semifinals
  { id: "101", st: "SF", side: "L", hs: W(97), as: W(98), v: "att", ko: k("07-14", "16:00") },
  { id: "102", st: "SF", side: "R", hs: W(99), as: W(100), v: "mbs", ko: k("07-15", "16:00") },
  // Third place + Final
  { id: "103", st: "3RD", side: "F", hs: L(101), as: L(102), v: "hardrock", ko: k("07-18", "18:00") },
  { id: "104", st: "FINAL", side: "F", hs: W(101), as: W(102), v: "metlife", ko: k("07-19", "16:00") },
];
const MATCHES = [...GS, ...KO].sort((x, y) => x.ko - y.ko);
const MATCH_LABEL = { MD1: "MD1", MD2: "MD2", MD3: "MD3", R32: "R32", R16: "R16", QF: "QF", SF: "SF", "3RD": "3rd Pl", FINAL: "Final" };
const STAGE_FILTERS = ["MD1", "MD2", "MD3", "R32", "R16", "QF", "SF", "FINAL"];
const stageBucket = (st) => (st === "3RD" ? "FINAL" : st);

/* ---------- Timezones: 25 cities ---------- */
const CITIES = [
  ["Honolulu", "Pacific/Honolulu"], ["Anchorage", "America/Anchorage"], ["Los Angeles", "America/Los_Angeles"],
  ["Denver", "America/Denver"], ["Mexico City", "America/Mexico_City"], ["Chicago", "America/Chicago"],
  ["New York", "America/New_York"], ["Toronto", "America/Toronto"], ["Buenos Aires", "America/Argentina/Buenos_Aires"],
  ["São Paulo", "America/Sao_Paulo"], ["London", "Europe/London"], ["Paris", "Europe/Paris"],
  ["Madrid", "Europe/Madrid"], ["Berlin", "Europe/Berlin"], ["Cairo", "Africa/Cairo"],
  ["Istanbul", "Europe/Istanbul"], ["Moscow", "Europe/Moscow"], ["Dubai", "Asia/Dubai"],
  ["Karachi", "Asia/Karachi"], ["New Delhi", "Asia/Kolkata"], ["Bangkok", "Asia/Bangkok"],
  ["Singapore", "Asia/Singapore"], ["Tokyo", "Asia/Tokyo"], ["Sydney", "Australia/Sydney"],
  ["Auckland", "Pacific/Auckland"],
];

const PALETTE = ["#74ACDF", "#F5C84B", "#EF6C5A", "#56C98E", "#B07FE8", "#FF9F43", "#4CC3E0", "#E85D9E", "#A3E057", "#E9EDF5"];
const GOLD = "#F5C84B";
const PLAYED_AFTER_MS = 2.75 * 3600 * 1000; // kickoff + ~165 min ⇒ treated as finished

/* ---------- helpers ---------- */
const parseScore = (s) => {
  const m = String(s).match(/(\d+)\s*[-–:]\s*(\d+)/);
  return m ? { h: m[1], a: m[2] } : null;
};
const ord = (n) => (n === 1 ? "1st" : n === 2 ? "2nd" : "3rd");

function dayKey(ts, tz) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(ts);
}
function dayHeader(ts, tz) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: tz, weekday: "long", day: "numeric", month: "long" }).format(ts);
}
function dayChip(ts, tz) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: tz, weekday: "short", day: "numeric", month: "short" }).format(ts);
}
function timeIn(ts, tz) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false }).format(ts);
}
function fullDateTime(ts, tz) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: tz, weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false }).format(ts);
}
function dateOnly(ts, tz) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: tz, weekday: "short", day: "numeric", month: "long" }).format(ts);
}

function extractJSON(text) {
  const s = String(text || "");
  // strip markdown fences and leading prose
  const cleaned = s.replace(/```json|```/gi, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new Error(`No JSON object found. Got: ${cleaned.slice(0, 120)}`);
  }
  try {
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch (e) {
    throw new Error(`JSON parse failed: ${e.message}. Text: ${cleaned.slice(start, start + 120)}`);
  }
}

/* ---------------------------------------------------------------
   API LAYER (best-effort enhancement)
   All already-played matches are pre-filled with verified data in
   KNOWN_SCORES, so the app works fully WITHOUT any API call. These
   functions only ADD live detail for matches not already cached,
   and they fail silently so a flaky/unavailable web-search tool
   never breaks the UI.
--------------------------------------------------------------- */
async function rawPost(body, apiKey) {
  const ctrl = new AbortController();
  const tid = setTimeout(() => ctrl.abort(), 90000);
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "anthropic-dangerous-direct-browser-access": "true",
        ...(apiKey ? { "x-api-key": apiKey } : {}),
      },
      body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 1500, ...body }),
      signal: ctrl.signal,
    });
    clearTimeout(tid);
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error?.message || `HTTP ${res.status}`);
    return data;
  } catch (e) {
    clearTimeout(tid);
    if (e.name === "AbortError") throw new Error("timed out");
    throw e;
  }
}

function textFrom(content) {
  return (content || []).filter(b => b.type === "text").map(b => b.text).join("\n").trim();
}

// Trim trailing whitespace on text blocks (API rejects assistant turns
// ending in whitespace); never inject fake blocks that corrupt continuation.
function sealContent(content) {
  return (content || []).map(b => b.type === "text" ? { ...b, text: b.text.replace(/\s+$/, "") || "." } : b);
}

// Web-search-enabled conversation that follows pause_turn until text arrives.
async function runSearch(prompt, onLog, apiKey) {
  let messages = [{ role: "user", content: prompt }];
  for (let turn = 0; turn < 8; turn++) {
    onLog(`search ${turn + 1}…`);
    const data = await rawPost({
      messages,
      tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 6 }],
    }, apiKey);
    const types = (data.content || []).map(b => b.type).join(",");
    onLog(`${data.stop_reason} [${types}]`);
    if (data.stop_reason === "pause_turn") {
      messages = [...messages, { role: "assistant", content: sealContent(data.content) }];
      continue;
    }
    const t = textFrom(data.content);
    if (t) return t;
    messages = [...messages, { role: "assistant", content: sealContent(data.content) }];
  }
  throw new Error("no text from search");
}

// search → JSON; if search text isn't clean JSON, reformat with a no-tool call.
async function searchForJSON(searchPrompt, schemaHint, onLog, apiKey) {
  const text = await runSearch(
    `${searchPrompt}\n\nWhen finished searching, reply with ONLY this JSON and nothing else: ${schemaHint}`,
    onLog, apiKey
  );
  try { return extractJSON(text); }
  catch {
    onLog("formatting…");
    const d = await rawPost({
      system: "You output ONLY raw minified JSON. No prose, no markdown, no code fences.",
      messages: [{ role: "user", content: `Extract exactly this JSON shape: ${schemaHint}\n\nfrom this text:\n${text.slice(0, 4000)}\n\nOutput only the JSON object.` }],
    }, apiKey);
    return extractJSON(textFrom(d.content));
  }
}

const MATCH_SCHEMA = '{"played":true,"score":"2-1","pens":null,"scorers":[{"team":"home","player":"Name","minute":"45","pen":false,"og":false}],"cards":[{"team":"away","player":"Name","minute":"60","card":"yellow"}]}';

async function fetchMatchDetails(matchDesc, onLog, apiKey) {
  const prompt = `Find the result of the 2026 FIFA World Cup match ${matchDesc}: the final score, every goalscorer with minute (mark penalties and own goals), and every yellow and red card with player name and minute. Use "home" or "away" to say which team for each event. If the match has not been played yet, the JSON is simply {"played":false}.`;
  return searchForJSON(prompt, MATCH_SCHEMA, onLog, apiKey);
}

/* best-effort persistence (window.storage may not exist) */
async function loadStored(key) {
  try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : null; } catch { return null; }
}
async function saveStored(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* non-fatal */ }
}

/* ============================================================ */
export default function WorldCup2026Schedule() {
  const [tz, setTz] = useState("America/Argentina/Buenos_Aires");
  const [now, setNow] = useState(Date.now());
  const [stageSel, setStageSel] = useState(new Set(STAGE_FILTERS));
  const [groupSel, setGroupSel] = useState(new Set(Object.keys(GROUPS)));
  const [daySel, setDaySel] = useState(null); // null = all
  const [favs, setFavs] = useState([{ team: "ARG", color: "#74ACDF" }]);
  const [rankThresh, setRankThresh] = useState(10);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [info, setInfo] = useState(null); // match id shown in popup
  // GitHub repo where scores.json lives — update YOUR_GITHUB_USERNAME
  const SCORES_URL = "https://raw.githubusercontent.com/nicordp/worldcup2026/main/scores.json";

  // Verified results pre-filled so scores, goals and cards show instantly
  // with NO API call. done:true means "complete — never refetch".
  const KNOWN_SCORES = {
    // Match 1 · Mexico 2-0 South Africa · Estadio Azteca
    g1: { played: true, done: true, score: "2-0",
      scorers: [
        { team: "home", player: "J. Quiñones",  minute: "9",    pen: false, og: false },
        { team: "home", player: "R. Jiménez",   minute: "52",   pen: false, og: false },
      ],
      cards: [
        { team: "home", player: "B. Gutiérrez", minute: "34",   card: "yellow" },
        { team: "away", player: "T. Mokoena",   minute: "43",   card: "yellow" },
        { team: "away", player: "S. Sithole",   minute: "49",   card: "red"    },
        { team: "away", player: "T. Zwane",     minute: "84",   card: "red"    },
        { team: "home", player: "C. Montes",    minute: "90+2", card: "red"    },
      ] },
    // Match 2 · South Korea 2-1 Czechia · Estadio Akron
    g2: { played: true, done: true, score: "2-1",
      scorers: [
        { team: "away", player: "L. Krejčí", minute: "59", pen: false, og: false },
        { team: "home", player: "Hwang In-beom", minute: "67", pen: false, og: false },
        { team: "home", player: "Oh Hyeon-gyu", minute: "80", pen: false, og: false },
      ],
      cards: [
        { team: "home", player: "Lee Gi-hyuk", minute: "88", card: "yellow" },
      ] },
    // Match 3 · Canada 1-1 Bosnia & Herz. · BMO Field
    g3: { played: true, done: true, score: "1-1",
      scorers: [
        { team: "away", player: "J. Lukić", minute: "21", pen: false, og: false },
        { team: "home", player: "C. Larin", minute: "78", pen: false, og: false },
      ],
      cards: [
        { team: "home", player: "A. Johnston", minute: "11", card: "yellow" },
        { team: "away", player: "N. Katić", minute: "90+3", card: "yellow" },
      ] },
    // Match 6 · Brazil 1-1 Morocco · MetLife Stadium
    g6: { played: true, done: true, score: "1-1",
      scorers: [
        { team: "away", player: "I. Saibari",    minute: "21", pen: false, og: false },
        { team: "home", player: "Vinícius Jr",   minute: "32", pen: false, og: false },
      ],
      cards: [
        { team: "home", player: "Casemiro",      minute: "37", card: "yellow" },
        { team: "home", player: "R. Ibáñez",     minute: "43", card: "yellow" },
      ] },
    // Match 7 · Haiti 0-1 Scotland · Gillette Stadium
    g7: { played: true, done: true, score: "0-1",
      scorers: [
        { team: "away", player: "J. McGinn",     minute: "28", pen: false, og: false },
      ],
      cards: [
        { team: "home", player: "J-R. Bellegarde", minute: "38", card: "yellow" },
        { team: "away", player: "A. Hickey",       minute: "65", card: "yellow" },
        { team: "away", player: "K. McLean",       minute: "82", card: "yellow" },
        { team: "away", player: "F. Curtis",       minute: "90+3", card: "yellow" },
      ] },
    // Match 9  · Germany 7-1 Curaçao · NRG Stadium Houston
    g9:  { played: true, done: true, score: "7-1",
      scorers: [
        { team: "home", player: "F. Nmecha",       minute: "6",    pen: false, og: false },
        { team: "away", player: "L. Comenencia",   minute: "21",   pen: false, og: false },
        { team: "home", player: "N. Schlotterbeck",minute: "38",   pen: false, og: false },
        { team: "home", player: "K. Havertz",      minute: "45+5", pen: true,  og: false },
        { team: "home", player: "J. Musiala",      minute: "47",   pen: false, og: false },
        { team: "home", player: "N. Brown",        minute: "68",   pen: false, og: false },
        { team: "home", player: "D. Undav",        minute: "78",   pen: false, og: false },
        { team: "home", player: "K. Havertz",      minute: "88",   pen: false, og: false },
      ],
      cards: [] },
    // Match 10 · Netherlands 2-2 Japan · AT&T Stadium Dallas
    g10: { played: true, done: true, score: "2-2",
      scorers: [
        { team: "home", player: "V. van Dijk",     minute: "50",   pen: false, og: false },
        { team: "away", player: "K. Nakamura",     minute: "57",   pen: false, og: false },
        { team: "home", player: "C. Summerville",  minute: "64",   pen: false, og: false },
        { team: "away", player: "D. Kamada",       minute: "89",   pen: false, og: false },
      ],
      cards: [] },
    // Match 11 · Ivory Coast 1-0 Ecuador · Lincoln Financial Field Philadelphia
    g11: { played: true, done: true, score: "1-0",
      scorers: [
        { team: "home", player: "A. Diallo",       minute: "90",   pen: false, og: false },
      ],
      cards: [
        { team: "home", player: "F. Kessié",       minute: "27",   card: "yellow" },
        { team: "away", player: "J. Porozo",       minute: "73",   card: "yellow" },
      ] },
    // Match 12 · Sweden 5-1 Tunisia · Estadio BBVA Monterrey
    g12: { played: true, done: true, score: "5-1",
      scorers: [
        { team: "home", player: "Y. Ayari",        minute: "7",    pen: false, og: false },
        { team: "home", player: "A. Isak",         minute: "30",   pen: false, og: false },
        { team: "away", player: "O. Rekik",        minute: "43",   pen: false, og: false },
        { team: "home", player: "V. Gyökeres",     minute: "59",   pen: false, og: false },
        { team: "home", player: "M. Svanberg",     minute: "84",   pen: false, og: false },
        { team: "home", player: "Y. Ayari",        minute: "90+6", pen: false, og: false },
      ],
      cards: [] },
    // Match 8 · Australia 2-0 Türkiye · BC Place Vancouver
    g8: { played: true, done: true, score: "2-0",
      scorers: [
        { team: "home", player: "N. Irankunda",  minute: "27", pen: false, og: false },
        { team: "home", player: "C. Metcalfe",   minute: "75", pen: false, og: false },
      ],
      cards: [
        { team: "away", player: "Y. Akgün",      minute: "62", card: "yellow" },
      ] },
    // Match 5 · Qatar 1-1 Switzerland · Levi's Stadium
    g5: { played: true, done: true, score: "1-1",
      scorers: [
        { team: "away", player: "B. Embolo",   minute: "17",   pen: true,  og: false },
        { team: "home", player: "B. Khoukhi",  minute: "90+5", pen: false, og: false },
      ],
      cards: [
        { team: "home", player: "M. Abunada",     minute: "16", card: "yellow" },
        { team: "home", player: "J.G. Abdulsallam",minute:"22", card: "yellow" },
        { team: "away", player: "D. Zakaria",     minute: "41", card: "yellow" },
      ] },
    // Match 4 · USA 4-1 Paraguay · SoFi Stadium
    g4: { played: true, done: true, score: "4-1",
      scorers: [
        { team: "home", player: "D. Bobadilla", minute: "7",  pen: false, og: true  },
        { team: "home", player: "F. Balogun",   minute: "30", pen: false, og: false },
        { team: "home", player: "F. Balogun",   minute: "45+2", pen: false, og: false },
        { team: "away", player: "Maurício",      minute: "73", pen: false, og: false },
        { team: "home", player: "G. Reyna",      minute: "90+7", pen: false, og: false },
      ],
      cards: [
        { team: "away", player: "J.J. Cáceres", minute: "9",  card: "yellow" },
        { team: "home", player: "T. Adams",      minute: "59", card: "yellow" },
        { team: "away", player: "Alonso",        minute: "88", card: "yellow" },
      ] },
  };
  const [details, setDetails] = useState(KNOWN_SCORES);
  const [loadingInfo, setLoadingInfo] = useState(false);
  const [infoErr, setInfoErr] = useState(null);
  const [apiLog, setApiLog] = useState([]);
  const [apiKey, setApiKey] = useState(() => { try { return localStorage.getItem("wc26-apikey") || ""; } catch { return ""; } });
  const [standings, setStandings] = useState(null);
  const [standingsAt, setStandingsAt] = useState(null);
  const [standingsBusy, setStandingsBusy] = useState(false);
  const [standingsErr, setStandingsErr] = useState(null);
  const [openSec, setOpenSec] = useState({ stage: true, group: false, day: false });
  const loadedRef = useRef(false);
  const autoLoadRef = useRef(new Set());

  // Fetch scores.json from GitHub on load — merges with KNOWN_SCORES
  // so the app always shows latest data even without opening this chat.
  useEffect(() => {
    fetch(`${SCORES_URL}?t=${Date.now()}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data || !data.matches) return;
        setDetails(prev => {
          const merged = { ...prev };
          for (const [id, match] of Object.entries(data.matches)) {
            if (!merged[id] || !merged[id].done) {
              merged[id] = match;
            }
          }
          return merged;
        });
        if (data.updated) setStandingsAt(new Date(data.updated).getTime());
      })
      .catch(() => {}); // silent fail — KNOWN_SCORES still covers all verified matches
  }, []);

  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 60000); return () => clearInterval(t); }, []);

  /* restore prefs + cache */
  useEffect(() => {
    (async () => {
      const p = await loadStored("wc26-prefs");
      if (p) {
        if (p.tz) setTz(p.tz);
        if (Array.isArray(p.favs)) setFavs(p.favs.filter((f) => TEAMS[f.team]));
        if (p.rankThresh) setRankThresh(p.rankThresh);
      }
      const c = await loadStored("wc26-details");
      if (c) setDetails((d) => ({ ...c, ...d }));
      const s = await loadStored("wc26-standings");
      if (s && s.data) { setStandings(s.data); setStandingsAt(s.at); }
      loadedRef.current = true;
      refreshStandings(s && s.data ? s.data : null, true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { if (loadedRef.current) saveStored("wc26-prefs", { tz, favs, rankThresh }); }, [tz, favs, rankThresh]);
  useEffect(() => { if (loadedRef.current) saveStored("wc26-details", details); }, [details]);

  const isPlayed = useCallback((m) => now > m.ko + PLAYED_AFTER_MS, [now]);

  /* ---------- standings + bracket refresh via Claude API ---------- */
  const refreshStandings = useCallback(async (prev, silent) => {
    if (standingsBusy) return;
    setStandingsBusy(true); setStandingsErr(null);
    try {
      const names = Object.values(TEAMS).map((t) => t.name).join("; ");
      const today = new Date().toUTCString();
      const question = `Today is ${today}. Find the CURRENT 2026 FIFA World Cup group-stage standings for ALL groups A through L (table order 1st to 4th, all four teams each), plus any officially confirmed Round-of-32 or later knockout pairings. Use exactly these team names where possible: ${names}.`;
      const schema = `{"groups":{"A":{"complete":false,"order":["Mexico","South Korea","Czechia","South Africa"]}},"knockout":{"73":{"home":"TeamName","away":"TeamName"}}} (include all 12 groups A-L; complete=true only when that group finished all 3 matchdays; knockout only for officially confirmed pairings)`;
      const j = await searchForJSON(question, schema, () => {}, apiKey);
      const groups = {};
      Object.entries(j.groups || {}).forEach(([g, v]) => {
        if (!GROUPS[g]) return;
        const order = (v.order || []).map(teamKeyFromName).filter(Boolean);
        if (order.length === 4) groups[g] = { complete: !!v.complete, order };
      });
      const knockout = {};
      Object.entries(j.knockout || {}).forEach(([n, v]) => {
        const h = teamKeyFromName(v && v.home), a = teamKeyFromName(v && v.away);
        if (h || a) knockout[n] = { h, a };
      });
      const data = { groups: { ...(prev && prev.groups), ...groups }, knockout: { ...(prev && prev.knockout), ...knockout } };
      setStandings(data);
      const at = Date.now();
      setStandingsAt(at);
      saveStored("wc26-standings", { data, at });
    } catch (e) {
      // Graceful: live standings are optional. Keep existing data, show a soft note.
      if (!silent) setStandingsErr("Live standings unavailable right now — showing groups as drawn.");
    } finally {
      setStandingsBusy(false);
    }
  }, [standingsBusy, apiKey]);

  /* ---------- slot resolution ---------- */
  const resolveSlot = useCallback((m, which) => {
    const slot = which === "h" ? m.hs : m.as;
    if (!slot) return { team: m[which] }; // group-stage match: fixed team
    const koTeam = standings && standings.knockout && standings.knockout[m.id] && standings.knockout[m.id][which];
    if (koTeam && TEAMS[koTeam]) return { team: koTeam };
    if (slot.t === "pos") {
      const g = standings && standings.groups && standings.groups[slot.g];
      if (g && g.complete && g.order[slot.pos - 1]) return { team: g.order[slot.pos - 1] };
      const label = `${ord(slot.pos)} ${slot.g}`;
      if (g && g.order[slot.pos - 1]) return { label, prov: g.order[slot.pos - 1] };
      return { label };
    }
    if (slot.t === "third") return { label: `3rd ${slot.gs.split("").join("/")}` };
    if (slot.t === "w") return { label: `Winner M${slot.n}` };
    return { label: `Loser M${slot.n}` };
  }, [standings]);

  /* ---------- highlight ---------- */
  const favOf = useCallback((m) => {
    const keys = [resolveSlot(m, "h").team, resolveSlot(m, "a").team].filter(Boolean);
    const f = favs.find((f) => keys.includes(f.team));
    return f ? f.color : null;
  }, [favs, resolveSlot]);
  const isTop = useCallback((m) => {
    const t = [resolveSlot(m, "h").team, resolveSlot(m, "a").team].filter(Boolean);
    return t.some((key) => TEAMS[key].rank <= rankThresh);
  }, [rankThresh, resolveSlot]);

  /* ---------- match details via Claude API ---------- */
  const fetchDetails = useCallback(async (m, opts = {}) => {
    const { silent = false } = opts;
    const cached = details[m.id];
    if (cached && (cached.done || !cached.partial)) return; // verified or already-full
    if (!(now > m.ko + PLAYED_AFTER_MS)) return; // not played
    if (!silent) { setLoadingInfo(true); setInfoErr(null); setApiLog([]); }
    const logLine = (line) => {
      if (!silent) setApiLog((l) => [...l.slice(-20), line]);
    };
    try {
      const hN = resolveSlot(m, "h"), aN = resolveSlot(m, "a");
      const home = hN.team ? TEAMS[hN.team].name : hN.label;
      const away = aN.team ? TEAMS[aN.team].name : aN.label;
      const when = new Intl.DateTimeFormat("en-GB", { timeZone: "America/New_York", day: "numeric", month: "long", year: "numeric" }).format(m.ko);
      const venue = VENUES[m.v];
      const matchDesc = `${home} vs ${away} on ${when} at ${venue.stadium}, ${venue.city}`;
      const j = await fetchMatchDetails(matchDesc, logLine, apiKey);
      // Preserve hardcoded score if API returns no score but we have one
      const existing = details[m.id];
      const merged = (existing && existing.score && (!j.score)) ? { ...j, score: existing.score } : j;
      // Mark done so the auto-update timer doesn't refetch
      if (merged.played && merged.score) merged.done = true;
      setDetails((d) => ({ ...d, [m.id]: merged }));
    } catch (e) {
      if (!silent) setInfoErr(`${e.message}`);
      logLine(`ERROR: ${e.message}`);
    } finally {
      if (!silent) setLoadingInfo(false);
    }
  }, [details, now, resolveSlot]);

  const openInfo = useCallback(async (m) => {
    setInfo(m.id);
    setInfoErr(null);
    setApiLog([]);
    fetchDetails(m, { silent: false });
  }, [fetchDetails]);

  // AUTO-UPDATE: every 5 minutes, find matches that finished (kickoff + 2.5h)
  // but don't yet have verified data (done:true), and fetch silently.
  // autoLoadRef tracks in-flight fetches to avoid parallel duplicate requests.
  const fetchIfNeeded = useCallback(() => {
    const fetchable = MATCHES.filter(m => {
      if (!(Date.now() > m.ko + PLAYED_AFTER_MS)) return false; // not finished yet
      if (autoLoadRef.current.has(m.id)) return false;          // already in-flight
      const d = details[m.id];
      if (d && d.done) return false;                             // verified — skip
      return true;
    });
    fetchable.forEach(m => {
      autoLoadRef.current.add(m.id);
      fetchDetails(m, { silent: true }).finally(() => {
        // Remove from in-flight set so it can retry next tick if it failed
        autoLoadRef.current.delete(m.id);
      });
    });
  }, [details, fetchDetails]);

  // Run once on mount, then every 5 minutes
  useEffect(() => {
    fetchIfNeeded();
    const t = setInterval(fetchIfNeeded, 5 * 60 * 1000);
    return () => clearInterval(t);
  }, [fetchIfNeeded]);

  /* ---------- day list (in the selected timezone) ---------- */
  const days = useMemo(() => {
    const map = new Map();
    MATCHES.forEach((m) => { const key = dayKey(m.ko, tz); if (!map.has(key)) map.set(key, m.ko); });
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [tz]);
  useEffect(() => { setDaySel(null); }, [tz]); // tz change ⇒ all days selected

  const effDaySel = daySel || new Set(days.map((d) => d[0]));

  /* ---------- filtering ---------- */
  const visible = useMemo(() => MATCHES.filter((m) => {
    if (!stageSel.has(stageBucket(m.st))) return false;
    if (m.g && !groupSel.has(m.g)) return false;
    if (!effDaySel.has(dayKey(m.ko, tz))) return false;
    return true;
  }), [stageSel, groupSel, effDaySel, tz]);

  const grouped = useMemo(() => {
    const out = [];
    let cur = null;
    visible.forEach((m) => {
      const key = dayKey(m.ko, tz);
      if (!cur || cur.key !== key) { cur = { key, ts: m.ko, items: [] }; out.push(cur); }
      cur.items.push(m);
    });
    return out;
  }, [visible, tz]);

  const toggleSet = (set, setter, all) => {
    const isAll = set.size === all.length;
    setter(isAll ? new Set() : new Set(all));
  };
  const flip = (set, setter, v) => {
    const n = new Set(set); n.has(v) ? n.delete(v) : n.add(v); setter(n);
  };
  const flipDay = (key) => {
    const n = new Set(effDaySel); n.has(key) ? n.delete(key) : n.add(key); setDaySel(n);
  };

  const cityName = CITIES.find((c) => c[1] === tz)?.[0] || tz;
  const infoMatch = info ? MATCHES.find((m) => m.id === info) : null;

  /* ---------- render ---------- */
  return (
    <div className="wc-root">
      <style>{CSS}</style>

      <header className="topbar">
        <div className="brand">
          <div className="eyebrow">FIFA World Cup 26 · Canada · Mexico · USA</div>
          <h1>Match Schedule</h1>
        </div>
        <div className="topctl">
          <label className="tzwrap">
            <span className="tzlabel">Kickoff times</span>
            <select value={tz} onChange={(e) => setTz(e.target.value)} aria-label="Timezone">
              {CITIES.map(([name, zone]) => <option key={zone} value={zone}>{name}</option>)}
            </select>
          </label>
          <button className="btn" onClick={() => refreshStandings(standings, false)} disabled={standingsBusy}>
            {standingsBusy ? "Updating…" : "↻ Standings"}
          </button>
          <button className="btn" onClick={() => setSettingsOpen(true)}>⚙ Settings</button>
        </div>
      </header>

      <div className="statusline">
        {standingsErr ? <span className="soft">{standingsErr}</span>
          : standingsAt ? <span>Standings updated {timeIn(standingsAt, tz)} ({cityName})</span>
          : <span>{standingsBusy ? "Checking live group standings…" : "Group placeholders shown as drawn — tap ↻ Standings for live tables"}</span>}
      </div>

      {/* ---------- filters ---------- */}
      <section className="filters">
        <FilterSec title="Stage" open={openSec.stage} onToggle={() => setOpenSec((s) => ({ ...s, stage: !s.stage }))}
          allOn={stageSel.size === STAGE_FILTERS.length}
          onAll={() => toggleSet(stageSel, setStageSel, STAGE_FILTERS)}
          summary={stageSel.size === STAGE_FILTERS.length ? "All stages" : `${stageSel.size}/${STAGE_FILTERS.length}`}>
          {STAGE_FILTERS.map((s) => (
            <Chip key={s} on={stageSel.has(s)} onClick={() => flip(stageSel, setStageSel, s)}>
              {s === "FINAL" ? "Final*" : s}
            </Chip>
          ))}
          <span className="hint">*includes third place</span>
        </FilterSec>

        <FilterSec title="Group" open={openSec.group} onToggle={() => setOpenSec((s) => ({ ...s, group: !s.group }))}
          allOn={groupSel.size === 12}
          onAll={() => toggleSet(groupSel, setGroupSel, Object.keys(GROUPS))}
          summary={groupSel.size === 12 ? "All groups" : `${groupSel.size}/12`}>
          {Object.keys(GROUPS).map((g) => (
            <Chip key={g} on={groupSel.has(g)} onClick={() => flip(groupSel, setGroupSel, g)}>{g}</Chip>
          ))}
          <span className="hint">Group stage only — knockouts unaffected</span>
        </FilterSec>

        <FilterSec title="Day" open={openSec.day} onToggle={() => setOpenSec((s) => ({ ...s, day: !s.day }))}
          allOn={effDaySel.size === days.length}
          onAll={() => setDaySel(effDaySel.size === days.length ? new Set() : null)}
          summary={effDaySel.size === days.length ? "All days" : `${effDaySel.size}/${days.length}`}>
          {days.map(([key, ts]) => (
            <Chip key={key} on={effDaySel.has(key)} onClick={() => flipDay(key)}>{dayChip(ts, tz)}</Chip>
          ))}
        </FilterSec>
      </section>

      {/* ---------- match list ---------- */}
      <main className="list">
        {grouped.length === 0 && (
          <div className="empty">No matches for these filters. Open a filter section above and select more options.</div>
        )}
        {grouped.map((g) => (
          <section key={g.key}>
            <h2 className="dayslate"><span>{dayHeader(g.ts, tz)}</span><i /></h2>
            {g.items.map((m) => (
              <Row key={m.id} m={m} tz={tz} now={now}
                played={isPlayed(m)} det={details[m.id]}
                resolve={resolveSlot} favColor={favOf(m)} top={isTop(m)}
                onInfo={() => openInfo(m)} />
            ))}
          </section>
        ))}
      </main>

      <footer className="foot">
        June 11 – July 19, 2026 · 104 matches · 16 stadiums · Times stored at UTC−3 (Argentina) and shown in <b>{cityName}</b>.
      </footer>

      {/* ---------- info popup ---------- */}
      {infoMatch && (
        <Modal onClose={() => setInfo(null)} label="Match information">
          <InfoCard m={infoMatch} tz={tz} cityName={cityName} played={isPlayed(infoMatch)}
            det={details[infoMatch.id]} loading={loadingInfo} err={infoErr} apiLog={apiLog}
            resolve={resolveSlot} retry={() => fetchDetails(infoMatch, { silent: false })} />
        </Modal>
      )}

      {/* ---------- settings ---------- */}
      {settingsOpen && (
        <Modal onClose={() => setSettingsOpen(false)} label="Settings">
          <Settings favs={favs} setFavs={setFavs} rankThresh={rankThresh} setRankThresh={setRankThresh} apiKey={apiKey} setApiKey={k => { setApiKey(k); try { localStorage.setItem("wc26-apikey", k); } catch {} }} />
        </Modal>
      )}
    </div>
  );
}

/* ============== sub-components ============== */

function FilterSec({ title, open, onToggle, allOn, onAll, summary, children }) {
  return (
    <div className="fsec">
      <div className="fhead">
        <button className="fcollapse" onClick={onToggle} aria-expanded={open}>
          <span className="fcaret">{open ? "▾" : "▸"}</span>{title}
          <span className="fsum">{summary}</span>
        </button>
        <button className="fall" onClick={onAll}>{allOn ? "Deselect all" : "Select all"}</button>
      </div>
      {open && <div className="fchips">{children}</div>}
    </div>
  );
}

function Chip({ on, onClick, children }) {
  return <button className={`chip ${on ? "on" : ""}`} onClick={onClick} aria-pressed={on}>{children}</button>;
}

function TeamSide({ res, align }) {
  // Flags sit INNER (next to the score); FIFA rank sits on the OUTER edge.
  // align "r" = home (right-aligned): #rank · name · flag   (flag nearest score)
  // align "l" = away (left-aligned):  flag · name · #rank   (flag nearest score)
  if (res.team) {
    const t = TEAMS[res.team];
    return align === "r" ? (
      <span className="team r"><em>#{t.rank}</em><b>{t.name}</b><i className="fl">{t.flag}</i></span>
    ) : (
      <span className="team l"><i className="fl">{t.flag}</i><b>{t.name}</b><em>#{t.rank}</em></span>
    );
  }
  const prov = res.prov ? TEAMS[res.prov] : null;
  return align === "r" ? (
    <span className="team slot r"><b>{res.label}</b>{prov && <em className="prov">[{prov.flag}#{prov.rank}]</em>}</span>
  ) : (
    <span className="team slot l">{prov && <em className="prov">[{prov.flag}#{prov.rank}]</em>}<b>{res.label}</b></span>
  );
}

function Row({ m, tz, played, det, resolve, favColor, top, onInfo }) {
  const h = resolve(m, "h"), a = resolve(m, "a");
  const sc = det && det.played && det.score ? parseScore(det.score) : null;
  const accent = favColor || (top ? GOLD : null);
  const tag = m.g ? `Gr ${m.g}` : `${MATCH_LABEL[m.st]}${m.side === "L" ? " ◂L" : m.side === "R" ? " R▸" : ""}`;
  return (
    <div className={`row ${accent ? "hl" : ""}`} style={accent ? { "--accent": accent } : undefined}>
      <span className="tag" title={m.g ? `Group ${m.g} · ${m.st}` : `${MATCH_LABEL[m.st]} · ${m.side === "L" ? "left side of bracket" : m.side === "R" ? "right side of bracket" : "final stage"} · Match ${m.id}`}>{tag}</span>
      <TeamSide res={h} align="r" />
      {sc
        ? <span className="mid score"><b>{sc.h}</b><u>–</u><b>{sc.a}</b></span>
        : <span className="mid">vs</span>}
      <TeamSide res={a} align="l" />
      <button className="info" onClick={onInfo} aria-label="Match info">
        <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true">
          <circle cx="8" cy="8" r="6.7" fill="none" stroke="currentColor" strokeWidth="1.1" />
          <rect x="7.3" y="6.9" width="1.4" height="4.4" rx="0.7" fill="currentColor" />
          <circle cx="8" cy="4.8" r="0.9" fill="currentColor" />
        </svg>
      </button>
      <span className="ko">{played ? <i className="ft">FT</i> : timeIn(m.ko, tz)}</span>
    </div>
  );
}

function InfoCard({ m, tz, cityName, played, det, loading, err, apiLog, resolve, retry }) {
  const v = VENUES[m.v];
  const h = resolve(m, "h"), a = resolve(m, "a");
  const name = (r) => (r.team ? `${TEAMS[r.team].flag} ${TEAMS[r.team].name}` : r.label);
  const sideName = (side) => (side === "home" ? name(h) : name(a));
  const roundLine = m.g ? `Group ${m.g} · ${m.st}` : `${MATCH_LABEL[m.st]} · Match ${m.id}${m.side === "L" ? " · left side of bracket" : m.side === "R" ? " · right side of bracket" : ""}`;
  const sc = det && det.played && det.score ? parseScore(det.score) : null;
  const [showLog, setShowLog] = useState(false);
  return (
    <div className="card">
      <div className="cardround">{roundLine}</div>
      <h3>{name(h)} <span className="vsdim">vs</span> {name(a)}</h3>
      <dl className="meta">
        <div><dt>Stadium</dt><dd>{v.stadium}</dd></div>
        <div><dt>City</dt><dd>{v.city}</dd></div>
        {played
          ? <div><dt>Date</dt><dd>{dateOnly(m.ko, tz)}</dd></div>
          : <div><dt>Kickoff</dt><dd>{fullDateTime(m.ko, tz)} — {cityName}</dd></div>}
      </dl>
      {!played && <div className="notplayed">Not played yet</div>}
      {played && loading && (
        <div className="loading">
          {apiLog.length > 0 ? apiLog[apiLog.length - 1] : "Fetching result via web search…"}
        </div>
      )}
      {played && !loading && err && (
        <div>
          <div className="err">{err}</div>
          <div className="logrow">
            <button className="btn sm" onClick={retry}>Retry</button>
            <button className="btn sm" onClick={() => setShowLog(x => !x)}>{showLog ? "Hide log" : "Show debug log"}</button>
          </div>
          {showLog && apiLog.length > 0 && (
            <pre className="apilog">{apiLog.join("\n")}</pre>
          )}
        </div>
      )}
      {played && !loading && !err && det && det.played === false && <div className="notplayed">Not played yet</div>}
      {played && det && det.played && (
        <div className="result">
          <div className="bigscore">
            {sc ? <><b>{sc.h}</b><u>–</u><b>{sc.a}</b></> : det.score}
            {det.pens && <span className="pens"> pens {det.pens}</span>}
          </div>
          {det.scorers && det.scorers.length > 0 && (
            <div className="evt">
              <h4>Goals</h4>
              {det.scorers.map((s, i) => (
                <div key={i} className="evline">
                  <span className="emin">{s.minute}'</span>
                  <span>⚽ {s.player}{s.pen ? " (pen)" : ""}{s.og ? " (own goal)" : ""}</span>
                  <span className="eteam">{sideName(s.team)}</span>
                </div>
              ))}
            </div>
          )}
          {det.cards && det.cards.length > 0 && (
            <div className="evt">
              <h4>Cards</h4>
              {det.cards.map((c, i) => (
                <div key={i} className="evline">
                  <span className="emin">{c.minute}'</span>
                  <span>{String(c.card).toLowerCase().startsWith("r") ? "🟥" : "🟨"} {c.player}</span>
                  <span className="eteam">{sideName(c.team)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Settings({ favs, setFavs, rankThresh, setRankThresh, apiKey, setApiKey }) {
  const [pick, setPick] = useState("BRA");
  const [color, setColor] = useState(PALETTE[3]);
  const available = Object.keys(TEAMS).filter((key) => !favs.some((f) => f.team === key))
    .sort((x, y) => TEAMS[x].name.localeCompare(TEAMS[y].name));
  useEffect(() => { if (!available.includes(pick) && available.length) setPick(available[0]); }, [favs]); // eslint-disable-line
  return (
    <div className="card">
      <h3>Settings</h3>

      <h4 className="sethead">Anthropic API Key</h4>
      <p className="hint">Required for live standings and match detail lookups. Get yours at console.anthropic.com. Stored only in your browser.</p>
      <input
        type="password"
        placeholder="sk-ant-…"
        value={apiKey}
        onChange={e => setApiKey(e.target.value)}
        style={{width:"100%",marginBottom:8}}
      />

      <h4 className="sethead">Favourite teams</h4>
      <p className="hint">Their matches get a left border in the team's colour.</p>
      {favs.length === 0 && <div className="hint">No favourites yet.</div>}
      {favs.map((f) => (
        <div key={f.team} className="favline">
          <span className="favname">{TEAMS[f.team].flag} {TEAMS[f.team].name} <em>#{TEAMS[f.team].rank}</em></span>
          <span className="swatches">
            {PALETTE.map((c) => (
              <button key={c} className={`sw ${f.color === c ? "cur" : ""}`} style={{ background: c }}
                aria-label={`Set colour ${c}`}
                onClick={() => setFavs(favs.map((x) => x.team === f.team ? { ...x, color: c } : x))} />
            ))}
          </span>
          <button className="btn sm" onClick={() => setFavs(favs.filter((x) => x.team !== f.team))}>Remove</button>
        </div>
      ))}
      {available.length > 0 && (
        <div className="favadd">
          <select value={pick} onChange={(e) => setPick(e.target.value)}>
            {available.map((key) => <option key={key} value={key}>{TEAMS[key].flag} {TEAMS[key].name}</option>)}
          </select>
          <span className="swatches">
            {PALETTE.map((c) => (
              <button key={c} className={`sw ${color === c ? "cur" : ""}`} style={{ background: c }}
                aria-label={`Pick colour ${c}`} onClick={() => setColor(c)} />
            ))}
          </span>
          <button className="btn" onClick={() => setFavs([...favs, { team: pick, color }])}>Add</button>
        </div>
      )}

      <h4 className="sethead">Top-rank highlight</h4>
      <p className="hint">Matches with a team ranked inside this threshold get a gold left border.</p>
      <label className="threshline">
        Highlight when FIFA rank ≤
        <input type="number" min="1" max="100" value={rankThresh}
          onChange={(e) => setRankThresh(Math.max(1, Math.min(100, Number(e.target.value) || 1)))} />
      </label>
    </div>
  );
}

function Modal({ children, onClose, label }) {
  useEffect(() => {
    const fn = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClose]);
  return (
    <div className="overlay" onClick={onClose} role="dialog" aria-label={label}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="x" onClick={onClose} aria-label="Close">✕</button>
        {children}
      </div>
    </div>
  );
}

/* ============== styles ============== */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap');
*{box-sizing:border-box}
.wc-root{min-height:100vh;background:#0a0d14;color:#e9edf5;font-family:'Inter',system-ui,-apple-system,sans-serif;font-size:13px;line-height:1.4;padding:0 12px 32px;max-width:1040px;margin:0 auto}
button{font:inherit;color:inherit;cursor:pointer}
.topbar{display:flex;flex-wrap:wrap;gap:8px;align-items:flex-end;justify-content:space-between;padding:12px 0 6px}
.eyebrow{font-family:'Barlow Condensed',sans-serif;letter-spacing:.22em;text-transform:uppercase;font-size:10.5px;color:#8b93a7}
h1{font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:27px;line-height:1;margin:2px 0 0;text-transform:uppercase;letter-spacing:.02em}
.topctl{display:flex;gap:6px;align-items:center;flex-wrap:wrap}
.tzwrap{display:flex;align-items:center;gap:6px;background:#10141d;border:1px solid #232a3a;border-radius:7px;padding:4px 8px}
.tzlabel{font-size:10px;color:#8b93a7;text-transform:uppercase;letter-spacing:.08em;font-family:'Barlow Condensed',sans-serif}
select{background:#0a0d14;color:#e9edf5;border:1px solid #2a3247;border-radius:5px;padding:3px 6px;font:inherit;font-size:12.5px}
.btn{background:#161b28;border:1px solid #2a3247;border-radius:7px;padding:4px 10px;font-weight:500;font-size:12.5px}
.btn:hover{background:#1c2333}
.btn:disabled{opacity:.5;cursor:default}
.btn.sm{padding:2px 7px;font-size:11.5px;border-radius:5px}
.btn:focus-visible,.chip:focus-visible,.info:focus-visible,.sw:focus-visible,.fall:focus-visible,.fcollapse:focus-visible,.x:focus-visible,select:focus-visible,input:focus-visible{outline:2px solid #6ea8ff;outline-offset:2px}
.statusline{font-size:11px;color:#8b93a7;padding:0 0 6px;min-height:15px}
.soft{color:#7d859a}
.err{color:#ef8a7a}
.filters{border:1px solid #1c2231;background:#0d111a;border-radius:10px;padding:1px 10px;margin-bottom:10px}
.fsec{border-bottom:1px solid #161c29}
.fsec:last-child{border-bottom:none}
.fhead{display:flex;align-items:center;justify-content:space-between;gap:8px}
.fcollapse{display:flex;align-items:center;gap:7px;background:none;border:none;padding:5px 0;font-family:'Barlow Condensed',sans-serif;text-transform:uppercase;letter-spacing:.12em;font-size:13px;font-weight:600;color:#cfd6e6}
.fcaret{color:#5c6477;width:10px}
.fsum{font-family:'Inter';text-transform:none;letter-spacing:0;font-size:10px;color:#5c6477;font-weight:400}
.fall{background:none;border:1px solid #2a3247;border-radius:999px;padding:2px 9px;font-size:10.5px;color:#9fb6e8}
.fall:hover{border-color:#3a4565}
.fchips{display:flex;flex-wrap:wrap;gap:4px;padding:1px 0 8px;align-items:center}
.chip{background:#11151f;border:1px solid #232a3a;color:#98a0b3;border-radius:999px;padding:2px 9px;font-size:11.5px}
.chip.on{background:#1b2b4a;border-color:#3c5a96;color:#dce7ff}
.hint{font-size:10.5px;color:#5c6477}
.dayslate{display:flex;align-items:center;gap:10px;font-family:'Barlow Condensed',sans-serif;font-weight:600;font-size:14px;letter-spacing:.14em;text-transform:uppercase;color:#aeb7cc;margin:13px 0 5px}
.dayslate i{flex:1;height:1px;background:linear-gradient(90deg,#242c3f,transparent)}
.row{display:grid;grid-template-columns:52px 1fr 54px 1fr 20px 40px;align-items:center;column-gap:6px;background:#10141d;border:1px solid #1a2030;border-left:3px solid transparent;border-radius:7px;padding:3px 8px;margin-bottom:3px;min-height:30px}
.row.hl{border-left-color:var(--accent);background:linear-gradient(90deg,color-mix(in srgb,var(--accent) 9%,#10141d),#10141d 32%)}
.tag{font-family:'Barlow Condensed',sans-serif;font-size:11.5px;font-weight:600;letter-spacing:.06em;color:#7f88a0;text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.team{display:flex;align-items:baseline;gap:4px;min-width:0;font-size:12.5px;white-space:nowrap;overflow:hidden;line-height:1}
.team.r{justify-content:flex-end}
.team b{font-weight:600;overflow:hidden;text-overflow:ellipsis;min-width:0;flex-shrink:1}
.team em{font-style:normal;color:#6b7490;font-size:10.5px;flex:none;line-height:1}
.team .fl{font-style:normal;flex:none;line-height:1;font-size:14px}
.team.slot b{color:#9aa3ba;font-weight:500}
.prov{color:#6f7a96;font-size:11px;font-style:normal;flex:none}
.mid{text-align:center;color:#5c6477;font-size:11px;letter-spacing:.04em;line-height:1}
.mid.score{display:flex;align-items:center;justify-content:center;gap:4px;background:#171e2e;border:1px solid #28304a;border-radius:6px;padding:2px 3px}
.mid.score b{font-size:14.5px;font-weight:700;color:#f3f6fc;font-variant-numeric:tabular-nums;font-family:'Barlow Condensed',sans-serif;line-height:1}
.mid.score u{text-decoration:none;color:#5c6477;font-size:11px}
.info{display:flex;align-items:center;justify-content:center;background:none;border:none;padding:1px;color:#4a5268;line-height:0}
.info:hover{color:#9fb6e8}
.ko{text-align:right;font-variant-numeric:tabular-nums;font-weight:600;font-size:12px;color:#cdd5e6;white-space:nowrap;line-height:1}
.ft{font-style:normal;font-size:10px;font-weight:700;letter-spacing:.14em;color:#7f88a0}
.empty{color:#8b93a7;text-align:center;padding:40px 0}
.foot{margin-top:24px;font-size:11px;color:#5c6477;border-top:1px solid #161c29;padding-top:10px}
.overlay{position:fixed;inset:0;background:rgba(4,6,10,.72);backdrop-filter:blur(3px);display:flex;align-items:center;justify-content:center;padding:14px;z-index:50}
.modal{position:relative;background:#10141d;border:1px solid #28304a;border-radius:12px;max-width:480px;width:100%;max-height:88vh;overflow:auto;padding:16px 18px;box-shadow:0 18px 60px rgba(0,0,0,.55)}
.x{position:absolute;top:8px;right:10px;background:none;border:none;color:#8b93a7;font-size:14px}
.x:hover{color:#fff}
.card h3{font-family:'Barlow Condensed',sans-serif;font-size:21px;font-weight:600;margin:2px 0 10px;line-height:1.2}
.cardround{font-family:'Barlow Condensed',sans-serif;font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#7f88a0}
.vsdim{color:#5c6477;font-size:13px}
.meta{margin:0 0 10px;display:flex;flex-direction:column;gap:3px}
.meta div{display:flex;gap:8px}
.meta dt{width:60px;color:#6b7490;font-size:11px;text-transform:uppercase;letter-spacing:.08em;font-family:'Barlow Condensed',sans-serif;padding-top:1px}
.meta dd{margin:0;font-size:12.5px}
.notplayed{background:#141a28;border:1px dashed #2a3247;color:#9aa3ba;border-radius:8px;padding:10px;text-align:center;font-weight:500}
.loading{color:#9fb6e8;padding:6px 0;font-size:12.5px}
.logrow{display:flex;gap:6px;margin-top:6px}
.apilog{background:#0a0d14;border:1px solid #1a2030;border-radius:6px;padding:8px;font-size:10.5px;color:#6b9ed4;overflow:auto;max-height:180px;white-space:pre-wrap;word-break:break-all;margin-top:6px}
.result{border-top:1px solid #1d2435;padding-top:10px}
.bigscore{display:flex;align-items:baseline;justify-content:center;gap:7px;font-family:'Barlow Condensed',sans-serif;margin-bottom:8px}
.bigscore b{font-size:28px;font-weight:700;color:#f3f6fc;font-variant-numeric:tabular-nums;line-height:1}
.bigscore u{text-decoration:none;color:#5c6477;font-size:18px}
.pens{font-size:12px;color:#9aa3ba;font-family:'Inter'}
.evt h4{font-family:'Barlow Condensed',sans-serif;text-transform:uppercase;letter-spacing:.14em;font-size:11.5px;color:#7f88a0;margin:10px 0 4px}
.evline{display:grid;grid-template-columns:38px 1fr auto;gap:7px;padding:2px 0;font-size:12px}
.emin{color:#6b7490;font-variant-numeric:tabular-nums;text-align:right}
.eteam{color:#6b7490;font-size:11px}
.sethead{font-family:'Barlow Condensed',sans-serif;text-transform:uppercase;letter-spacing:.14em;font-size:12.5px;color:#aeb7cc;margin:14px 0 3px}
.favline,.favadd{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:5px 0;border-bottom:1px solid #161c29}
.favname{min-width:140px}
.favname em{font-style:normal;color:#6b7490;font-size:11.5px}
.swatches{display:flex;gap:4px}
.sw{width:16px;height:16px;border-radius:50%;border:2px solid transparent;padding:0}
.sw.cur{border-color:#fff}
.threshline{display:flex;align-items:center;gap:7px;margin-top:5px}
.threshline input{width:56px;background:#0a0d14;color:#e9edf5;border:1px solid #2a3247;border-radius:5px;padding:4px 6px;font:inherit}
@media (max-width:600px){
  .row{grid-template-columns:38px 1fr 46px 1fr 16px 30px;column-gap:3px;padding:3px 5px}
  .team{font-size:11px;gap:3px}
  .team em{font-size:9.5px}
  .team .fl{font-size:13px}
  .tag{font-size:10px;letter-spacing:.03em}
  h1{font-size:23px}
}
@media (prefers-reduced-motion:reduce){.info:hover{transform:none}}
`;
