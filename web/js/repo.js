// Data access on top of IndexedDB: path progress, practice results, vocabulary cards, imported scenes, stats.
import * as db from './db.js';
import { cardKey, isDue, isMastered, newCard } from './srs.js';
import { LESSONS, HANGEUL, PATH } from './data/lessons.js';

/* ---------------- path progress ---------------- */
export const LESSON_PARTS = ['decouvrir', 'scene', 'exercices', 'parler'];
export const HANGEUL_PARTS = ['lettres', 'exercices'];

export async function progressMap() {
  return new Map((await db.all('progress')).map((p) => [p.id, p]));
}
export async function getProgress(id) { return (await db.get('progress', id)) ?? { id, parts: {}, done: false }; }

/** Marks one part of a lesson or Hangeul step as done; the step is done when all its parts are. */
export async function markPart(id, part, extra = {}) {
  const p = await getProgress(id);
  const parts = { ...p.parts, [part]: { at: Date.now(), ...extra } };
  const needed = id.startsWith('h') ? HANGEUL_PARTS : LESSON_PARTS;
  const done = needed.every((k) => parts[k]);
  const row = { ...p, parts, done, startedAt: p.startedAt ?? Date.now(), doneAt: done ? (p.doneAt ?? Date.now()) : null, updatedAt: Date.now() };
  await db.put('progress', row);
  return row;
}

/** The first step of the path that is not done (or null when everything is). */
export async function nextStep() {
  const map = await progressMap();
  return PATH.find((s) => !map.get(s.id)?.done) ?? null;
}
export async function startedLessons() {
  const map = await progressMap();
  return new Set(LESSONS.filter((l) => map.has(l.id)).map((l) => l.id));
}

/* ---------------- practice results ---------------- */
/**
 * Records a practice session. kind: listen (blind listening) | speak (said in Korean) | quiz | review.
 * total and ok count items; ok means understood (listen) or said well enough (speak).
 */
export async function addSession(s) {
  return db.put('sessions', { lessonId: null, total: 0, ok: 0, minutes: 1, ...s, at: Date.now() });
}

/* ---------------- vocabulary ---------------- */
/** Adds a card unless the same Korean is already in the notebook. Returns {card, added}. */
export async function addCard(fields) {
  const key = cardKey(fields.ko);
  if (!key) return { card: null, added: false };
  const existing = (await db.all('cards')).find((c) => c.key === key);
  if (existing) return { card: existing, added: false };
  const card = await db.put('cards', newCard({ fr: '', note: '', context: null, source: '', ...fields, front: fields.ko, key }));
  return { card, added: true };
}
export async function addCards(list, source) {
  let n = 0;
  for (const w of list) if ((await addCard({ ko: w.ko, fr: w.fr, note: w.note ?? '', source })).added) n++;
  return n;
}
export const allCards = () => db.all('cards');
export const saveCard = (c) => db.put('cards', c);
export const deleteCard = (id) => db.del('cards', id);

/* ---------------- imported scenes ---------------- */
export async function createMaterial(m) {
  return db.put('materials', { source: 'subs', videoId: null, audioUrl: null, translated: false, ...m, createdAt: Date.now() });
}
export const getMaterial = (id) => db.get('materials', id);
export const saveMaterial = (m) => db.put('materials', m);
export const deleteMaterial = (id) => db.del('materials', id);
export async function listMaterials() { return (await db.all('materials')).sort((a, b) => b.createdAt - a.createdAt); }

/* ---------------- stats ---------------- */
const dayKey = (ts) => { const d = new Date(ts); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

/** Ratio ok/total over the most recent sessions of a kind, up to `window` items. */
function recentRatio(sessions, kind, window = 200) {
  let total = 0, ok = 0;
  for (const s of sessions.filter((x) => x.kind === kind)) {
    if (total >= window) break;
    total += s.total; ok += s.ok;
  }
  return total ? { ratio: ok / total, total } : { ratio: null, total: 0 };
}

export async function stats() {
  const [sessions, cards, map] = await Promise.all([db.all('sessions'), db.all('cards'), progressMap()]);
  sessions.sort((a, b) => b.at - a.at);
  const activity = {};
  sessions.forEach((s) => { const k = dayKey(s.at); activity[k] = (activity[k] ?? 0) + 1; });
  cards.forEach((c) => { if (c.lastReview) { const k = dayKey(c.lastReview); activity[k] = (activity[k] ?? 0) + 1; } });
  let streak = 0;
  for (let d = new Date(); ; d.setDate(d.getDate() - 1)) {
    if (activity[dayKey(d)]) streak++;
    else if (streak || dayKey(d) !== dayKey(Date.now())) break; // today may still be empty
  }
  // weekly evolution of the two indicators
  const weeks = [];
  for (let w = 7; w >= 0; w--) {
    const from = Date.now() - (w + 1) * 7 * 86400000, to = Date.now() - w * 7 * 86400000;
    const inWeek = sessions.filter((s) => s.at >= from && s.at < to);
    const r = (kind) => { const xs = inWeek.filter((s) => s.kind === kind); const t = xs.reduce((a, s) => a + s.total, 0); return t ? xs.reduce((a, s) => a + s.ok, 0) / t : null; };
    weeks.push({ to, listen: r('listen'), speak: r('speak') });
  }
  return {
    listen: recentRatio(sessions, 'listen'),
    speak: recentRatio(sessions, 'speak'),
    weeks,
    totalMinutes: sessions.reduce((a, s) => a + (s.minutes ?? 0), 0),
    lessonsDone: LESSONS.filter((l) => map.get(l.id)?.done).length,
    hangeulDone: HANGEUL.filter((h) => map.get(h.id)?.done).length,
    streak,
    activity,
    cards: { total: cards.length, due: cards.filter((c) => isDue(c)).length, mastered: cards.filter(isMastered).length },
  };
}
