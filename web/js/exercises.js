// The exercise engine: a sequence of tasks shown one at a time, with listening, reading and speaking tasks.
// Tasks are plain objects built by the helpers below; results are saved as practice sessions.
import * as repo from './repo.js';
import { alignSyllables, judge, romanize, VERDICT } from './hangul.js';
import { canRecognize, currentRate, listen, Recorder, setRatePref, speak, stopSpeaking } from './speech.js';
import { getSetting, setSetting } from './db.js';
import { $, $$, html, icon, ko3, markup, raw, render, sample, shuffle, toast } from './ui.js';

/* ---------------- task builders ---------------- */
const others = (pool, item, key, n) => sample(pool.filter((p) => p[key] !== item[key]).filter((p, i, a) => a.findIndex((q) => q[key] === p[key]) === i), n);

/** See the Hangeul, choose how it is read. */
export const readSound = (item, pool) => ({ type: 'choose', mode: 'read-sound', item, options: shuffle([item, ...others(pool, item, 'ko', 3)]), show: 'ko', answer: 'rom' });
/** Hear it, choose the Hangeul. */
export const hearHangeul = (item, pool) => ({ type: 'choose', mode: 'hear-ko', item, options: shuffle([item, ...others(pool, item, 'ko', 3)]), show: 'audio', answer: 'ko' });
/** Hear it (no text), choose the meaning. */
export const hearMeaning = (item, pool) => ({ type: 'choose', mode: 'hear-fr', item, options: shuffle([item, ...others(pool, item, 'fr', 3)]), show: 'audio', answer: 'fr' });
/** Read it, choose the meaning. */
export const readMeaning = (item, pool) => ({ type: 'choose', mode: 'read-fr', item, options: shuffle([item, ...others(pool, item, 'fr', 3)]), show: 'ko', answer: 'fr' });
/** Hear a sentence, find which word was in it. */
export function spotWord(line, words) {
  const inLine = words.filter((w) => line.ko.includes(w.ko.replace(/[?!.…]/g, '')));
  if (!inLine.length) return null;
  const right = inLine[Math.floor(Math.random() * inLine.length)];
  const wrong = sample(words.filter((w) => !line.ko.includes(w.ko.replace(/[?!.…]/g, '')) && w.ko !== right.ko), 3);
  if (wrong.length < 2) return null;
  return { type: 'choose', mode: 'spot', item: line, right, options: shuffle([right, ...wrong]), show: 'audio', answer: 'ko' };
}
/** Hear a line without any text, then reveal and say honestly whether it was understood. */
export const blind = (line) => ({ type: 'blind', item: line });
/** French shown, say it in Korean. */
export const sayIt = (prompt) => ({ type: 'say', item: prompt, answers: prompt.answers ?? [prompt.ko] });
/** Hear and read a line, repeat it. */
export const shadow = (line) => ({ type: 'shadow', item: line, answers: [line.ko] });
/** Minimal pair: hear one of two or three close words, find which. */
export const pairTask = (set) => { const item = set[Math.floor(Math.random() * set.length)]; return { type: 'choose', mode: 'pair', item, options: set, show: 'audio', answer: 'ko' }; };

const KIND = { blind: 'listen', say: 'speak', shadow: 'speak', choose: 'quiz' };
const PROMPT = {
  'read-sound': 'Comment ça se lit ?', 'hear-ko': 'Qu’entends-tu ?', 'hear-fr': 'Qu’est-ce que ça veut dire ?',
  'read-fr': 'Que veut dire ce mot ?', spot: 'Quel mot as-tu entendu dans la phrase ?', pair: 'Lequel entends-tu ?',
};

/* ---------------- the engine ---------------- */
/**
 * Runs `tasks` inside `el`. Options: title, lessonId, onDone(results) → optional html for the end screen,
 * play(item, rate) to replace the synthetic voice (imported scenes with original audio).
 */
export function runExercises(el, tasks, { title = 'Exercices', lessonId = null, onDone, play, retry = true } = {}) {
  tasks = tasks.filter(Boolean);
  const started = Date.now();
  const results = [];
  let i = 0;
  let alive = true;
  let mic = null;
  const hear = (item, rate) => (play ? play(item, rate ?? currentRate()) : speak(item.ko, { rate: rate ?? currentRate(), who: item.voice }));
  const onKey = (e) => {
    if (e.target.matches('input, textarea')) return;
    const n = Number(e.key);
    const opts = $$('[data-opt]:not(:disabled)', el);
    if (n >= 1 && n <= opts.length) { opts[n - 1].click(); e.preventDefault(); }
    else if (e.key === 'Enter' && $('#next', el)) { $('#next', el).click(); e.preventDefault(); }
  };
  document.addEventListener('keydown', onKey);

  const header = () => html`<div class="ex-head">
    <div class="row between"><span class="label">${title}</span><span class="hint tnum">${Math.min(i + 1, tasks.length)} / ${tasks.length}</span></div>
    <div class="progress"><i style="width:${Math.round((i / tasks.length) * 100)}%"></i></div>
    <div class="row tight speed" role="group" aria-label="Vitesse de la voix"><span class="hint">Vitesse</span>
      ${['lent', 'normal', 'rapide'].map((r) => html`<button type="button" class="pick small" data-rate="${r}" aria-pressed="${currentRate() === r}">${{ lent: 'Lente', normal: 'Normale', rapide: 'Rapide' }[r]}</button>`)}</div>
  </div>`;

  const finish = async () => {
    for (const kind of ['listen', 'speak', 'quiz']) {
      const rs = results.filter((r) => r.kind === kind);
      if (rs.length) await repo.addSession({ kind, total: rs.length, ok: rs.filter((r) => r.ok).length, lessonId, minutes: Math.max(1, Math.round((Date.now() - started) / 60000)) });
    }
    const ok = results.filter((r) => r.ok).length;
    const custom = onDone ? await onDone(results) : null;
    if (!alive) return;
    const missed = results.filter((r) => !r.ok).map((r) => r.task);
    render(el, html`<section class="panel done-card">
      <h2>Terminé</h2>
      <p class="big-score tnum">${ok} / ${results.length}</p>
      <p class="muted">${ok === results.length ? 'Tout juste. Bravo !' : ok >= results.length * 0.7 ? 'Très bien. Les erreurs reviendront dans tes révisions.' : 'C’est en réécoutant que l’oreille progresse : refais les erreurs maintenant.'}</p>
      ${custom ?? ''}
      <div class="row">${retry && missed.length ? html`<button class="btn primary" type="button" id="again">Refaire les ${missed.length} erreur${missed.length > 1 ? 's' : ''}</button>` : ''}</div>
    </section>`);
    $('#again', el)?.addEventListener('click', () => { cleanup(); runExercises(el, missed.map((t) => ({ ...t, options: t.options ? shuffle(t.options) : t.options })), { title, lessonId, onDone, play, retry }); });
  };

  const record = (task, ok, extra = {}) => { results.push({ task, ok, kind: KIND[task.type], ...extra }); };
  const next = () => { mic?.cancel(); mic = null; stopSpeaking(); i++; if (i >= tasks.length) finish(); else step(); };
  const nextBtn = (label = 'Suivant') => html`<button class="btn primary" type="button" id="next">${label}${icon.next}</button>`;

  const step = () => {
    if (!alive) return;
    const t = tasks[i];
    render(el, html`<section class="panel ex">${header()}<div id="task" class="stack"></div></section>`);
    for (const b of $$('[data-rate]', el)) b.addEventListener('click', () => {
      setRatePref(b.dataset.rate); setSetting('rate', b.dataset.rate);
      for (const x of $$('[data-rate]', el)) x.setAttribute('aria-pressed', String(x === b));
      hear(t.item);
    });
    const box = $('#task', el);
    if (t.type === 'choose') chooseTask(box, t);
    else if (t.type === 'blind') blindTask(box, t);
    else sayTask(box, t);
  };

  /* multiple choice */
  const chooseTask = (box, t) => {
    const label = (o) => (t.answer === 'rom' ? romanize(o.ko) : t.answer === 'fr' ? o.fr : o.ko);
    const target = t.mode === 'spot' ? t.right : t.item;
    render(box, html`
      <h2>${PROMPT[t.mode]}</h2>
      ${t.show === 'ko' ? html`<p class="ko show-ko" lang="ko">${t.item.ko}</p>` : html`<div class="row"><button class="btn big" type="button" id="hear">${icon.speaker}Écouter</button></div>`}
      <div class="choices ${t.answer === 'ko' ? 'ko-choices' : ''}">${t.options.map((o, k) => html`<button class="choice" type="button" data-opt="${k}"><span class="kbd">${k + 1}</span><span ${t.answer === 'ko' ? raw('lang="ko"') : ''}>${label(o)}</span>${t.mode === 'pair' ? html`<span class="hint">${o.fr}</span>` : ''}</button>`)}</div>
      <div id="fb" class="stack"></div>`);
    $('#hear', box)?.addEventListener('click', () => hear(t.item));
    if (t.show === 'audio') setTimeout(() => alive && hear(t.item), 250);
    for (const b of $$('[data-opt]', box)) b.addEventListener('click', () => {
      const o = t.options[Number(b.dataset.opt)];
      const ok = label(o) === label(target);
      for (const x of $$('[data-opt]', box)) {
        x.disabled = true;
        if (label(t.options[Number(x.dataset.opt)]) === label(target)) x.classList.add('right');
      }
      if (!ok) b.classList.add('wrong');
      record(t, ok);
      render($('#fb', box), html`<div class="answer ${ok ? 'good' : 'bad'}">
        <b>${ok ? 'Exact !' : 'Pas tout à fait.'}</b>
        ${ko3(t.item, { size: 'lg', force: true, voice: t.item.voice })}
        ${t.mode === 'spot' ? html`<p class="hint">Le mot : <span lang="ko">${t.right.ko}</span> · ${t.right.fr}</p>` : ''}
        ${t.mode === 'pair' ? html`<div class="row tight">${t.options.map((o) => html`<button class="btn small" type="button" data-say="${o.ko}">${icon.speaker}<span lang="ko">${o.ko}</span></button>`)}</div>` : ''}
      </div><div class="row">${nextBtn()}</div>`);
      if (t.show !== 'audio') hear(t.item);
      $('#next', box).addEventListener('click', next);
      $('#next', box).focus({ preventScroll: true });
    });
  };

  /* blind listening */
  const blindTask = (box, t) => {
    render(box, html`
      <h2>Écoute sans le texte</h2>
      <p class="muted">Écoute autant de fois que tu veux, puis affiche le texte et dis honnêtement si tu avais compris.</p>
      <div class="row"><button class="btn big" type="button" id="hear">${icon.speaker}Réécouter</button>
        <button class="btn" type="button" id="slow">Plus lentement</button>
        <button class="btn primary" type="button" id="reveal">${icon.eye}Voir le texte</button></div>
      <div id="fb" class="stack"></div>`);
    $('#hear', box).addEventListener('click', () => hear(t.item));
    $('#slow', box).addEventListener('click', () => hear(t.item, 'lent'));
    setTimeout(() => alive && hear(t.item), 250);
    $('#reveal', box).addEventListener('click', () => {
      $('#reveal', box).remove();
      render($('#fb', box), html`<div class="answer">${ko3(t.item, { size: 'lg', force: true, voice: t.item.voice })}</div>
        <span class="label">Avais-tu compris le sens ?</span>
        <div class="row"><button class="btn primary" type="button" data-u="1" data-opt="0">${icon.check}J’avais compris</button>
          <button class="btn" type="button" data-u="0" data-opt="1">Pas vraiment</button></div>`);
      for (const b of $$('[data-u]', box)) b.addEventListener('click', () => { record(t, b.dataset.u === '1'); next(); });
    });
  };

  /* speaking: say in Korean, or repeat */
  const sayTask = (box, t) => {
    const isShadow = t.type === 'shadow';
    let attempts = 0;
    render(box, html`
      ${isShadow ? html`<h2>Répète après la voix</h2>${ko3(t.item, { size: 'xl', force: true, voice: t.item.voice })}`
        : html`<h2>Dis-le en coréen</h2><p class="say-fr">${t.item.fr}</p>
          <div class="row tight"><button class="btn quiet small" type="button" id="hint">Indice</button><span id="hint-text" class="rom-hint" hidden>${romanize(t.answers[0])}</span></div>`}
      <div id="mic"></div>
      <div id="fb" class="stack"></div>
      <div class="row"><button class="btn quiet" type="button" id="skip">${isShadow ? 'Passer' : 'Voir la réponse et passer'}</button></div>`);
    $('#hint', box)?.addEventListener('click', (e) => { e.currentTarget.remove(); $('#hint-text', box).hidden = false; });
    if (isShadow) setTimeout(() => alive && hear(t.item), 250);
    let best = null;
    $('#skip', box).addEventListener('click', () => {
      if (!best) record(t, false);
      if (isShadow) { next(); return; }
      $('#skip', box).remove();
      render($('#fb', box), html`<div class="answer">${ko3({ ko: t.answers[0], fr: t.item.fr }, { size: 'lg', force: true })}</div><div class="row">${nextBtn()}</div>`);
      hear({ ko: t.answers[0] });
      $('#next', box).addEventListener('click', next);
    });
    mic = micWidget($('#mic', box), {
      answers: t.answers,
      onResult: (r) => {
        attempts++;
        if (!best || r.score > best.score) best = r;
        const ok = r.verdict === 'great' || r.verdict === 'good';
        const v = VERDICT[r.verdict];
        render($('#fb', box), html`<div class="answer ${ok ? 'good' : r.verdict === 'close' ? 'warm' : 'bad'}">
          <div class="row tight"><span class="chip ${v.tone}">${v.label}</span><span class="hint tnum">${Math.round(r.score * 100)} % de ressemblance</span></div>
          ${r.said ? html`<p class="diff" lang="ko" aria-label="Ce qui a été reconnu">${alignSyllables(r.said, r.answer).map((s) => (s.text === ' ' ? raw(' ') : html`<span class="${s.ok ? 'ok' : 'miss'}">${s.text}</span>`))}</p>
            <p class="hint">Reconnu : <span lang="ko">${r.said}</span> (${romanize(r.said)})</p>` : html`<p class="muted">Je n’ai rien entendu. Approche-toi du micro et parle un peu plus fort.</p>`}
          ${ok || attempts >= 2 ? ko3({ ko: r.answer, fr: t.item.fr }, { force: true }) : ''}
          <div class="row tight">
            <button class="btn small" type="button" id="model">${icon.speaker}Modèle</button>
            ${r.url ? html`<button class="btn small" type="button" id="mine">${icon.play}Ma voix</button>` : ''}
          </div>
        </div>
        <div class="row">${ok ? nextBtn() : html`<span class="hint">Réessaie, ou réécoute le modèle.</span>${attempts >= 2 ? nextBtn('Continuer') : ''}`}</div>`);
        $('#model', box).addEventListener('click', () => hear({ ...t.item, ko: r.answer }));
        if (r.url) { const a = new Audio(r.url); $('#mine', box).addEventListener('click', () => { stopSpeaking(); a.currentTime = 0; a.play().catch(() => {}); }); }
        $('#next', box)?.addEventListener('click', () => { record(t, best.verdict === 'great' || best.verdict === 'good', { score: best.score }); next(); });
        $('#skip', box)?.remove();
        if (!ok && !isShadow) hear({ ko: r.answer }, 'lent');
      },
    });
  };

  const cleanup = () => { alive = false; mic?.cancel(); stopSpeaking(); document.removeEventListener('keydown', onKey); };
  if (!tasks.length) render(el, html`<p class="empty">Pas encore d’exercice ici.</p>`); else step();
  return cleanup;
}

/* ---------------- microphone widget ---------------- */
/**
 * A big "speak" button. Uses the browser's Korean recognition and records the voice at the same time
 * so the learner can listen back. Without recognition, falls back to recording + self-assessment.
 * onResult({verdict, score, said, answer, url})
 */
export function micWidget(el, { answers, onResult }) {
  const rec = new Recorder();
  let handle = null;
  let busy = false;
  const auto = canRecognize();
  render(el, html`<div class="mic-hero">
    <button class="btn big mic" type="button" id="talk">${icon.mic}<span>Appuie et parle</span></button>
    <p class="partial" id="partial" lang="ko" aria-live="polite"></p>
    <p class="hint" id="privacy" hidden>La reconnaissance vocale passe par le service de ton navigateur (Google pour Chrome). Ta voix enregistrée, elle, reste sur ton ordinateur.</p>
    ${auto ? '' : html`<p class="notice">Ce navigateur ne reconnaît pas la voix : tu pourras t’enregistrer et comparer à l’oreille. Pour la vérification automatique, utilise Chrome ou Edge.</p>`}
  </div>`);
  getSetting('micNoticeSeen', false).then((seen) => { if (!seen && auto) { $('#privacy', el).hidden = false; setSetting('micNoticeSeen', true); } });
  const btn = $('#talk', el);
  const setIdle = () => { btn.classList.remove('rec'); btn.innerHTML = markup(html`${icon.mic}<span>${auto ? 'Réessayer' : 'Enregistrer'}</span>`); btn.disabled = false; busy = false; };

  btn.addEventListener('click', async () => {
    if (busy && handle) { handle.stop(); return; }
    if (busy && !auto) { // manual recording: stop and self-assess
      btn.disabled = true;
      const take = await rec.stop();
      setIdle();
      selfAssess(take);
      return;
    }
    busy = true;
    stopSpeaking();
    $('#partial', el).textContent = '';
    try { await rec.start(); } catch (e) { if (!auto) { toast(e.message, 'bad'); busy = false; return; } }
    btn.classList.add('rec');
    btn.innerHTML = markup(html`${icon.stop}<span>${auto ? 'J’ai fini' : 'Arrêter'}</span>`);
    if (!auto) return;
    handle = listen({ onPartial: (t) => { $('#partial', el).textContent = t; } });
    try {
      const r = await handle.result;
      const take = await rec.stop();
      handle = null;
      setIdle();
      const j = judge(r.alternatives.length ? r.alternatives : [''], answers);
      onResult({ ...j, said: r.text ? j.said : '', url: take?.url ?? null });
    } catch (e) {
      handle = null; rec.cancel(); setIdle();
      toast(e.message, 'bad');
    }
  });

  const selfAssess = (take) => {
    render(el, html`<div class="stack">
      <div class="compare"><div><span class="label">Le modèle</span><button class="btn" type="button" id="m">${icon.speaker}Écouter</button></div>
        <div><span class="label">Ta voix</span>${take ? html`<audio controls src="${take.url}"></audio>` : html`<span class="hint">Rien n’a été enregistré.</span>`}</div></div>
      <span class="label">Ça ressemblait ?</span>
      <div class="row"><button class="btn primary" type="button" data-s="great">Oui</button><button class="btn" type="button" data-s="close">Presque</button><button class="btn" type="button" data-s="miss">Non</button></div></div>`);
    $('#m', el).addEventListener('click', () => speak(answers[0]));
    for (const b of $$('[data-s]', el)) b.addEventListener('click', () => onResult({ verdict: b.dataset.s, score: { great: 1, close: 0.6, miss: 0.2 }[b.dataset.s], said: '', answer: answers[0], url: take?.url ?? null }));
  };

  return { cancel: () => { handle?.stop(); rec.cancel(); } };
}
