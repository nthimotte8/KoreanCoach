// An imported scene: original audio/video when there is one, line-by-line text in three lines,
// translation by the coach, and the same listening and speaking exercises as the lessons.
import * as repo from '../repo.js';
import * as coach from '../coach.js';
import { AudioPlayer, playItem, YouTubePlayer } from '../players.js';
import { blind, hearMeaning, runExercises, shadow } from '../exercises.js';
import { coachGate } from './gate.js';
import { stopSpeaking } from '../speech.js';
import { $, $$, html, icon, ko3, render, sample, toast } from '../ui.js';

export async function mount(view, [id, mode]) {
  if (mode === 'texte') mode = undefined;
  const m = await repo.getMaterial(Number(id));
  if (!m) { render(view, html`<div class="wrap"><p class="empty">Scène introuvable. <a href="#ecouter-scenes">Mes scènes</a></p></div>`); return; }
  let player = null;
  let stop = null;
  let gateOff = () => {};
  let objectUrl = null;
  let hidden = false;
  const lines = m.lines.map((l, i) => ({ ...l, id: `${m.id}-${i}`, fr: l.fr ?? '' }));
  const timed = (m.audioBlob || m.videoId) && lines.some((l) => l.start != null);

  render(view, html`<div class="wrap">
    <a class="hint" href="#ecouter-scenes">← Mes scènes</a>
    <h1>${m.title}</h1>
    ${m.videoId ? html`<div class="video"><div id="yt"></div></div>` : m.audioBlob ? html`<audio id="audio" controls style="width:100%"></audio>` : html`<p class="hint">Pas de fichier audio : les répliques sont lues par la voix de synthèse.</p>`}
    <div class="toolbar">
      <a class="btn ${mode === 'aveugle' ? 'primary' : ''}" href="#scene-${m.id}-aveugle">${icon.ear}Écoute à l’aveugle</a>
      <a class="btn ${mode === 'repeter' ? 'primary' : ''}" href="#scene-${m.id}-repeter">${icon.mic}Répéter</a>
      ${m.translated ? html`<a class="btn ${mode === 'sens' ? 'primary' : ''}" href="#scene-${m.id}-sens">Qu’as-tu entendu ?</a>` : ''}
      ${mode ? html`<a class="btn quiet" href="#scene-${m.id}">Revenir au texte</a>` : html`<button class="btn" type="button" id="hide">${icon.eye}Cacher le texte</button>`}
    </div>
    <div id="main" class="stack" style="gap:16px"></div></div>`);
  if (m.videoId) player = new YouTubePlayer($('#yt', view), m.videoId);
  if (m.audioBlob) { objectUrl = URL.createObjectURL(m.audioBlob); $('#audio', view).src = objectUrl; player = new AudioPlayer($('#audio', view)); }
  const play = (item, rate) => (timed && item.start != null ? playItem(player, item, { rate }) : playItem(null, item, { rate }));
  const main = $('#main', view);

  if (mode === 'aveugle' || mode === 'repeter' || mode === 'sens') {
    const pool = lines.filter((l) => l.ko.length > 2);
    const tasks = mode === 'aveugle' ? pool.slice(0, 15).map(blind) : mode === 'repeter' ? sample(pool, 8).map(shadow) : sample(pool.filter((l) => l.fr), 8).map((l) => hearMeaning(l, pool.filter((x) => x.fr)));
    stop = runExercises(main, tasks, { title: m.title, play });
    return () => { stop?.(); player?.destroy(); stopSpeaking(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }

  const paint = () => render(main, html`
    ${m.translated ? '' : html`<section class="panel" id="tr"><h2>Traduction</h2>
      <p class="muted">Le coach peut traduire chaque réplique en français et en relever les mots clés. Vérifie toujours avec les sous-titres français si tu les as : un petit modèle peut se tromper.</p><div id="gate"></div></section>`}
    <section class="panel"><div class="scene-lines">${lines.map((l, i) => html`<div class="sline" data-line="${i}">
      <button class="btn quiet small icon" type="button" data-play="${i}" aria-label="Écouter la réplique ${i + 1}">${icon.play}</button>
      <div class="stack" style="gap:6px;flex:1">${hidden ? html`<span class="hidden-text">Réplique ${i + 1}</span>` : ko3({ ko: l.ko, fr: l.fr }, { speaker: false })}
        ${!hidden && l.words?.length ? html`<div class="row tight">${l.words.map((w, k) => html`<button class="pick small" type="button" data-word="${i}:${k}" title="Ajouter au carnet"><span lang="ko">${w.ko}</span> · ${w.fr}</button>`)}</div>` : ''}</div>
    </div>`)}</div></section>`);
  paint();

  main.addEventListener('click', async (e) => {
    const p = e.target.closest('[data-play]');
    if (p) {
      const i = Number(p.dataset.play);
      for (const x of $$('.sline', main)) x.classList.toggle('on', Number(x.dataset.line) === i);
      await play(lines[i]);
      return;
    }
    const w = e.target.closest('[data-word]');
    if (w) {
      const [i, k] = w.dataset.word.split(':').map(Number);
      const word = lines[i].words[k];
      const { added } = await repo.addCard({ ko: word.ko, fr: word.fr, context: lines[i].ko, source: m.title });
      w.setAttribute('aria-pressed', 'true');
      toast(added ? `« ${word.ko} » ajouté à ton carnet.` : 'Déjà dans ton carnet.', added ? 'good' : 'neutral');
      import('../main.js').then((x) => x.refreshBadge());
    }
  });
  $('#hide', view)?.addEventListener('click', (e) => { hidden = !hidden; e.currentTarget.lastChild.textContent = hidden ? 'Afficher le texte' : 'Cacher le texte'; paint(); if (!m.translated) mountGate(); });

  const mountGate = () => {
    const g = $('#gate', main);
    if (!g) return;
    gateOff();
    gateOff = coachGate(g, () => {
      render(g, html`<button class="btn primary" type="button" id="translate">Traduire les ${lines.length} répliques</button><div id="tp"></div>`);
      $('#translate', g).addEventListener('click', async (e) => {
        e.currentTarget.disabled = true;
        try {
          for (let s = 0; s < lines.length; s += 6) {
            render($('#tp', g), html`<p class="hint">Traduction… ${s} / ${lines.length}</p><div class="progress"><i style="width:${Math.round((s / lines.length) * 100)}%"></i></div>`);
            const chunk = lines.slice(s, s + 6);
            const out = await coach.translateLines(chunk.map((l) => l.ko));
            out.forEach((o, k) => { lines[s + k].fr = o.fr; lines[s + k].words = o.words; });
            if (!view.isConnected) return;
          }
          m.lines = lines.map(({ id: _id, ...rest }) => rest);
          m.translated = true;
          await repo.saveMaterial(m);
          location.hash = location.hash.endsWith('-texte') ? `#scene-${m.id}` : `#scene-${m.id}-texte`;
        } catch (err) { toast(err.message, 'bad'); e.currentTarget.disabled = false; }
      });
    }, { compact: true });
  };
  if (!m.translated) mountGate();
  return () => { gateOff(); player?.destroy(); stopSpeaking(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
}
