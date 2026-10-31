// Listening: audio suggestions in four tiers, your imported scenes, and blind listening of what you have learned.
import * as repo from '../repo.js';
import * as pods from '../podcasts.js';
import { LESSONS, learnedMaterial } from '../data/lessons.js';
import { blind, runExercises } from '../exercises.js';
import { $, $$, html, icon, render, sample, shortDate, toast } from '../ui.js';

const fmtDur = (s) => (s ? `${Math.round(s / 60)} min` : '');

export async function mount(view, [tab = 'suggestions']) {
  let stop = null;
  const tabs = [['suggestions', 'Suggestions d’audios'], ['scenes', 'Mes scènes'], ['aveugle', 'Écoute à l’aveugle']];
  render(view, html`<div class="wrap">
    <div class="page-head"><div class="stack" style="gap:4px"><h1>Écouter</h1>
      <p>Pour comprendre les dramas sans sous-titres, l’oreille doit passer de la voix de synthèse aux vrais Coréens. Avance d’un palier à l’autre, à ton rythme.</p></div>
      <a class="btn primary" href="#importer">${icon.plus}Importer une scène</a></div>
    <nav class="tabs" aria-label="Écouter">${tabs.map(([k, label]) => html`<a href="#ecouter-${k}" ${k === tab ? html`aria-current="page"` : ''}>${label}</a>`)}</nav>
    <div id="pane" class="stack" style="gap:16px"></div></div>`);
  const pane = $('#pane', view);

  if (tab === 'aveugle') {
    const started = await repo.startedLessons();
    const mat = learnedMaterial(started.size ? started : new Set([LESSONS[0].id]));
    render(pane, html`<p class="muted">Dix répliques des leçons ${started.size ? 'que tu as commencées' : 'du début du parcours'}, dans le désordre et sans texte. C’est cet exercice qui mesure ta « compréhension sans texte ».</p><div id="ex"></div>`);
    stop = runExercises($('#ex', pane), sample(mat.lines.filter((x) => x.ko.length > 3), 10).map(blind), { title: 'Écoute à l’aveugle' });
    return () => stop?.();
  }

  if (tab === 'scenes') {
    const list = await repo.listMaterials();
    render(pane, list.length ? html`<section class="panel"><div class="stack" style="gap:0">${list.map((m) => html`<div class="list-item">
        <a class="link-btn" href="#scene-${m.id}"><b>${m.title}</b><br><span class="hint">${m.lines.length} répliques · ${{ subs: 'sous-titres', audio: 'fichier audio', youtube: 'YouTube', podcast: 'podcast' }[m.source] ?? m.source} · ${shortDate(m.createdAt)}${m.translated ? ' · traduit' : ''}</span></a>
        <button class="btn quiet small danger" type="button" data-del="${m.id}">Supprimer</button></div>`)}</div></section>`
      : html`<section class="panel"><p class="empty">Aucune scène importée. Colle les sous-titres coréens d’une scène de drama, ou importe un fichier audio.</p><div class="row" style="justify-content:center"><a class="btn primary" href="#importer">Importer une scène</a></div></section>`);
    pane.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-del]');
      if (!b) return;
      if (b.dataset.confirm !== '1') { b.dataset.confirm = '1'; b.textContent = 'Confirmer'; return; }
      await repo.deleteMaterial(Number(b.dataset.del));
      b.closest('.list-item').remove();
    });
    return;
  }

  /* suggestions */
  render(pane, html`${pods.TIERS.map((t) => html`<section class="panel">
      <div class="tier-head"><span class="tier-n">${t.n}</span><h2>${t.title}</h2><span class="chip">${t.when}</span></div>
      <p class="muted">${t.goal}</p>
      <div class="sugg">${pods.suggestions(t.n).map((s, k) => html`<div class="sugg-card">
        <b>${s.name}</b><span class="by">${s.by}${s.lang ? ` · ${s.lang}` : ''}</span><p>${s.why}</p>
        <div class="row tight">${s.kind === 'podcast' ? html`<button class="btn small" type="button" data-pod="${s.term}" data-name="${s.name}">${icon.ear}Voir les épisodes</button>`
          : s.kind === 'tip' ? (t.n === 4 && k === 0 ? html`<a class="btn small primary" href="#importer">Importer une scène</a>` : '')
          : html`<a class="btn small" href="${s.url}" target="_blank" rel="noopener">${icon.external}${s.kind === 'youtube' ? 'Sur YouTube' : 'Ouvrir le site'}</a>`}</div>
      </div>`)}</div>
      ${t.n === 1 ? html`<div id="pod"></div>` : ''}
    </section>`)}
    <section class="panel"><h2>Chercher un autre podcast</h2>
      <form class="row" id="search"><label class="field" style="flex:1 1 240px"><span class="sr">Nom ou thème</span><input id="term" placeholder="Ex. Korean listening, 한국어"></label><button class="btn" type="submit">Chercher</button></form>
      <div id="results"></div></section>`);

  const showEpisodes = async (target, show) => {
    render(target, html`<p class="thinking"><span class="dot"></span>Chargement des épisodes…</p>`);
    try {
      const eps = await pods.episodes(show);
      render(target, html`<div class="stack"><div class="row between"><h3>${show.title}</h3><span class="hint">${show.author}</span></div>
        ${eps.length ? eps.slice(0, 8).map((e, i) => html`<div class="ep" data-ep="${i}"><span><b>${e.title}</b><br><span class="hint">${e.published ? shortDate(Date.parse(e.published)) : ''} ${fmtDur(e.duration)}</span></span><span class="row tight"><button class="btn small" type="button" data-play="${i}">${icon.play}Écouter</button></span></div>`) : html`<p class="empty">Aucun épisode audio trouvé.</p>`}
        <audio id="player" controls hidden style="width:100%"></audio>
        <p class="hint">Pour étudier un épisode réplique par réplique : télécharge-le, puis importe le fichier dans « Importer une scène » (il sera transcrit sur ton ordinateur).</p></div>`);
      const player = $('#player', target);
      for (const b of $$('[data-play]', target)) b.addEventListener('click', () => { player.hidden = false; player.src = eps[Number(b.dataset.play)].audioUrl; player.play().catch(() => {}); });
    } catch (err) { render(target, html`<p class="notice">${err.message}</p>`); }
  };

  for (const b of $$('[data-pod]', pane)) b.addEventListener('click', async () => {
    const target = b.closest('section').querySelector('#pod') ?? b.closest('.sugg-card');
    let box = target.id === 'pod' ? target : target.querySelector('.ep-box');
    if (!box) { box = document.createElement('div'); box.className = 'ep-box'; target.append(box); }
    render(box, html`<p class="thinking"><span class="dot"></span>Recherche de « ${b.dataset.name} »…</p>`);
    try {
      const shows = await pods.searchShows(b.dataset.pod, 5);
      if (!shows.length) { render(box, html`<p class="notice">Ce podcast n’a pas été trouvé dans l’annuaire Apple Podcasts.</p>`); return; }
      showEpisodes(box, shows[0]);
    } catch (err) { render(box, html`<p class="notice">${err.message}</p>`); }
  });

  $('#search', pane).addEventListener('submit', async (e) => {
    e.preventDefault();
    const term = $('#term', pane).value.trim();
    if (!term) return;
    const out = $('#results', pane);
    render(out, html`<p class="thinking"><span class="dot"></span>Recherche…</p>`);
    try {
      const shows = await pods.searchShows(term);
      render(out, shows.length ? html`<div class="grid2">${shows.map((s, i) => html`<button class="show" type="button" data-show="${i}">${s.artwork ? html`<img src="${s.artwork}" alt="" loading="lazy">` : html`<span class="show-ph">${icon.ear}</span>`}<span class="stack" style="gap:0"><b>${s.title}</b><span class="hint">${s.author}</span></span></button>`)}</div><div id="eps"></div>` : html`<p class="empty">Aucun résultat.</p>`);
      for (const b of $$('[data-show]', out)) b.addEventListener('click', () => showEpisodes($('#eps', out), shows[Number(b.dataset.show)]));
    } catch (err) { render(out, html`<p class="notice">${err.message}</p>`); toast(err.message, 'bad'); }
  });
}
