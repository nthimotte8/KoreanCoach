// Spoken conversation with the coach in simple Korean: it plays a role, answers aloud, corrects in French,
// and always suggests something you could say next.
import * as coach from '../coach.js';
import * as repo from '../repo.js';
import { coachGate } from './gate.js';
import { canRecognize, listen, speak, stopSpeaking } from '../speech.js';
import { romanize } from '../hangul.js';
import { $, html, icon, ko3, markup, render, toast } from '../ui.js';

export async function mount(view, [key]) {
  let gateOff = () => {};
  const sc = coach.SCENARIOS.find((s) => s.key === key);

  if (!sc) {
    render(view, html`<div class="wrap"><a class="hint" href="#parler">← Parler</a>
      <div class="page-head"><div class="stack" style="gap:4px"><h1>Conversation avec le coach</h1>
        <p>Choisis une situation. Le coach parle en coréen très simple, la traduction s’affiche, et il te propose toujours une phrase à dire si tu bloques.</p></div></div>
      <div class="scen-grid">${coach.SCENARIOS.map((s) => html`<a class="tile" href="#conversation-${s.key}"><span class="k">${s.speech === 'casual' ? '반말 · familier' : '해요 · poli'}</span><b>${s.label}</b></a>`)}</div>
      <p class="hint">Conseillé à partir de l’unité 3 du parcours. Avant, préfère « Jouer une scène ».</p></div>`);
    return;
  }

  const history = [];
  const started = Date.now();
  let turns = 0;
  let listening = null;
  render(view, html`<div class="wrap"><a class="hint" href="#conversation">← Situations</a>
    <h1>${sc.label}</h1>
    <div id="gate"></div>
    <div id="zone" class="stack" hidden>
      <div class="chat" id="chat" aria-live="polite"></div>
      <div class="composer"><div class="composer-row">
        <button class="btn primary big" type="button" id="talk">${icon.mic}<span>Parler</span></button>
        <label class="sr" for="t">Écrire</label><textarea class="input" id="t" rows="1" lang="ko" placeholder="Ou écris (en coréen, ou en français si tu bloques)"></textarea>
        <button class="btn" type="button" id="send" aria-label="Envoyer">${icon.send}</button></div>
        <p class="partial" id="partial" lang="ko"></p></div>
      <div class="row"><button class="btn quiet" type="button" id="end">Terminer la conversation</button></div>
    </div></div>`);
  const chat = $('#chat', view);
  const add = (cls, inner) => { const d = document.createElement('div'); d.className = cls; d.innerHTML = markup(inner); chat.append(d); d.scrollIntoView({ block: 'nearest' }); return d; };

  const turn = async (message) => {
    if (message) { add('msg me', html`${ko3({ ko: message }, { speaker: false })}`); turns++; }
    const bubble = add('msg them', html`<span class="thinking"><span class="dot"></span>…</span>`);
    try {
      const r = await coach.roleplayTurn(sc, history, message, (text) => { if (text) bubble.innerHTML = markup(html`<span class="ko" lang="ko">${text}</span>`); });
      bubble.innerHTML = markup(ko3({ ko: r.ko, fr: r.fr }, { voice: 'm' }));
      if (r.corrections.length) add('fb', html`<b>Correction</b>${r.corrections.map((c) => html`<div class="corr"><span lang="ko"><s>${c.original}</s> → <strong>${c.better}</strong></span><span class="hint">${romanize(c.better)}</span>${c.why ? html`<span>${c.why}</span>` : ''}</div>`)}`);
      if (r.suggestion) {
        const s = add('sugg-line', html`<span class="label">Tu pourrais répondre :</span>${ko3(r.suggestion)}<div class="row tight"><button class="btn small" type="button" data-use>Je la dis</button></div>`);
        $('[data-use]', s).addEventListener('click', () => { startTalk(); });
      }
      history.push({ role: 'user', content: message ? `Learner: ${message}` : sc.opening }, { role: 'assistant', content: JSON.stringify({ reply_ko: r.ko }) });
      await speak(r.ko, { who: 'm' });
      for (const c of r.corrections) await repo.addCard({ ko: c.better, fr: c.why, context: c.original, source: `Conversation : ${sc.label}` });
    } catch (err) { bubble.textContent = err.message; toast(err.message, 'bad'); }
  };

  const startTalk = async () => {
    const b = $('#talk', view);
    if (listening) { listening.stop(); return; }
    if (!canRecognize()) { toast('La reconnaissance vocale demande Chrome ou Edge. Tu peux écrire ta réponse.'); return; }
    stopSpeaking();
    b.classList.add('rec'); b.querySelector('span').textContent = 'J’ai fini';
    listening = listen({ onPartial: (t) => { $('#partial', view).textContent = t; } });
    try {
      const r = await listening.result;
      listening = null;
      b.classList.remove('rec'); b.querySelector('span').textContent = 'Parler';
      $('#partial', view).textContent = '';
      if (r.text) turn(r.text); else toast('Je n’ai rien entendu. Réessaie, plus près du micro.');
    } catch (err) { listening = null; b.classList.remove('rec'); b.querySelector('span').textContent = 'Parler'; toast(err.message, 'bad'); }
  };

  gateOff = coachGate($('#gate', view), () => {
    $('#gate', view).innerHTML = '';
    $('#zone', view).hidden = false;
    $('#talk', view).addEventListener('click', startTalk);
    const sendText = () => { const t = $('#t', view).value.trim(); if (t) { $('#t', view).value = ''; turn(t); } };
    $('#send', view).addEventListener('click', sendText);
    $('#t', view).addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendText(); } });
    $('#end', view).addEventListener('click', async () => {
      if (turns) await repo.addSession({ kind: 'conversation', total: turns, ok: turns, minutes: Math.max(1, Math.round((Date.now() - started) / 60000)) });
      location.hash = '#parler';
    });
    turn(null);
  });
  return () => { gateOff(); listening?.stop(); stopSpeaking(); };
}
