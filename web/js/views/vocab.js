// Vocabulary notebook with spaced repetition. Two ways to review: by ear (hear → understand) or by mouth (French → say it).
import * as ai from '../ai.js';
import * as coach from '../coach.js';
import * as repo from '../repo.js';
import { dueCards, GRADES, isMastered, review } from '../srs.js';
import { micWidget } from '../exercises.js';
import { speak, stopSpeaking } from '../speech.js';
import { getSetting, setSetting } from '../db.js';
import { hasHangul, romanize, VERDICT } from '../hangul.js';
import { $, $$, html, icon, ko3, render, shortDate, toast } from '../ui.js';

const DAY = 86400000;
const nextLabel = (due) => {
  const d = due - Date.now();
  if (d <= 0) return 'maintenant';
  if (d < DAY) return 'aujourd’hui';
  const n = Math.round(d / DAY);
  return n === 1 ? 'demain' : `dans ${n} j`;
};

export async function mount(view, [tab]) {
  const cards = await repo.allCards();
  const due = dueCards(cards);
  const active = tab === 'carnet' || !due.length ? 'carnet' : 'reviser';
  let mode = await getSetting('reviewMode', 'oreille');
  let mic = null;

  render(view, html`<div class="wrap">
    <div class="page-head"><div class="stack" style="gap:4px"><h1>Vocabulaire</h1>
      <p>Les mots des leçons et ceux que tu ajoutes reviennent au moment où tu risques de les oublier.</p></div>
      <div class="seg" role="group" aria-label="Vue"><button type="button" data-tab="reviser" aria-pressed="${active === 'reviser'}">Réviser${due.length ? ` (${due.length})` : ''}</button>
        <button type="button" data-tab="carnet" aria-pressed="${active === 'carnet'}">Carnet (${cards.length})</button></div></div>
    <div id="pane" class="stack" style="gap:16px"></div></div>`);
  for (const b of $$('[data-tab]', view)) b.addEventListener('click', () => { location.hash = `#mots-${b.dataset.tab}`; });
  const pane = $('#pane', view);

  /* ---------------- review ---------------- */
  if (active === 'reviser') {
    let i = 0, right = 0;
    const header = () => html`<div class="row between"><div class="seg" role="group" aria-label="Façon de réviser">
        <button type="button" data-mode="oreille" aria-pressed="${mode === 'oreille'}">${icon.ear}À l’oreille</button>
        <button type="button" data-mode="bouche" aria-pressed="${mode === 'bouche'}">${icon.mic}À voix haute</button></div>
      <span class="hint tnum">${Math.min(i + 1, due.length)} / ${due.length}</span></div>`;
    const step = () => {
      mic?.cancel(); mic = null;
      if (i >= due.length) {
        render(pane, html`<section class="panel flash"><h2>Révision terminée</h2>
          <p class="muted">${right} / ${due.length} retrouvé${right > 1 ? 's' : ''} du premier coup. Les cartes reviendront au bon moment.</p>
          <div class="row"><a class="btn primary" href="#mots-carnet">Voir le carnet</a><a class="btn" href="#parler-dire">S’entraîner à les dire</a></div></section>`);
        import('../main.js').then((m) => m.refreshBadge());
        return;
      }
      const c = due[i];
      render(pane, html`${header()}<section class="panel flash" id="card">
        ${mode === 'oreille' ? html`<span class="label">Écoute. Que veut dire ce mot ?</span>
            <button class="btn big" type="button" id="hear">${icon.speaker}Réécouter</button>`
          : html`<span class="label">Comment dit-on en coréen ?</span><p class="front">${c.fr || '—'}</p><div id="mic" style="width:100%"></div><div id="res"></div>`}
        <button class="btn ${mode === 'oreille' ? 'primary' : 'quiet'}" type="button" id="reveal">${icon.eye}Afficher la réponse</button>
        <div id="back" class="stack" style="align-items:center" hidden></div></section>`);
      for (const b of $$('[data-mode]', pane)) b.addEventListener('click', () => { mode = b.dataset.mode; setSetting('reviewMode', mode); step(); });
      let verdict = null;
      if (mode === 'oreille') {
        $('#hear', pane).addEventListener('click', () => speak(c.ko));
        setTimeout(() => speak(c.ko), 200);
      } else {
        mic = micWidget($('#mic', pane), { answers: [c.ko], onResult: (r) => { verdict = r.verdict; showBack(); } });
      }
      const showBack = () => {
        mic?.cancel();
        $('#reveal', pane)?.remove(); $('#hear', pane)?.remove(); $('#mic', pane)?.remove();
        const back = $('#back', pane);
        back.hidden = false;
        const sugg = verdict === 'great' ? 2 : verdict === 'good' ? 2 : verdict === 'close' ? 1 : verdict === 'miss' ? 0 : -1;
        render(back, html`
          ${verdict ? html`<span class="chip ${VERDICT[verdict].tone}">${VERDICT[verdict].label}</span>` : ''}
          ${ko3({ ko: c.ko, fr: c.fr }, { size: 'xl', force: true })}
          ${c.note ? html`<p class="ctx">${c.note}</p>` : ''}
          ${c.context ? html`<p class="ctx" lang="ko">« ${c.context} »</p>` : ''}
          <span class="label">${mode === 'oreille' ? 'Avais-tu compris ?' : 'Comment ça s’est passé ?'}</span>
          <div class="grades">${GRADES.map((g) => html`<button class="btn${g.value === sugg ? ' primary' : ''}" type="button" data-grade="${g.value}">${g.label}${g.hint ? html`<small>${g.hint}</small>` : ''}</button>`)}</div>`);
        if (mode === 'bouche') speak(c.ko);
        for (const b of $$('[data-grade]', back)) b.addEventListener('click', async () => {
          const g = Number(b.dataset.grade);
          if (g >= 2) right++;
          const updated = review(c, g);
          await repo.saveCard(updated);
          await repo.addSession({ kind: 'review', total: 1, ok: g >= 2 ? 1 : 0, minutes: 0 });
          if (g === 0) due.push(updated);
          i++; step();
        });
        $('[data-grade].primary', back)?.focus();
      };
      $('#reveal', pane).addEventListener('click', showBack);
    };
    step();
    return () => { mic?.cancel(); stopSpeaking(); };
  }

  /* ---------------- notebook ---------------- */
  const paint = (filter = '') => {
    const f = filter.trim().toLowerCase();
    const list = cards.filter((c) => !f || `${c.ko} ${romanize(c.ko)} ${c.fr}`.toLowerCase().includes(f)).sort((a, b) => b.createdAt - a.createdAt);
    render($('#list', pane), list.length ? html`<div class="scroll-x"><table class="t"><thead><tr><th>Coréen</th><th>Français</th><th>Révision</th><th><span class="sr">Actions</span></th></tr></thead><tbody>
      ${list.map((c) => html`<tr>
        <td>${ko3({ ko: c.ko }, { force: true })}</td>
        <td>${c.fr || html`<span class="hint">—</span>`}${c.source ? html`<br><span class="hint">${c.source}</span>` : ''}</td>
        <td class="tnum">${isMastered(c) ? html`<span class="chip good">Acquis</span>` : nextLabel(c.due)}<br><span class="hint">ajouté le ${shortDate(c.createdAt)}</span></td>
        <td><div class="row tight" style="flex-wrap:nowrap">
          ${!c.fr ? html`<button class="btn quiet small" type="button" data-explain="${c.id}">Traduire</button>` : ''}
          <button class="btn quiet small danger" type="button" data-del="${c.id}">Supprimer</button></div></td></tr>`)}
      </tbody></table></div>` : html`<p class="empty">${cards.length ? 'Aucun résultat.' : 'Ton carnet est vide. Les mots de chaque leçon s’y ajoutent quand tu la découvres.'}</p>`);
  };

  render(pane, html`<section class="panel">
      <form class="row" id="add" style="align-items:flex-end">
        <label class="field" style="flex:1 1 200px">Mot ou expression en coréen<input id="ko" lang="ko" required placeholder="Ex. 진짜"></label>
        <label class="field" style="flex:1 1 200px">Sens en français<input id="fr" placeholder="Facultatif : le coach peut le compléter"></label>
        <button class="btn primary" type="submit">${icon.plus}Ajouter</button></form>
      <p class="hint">Astuce : sur Mac, ajoute le clavier « Coréen – 2-Set » dans Réglages système › Clavier pour taper en hangeul.</p></section>
    <section class="panel">
      <div class="row between"><h2>Mon carnet</h2>
        <label class="field" style="flex:0 1 260px"><span class="sr">Rechercher</span><input id="q" type="search" placeholder="Rechercher (hangeul, romanisation, français)"></label></div>
      <div id="list"></div></section>`);
  paint();
  $('#q', pane).addEventListener('input', (e) => paint(e.target.value));
  $('#add', pane).addEventListener('submit', async (e) => {
    e.preventDefault();
    const ko = $('#ko', pane).value.trim();
    if (!hasHangul(ko)) { toast('Écris le mot en hangeul.', 'bad'); return; }
    const { card, added } = await repo.addCard({ ko, fr: $('#fr', pane).value.trim(), source: 'Ajout manuel' });
    if (!added) { toast('Ce mot est déjà dans ton carnet.'); return; }
    cards.push(card);
    $('#ko', pane).value = ''; $('#fr', pane).value = '';
    paint($('#q', pane).value);
    if (!card.fr) fill(card);
    import('../main.js').then((m) => m.refreshBadge());
  });
  const fill = async (card) => {
    if (ai.state.status !== 'ready') { toast('Charge le coach (onglet Coach) pour traduire automatiquement.'); return; }
    try {
      const x = await coach.explain(card.ko, card.context);
      const updated = { ...card, fr: x.meaning, note: [x.base ? `Forme du dictionnaire : ${x.base}` : '', x.example ? `Ex. ${x.example.ko} — ${x.example.fr}` : ''].filter(Boolean).join(' · ') };
      await repo.saveCard(updated);
      cards.splice(cards.findIndex((c) => c.id === card.id), 1, updated);
      paint($('#q', pane).value);
    } catch (err) { toast(err.message, 'bad'); }
  };
  $('#list', pane).addEventListener('click', async (e) => {
    const t = e.target.closest('button');
    if (!t || t.dataset.say) return;
    const id = Number(t.dataset.explain ?? t.dataset.del);
    const card = cards.find((c) => c.id === id);
    if (!card) return;
    if (t.dataset.explain) { t.disabled = true; t.textContent = '…'; fill(card); }
    if (t.dataset.del) {
      if (t.dataset.confirm !== '1') { t.dataset.confirm = '1'; t.textContent = 'Confirmer'; return; }
      await repo.deleteCard(id);
      cards.splice(cards.indexOf(card), 1);
      paint($('#q', pane).value);
      import('../main.js').then((m) => m.refreshBadge());
    }
  });
}
