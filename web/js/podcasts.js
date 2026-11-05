// Listening library: suggestions in four tiers (from synthetic voice to real actors), and podcast search
// through the public Apple Podcasts directory (iTunes Search API, called with script tags so no server is needed).

const mock = () => globalThis.__KC_MOCK__?.podcasts;
const yt = (q) => `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;

export const TIERS = [
  { n: 1, title: 'Débutant, avec explications', when: 'Dès maintenant, en parallèle du parcours', goal: 'Habituer ton oreille aux sons et entendre la grammaire expliquée.' },
  { n: 2, title: 'Coréen lent pour apprenants', when: 'Après l’unité 2 du parcours', goal: 'Comprendre du coréen suivi, sans traduction permanente.' },
  { n: 3, title: 'Coréen naturel', when: 'Après l’unité 4', goal: 'Entendre de vrais Coréens parler à vitesse normale.' },
  { n: 4, title: 'Tes dramas', when: 'Dès l’unité 3, scène par scène', goal: 'Comprendre des scènes réelles, d’abord avec, puis sans sous-titres.' },
];

/** kind: podcast (searched in the directory, playable here) · youtube · site. */
export const SUGGESTIONS = [
  { tier: 1, kind: 'podcast', term: 'Talk To Me In Korean', name: 'Talk To Me In Korean', by: 'TTMIK', lang: 'Explications en anglais', why: 'Un épisode par semaine, sur un même thème en trois niveaux. Commence par le niveau débutant.' },
  { tier: 1, kind: 'podcast', term: 'Slow Heeya Korean', name: 'Slow Heeya Korean', by: 'Heeya', lang: 'Coréen lent', why: 'Des épisodes courts, lus lentement, pensés pour les débutants qui veulent entraîner leur écoute.' },
  { tier: 1, kind: 'podcast', term: 'KoreanClass101', name: 'KoreanClass101', by: 'Innovative Language', lang: 'Explications en anglais', why: 'Un court dialogue, puis son explication mot à mot. Les transcriptions complètes sont payantes.' },
  { tier: 1, kind: 'youtube', url: yt('GO! Billy Korean'), name: 'GO! Billy Korean', by: 'Billy Go', lang: 'Explications en anglais', why: 'La grammaire du débutant expliquée très clairement, en vidéo.' },
  { tier: 2, kind: 'youtube', url: yt('Korean Unnie'), name: 'Korean Unnie', by: 'Jiyoon', lang: 'Coréen et anglais', why: 'Une jeune Coréenne explique expressions et culture, souvent à partir de dramas et de K-pop.' },
  { tier: 2, kind: 'site', url: 'https://talktomeinkorean.com/', name: 'Iyagi (TTMIK)', by: 'TTMIK', lang: '100 % coréen, avec transcription', why: 'Des conversations naturelles entre Coréens, ralenties pour apprenants. Elles ne sont plus diffusées en podcast : elles sont désormais sur le site de TTMIK.' },
  { tier: 3, kind: 'youtube', url: yt('Easy Korean street interviews'), name: 'Easy Korean', by: 'Easy Languages', lang: 'Sous-titres coréens et anglais', why: 'Des interviews dans les rues de Séoul : du vrai coréen, à vitesse normale, sous-titré dans les deux langues.' },
  { tier: 3, kind: 'podcast', term: 'Talk To Me In Korean', name: 'TTMIK, niveau avancé', by: 'TTMIK', lang: '100 % coréen', why: 'Le même podcast que le palier 1, mais la partie avancée, entièrement en coréen.' },
  { tier: 4, kind: 'tip', name: 'Netflix avec les sous-titres coréens', by: 'Ton abonnement', lang: 'Coréen', why: 'Dans un drama, choisis « Coréen » pour l’audio et les sous-titres. Repère une scène de 1 à 2 minutes, copie ses répliques et colle-les ici dans « Importer une scène ».' },
  { tier: 4, kind: 'tip', name: 'Revoir une scène sans aucun sous-titre', by: 'Méthode', lang: '', why: 'Étudie une scène ici jusqu’à la comprendre à l’aveugle, puis regarde-la dans le drama sans sous-titres. Recommence avec la scène suivante : c’est ainsi que la compréhension se construit.' },
];

export function suggestions(tier) { return SUGGESTIONS.filter((s) => !tier || s.tier === tier); }

let n = 0;
function jsonp(url, timeoutMs = 12000) {
  return new Promise((resolve, reject) => {
    const cb = `__kcPodcast${Date.now()}_${n++}`;
    const s = document.createElement('script');
    const done = () => { clearTimeout(t); delete globalThis[cb]; s.remove(); };
    const t = setTimeout(() => { done(); reject(new Error('L’annuaire des podcasts ne répond pas. Vérifie ta connexion.')); }, timeoutMs);
    globalThis[cb] = (data) => { done(); resolve(data); };
    s.src = `${url}&callback=${cb}`;
    s.onerror = () => { done(); reject(new Error('L’annuaire des podcasts est injoignable.')); };
    document.head.append(s);
  });
}

export function toShow(r) {
  return {
    id: r.collectionId, title: r.collectionName ?? r.trackName ?? 'Podcast', author: r.artistName ?? '',
    artwork: r.artworkUrl600 ?? r.artworkUrl100 ?? null, genre: r.primaryGenreName ?? '', feedUrl: r.feedUrl ?? null, count: r.trackCount ?? null,
  };
}
export function toEpisode(r) {
  const audioUrl = r.episodeUrl ?? r.previewUrl ?? null;
  if (!audioUrl || (r.episodeContentType && r.episodeContentType !== 'audio')) return null;
  return {
    title: r.trackName ?? 'Épisode', audioUrl,
    duration: r.trackTimeMillis ? Math.round(r.trackTimeMillis / 1000) : null,
    published: r.releaseDate ?? null,
    description: String(r.shortDescription ?? r.description ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 220),
  };
}

export async function searchShows(term, limit = 12) {
  if (mock()) return mock().search(term);
  const data = await jsonp(`https://itunes.apple.com/search?media=podcast&entity=podcast&limit=${limit}&term=${encodeURIComponent(term)}`);
  return (data.results ?? []).filter((r) => r.collectionId).map(toShow);
}

export async function episodes(show, limit = 20) {
  if (mock()) return mock().episodes(show);
  const data = await jsonp(`https://itunes.apple.com/lookup?id=${show.id}&media=podcast&entity=podcastEpisode&limit=${limit}`);
  return (data.results ?? []).filter((r) => r.wrapperType === 'podcastEpisode' || r.kind === 'podcast-episode').map(toEpisode).filter(Boolean)
    .sort((a, b) => String(b.published).localeCompare(String(a.published)));
}

/* ---------------- subtitles ---------------- */
const TS = /(\d{1,2}:)?\d{1,2}:\d{2}([.,]\d{1,3})?/;
const toSec = (ts) => {
  const [hms, ms = '0'] = ts.replace(',', '.').split('.');
  return hms.split(':').reduce((a, p) => a * 60 + Number(p), 0) + Number('0.' + ms);
};

/**
 * Korean subtitles or transcript pasted as SRT, VTT, "00:12 text" lines, or plain text.
 * Returns [{ko, start, end}] (start/end in seconds, or null without timings). Non-Korean lines are dropped.
 */
export function parseSubtitles(raw) {
  const text = String(raw ?? '').replace(/\r/g, '').replace(/^WEBVTT.*$/m, '');
  const out = [];
  const blocks = text.split(/\n\s*\n/);
  const timed = /-->/.test(text);
  if (timed) {
    for (const b of blocks) {
      const lines = b.split('\n').map((l) => l.trim()).filter(Boolean);
      const ti = lines.findIndex((l) => l.includes('-->'));
      if (ti < 0) continue;
      const [a, z] = lines[ti].split('-->').map((s) => s.trim().split(/\s/)[0]);
      const ko = clean(lines.slice(ti + 1).join(' '));
      if (ko) out.push({ ko, start: toSec(a), end: toSec(z) });
    }
  } else {
    let pending = null;
    for (const l0 of text.split('\n')) {
      const l = l0.trim();
      if (!l) continue;
      const only = l.match(new RegExp(`^${TS.source}$`));
      if (only) { pending = toSec(l); continue; }
      const lead = l.match(new RegExp(`^(${TS.source})\\s+(.+)$`));
      const ko = clean(lead ? lead[lead.length - 1] : l);
      const start = lead ? toSec(lead[1]) : pending;
      pending = null;
      if (ko) out.push({ ko, start, end: null });
    }
    for (let i = 0; i < out.length; i++) if (out[i].start != null) out[i].end = out[i + 1]?.start ?? out[i].start + 4;
  }
  // without timings, long paragraphs are cut into sentences
  const untimed = out.every((o) => o.start == null);
  const lines = untimed ? out.flatMap((o) => splitKo(o.ko).map((ko) => ({ ko, start: null, end: null }))) : out;
  return lines.filter((l) => /[가-힣]/.test(l.ko)).slice(0, 120);
}
const clean = (s) => s.replace(/<[^>]+>/g, '').replace(/\{[^}]+\}/g, '').replace(/^[-–]\s*/, '').replace(/\[[^\]]*\]|\([^)]*\)|♪/g, '').replace(/\s+/g, ' ').trim();
export function splitKo(text) {
  return (String(text).match(/[^.!?。…]+[.!?。…]+["')\]]*|[^.!?。…]+$/g) ?? []).map((s) => s.trim()).filter(Boolean);
}
