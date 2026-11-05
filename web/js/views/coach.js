// Ask the coach anything about Korean, in French. Answers come with Korean examples in three lines.
import * as coach from '../coach.js';
import { coachGate } from './gate.js';
import { $, $$, html, icon, ko3, markup, render, toast } from '../ui.js';

const STARTERS = [
  'Quelle différence entre 은/는 et 이/가 ?',
  'Pourquoi dit-on 오빠 et pas 형 ?',
  'Comment dire « je ne comprends pas » ?',
  'Que veut dire 화이팅 ?',
  'Quand utiliser 감사합니다 ou 고마워요 ?',
  'Comment dire « tu me manques » poliment ?',
];

export async function mount(view) {
  const history = [];
  render(view, html`<div class="wrap">
    <div class="page-head"><div class="stack" style="gap:4px"><h1>Coach</h1>
      <p>Pose toutes tes questions sur le coréen, en français : grammaire, sens d’une réplique, politesse, culture. Les exemples s’affichent avec la prononciation et la traduction.</p></div>
      <a class="btn" href="#conversation">${icon.talk}Conversation à l’oral</a></div>
    <div id="gate"></div>
    <div id="chat-zone" hidden class="stack">
      <div class="chat" id="chat" aria-live="polite"></div>
      <div class="row tight" id="starters">${STARTERS.map((s) => html`<button class="pick small" type="button" data-q="${s}">${s}</button>`)}</div>
      <form class="composer" id="f"><div class="composer-row">
        <label class="sr" for="q">Ta question</label>
        <textarea class="input" id="q" rows="1" placeholder="Ex. Comment dire « on se voit demain » ?"></textarea>
        <button class="btn primary" type="submit" aria-label="Envoyer">${icon.send}</button></div></form>
      <p class="hint">Le coach est un petit modèle qui tourne sur ton ordinateur : il peut se tromper. Le contenu des leçons, lui, a été vérifié.</p>
    </div></div>`);

  const chat = $('#chat', view);
  const add = (cls, inner) => { const d = document.createElement('div'); d.className = `msg ${cls}`; d.innerHTML = markup(inner); chat.append(d); d.scrollIntoView({ block: 'nearest' }); return d; };
  const send = async (q) => {
    q = q.trim();
    if (!q) return;
    $('#starters', view).hidden = true;
    add('me', html`${q}`);
    const bubble = add('them', html`<span class="thinking"><span class="dot"></span>Le coach réfléchit…</span>`);
    $('#q', view).value = '';
    try {
      const r = await coach.ask(q, history, (text) => { if (text) bubble.textContent = text; });
      bubble.innerHTML = markup(html`<p style="white-space:pre-wrap">${r.answer}</p>${r.examples.length ? html`<div class="examples" style="margin-top:10px">${r.examples.map((e) => ko3(e))}</div>` : ''}`);
      history.push({ role: 'user', content: q }, { role: 'assistant', content: JSON.stringify(r) });
    } catch (err) { bubble.textContent = err.message; toast(err.message, 'bad'); }
  };
  for (const b of $$('[data-q]', view)) b.addEventListener('click', () => send(b.dataset.q));
  $('#f', view).addEventListener('submit', (e) => { e.preventDefault(); send($('#q', view).value); });
  $('#q', view).addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(e.target.value); } });
  return coachGate($('#gate', view), () => { $('#gate', view).innerHTML = ''; $('#chat-zone', view).hidden = false; $('#q', view).focus(); });
}
