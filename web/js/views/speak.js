// Speaking hub: difficult sounds, say it in Korean, shadowing, role-play a lesson scene, conversation with the coach.
import * as repo from '../repo.js';
import { CAST, LESSONS, PAIRS, lesson as getLesson, learnedMaterial } from '../data/lessons.js';
import { micWidget, pairTask, runExercises, sayIt, shadow } from '../exercises.js';
import { canRecognize, speak, stopSpeaking } from '../speech.js';
import { alignSyllables, romanize, VERDICT } from '../hangul.js';
import { AVATAR } from './lesson.js';
import { $, $$, html, icon, ko3, markup, raw, render, sample, shuffle } from '../ui.js';

export async function mount(view, [mode, arg]) {
  const started = await repo.startedLessons();
  const mat = learnedMaterial(started.size ? started : new Set([LESSONS[0].id]));
  let stop = null;

  if (mode === 'sons') {
    const p = PAIRS.find((x) => x.id === arg) ?? PAIRS[0];
    render(view, html`<div class="wrap"><a class="hint" href="#parler">← Parler</a><h1>Sons difficiles : <span lang="ko">${p.title}</span></h1>
      <p class="muted">D’abord les entendre (${p.what}), puis les dire. Écoute chaque mot avant de commencer.</p>
      <section class="panel"><div class="stack">${p.sets.map((s) => html`<div class="row">${s.map((w) => html`<button class="btn" type="button" data-say="${w.ko}"><span lang="ko" style="font-size:20px">${w.ko}</span><span class="hint">${w.fr}</span></button>`)}</div>`)}</div></section>
      <div id="ex"></div></div>`);
    const words = p.sets.flat();
    const tasks = [...shuffle(p.sets.flatMap((s) => [pairTask(s), pairTask(s)])), ...sample(words, 3).map((w) => sayIt({ fr: `Dis « ${w.ko} » (${w.fr})`, ko: w.ko, answers: [w.ko] }))];
    stop = runExercises($('#ex', view), tasks, { title: `Sons ${p.title}` });
    return () => stop?.();
  }

  if (mode === 'dire') {
    render(view, html`<div class="wrap"><a class="hint" href="#parler">← Parler</a><h1>Dire en coréen</h1>
      <p class="muted">Des phrases des leçons que tu as commencées, dans le désordre. Le français s’affiche : à toi de le dire en coréen.</p><div id="ex"></div></div>`);
    stop = runExercises($('#ex', view), sample(mat.speak, 8).map(sayIt), { title: 'Dire en coréen' });
    return () => stop?.();
  }

  if (mode === 'repeter') {
    render(view, html`<div class="wrap"><a class="hint" href="#parler">← Parler</a><h1>Répéter (shadowing)</h1>
      <p class="muted">Écoute la réplique, répète-la en imitant la mélodie, puis compare ta voix au modèle.</p><div id="ex"></div></div>`);
    stop = runExercises($('#ex', view), sample(mat.lines.filter((x) => x.ko.length > 3), 8).map(shadow), { title: 'Répéter' });
    return () => stop?.();
  }

  if (mode === 'jouer') return rolePlay(view, getLesson(arg) ?? LESSONS[0]);

  /* hub */
  const playable = LESSONS.filter((l) => started.has(l.id));
  render(view, html`<div class="wrap">
    <div class="page-head"><div class="stack" style="gap:4px"><h1>Parler</h1>
      <p>Cinq façons de faire travailler ta bouche, de la plus guidée à la plus libre. ${canRecognize() ? 'Ta prononciation est vérifiée par la reconnaissance vocale de ton navigateur.' : ''}</p></div></div>
    ${canRecognize() ? '' : html`<p class="notice">Ce navigateur ne reconnaît pas la voix. Tu peux t’enregistrer et comparer à l’oreille ; pour la vérification automatique, ouvre le site dans Chrome ou Edge.</p>`}
    <section class="panel">
      <h2>1. Les sons difficiles</h2>
      <p class="muted">Les paires que l’oreille francophone confond. Entends la différence, puis produis-la.</p>
      <div class="scen-grid">${PAIRS.map((p) => html`<a class="tile" href="#parler-sons-${p.id}"><b lang="ko">${p.title}</b><span>${p.what}</span></a>`)}</div>
    </section>
    <div class="tiles">
      <a class="tile" href="#parler-repeter"><span class="k">2</span><b>Répéter</b><span>Écouter une réplique et l’imiter, mélodie comprise.</span></a>
      <a class="tile" href="#parler-dire"><span class="k">3</span><b>Dire en coréen</b><span>Le français s’affiche, tu le dis en coréen.</span></a>
      <a class="tile" href="#conversation"><span class="k">5</span><b>Conversation avec le coach</b><span>Un échange libre, corrigé en français. Conseillé à partir de l’unité 3.</span></a>
    </div>
    <section class="panel">
      <h2>4. Jouer une scène</h2>
      <p class="muted">Choisis une scène et un personnage : tu dis ses répliques, la voix joue les autres.</p>
      ${playable.length ? html`<div class="steps">${playable.map((l) => html`<a class="step" href="#parler-jouer-${l.id}"><span class="num">${l.n}</span><span class="stack" style="gap:0"><span class="t-ko">${l.scene.title}</span><span class="t-fr" lang="ko">${l.title}</span></span></a>`)}</div>`
        : html`<p class="empty">Commence la première leçon pour débloquer sa scène.</p>`}
    </section>
  </div>`);
}

/** Role-play: the learner says one character's lines; the other lines are spoken. */
function rolePlay(view, l) {
  const speakers = [...new Set(l.scene.lines.map((x) => x.who))];
  let alive = true;
  let mic = null;
  const chooseRole = () => render(view, html`<div class="wrap"><a class="hint" href="#parler">← Parler</a>
    <h1>Jouer la scène : ${l.scene.title}</h1><p class="muted">${l.scene.context}</p>
    <section class="panel"><h2>Quel rôle prends-tu ?</h2><div class="row">${speakers.map((w) => html`<button class="btn big" type="button" data-role="${w}"><span lang="ko">${CAST[w].ko}</span> · ${CAST[w].fr}</button>`)}</div>
    <p class="hint">Tes répliques s’affichent en français, avec la romanisation en indice. Dis-les en coréen.</p></section></div>`);
  chooseRole();
  for (const b of $$('[data-role]', view)) b.addEventListener('click', () => start(b.dataset.role));

  function start(me) {
    let i = 0;
    let good = 0, mine = 0;
    render(view, html`<div class="wrap"><a class="hint" href="#parler">← Parler</a>
      <h1>${l.scene.title}</h1><p class="muted">Tu joues <b lang="ko">${CAST[me].ko}</b> (${CAST[me].fr}).</p>
      <section class="panel"><div class="scene-lines" id="lines"></div><div id="turn" class="stack"></div></section></div>`);
    const linesEl = $('#lines', view), turn = $('#turn', view);
    const addLine = (x) => linesEl.insertAdjacentHTML('beforeend', markup(html`<div class="sline"><span class="avatar" style="background:${AVATAR[x.voice]}" lang="ko">${CAST[x.who].ko.slice(0, 1)}</span>${ko3(x, { voice: x.voice })}</div>`));
    const step = async () => {
      if (!alive) return;
      if (i >= l.scene.lines.length) {
        await repo.addSession({ kind: 'speak', total: mine, ok: good, lessonId: l.id });
        render(turn, html`<div class="answer good"><b>Scène terminée</b><p>${good} / ${mine} répliques bien dites.</p></div>
          <div class="row"><button class="btn" type="button" id="again">Rejouer</button><button class="btn" type="button" id="other">Changer de rôle</button><a class="btn primary" href="#parler">Retour</a></div>`);
        $('#again', turn).addEventListener('click', () => start(me));
        $('#other', turn).addEventListener('click', () => { chooseRole(); for (const b of $$('[data-role]', view)) b.addEventListener('click', () => start(b.dataset.role)); });
        return;
      }
      const x = l.scene.lines[i];
      if (x.who !== me) {
        addLine(x);
        render(turn, html`<p class="thinking"><span class="dot"></span><span lang="ko">${CAST[x.who].ko}</span> parle…</p>`);
        await speak(x.ko, { who: x.voice });
        i++;
        setTimeout(step, 300);
        return;
      }
      mine++;
      render(turn, html`<span class="label">À toi (${CAST[me].fr}) :</span><p class="say-fr">${x.fr}</p>
        <div class="row tight"><button class="btn quiet small" type="button" id="hint">Indice</button><span class="rom-hint" id="ht" hidden>${romanize(x.ko)}</span></div>
        <div id="mic"></div><div id="fb"></div>
        <div class="row"><button class="btn quiet" type="button" id="skip">Voir la réplique et continuer</button></div>`);
      $('#hint', turn).addEventListener('click', (e) => { e.currentTarget.remove(); $('#ht', turn).hidden = false; });
      const advance = (ok) => { if (ok) good++; addLine(x); i++; step(); };
      $('#skip', turn).addEventListener('click', () => { speak(x.ko, { who: x.voice }); advance(false); });
      mic = micWidget($('#mic', turn), {
        answers: [x.ko],
        onResult: (r) => {
          const ok = r.verdict === 'great' || r.verdict === 'good';
          const v = VERDICT[r.verdict];
          render($('#fb', turn), html`<div class="answer ${ok ? 'good' : 'warm'}"><span class="chip ${v.tone}">${v.label}</span>
            ${r.said ? html`<p class="diff" lang="ko">${alignSyllables(r.said, x.ko).map((s) => (s.text === ' ' ? raw(' ') : html`<span class="${s.ok ? 'ok' : 'miss'}">${s.text}</span>`))}</p>` : ''}
            <div class="row tight"><button class="btn small" type="button" data-say="${x.ko}" data-voice="${x.voice}">${icon.speaker}Modèle</button>
            <button class="btn primary small" type="button" id="cont">Continuer</button></div></div>`);
          $('#cont', turn).addEventListener('click', () => advance(ok));
        },
      });
    };
    step();
  }
  return () => { alive = false; mic?.cancel(); stopSpeaking(); };
}
