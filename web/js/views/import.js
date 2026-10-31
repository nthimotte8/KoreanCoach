// Import a real scene: pasted Korean subtitles, an audio/video file (transcribed by Whisper on this computer),
// or a YouTube video with its Korean transcript.
import * as repo from '../repo.js';
import { parseSubtitles, splitKo } from '../podcasts.js';
import { decode, onAsrProgress, transcribe } from '../speech.js';
import { youtubeId } from '../textproc.js';
import { $, $$, html, render, toast } from '../ui.js';

const EXAMPLE = `1
00:00:01,200 --> 00:00:03,000
지우야, 어디 가?

2
00:00:03,400 --> 00:00:05,800
나 집에 가. 너무 피곤해.

3
00:00:06,100 --> 00:00:08,500
같이 밥 먹자. 내가 살게.`;

export async function mount(view, [mode = 'texte']) {
  const modes = [['texte', 'Sous-titres ou texte'], ['fichier', 'Fichier audio ou vidéo'], ['youtube', 'Vidéo YouTube']];
  render(view, html`<div class="wrap">
    <a class="hint" href="#ecouter-scenes">← Mes scènes</a>
    <div class="page-head"><div class="stack" style="gap:4px"><h1>Importer une scène</h1>
      <p>Choisis une scène courte (1 à 3 minutes) : c’est la bonne taille pour la travailler jusqu’à la comprendre sans texte.</p></div></div>
    <div class="seg" role="group" aria-label="Source">${modes.map(([k, l]) => html`<button type="button" data-mode="${k}" aria-pressed="${k === mode}">${l}</button>`)}</div>
    <form class="panel" id="f">
      <label class="field">Titre<input id="title" required placeholder="Ex. Crash Landing on You, épisode 1, la rencontre"></label>
      ${mode === 'fichier' ? html`
        <label class="field">Fichier (MP3, M4A, WAV, MP4…)<input id="file" type="file" accept="audio/*,video/*" required></label>
        <p class="hint">Le fichier est transcrit en coréen par Whisper, directement dans ton navigateur (environ 150 Mo à télécharger la première fois). Sur un MacBook Air, compte environ une minute de calcul par minute d’audio : garde des extraits courts. Seules les 5 premières minutes sont transcrites.</p>
        <label class="field">Sous-titres coréens (facultatif : remplace la transcription automatique)<textarea id="subs" rows="5" lang="ko" placeholder="Colle ici un fichier .srt ou .vtt si tu l’as"></textarea></label>`
      : mode === 'youtube' ? html`
        <label class="field">Lien de la vidéo<input id="url" required placeholder="https://www.youtube.com/watch?v=…"></label>
        <label class="field">Transcription coréenne, avec les minutages<textarea id="subs" rows="9" lang="ko" required placeholder="Sous la vidéo : « … Plus », puis « Afficher la transcription », choisis le coréen, et copie tout ici."></textarea></label>
        <p class="hint">Les minutages permettent de réécouter chaque réplique avec la vraie voix.</p>`
      : html`
        <label class="field">Sous-titres ou texte coréen<textarea id="subs" rows="10" lang="ko" required placeholder="Colle un fichier .srt / .vtt, ou simplement les répliques, une par ligne."></textarea></label>
        <div class="row tight"><button class="btn quiet small" type="button" id="ex">Essayer avec un exemple</button></div>
        <p class="hint">Sans fichier audio, les répliques sont lues par la voix de synthèse.</p>`}
      <div class="row"><button class="btn primary" type="submit" id="go">Créer la scène</button></div>
      <div id="state" aria-live="polite"></div>
    </form></div>`);
  for (const b of $$('[data-mode]', view)) b.addEventListener('click', () => { location.hash = `#importer-${b.dataset.mode}`; });
  $('#ex', view)?.addEventListener('click', () => { $('#subs', view).value = EXAMPLE; $('#title', view).value = 'Exemple : la fin de journée'; });

  let off = () => {};
  $('#f', view).addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = $('#title', view).value.trim();
    const subs = $('#subs', view)?.value ?? '';
    const state = $('#state', view);
    const go = $('#go', view);
    try {
      if (mode === 'texte') {
        const lines = parseSubtitles(subs);
        if (!lines.length) throw new Error('Aucune ligne en coréen trouvée.');
        const m = await repo.createMaterial({ title, source: 'subs', lines });
        location.hash = `#scene-${m.id}`;
      } else if (mode === 'youtube') {
        const videoId = youtubeId($('#url', view).value);
        if (!videoId) throw new Error('Ce lien YouTube n’est pas reconnu.');
        const lines = parseSubtitles(subs);
        if (!lines.length) throw new Error('Aucune ligne en coréen trouvée dans la transcription.');
        const m = await repo.createMaterial({ title, source: 'youtube', videoId, lines });
        location.hash = `#scene-${m.id}`;
      } else {
        const file = $('#file', view).files[0];
        if (!file) throw new Error('Choisis un fichier.');
        go.disabled = true;
        let lines = parseSubtitles(subs);
        if (!lines.length) {
          render(state, html`<p class="thinking"><span class="dot"></span>Lecture du fichier…</p>`);
          const { audio } = await decode(file, 300);
          off = onAsrProgress((p) => render(state, html`<p class="hint">${p.text}</p><div class="progress"><i style="width:${Math.round((p.progress ?? 0) * 100)}%"></i></div>`));
          const r = await transcribe(audio);
          off();
          lines = (r.chunks.length ? r.chunks : [{ text: r.text, start: 0, end: null }])
            .flatMap((c) => { const parts = splitKo(c.text); return parts.length > 1 && c.end != null ? parts.map((ko, i) => ({ ko, start: c.start + ((c.end - c.start) * i) / parts.length, end: c.start + ((c.end - c.start) * (i + 1)) / parts.length })) : [{ ko: c.text.trim(), start: c.start, end: c.end }]; })
            .filter((l) => /[가-힣]/.test(l.ko));
          if (!lines.length) throw new Error('Aucune parole coréenne n’a été reconnue dans ce fichier.');
        }
        const m = await repo.createMaterial({ title, source: 'audio', audioBlob: file, lines });
        location.hash = `#scene-${m.id}`;
      }
    } catch (err) {
      off();
      go.disabled = false;
      render(state, html`<p class="notice">${err.message}</p>`);
      toast(err.message, 'bad');
    }
  });
  return () => off();
}
