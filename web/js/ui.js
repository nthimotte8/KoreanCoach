// Small DOM helpers shared by every view, and the three-line display of Korean (hangeul, romanisation, French).
import { romanize } from './hangul.js';

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/** Tagged template that escapes interpolated values; wrap trusted markup with raw(). */
const RAW = Symbol('raw');
export const raw = (s) => ({ [RAW]: String(s) });
export function html(strings, ...values) {
  let out = '';
  strings.forEach((s, i) => {
    out += s;
    if (i < values.length) {
      const v = values[i];
      if (Array.isArray(v)) out += v.map((x) => (x && x[RAW] !== undefined ? x[RAW] : esc(x))).join('');
      else if (v && v[RAW] !== undefined) out += v[RAW];
      else if (v !== false && v != null) out += esc(v);
    }
  });
  return raw(out);
}
export const markup = (view) => view?.[RAW] ?? esc(view);
export const render = (el, view) => { el.innerHTML = markup(view); };

/** Escapes text, then turns **bold** into <b>. */
export const rich = (s) => raw(esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>'));

let toastTimer = null;
export function toast(message, tone = 'neutral') {
  const el = $('#toast');
  el.textContent = message;
  el.dataset.tone = tone;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 3500);
}

export const shortDate = (ts) => new Date(ts).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
export const minutesSince = (start) => Math.max(1, Math.round((Date.now() - start) / 60000));
export const pct = (x) => (x == null ? '—' : `${Math.round(x * 100)} %`);
export function shuffle(a) { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; }
export const sample = (a, n) => shuffle(a).slice(0, n);

const P = 'fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';
const svg = (d) => raw(`<svg class="i" viewBox="0 0 24 24" ${P}>${d}</svg>`);
export const icon = {
  home: svg('<path d="M4 11l8-7 8 7v9H4z"/><path d="M10 20v-6h4v6"/>'),
  path: svg('<circle cx="6" cy="6" r="2"/><circle cx="18" cy="18" r="2"/><path d="M8 6h6a4 4 0 0 1 0 8h-4a4 4 0 0 0 0 8"/>'),
  ear: svg('<path d="M7 9a5 5 0 0 1 10 0c0 3-3 4-3 7a3 3 0 0 1-5 2"/><path d="M10 9a2 2 0 0 1 4 0"/>'),
  talk: svg('<path d="M3 6h12v8H8l-5 4z"/><path d="M15 9h6v8l-4-3h-2"/>'),
  cards: svg('<rect x="3" y="6" width="14" height="14" rx="2"/><path d="M7 3h12a2 2 0 0 1 2 2v12"/>'),
  chat: svg('<path d="M4 5h16v11H9l-5 4z"/><path d="M9 10h.01M12 10h.01M15 10h.01"/>'),
  gear: svg('<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>'),
  mic: svg('<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>'),
  stop: svg('<rect x="6" y="6" width="12" height="12" rx="2"/>'),
  play: svg('<path d="M7 5l12 7-12 7z"/>'),
  speaker: svg('<path d="M11 5L6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/>'),
  eye: svg('<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'),
  check: svg('<path d="M5 12l5 5 9-10"/>'),
  plus: svg('<path d="M12 5v14M5 12h14"/>'),
  send: svg('<path d="M5 12h14M13 6l6 6-6 6"/>'),
  next: svg('<path d="M9 6l6 6-6 6"/>'),
  external: svg('<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>'),
};

/** Speaker button; main.js speaks data-say on click (data-voice: f, f2, m, m2). */
export const sayBtn = (ko, voice = 'f', label = 'Écouter') =>
  html`<button class="btn quiet small icon say-btn" type="button" data-say="${ko}" data-voice="${voice}" aria-label="${label} : ${ko}" title="Écouter">${icon.speaker}</button>`;

/**
 * Korean in three lines: hangeul, romanisation, French. Romanisation and French follow the display settings
 * (body classes no-rom / no-fr) unless `force` is set. size: 'xl' | 'lg' | '' .
 */
export function ko3({ ko, fr = '', rom, voice = 'f' }, { size = '', force = false, speaker = true, who = '' } = {}) {
  return html`<div class="ko3 ${size}${force ? ' force' : ''}">
    <div class="ko-row">${who ? html`<span class="who">${who}</span>` : ''}<span class="ko" lang="ko">${ko}</span>${speaker ? sayBtn(ko, voice) : ''}</div>
    <span class="rom">${rom ?? romanize(ko)}</span>
    ${fr ? html`<span class="fr">${fr}</span>` : ''}
  </div>`;
}

export const chip = (text, tone = '') => html`<span class="chip ${tone}">${text}</span>`;
