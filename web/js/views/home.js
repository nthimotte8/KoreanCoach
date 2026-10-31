// Home: the next step of the path, the two indicators (understood without text, said well), and quick practice.
import * as repo from '../repo.js';
import { CAST, HANGEUL, LESSONS, lesson, hangeulStep } from '../data/lessons.js';
import { $, html, pct, render } from '../ui.js';

const href = (s) => (s.kind === 'hangeul' ? `#alphabet-${s.id}` : `#lecon-${s.id}`);

export async function mount(view) {
  const [st, next, map] = await Promise.all([repo.stats(), repo.nextStep(), repo.progressMap()]);
  const isNew = !map.size && !st.cards.total;
  const nextInfo = next ? (next.kind === 'hangeul' ? hangeulStep(next.id) : lesson(next.id)) : null;
  const started = next && map.has(next.id);

  render(view, html`<div class="wrap">
    <div class="page-head"><div class="stack" style="gap:4px">
      <h1><span lang="ko">안녕하세요!</span></h1>
      <p>${isNew ? 'Bienvenue. Tu vas apprendre le coréen comme on suit un drama : l’alphabet d’abord, puis l’histoire de Jiwoo et Minjun, scène par scène.' : 'Content de te revoir. Voici où tu en es.'}</p>
    </div><a class="btn quiet" href="#reglages">Réglages</a></div>

    ${next ? html`<section class="hero">
      <div class="stack" style="gap:6px">
        <span class="next-k">${started ? 'Reprendre' : isNew ? 'Commencer' : 'Étape suivante'} · ${next.kind === 'hangeul' ? `Alphabet ${HANGEUL.indexOf(nextInfo) + 1} / 6` : `Leçon ${nextInfo.n} / ${LESSONS.length}`}</span>
        <h2>${next.kind === 'lesson' ? html`<span lang="ko">${nextInfo.title}</span> · ` : ''}${next.kind === 'hangeul' ? nextInfo.title : nextInfo.name}</h2>
        <p class="muted">${next.kind === 'hangeul' ? (isNew ? 'Le hangeul se lit en quelques jours. Six étapes courtes, avec le son de chaque lettre.' : nextInfo.intro[0]) : nextInfo.scene.context}</p>
      </div>
      <a class="btn primary big" href="${href(next)}">${started ? 'Continuer' : 'Commencer'}</a>
    </section>` : html`<section class="hero"><div class="stack"><span class="next-k">Parcours terminé</span><h2>Les 25 leçons sont faites. 대박!</h2>
      <p class="muted">Passe aux vraies scènes de dramas dans « Écouter », et continue la conversation avec le coach.</p></div><a class="btn primary big" href="#ecouter">Écouter</a></section>`}

    <div class="grid2">
      <section class="panel gauge">
        <span class="label">Compréhension sans texte</span>
        <span class="v">${pct(st.listen.ratio)}</span>
        <div class="bar"><i style="width:${Math.round((st.listen.ratio ?? 0) * 100)}%"></i></div>
        <span class="hint">${st.listen.total ? `Sur tes ${st.listen.total} dernières répliques écoutées à l’aveugle.` : 'Mesuré dans les exercices « Écoute sans le texte ».'}</span>
      </section>
      <section class="panel gauge speak">
        <span class="label">Expression orale</span>
        <span class="v">${pct(st.speak.ratio)}</span>
        <div class="bar"><i style="width:${Math.round((st.speak.ratio ?? 0) * 100)}%"></i></div>
        <span class="hint">${st.speak.total ? `Phrases bien dites, sur tes ${st.speak.total} derniers essais.` : 'Mesurée quand tu dis ou répètes une phrase au micro.'}</span>
      </section>
    </div>

    <div class="tiles">
      <a class="tile" href="#mots"><span class="k">Vocabulaire</span><b>${st.cards.due ? `${st.cards.due} mot${st.cards.due > 1 ? 's' : ''} à réviser` : 'Rien à réviser'}</b><span>${st.cards.total} dans ton carnet, ${st.cards.mastered} acquis</span></a>
      <a class="tile" href="#ecouter-aveugle"><span class="k">Écouter</span><b>Écoute à l’aveugle</b><span>Des répliques des leçons déjà vues, sans texte</span></a>
      <a class="tile" href="#parler"><span class="k">Parler</span><b>Dire, répéter, jouer une scène</b><span>Avec vérification de ta prononciation</span></a>
      <a class="tile" href="#parcours"><span class="k">Parcours</span><b>${st.hangeulDone} / 6 alphabet · ${st.lessonsDone} / ${LESSONS.length} leçons</b><span>${st.streak ? `${st.streak} jour${st.streak > 1 ? 's' : ''} d’affilée` : 'Un peu chaque jour vaut mieux que beaucoup une fois'}</span></a>
    </div>

    ${st.weeks.some((w) => w.listen != null || w.speak != null) ? html`<section class="panel"><h2>Ta progression, semaine après semaine</h2><div id="chart"></div>
      <div class="legend"><span><i style="background:var(--accent)"></i>Compréhension sans texte</span><span><i style="background:var(--blue)"></i>Expression orale</span></div></section>` : ''}

    ${isNew ? html`<section class="panel"><h2>Les personnages</h2>
      <p class="muted">Chaque leçon est une scène de leur histoire, du premier jour au bureau jusqu’à la déclaration.</p>
      <div class="stack" style="gap:6px">${['jiwoo', 'minjun', 'seoyeon', 'taeho'].map((k) => html`<p><b lang="ko">${CAST[k].ko}</b> · ${CAST[k].fr} — <span class="muted">${CAST[k].about}</span></p>`)}</div></section>` : ''}
  </div>`);

  const chart = $('#chart', view);
  if (chart) chart.innerHTML = lineChart(st.weeks);
}

/** Two lines (0–100 %) over eight weeks, as inline SVG. */
function lineChart(weeks) {
  const W = 640, H = 180, L = 36, B = 24, T = 10;
  const x = (i) => L + (i * (W - L - 10)) / (weeks.length - 1);
  const y = (v) => T + (1 - v) * (H - T - B);
  const path = (key) => {
    let d = '';
    weeks.forEach((w, i) => { if (w[key] != null) d += `${d ? 'L' : 'M'}${x(i).toFixed(1)},${y(w[key]).toFixed(1)}`; });
    return d;
  };
  const dots = (key, color) => weeks.map((w, i) => (w[key] != null ? `<circle cx="${x(i)}" cy="${y(w[key])}" r="3.5" fill="${color}"><title>${Math.round(w[key] * 100)} %</title></circle>` : '')).join('');
  const grid = [0, 0.5, 1].map((v) => `<line x1="${L}" x2="${W - 10}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)"/><text x="${L - 6}" y="${y(v) + 4}" text-anchor="end">${v * 100}</text>`).join('');
  const labels = weeks.map((w, i) => (i % 2 === 1 ? `<text x="${x(i)}" y="${H - 6}" text-anchor="middle">${new Date(w.to).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}</text>` : '')).join('');
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Évolution sur 8 semaines">${grid}${labels}
    <path d="${path('listen')}" fill="none" stroke="var(--accent)" stroke-width="2.5"/>${dots('listen', 'var(--accent)')}
    <path d="${path('speak')}" fill="none" stroke="var(--blue)" stroke-width="2.5"/>${dots('speak', 'var(--blue)')}</svg>`;
}
