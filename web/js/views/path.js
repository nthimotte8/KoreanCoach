// The guided path: six Hangeul steps, then five units of lessons. Everything stays open; the next step is highlighted.
import * as repo from '../repo.js';
import { HANGEUL, LESSONS, UNITS } from '../data/lessons.js';
import { html, render } from '../ui.js';

export async function mount(view) {
  const [map, next] = await Promise.all([repo.progressMap(), repo.nextStep()]);
  const cls = (id) => `step${map.get(id)?.done ? ' done' : map.has(id) ? ' started' : ''}${next?.id === id ? ' next' : ''}`;
  const state = (id) => (map.get(id)?.done ? 'terminé' : map.has(id) ? 'en cours' : '');

  render(view, html`<div class="wrap">
    <div class="page-head"><div class="stack" style="gap:4px"><h1>Parcours</h1>
      <p>De zéro au niveau A2 : l’alphabet, puis 25 leçons qui suivent l’histoire de Jiwoo. Chaque leçon : découvrir, écouter la scène, s’exercer, parler.</p></div></div>

    <section class="unit">
      <div class="unit-head"><h2>Lire le hangeul</h2><span class="chip">${HANGEUL.filter((h) => map.get(h.id)?.done).length} / 6</span></div>
      <div class="steps">${HANGEUL.map((h, i) => html`<a class="${cls(h.id)}" href="#alphabet-${h.id}">
        <span class="num">${map.get(h.id)?.done ? '✓' : i + 1}</span>
        <span class="stack" style="gap:0"><span class="t-ko">${h.title}</span><span class="t-fr">${h.letters.map((l) => l[0]).join(' ')}${state(h.id) ? ` · ${state(h.id)}` : ''}</span></span></a>`)}</div>
    </section>

    ${UNITS.map((u) => {
      const ls = LESSONS.filter((l) => l.unit === u.n);
      return html`<section class="unit">
        <div class="unit-head"><h2>Unité ${u.n} · ${u.title}</h2><span class="chip accent mono">${u.level}</span><span class="chip">${ls.filter((l) => map.get(l.id)?.done).length} / ${ls.length}</span></div>
        <div class="steps">${ls.map((l) => html`<a class="${cls(l.id)}" href="#lecon-${l.id}">
          <span class="num">${map.get(l.id)?.done ? '✓' : l.n}</span>
          <span class="stack" style="gap:0"><span class="t-ko" lang="ko">${l.title}</span><span class="t-fr">${l.name}${state(l.id) ? ` · ${state(l.id)}` : ''}</span></span></a>`)}</div>
      </section>`;
    })}
  </div>`);
}
