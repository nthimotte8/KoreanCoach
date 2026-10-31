// App shell: navigation, hash routing, display preferences, speaker buttons, offline support.
import * as ai from './ai.js';
import * as repo from './repo.js';
import { getSetting } from './db.js';
import { dueCards } from './srs.js';
import { loadVoicePrefs, speak } from './speech.js';
import { $, $$, esc, icon, markup } from './ui.js';

const ROUTES = {
  accueil: { label: 'Accueil', short: 'Accueil', icon: icon.home, load: () => import('./views/home.js') },
  parcours: { label: 'Parcours', short: 'Parcours', icon: icon.path, load: () => import('./views/path.js') },
  ecouter: { label: 'Écouter', short: 'Écouter', icon: icon.ear, load: () => import('./views/listen.js') },
  parler: { label: 'Parler', short: 'Parler', icon: icon.talk, load: () => import('./views/speak.js') },
  mots: { label: 'Vocabulaire', short: 'Mots', icon: icon.cards, load: () => import('./views/vocab.js') },
  coach: { label: 'Coach', short: 'Coach', icon: icon.chat, load: () => import('./views/coach.js') },
  reglages: { label: 'Réglages', short: 'Réglages', icon: icon.gear, load: () => import('./views/settings.js') },
};
// sub-pages and the section they belong to
const SUB = {
  alphabet: ['parcours', () => import('./views/hangeul.js')],
  lecon: ['parcours', () => import('./views/lesson.js')],
  scene: ['ecouter', () => import('./views/scene.js')],
  importer: ['ecouter', () => import('./views/import.js')],
  conversation: ['parler', () => import('./views/conversation.js')],
};

for (const a of $$('[data-nav]')) {
  const r = ROUTES[a.dataset.nav];
  a.innerHTML = `${markup(r.icon)}<span class="lbl-long">${esc(r.label)}</span><span class="lbl-short">${esc(r.short)}</span>`;
}

let cleanup = null;
let navToken = 0;
async function route() {
  const [name, ...args] = (location.hash.replace(/^#/, '') || 'accueil').split('-');
  const key = ROUTES[name] || SUB[name] ? name : 'accueil';
  const section = SUB[key]?.[0] ?? key;
  for (const a of $$('[data-nav]')) {
    if (a.dataset.nav === section) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  }
  const token = ++navToken;
  try { cleanup?.(); } catch { /* view already gone */ }
  cleanup = null;
  const mod = await (SUB[key]?.[1] ?? ROUTES[key].load)();
  if (token !== navToken) return;
  const view = $('#view');
  view.innerHTML = '';
  cleanup = (await mod.mount(view, args)) ?? null;
  document.title = `${ROUTES[section].label} · Korean Coach`;
  if (document.activeElement === document.body) view.focus({ preventScroll: true });
  window.scrollTo(0, 0);
  refreshBadge();
}
window.addEventListener('hashchange', route);

/** Number of vocabulary cards due, on the navigation link. */
export async function refreshBadge() {
  const n = dueCards(await repo.allCards(), Date.now(), 999).length;
  const link = $('[data-nav="mots"]');
  link.querySelector('.badge')?.remove();
  if (n) link.insertAdjacentHTML('beforeend', `<span class="badge" aria-label="${n} à réviser">${n > 99 ? '99+' : n}</span>`);
}

/** Romanisation and translation visibility (body classes read by the stylesheet). */
export async function applyDisplay() {
  document.body.classList.toggle('no-rom', !(await getSetting('showRom', true)));
  document.body.classList.toggle('no-fr', !(await getSetting('showFr', true)));
}

// any [data-say] element speaks its Korean text
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-say]');
  if (b) { e.preventDefault(); speak(b.dataset.say, { who: b.dataset.voice || 'f' }); }
});

/* coach status in the sidebar */
ai.onState((s) => {
  const el = $('#model-status');
  if (s.status === 'loading') {
    el.innerHTML = `<span>${esc(s.text || 'Chargement du coach…')}</span><div class="progress"><i style="width:${Math.round(s.progress * 100)}%"></i></div>`;
  } else if (s.status === 'ready' || s.status === 'thinking') {
    el.innerHTML = '<span class="chip good">Coach IA prêt</span>';
  } else if (s.status === 'error') {
    el.innerHTML = '<span class="chip bad">Coach indisponible</span>';
  } else {
    el.innerHTML = '<span>Coach IA : chargé à la demande</span>';
  }
});

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

await Promise.all([applyDisplay(), loadVoicePrefs()]);
route();
// the coach is optional: load it in the background only if it is already downloaded
setTimeout(() => ai.warmUpIfCached(), 2500);
