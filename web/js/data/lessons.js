// The guided path: units, lessons (expanded from the compact data files), cast of the story, minimal pairs.
import A from './lessons-a.js';
import B from './lessons-b.js';
import { HANGEUL } from './hangeul.js';

export { HANGEUL };

/** The recurring characters of the story. voice: f / f2 / m / m2 (two female, two male timbres). */
export const CAST = {
  jiwoo: { ko: '지우', fr: 'Jiwoo', voice: 'f', about: '25 ans, vient de Busan, nouvelle employée à Séoul' },
  minjun: { ko: '민준', fr: 'Minjun', voice: 'm', about: '28 ans, son collègue plus ancien (선배)' },
  seoyeon: { ko: '서연', fr: 'Seoyeon', voice: 'f2', about: 'l’amie d’enfance de Jiwoo, un peu plus âgée (언니)' },
  taeho: { ko: '태호', fr: 'Taeho', voice: 'm2', about: '23 ans, stagiaire, petit frère de Minjun' },
  boss: { ko: '팀장님', fr: 'Le chef', voice: 'm2', about: 'chef d’équipe' },
  mom: { ko: '엄마', fr: 'La mère', voice: 'f2', about: 'la mère de Jiwoo' },
};

export const UNITS = [
  { n: 1, title: 'Premiers mots', level: 'A1' },
  { n: 2, title: 'Le quotidien', level: 'A1' },
  { n: 3, title: 'Les émotions', level: 'A1' },
  { n: 4, title: 'Les relations', level: 'A2' },
  { n: 5, title: 'Raconter', level: 'A2' },
];

function expand(l, i) {
  return {
    ...l,
    n: i + 1,
    words: l.words.map(([ko, fr, note], k) => ({ id: `${l.id}w${k}`, ko, fr, note: note ?? '' })),
    grammar: { ...l.grammar, ex: l.grammar.ex.map(([ko, fr]) => ({ ko, fr })) },
    scene: {
      ...l.scene,
      lines: l.scene.lines.map(([who, ko, fr], k) => ({ id: `${l.id}s${k}`, who, ko, fr, voice: CAST[who]?.voice ?? 'f' })),
    },
    speak: l.speak.map(([fr, answers, hint], k) => ({ id: `${l.id}p${k}`, fr, ko: answers[0], answers, hint: hint ?? '' })),
  };
}

export const LESSONS = [...A, ...B].map(expand);
export const lesson = (id) => LESSONS.find((l) => l.id === id) ?? null;
export const hangeulStep = (id) => HANGEUL.find((h) => h.id === id) ?? null;

/** Every step of the path in order: the six Hangeul steps, then the lessons. */
export const PATH = [
  ...HANGEUL.map((h) => ({ kind: 'hangeul', id: h.id, title: h.title })),
  ...LESSONS.map((l) => ({ kind: 'lesson', id: l.id, title: l.name })),
];

/** Sounds a French ear confuses. Each set: words that differ by one sound, with their meaning. */
export const PAIRS = [
  { id: 'gk', title: 'ㄱ · ㅋ · ㄲ', what: 'doux, soufflé, tendu', sets: [[['가', 'g/k doux'], ['카', 'k soufflé'], ['까', 'kk tendu']], [['굴', 'huître'], ['쿨', 'cool'], ['꿀', 'miel']], [['기', 'énergie'], ['키', 'taille ; clé'], ['끼', 'repas (compteur) ; talent']]] },
  { id: 'dt', title: 'ㄷ · ㅌ · ㄸ', what: 'doux, soufflé, tendu', sets: [[['달', 'lune'], ['탈', 'masque'], ['딸', 'fille']], [['다', 'tout'], ['타', 'monte !'], ['따', 'cueille !']]] },
  { id: 'bp', title: 'ㅂ · ㅍ · ㅃ', what: 'doux, soufflé, tendu', sets: [[['불', 'feu'], ['풀', 'herbe ; colle'], ['뿔', 'corne']], [['방', 'chambre'], ['팡', 'pan ! (explosion)'], ['빵', 'pain']]] },
  { id: 'jc', title: 'ㅈ · ㅊ · ㅉ', what: 'doux, soufflé, tendu', sets: [[['자다', 'dormir'], ['차다', 'être froid ; botter'], ['짜다', 'être salé']], [['자', 'règle (à mesurer)'], ['차', 'thé ; voiture'], ['짜', 'salé']]] },
  { id: 'ss', title: 'ㅅ · ㅆ', what: 'normal, tendu', sets: [[['사다', 'acheter'], ['싸다', 'être bon marché']], [['살', 'âge ; chair'], ['쌀', 'riz (cru)']]] },
  { id: 'eo', title: 'ㅓ · ㅗ', what: 'o ouvert, o fermé', sets: [[['거기', 'là-bas'], ['고기', 'viande']], [['너', 'toi'], ['노', 'rame']]] },
  { id: 'eu', title: 'ㅡ · ㅜ', what: 'eu étiré, ou arrondi', sets: [[['그', 'il ; ce'], ['구', 'neuf']], [['으', '« eu »'], ['우', '« ou »']]] },
  { id: 'nng', title: 'ㄴ · ㅇ en finale', what: 'n, ng', sets: [[['반', 'classe ; moitié'], ['방', 'chambre']], [['간', 'foie'], ['강', 'rivière']], [['산', 'montagne'], ['상', 'table ; prix']]] },
].map((p) => ({ ...p, sets: p.sets.map((s) => s.map(([ko, fr]) => ({ ko, fr }))) }));

/** Lines and words of the lessons already started, as listening material for review. */
export function learnedMaterial(doneIds) {
  const ls = LESSONS.filter((l) => doneIds.has(l.id));
  return {
    lines: ls.flatMap((l) => l.scene.lines.map((x) => ({ ...x, lesson: l.id }))),
    words: ls.flatMap((l) => l.words.map((x) => ({ ...x, lesson: l.id }))),
    speak: ls.flatMap((l) => l.speak.map((x) => ({ ...x, lesson: l.id }))),
  };
}
