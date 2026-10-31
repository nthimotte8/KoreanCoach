// A lesson in four parts: discover (words + grammar), the scene (blind listening first), exercises, speaking.
import * as repo from '../repo.js';
import { CAST, LESSONS, lesson as getLesson } from '../data/lessons.js';
import { blind, hearMeaning, readMeaning, runExercises, sayIt, shadow, spotWord } from '../exercises.js';
import { currentRate, setRatePref, speakLines, stopSpeaking } from '../speech.js';
import { setSetting } from '../db.js';
import { $, $$, html, icon, ko3, markup, render, rich, sample, shuffle, toast } from '../ui.js';

const PARTS = [
  ['decouvrir', 'Découvrir'],
  ['scene', 'Scène'],
  ['exercices', 'Exercices'],
  ['parler', 'Parler'],
];
export const AVATAR = { f: '#B4233C', f2: '#B0611A', m: '#1F4FA8', m2: '#2F7D5B' };

export async function mount(view, [id = 'l01', part = 'decouvrir']) {
  const l = getLesson(id) ?? LESSONS[0];
  const prog = await repo.getProgress(l.id);
  const next = LESSONS[l.n] ?? null;
  let stop = null;
  const signal = { stop: false };

  render(view, html`<div class="wrap">
    <div class="lesson-head">
      <a class="hint" href="#parcours">← Parcours</a>
      <div class="row tight"><span class="label">Leçon ${l.n} / ${LESSONS.length} · unité ${l.unit}</span><span class="chip accent mono">${l.level}</span>${prog.done ? html`<span class="chip good">Terminée</span>` : ''}</div>
      <h1><span class="title-ko" lang="ko">${l.title}</span></h1>
      <p class="muted">${l.name}</p>
    </div>
    <nav class="tabs" aria-label="Parties de la leçon">${PARTS.map(([k, label], i) => html`<a href="#lecon-${l.id}-${k}" ${k === part ? html`aria-current="page"` : ''}>${i + 1}. ${label}${prog.parts?.[k] ? html` <span class="tick" aria-label="fait">✓</span>` : ''}</a>`)}</nav>
    <div id="part" class="stack" style="gap:16px"></div>
  </div>`);
  const box = $('#part', view);
  const goNext = (k) => { const i = PARTS.findIndex(([p]) => p === k); return PARTS[i + 1] ? `#lecon-${l.id}-${PARTS[i + 1][0]}` : next ? `#lecon-${next.id}` : '#parcours'; };

  /* ---------------- 1. discover ---------------- */
  if (part === 'decouvrir') {
    render(box, html`
      <section class="panel"><p>${l.intro}</p></section>
      <section class="panel">
        <div class="row between"><h2>Les mots et expressions</h2><button class="btn small" type="button" id="all">${icon.speaker}Tout écouter</button></div>
        <div class="word-list">${l.words.map((w) => html`<div class="word">${ko3(w, { size: 'lg' })}${w.note ? html`<span class="note">${w.note}</span>` : ''}</div>`)}</div>
      </section>
      <section class="panel grammar">
        <h2>${l.grammar.title}</h2>
        ${l.grammar.body.map((p) => html`<p>${rich(p)}</p>`)}
        <div class="examples">${l.grammar.ex.map((e) => ko3(e))}</div>
      </section>
      <div class="row"><button class="btn primary big" type="button" id="done">Écouter la scène${icon.next}</button></div>`);
    $('#all', box).addEventListener('click', () => speakLines(l.words, { signal }));
    $('#done', box).addEventListener('click', async () => {
      await repo.markPart(l.id, 'decouvrir');
      const n = await repo.addCards(l.words, `Leçon ${l.n}`);
      if (n) toast(`${n} mots ajoutés à ton carnet de vocabulaire.`, 'good');
      location.hash = goNext('decouvrir');
    });
  }

  /* ---------------- 2. the scene ---------------- */
  if (part === 'scene') {
    const lines = l.scene.lines;
    const speakers = [...new Set(lines.map((x) => x.who))];
    let shown = !!prog.parts?.scene; // first time: listen without the text
    let heard = false;
    const paint = () => {
      render(box, html`
        <section class="panel">
          <h2>${l.scene.title}</h2>
          <p class="muted">${l.scene.context}</p>
          <div class="cast">${speakers.map((w) => html`<span><i style="background:${AVATAR[CAST[w].voice]}"></i><b lang="ko">${CAST[w].ko}</b> ${CAST[w].fr}</span>`)}</div>
          ${shown ? '' : html`<p class="tip">Écoute d’abord toute la scène sans le texte. Essaie de deviner qui parle et ce qui se passe, puis affiche le texte.</p>`}
          <div class="toolbar">
            <button class="btn primary" type="button" id="play">${icon.play}Écouter la scène</button>
            <div class="row tight" role="group" aria-label="Vitesse">${['lent', 'normal', 'rapide'].map((r) => html`<button type="button" class="pick small" data-rate="${r}" aria-pressed="${currentRate() === r}">${{ lent: 'Lente', normal: 'Normale', rapide: 'Rapide' }[r]}</button>`)}</div>
            <button class="btn" type="button" id="toggle">${icon.eye}${shown ? 'Cacher le texte' : 'Afficher le texte'}</button>
          </div>
          <div class="scene-lines">${lines.map((x, i) => html`<div class="sline" data-line="${i}">
            <span class="avatar" style="background:${AVATAR[x.voice]}" lang="ko" aria-label="${CAST[x.who].fr}">${CAST[x.who].ko.slice(0, 1)}</span>
            ${shown ? ko3(x, { voice: x.voice }) : html`<div class="row tight"><button class="btn quiet small icon" type="button" data-say="${x.ko}" data-voice="${x.voice}" aria-label="Écouter la réplique ${i + 1}">${icon.speaker}</button><span class="hidden-text">Réplique ${i + 1} · ${CAST[x.who].fr}</span></div>`}
          </div>`)}</div>
        </section>
        <div class="row"><a class="btn ${heard || shown ? 'primary' : ''} big" href="${goNext('scene')}" id="done">S’exercer${icon.next}</a></div>`);
      $('#play', box).addEventListener('click', async (e) => {
        if (e.currentTarget.dataset.playing) { signal.stop = true; stopSpeaking(); return; }
        signal.stop = false;
        e.currentTarget.dataset.playing = '1';
        e.currentTarget.innerHTML = markup(html`${icon.stop}Arrêter`);
        await speakLines(lines, { signal, onLine: (i) => { for (const el of $$('.sline', box)) el.classList.toggle('on', Number(el.dataset.line) === i); } });
        heard = true;
        if (!view.isConnected) return;
        paint();
      });
      $('#toggle', box).addEventListener('click', () => { shown = !shown; paint(); });
      for (const b of $$('[data-rate]', box)) b.addEventListener('click', () => { setRatePref(b.dataset.rate); setSetting('rate', b.dataset.rate); paint(); });
      $('#done', box).addEventListener('click', () => repo.markPart(l.id, 'scene'));
    };
    paint();
  }

  /* ---------------- 3. exercises ---------------- */
  if (part === 'exercices') {
    const lines = l.scene.lines;
    const words = l.words;
    const allWords = LESSONS.flatMap((x) => x.words);
    const allLines = LESSONS.flatMap((x) => x.scene.lines);
    const nearLines = LESSONS.filter((x) => Math.abs(x.n - l.n) <= 3).flatMap((x) => x.scene.lines);
    const tasks = shuffle([
      ...sample(words, 3).map((w) => hearMeaning(w, allWords)),
      ...sample(words, 2).map((w) => readMeaning(w, allWords)),
      ...sample(lines, 2).map((x) => spotWord(x, [...words, ...sample(allWords, 12)])),
      ...sample(lines, 2).map((x) => hearMeaning(x, nearLines.length > 8 ? nearLines : allLines)),
    ]).filter(Boolean);
    // blind listening of scene lines comes last: the most important skill
    tasks.push(...sample(lines.filter((x) => x.ko.length > 3), 3).map(blind));
    stop = runExercises(box, tasks, {
      title: `Exercices · leçon ${l.n}`, lessonId: l.id,
      onDone: async () => { await repo.markPart(l.id, 'exercices'); return html`<div class="row"><a class="btn primary" href="${goNext('exercices')}">À toi de parler${icon.next}</a></div>`; },
    });
  }

  /* ---------------- 4. speaking ---------------- */
  if (part === 'parler') {
    const tasks = [...l.speak.map(sayIt), ...sample(l.scene.lines.filter((x) => x.ko.length > 4), 2).map(shadow)];
    render(box, html`<div id="ex"></div>`);
    stop = runExercises($('#ex', box), tasks, {
      title: `À toi de parler · leçon ${l.n}`, lessonId: l.id,
      onDone: async () => {
        const p = await repo.markPart(l.id, 'parler');
        return html`${p.done ? html`<p class="chip good">Leçon ${l.n} terminée</p>` : ''}
          <div class="row"><a class="btn" href="#parler-jouer-${l.id}">Jouer la scène, un rôle à la voix</a>
          ${next ? html`<a class="btn primary" href="#lecon-${next.id}">Leçon suivante : <span lang="ko">${next.title}</span></a>` : html`<a class="btn primary" href="#ecouter">Passer aux vraies scènes</a>`}</div>`;
      },
    });
  }

  return () => { signal.stop = true; stopSpeaking(); stop?.(); };
}
