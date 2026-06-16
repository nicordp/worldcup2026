/**
 * update-scores.js
 * Fetches 2026 World Cup results via Claude + web search
 * and updates scores.json with any new finished matches.
 *
 * Runs daily via GitHub Actions. No npm packages required.
 * Requires Node 18+ (uses built-in fetch).
 */

const fs = require('fs');
const path = require('path');

const API_KEY = process.env.ANTHROPIC_API_KEY;
if (!API_KEY) { console.error('Missing ANTHROPIC_API_KEY'); process.exit(1); }

const SCORES_FILE = path.join(__dirname, 'scores.json');

// All 72 group stage matches — home team / away team / date
const MATCH_SCHEDULE = [
  { id: 'g1',  home: 'Mexico',         away: 'South Africa',      date: '2026-06-11' },
  { id: 'g2',  home: 'South Korea',    away: 'Czechia',           date: '2026-06-11' },
  { id: 'g3',  home: 'Canada',         away: 'Bosnia & Herz.',    date: '2026-06-12' },
  { id: 'g4',  home: 'USA',            away: 'Paraguay',          date: '2026-06-12' },
  { id: 'g5',  home: 'Qatar',          away: 'Switzerland',       date: '2026-06-13' },
  { id: 'g6',  home: 'Brazil',         away: 'Morocco',           date: '2026-06-13' },
  { id: 'g7',  home: 'Haiti',          away: 'Scotland',          date: '2026-06-13' },
  { id: 'g8',  home: 'Australia',      away: 'Turkiye',           date: '2026-06-14' },
  { id: 'g9',  home: 'Germany',        away: 'Curacao',           date: '2026-06-14' },
  { id: 'g10', home: 'Netherlands',    away: 'Japan',             date: '2026-06-14' },
  { id: 'g11', home: 'Ivory Coast',    away: 'Ecuador',           date: '2026-06-14' },
  { id: 'g12', home: 'Sweden',         away: 'Tunisia',           date: '2026-06-14' },
  { id: 'g13', home: 'Spain',          away: 'Cape Verde',        date: '2026-06-15' },
  { id: 'g14', home: 'Belgium',        away: 'Egypt',             date: '2026-06-15' },
  { id: 'g15', home: 'Saudi Arabia',   away: 'Uruguay',           date: '2026-06-15' },
  { id: 'g16', home: 'Iran',           away: 'New Zealand',       date: '2026-06-15' },
  { id: 'g17', home: 'France',         away: 'Senegal',           date: '2026-06-16' },
  { id: 'g18', home: 'Iraq',           away: 'Norway',            date: '2026-06-16' },
  { id: 'g19', home: 'Argentina',      away: 'Algeria',           date: '2026-06-16' },
  { id: 'g20', home: 'Austria',        away: 'Jordan',            date: '2026-06-17' },
  { id: 'g21', home: 'Portugal',       away: 'DR Congo',          date: '2026-06-17' },
  { id: 'g22', home: 'England',        away: 'Croatia',           date: '2026-06-17' },
  { id: 'g23', home: 'Ghana',          away: 'Panama',            date: '2026-06-17' },
  { id: 'g24', home: 'Uzbekistan',     away: 'Colombia',          date: '2026-06-17' },
  { id: 'g25', home: 'Czechia',        away: 'South Africa',      date: '2026-06-18' },
  { id: 'g26', home: 'Switzerland',    away: 'Bosnia & Herz.',    date: '2026-06-18' },
  { id: 'g27', home: 'Canada',         away: 'Qatar',             date: '2026-06-18' },
  { id: 'g28', home: 'Mexico',         away: 'South Korea',       date: '2026-06-18' },
  { id: 'g29', home: 'USA',            away: 'Australia',         date: '2026-06-19' },
  { id: 'g30', home: 'Scotland',       away: 'Morocco',           date: '2026-06-19' },
  { id: 'g31', home: 'Brazil',         away: 'Haiti',             date: '2026-06-19' },
  { id: 'g32', home: 'Turkiye',        away: 'Paraguay',          date: '2026-06-20' },
  { id: 'g33', home: 'Netherlands',    away: 'Sweden',            date: '2026-06-20' },
  { id: 'g34', home: 'Germany',        away: 'Ivory Coast',       date: '2026-06-20' },
  { id: 'g35', home: 'Ecuador',        away: 'Curacao',           date: '2026-06-20' },
  { id: 'g36', home: 'Tunisia',        away: 'Japan',             date: '2026-06-21' },
  { id: 'g37', home: 'Spain',          away: 'Saudi Arabia',      date: '2026-06-21' },
  { id: 'g38', home: 'Belgium',        away: 'Iran',              date: '2026-06-21' },
  { id: 'g39', home: 'Uruguay',        away: 'Cape Verde',        date: '2026-06-21' },
  { id: 'g40', home: 'New Zealand',    away: 'Egypt',             date: '2026-06-21' },
  { id: 'g41', home: 'Argentina',      away: 'Austria',           date: '2026-06-22' },
  { id: 'g42', home: 'France',         away: 'Iraq',              date: '2026-06-22' },
  { id: 'g43', home: 'Norway',         away: 'Senegal',           date: '2026-06-22' },
  { id: 'g44', home: 'Jordan',         away: 'Algeria',           date: '2026-06-23' },
  { id: 'g45', home: 'Portugal',       away: 'Uzbekistan',        date: '2026-06-23' },
  { id: 'g46', home: 'England',        away: 'Ghana',             date: '2026-06-23' },
  { id: 'g47', home: 'Panama',         away: 'Croatia',           date: '2026-06-23' },
  { id: 'g48', home: 'Colombia',       away: 'DR Congo',          date: '2026-06-23' },
  { id: 'g49', home: 'Switzerland',    away: 'Canada',            date: '2026-06-24' },
  { id: 'g50', home: 'Bosnia & Herz.', away: 'Qatar',             date: '2026-06-24' },
  { id: 'g51', home: 'Scotland',       away: 'Brazil',            date: '2026-06-24' },
  { id: 'g52', home: 'Morocco',        away: 'Haiti',             date: '2026-06-24' },
  { id: 'g53', home: 'Czechia',        away: 'Mexico',            date: '2026-06-24' },
  { id: 'g54', home: 'South Africa',   away: 'South Korea',       date: '2026-06-24' },
  { id: 'g55', home: 'Ecuador',        away: 'Germany',           date: '2026-06-25' },
  { id: 'g56', home: 'Curacao',        away: 'Ivory Coast',       date: '2026-06-25' },
  { id: 'g57', home: 'Japan',          away: 'Sweden',            date: '2026-06-25' },
  { id: 'g58', home: 'Tunisia',        away: 'Netherlands',       date: '2026-06-25' },
  { id: 'g59', home: 'Turkiye',        away: 'USA',               date: '2026-06-25' },
  { id: 'g60', home: 'Paraguay',       away: 'Australia',         date: '2026-06-25' },
  { id: 'g61', home: 'Norway',         away: 'France',            date: '2026-06-26' },
  { id: 'g62', home: 'Senegal',        away: 'Iraq',              date: '2026-06-26' },
  { id: 'g63', home: 'Cape Verde',     away: 'Saudi Arabia',      date: '2026-06-26' },
  { id: 'g64', home: 'Uruguay',        away: 'Spain',             date: '2026-06-26' },
  { id: 'g65', home: 'Egypt',          away: 'Iran',              date: '2026-06-27' },
  { id: 'g66', home: 'New Zealand',    away: 'Belgium',           date: '2026-06-27' },
  { id: 'g67', home: 'Panama',         away: 'England',           date: '2026-06-27' },
  { id: 'g68', home: 'Croatia',        away: 'Ghana',             date: '2026-06-27' },
  { id: 'g69', home: 'Colombia',       away: 'Portugal',          date: '2026-06-27' },
  { id: 'g70', home: 'DR Congo',       away: 'Uzbekistan',        date: '2026-06-27' },
  { id: 'g71', home: 'Algeria',        away: 'Austria',           date: '2026-06-27' },
  { id: 'g72', home: 'Jordan',         away: 'Argentina',         date: '2026-06-27' },
];

// ─── API helpers ──────────────────────────────────────────────────────────────

async function apiPost(body) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 4096, ...body }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || `HTTP ${res.status}`);
  return data;
}

function textFrom(content) {
  return (content || []).filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
}

function sealContent(content) {
  return (content || []).map(b =>
    b.type === 'text' ? { ...b, text: b.text.trimEnd() || '.' } : b
  );
}

function extractJSON(text) {
  const cleaned = text.replace(/```json|```/gi, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('No JSON object in response');
  return JSON.parse(cleaned.slice(start, end + 1));
}

// Phase 1: search with web_search tool, follow pause_turn continuations
async function runSearch(prompt) {
  let messages = [{ role: 'user', content: prompt }];
  for (let turn = 0; turn < 10; turn++) {
    console.log(`  [search turn ${turn + 1}]`);
    const data = await apiPost({
      messages,
      tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 8 }],
    });
    const content = data.content || [];
    const types = content.map(b => b.type).join(',');
    console.log(`  stop=${data.stop_reason} blocks=[${types}]`);

    if (data.stop_reason === 'pause_turn') {
      messages = [...messages, { role: 'assistant', content: sealContent(content) }];
      continue;
    }
    const text = textFrom(content);
    if (text) return text;
    messages = [...messages, { role: 'assistant', content: sealContent(content) }];
  }
  throw new Error('Search produced no text after 10 turns');
}

// Phase 2: no-tool formatting pass — always returns end_turn immediately
async function formatToJSON(rawText, schema) {
  console.log('  [format pass]');
  const data = await apiPost({
    system: 'You output ONLY raw minified JSON. No prose, no markdown fences, no explanation.',
    messages: [{
      role: 'user',
      content: `Convert the match report text below into exactly this JSON schema.\n\nSCHEMA:\n${schema}\n\nTEXT:\n${rawText.slice(0, 6000)}\n\nOutput only the JSON object:`,
    }],
  });
  return extractJSON(textFrom(data.content));
}

// ─── Main logic ──────────────────────────────────────────────────────────────

async function main() {
  // Load existing scores
  let existing = { updated: null, matches: {} };
  if (fs.existsSync(SCORES_FILE)) {
    existing = JSON.parse(fs.readFileSync(SCORES_FILE, 'utf8'));
  }

  // Find matches to fetch: played (date <= today) and not yet verified
  const today = new Date().toISOString().slice(0, 10);
  const toFetch = MATCH_SCHEDULE.filter(m => {
    if (m.date > today) return false;               // future
    if (existing.matches[m.id]?.done) return false; // already verified
    return true;
  });

  if (toFetch.length === 0) {
    console.log('No new matches to fetch. All up to date.');
    return;
  }

  console.log(`Fetching results for ${toFetch.length} matches:`);
  toFetch.forEach(m => console.log(`  ${m.id}: ${m.home} vs ${m.away} (${m.date})`));

  const matchList = toFetch.map(m =>
    `${m.id}=${m.home} vs ${m.away} (${m.date})`
  ).join(', ');

  const schema = JSON.stringify({
    matches: {
      g1: {
        played: true,
        score: "2-0",
        pens: null,
        scorers: [{ team: "home", player: "Name", minute: "9", pen: false, og: false }],
        cards: [{ team: "away", player: "Name", minute: "55", card: "yellow" }]
      }
    }
  });

  const prompt = `Search the web for the final results of these 2026 FIFA World Cup matches: ${matchList}.

For each match that has been played, find:
- The exact final score (home-away)
- Every goalscorer with exact minute (mark pen:true for penalties, og:true for own goals)
- Every yellow and red card with player name and exact minute
- team field must be "home" or "away"

If a match has not been played yet, omit it from the response.

Return the results as a JSON object with this structure (using the match IDs provided):
${schema}`;

  console.log('\nSearching...');
  const rawText = await runSearch(prompt);

  console.log('\nFormatting...');
  let result;
  try {
    result = extractJSON(rawText);
  } catch {
    result = await formatToJSON(rawText, schema);
  }

  // Merge results into existing scores (never overwrite done:true)
  let updated = 0;
  for (const [id, data] of Object.entries(result.matches || {})) {
    if (existing.matches[id]?.done) {
      console.log(`  ${id}: already verified, skipping`);
      continue;
    }
    if (data.played !== false && data.score) {
      existing.matches[id] = { ...data, played: true, done: true };
      const match = MATCH_SCHEDULE.find(m => m.id === id);
      console.log(`  ${id} (${match?.home} vs ${match?.away}): ${data.score} ✓`);
      updated++;
    }
  }

  existing.updated = new Date().toISOString();
  fs.writeFileSync(SCORES_FILE, JSON.stringify(existing, null, 2));
  console.log(`\nDone. Updated ${updated} matches. scores.json saved.`);
}

main().catch(e => {
  console.error('Fatal error:', e.message);
  process.exit(1);
});
