// One Hangeul step: how the letters work, the sound of each letter, words to read, then exercises.
import * as repo from '../repo.js';
import { HANGEUL } from '../data/lessons.js';
import { hearHangeul, hearMeaning, readMeaning, readSound, runExercises } from '../exercises.js';
import { speak } from '../speech.js';
import { $, $$, html, icon, ko3, render, rich, sample, shuffle } from '../ui.js';

export async function mount(view, [id = 'h1', part]) {
  const k = Math.max(0, HANGEUL.findIndex((h) => h.id === id));
  const h = HANGEUL[k];
  const prev = HANGEUL.slice(0, k + 1);
  const nextStep = HANGEUL[k + 1];
  let stop = null;

  const head = html`<div class="lesson-head">
    <a class="hint" href="#parcours">← Parcours</a>
    <span class="label">Alphabet · étape ${k + 1} / 6</span>
    <h1>${h.title}</h1></div>`;

  if (part === 'exercices') {
    render(view, html`<div class="wrap">${head}<div id="ex"></div></div>`);
    const sylls = (steps) => steps.flatMap((s) => s.letters.map(([, , say, ex]) => ({ ko: ex, fr: say })));
    const own = sylls([h]);
    const pool = sylls(prev.length > 1 ? prev : HANGEUL.slice(0, 2));
    const words = h.words.map(([ko, fr]) => ({ ko, fr }));
    const wordPool = prev.flatMap((s) => s.words.map(([ko, fr]) => ({ ko, fr })));
    const tasks = shuffle([
      ...sample(own, Math.min(5, own.length)).map((it) => readSound(it, pool)),
      ...sample(own, Math.min(4, own.length)).map((it) => hearHangeul(it, pool)),
      ...sample(words, Math.min(3, words.length)).map((it) => readMeaning(it, wordPool)),
      ...sample(words, Math.min(2, words.length)).map((it) => hearMeaning(it, wordPool)),
    ]);
    stop = runExercises($('#ex', view), tasks, {
      title: `Exercices · ${h.short}`, lessonId: h.id,
      onDone: async (rs) => {
        await repo.markPart(h.id, 'exercices', { score: rs.filter((r) => r.ok).length / rs.length });
        await repo.markPart(h.id, 'lettres');
        return html`<div class="row">${nextStep ? html`<a class="btn primary" href="#alphabet-${nextStep.id}">Étape suivante : ${nextStep.title}</a>`
          : html`<a class="btn primary" href="#lecon-l01">Commencer la leçon 1</a>`}<a class="btn" href="#alphabet-${h.id}">Revoir les lettres</a></div>`;
      },
    });
    return () => stop?.();
  }

  render(view, html`<div class="wrap">
    ${head}
    <section class="panel">${h.intro.map((p) => html`<p>${rich(p)}</p>`)}</section>
    <section class="panel">
      <div class="row between"><h2>Les lettres</h2><button class="btn small" type="button" id="all">${icon.speaker}Tout écouter</button></div>
      <p class="hint">Clique une lettre pour l’entendre dans une syllabe.</p>
      <div class="letters">${h.letters.map(([j, rom, say, ex]) => html`<button class="letter" type="button" data-say="${ex}">
        <span class="j" lang="ko">${j}</span><span class="r">${rom}</span><span class="s">${say}</span><span class="s">ex. <span lang="ko">${ex}</span></span></button>`)}</div>
      <p class="tip">${h.tip}</p>
    </section>
    <section class="panel">
      <h2>À lire</h2>
      <p class="hint">Essaie de lire chaque mot avant de regarder la prononciation, puis écoute.</p>
      <div class="word-list">${h.words.map(([ko, fr]) => html`<div class="word">${ko3({ ko, fr }, { size: 'lg' })}</div>`)}</div>
    </section>
    <div class="row"><a class="btn primary big" href="#alphabet-${h.id}-exercices" id="go">S’exercer</a>
      ${nextStep ? html`<a class="btn" href="#alphabet-${nextStep.id}">Étape suivante</a>` : ''}</div>
  </div>`);

  let playing = true;
  $('#all', view).addEventListener('click', async () => {
    playing = true;
    for (const [, , , ex] of h.letters) { if (!playing) break; for (const b of $$('.letter', view)) b.classList.toggle('on', b.dataset.say === ex); await speak(ex, { rate: 'lent' }); await new Promise((r) => setTimeout(r, 250)); }
    for (const b of $$('.letter', view)) b.classList.remove('on');
  });
  $('#go', view).addEventListener('click', () => { repo.markPart(h.id, 'lettres'); });
  return () => { playing = false; };
}
