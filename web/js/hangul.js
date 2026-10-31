// Hangeul: syllable (de)composition, pronunciation-based romanisation, and comparison of what was said.
// Pure functions, no DOM: shared by the app and the Node tests.

export const CHO = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
export const JUNG = ['ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅘ', 'ㅙ', 'ㅚ', 'ㅛ', 'ㅜ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅠ', 'ㅡ', 'ㅢ', 'ㅣ'];
export const JONG = ['', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];

const BASE = 0xac00;
const LAST = 0xd7a3;
export const isSyllable = (ch) => { const c = ch.codePointAt(0); return c >= BASE && c <= LAST; };
export const hasHangul = (s) => /[가-힣]/.test(String(s ?? ''));

/** '한' → {cho:'ㅎ', jung:'ㅏ', jong:'ㄴ'}; null for anything that is not a Hangeul syllable. */
export function decompose(ch) {
  if (!ch || !isSyllable(ch)) return null;
  const i = ch.codePointAt(0) - BASE;
  return { cho: CHO[Math.floor(i / 588)], jung: JUNG[Math.floor((i % 588) / 28)], jong: JONG[i % 28] };
}
export function compose(cho, jung, jong = '') {
  const a = CHO.indexOf(cho), b = JUNG.indexOf(jung), c = JONG.indexOf(jong);
  if (a < 0 || b < 0 || c < 0) return '';
  return String.fromCodePoint(BASE + (a * 21 + b) * 28 + c);
}

/* ---------------- romanisation ---------------- */
// Revised Romanisation, applied to how the word is pronounced (liaison, nasalisation, aspiration,
// palatalisation, ㄹ assimilation), so a beginner reads what they will actually hear.
const R_CHO = { 'ㄱ': 'g', 'ㄲ': 'kk', 'ㄴ': 'n', 'ㄷ': 'd', 'ㄸ': 'tt', 'ㄹ': 'r', 'ㅁ': 'm', 'ㅂ': 'b', 'ㅃ': 'pp', 'ㅅ': 's', 'ㅆ': 'ss', 'ㅇ': '', 'ㅈ': 'j', 'ㅉ': 'jj', 'ㅊ': 'ch', 'ㅋ': 'k', 'ㅌ': 't', 'ㅍ': 'p', 'ㅎ': 'h' };
const R_JUNG = { 'ㅏ': 'a', 'ㅐ': 'ae', 'ㅑ': 'ya', 'ㅒ': 'yae', 'ㅓ': 'eo', 'ㅔ': 'e', 'ㅕ': 'yeo', 'ㅖ': 'ye', 'ㅗ': 'o', 'ㅘ': 'wa', 'ㅙ': 'wae', 'ㅚ': 'oe', 'ㅛ': 'yo', 'ㅜ': 'u', 'ㅝ': 'wo', 'ㅞ': 'we', 'ㅟ': 'wi', 'ㅠ': 'yu', 'ㅡ': 'eu', 'ㅢ': 'ui', 'ㅣ': 'i' };
const R_JONG = { '': '', 'ㄱ': 'k', 'ㄴ': 'n', 'ㄷ': 't', 'ㄹ': 'l', 'ㅁ': 'm', 'ㅂ': 'p', 'ㅇ': 'ng' };
// double final consonants: [kept, carried over to a following vowel]
const SPLIT = { 'ㄳ': ['ㄱ', 'ㅅ'], 'ㄵ': ['ㄴ', 'ㅈ'], 'ㄶ': ['ㄴ', 'ㅎ'], 'ㄺ': ['ㄹ', 'ㄱ'], 'ㄻ': ['ㄹ', 'ㅁ'], 'ㄼ': ['ㄹ', 'ㅂ'], 'ㄽ': ['ㄹ', 'ㅅ'], 'ㄾ': ['ㄹ', 'ㅌ'], 'ㄿ': ['ㄹ', 'ㅍ'], 'ㅀ': ['ㄹ', 'ㅎ'], 'ㅄ': ['ㅂ', 'ㅅ'] };
// the seven sounds a final consonant can have
const NEUTRAL = { 'ㄱ': 'ㄱ', 'ㄲ': 'ㄱ', 'ㅋ': 'ㄱ', 'ㄳ': 'ㄱ', 'ㄺ': 'ㄱ', 'ㄴ': 'ㄴ', 'ㄵ': 'ㄴ', 'ㄶ': 'ㄴ', 'ㄷ': 'ㄷ', 'ㅅ': 'ㄷ', 'ㅆ': 'ㄷ', 'ㅈ': 'ㄷ', 'ㅊ': 'ㄷ', 'ㅌ': 'ㄷ', 'ㅎ': 'ㄷ', 'ㄹ': 'ㄹ', 'ㄼ': 'ㄹ', 'ㄽ': 'ㄹ', 'ㄾ': 'ㄹ', 'ㅀ': 'ㄹ', 'ㄻ': 'ㅁ', 'ㅁ': 'ㅁ', 'ㅂ': 'ㅂ', 'ㅍ': 'ㅂ', 'ㄿ': 'ㅂ', 'ㅄ': 'ㅂ', 'ㅇ': 'ㅇ', '': '' };
const ASPIRATE = { 'ㄱ': 'ㅋ', 'ㄷ': 'ㅌ', 'ㅂ': 'ㅍ', 'ㅈ': 'ㅊ' };
const NASAL = { 'ㄱ': 'ㅇ', 'ㄷ': 'ㄴ', 'ㅂ': 'ㅁ' };

/** Applies the sound changes at the boundary between syllable a and the next one b (both mutated). */
function boundary(a, b) {
  let j = a.jong;
  const c = b.cho;
  if (!j) return;
  // 1. a vowel follows: the final consonant moves to the next syllable (liaison)
  if (c === 'ㅇ') {
    if (j === 'ㅇ') return;
    if (j === 'ㅎ') { a.jong = ''; return; }
    if (j === 'ㄶ' || j === 'ㅀ') { a.jong = ''; b.cho = j === 'ㄶ' ? 'ㄴ' : 'ㄹ'; return; }
    let moved = j;
    if (SPLIT[j]) { a.jong = SPLIT[j][0]; moved = SPLIT[j][1]; } else a.jong = '';
    if (b.jung === 'ㅣ' && (moved === 'ㄷ' || moved === 'ㅌ')) moved = moved === 'ㄷ' ? 'ㅈ' : 'ㅊ'; // 같이 → 가치
    b.cho = moved;
    return;
  }
  // 2. ㅎ in the final: aspirates the next consonant, or assimilates
  if (j === 'ㅎ' || j === 'ㄶ' || j === 'ㅀ') {
    const rest = j === 'ㅎ' ? '' : SPLIT[j][0];
    if (ASPIRATE[c]) { a.jong = rest; b.cho = ASPIRATE[c]; return; }
    if (c === 'ㅅ') { a.jong = rest; b.cho = 'ㅆ'; return; }
    if (c === 'ㄴ') { a.jong = j === 'ㅀ' ? 'ㄹ' : 'ㄴ'; if (j === 'ㅀ') b.cho = 'ㄹ'; return; }
    j = rest || 'ㄷ';
  }
  // 3. ㅎ starts the next syllable: k/t/p before it become aspirated (축하 → 추카)
  if (c === 'ㅎ') {
    const keep = SPLIT[j] ? SPLIT[j][0] : '';
    const last = SPLIT[j] ? SPLIT[j][1] : j;
    const n = NEUTRAL[last];
    if (ASPIRATE[n] && !['ㄴ', 'ㄹ', 'ㅁ', 'ㅇ'].includes(last)) {
      a.jong = keep;
      b.cho = (b.jung === 'ㅣ' && n === 'ㄷ') ? 'ㅊ' : ASPIRATE[n];
      return;
    }
  }
  // 4. the final takes one of its seven sounds
  let n = NEUTRAL[j] ?? j;
  if (j === 'ㄺ' && c === 'ㄱ') n = 'ㄹ'; // 읽고 → 일꼬
  // 5. nasalisation and ㄹ assimilation
  if (NASAL[n] && (c === 'ㄴ' || c === 'ㅁ')) n = NASAL[n];
  else if (c === 'ㄹ') {
    if (n === 'ㄴ') n = 'ㄹ';
    else if (n === 'ㅁ' || n === 'ㅇ') b.cho = 'ㄴ';
    else if (NASAL[n]) { n = NASAL[n]; b.cho = 'ㄴ'; }
  } else if (n === 'ㄹ' && c === 'ㄴ') b.cho = 'ㄹ';
  a.jong = n;
}

function romanizeWord(word) {
  const syl = [...word].map((ch) => decompose(ch));
  for (let i = 0; i < syl.length - 1; i++) if (syl[i] && syl[i + 1]) boundary(syl[i], syl[i + 1]);
  let out = '';
  const chars = [...word];
  syl.forEach((s, i) => {
    if (!s) { out += chars[i]; return; }
    const prev = syl[i - 1];
    let cho = R_CHO[s.cho];
    if (s.cho === 'ㄹ' && prev && prev.jong === 'ㄹ') cho = 'l'; // ㄹㄹ → ll
    const jong = R_JONG[NEUTRAL[s.jong] ?? s.jong] ?? '';
    out += cho + R_JUNG[s.jung] + jong;
  });
  return out;
}

/** 감사합니다 → gamsahamnida ; spaces and punctuation are kept. */
export function romanize(text) {
  return String(text ?? '').split(/(\s+)/).map((part) => (hasHangul(part) ? romanizeWord(part) : part)).join('');
}

/* ---------------- comparing what was said ---------------- */
/** Only Hangeul, Latin letters and digits: what speech recognition and the target have in common. */
export const squash = (s) => String(s ?? '').toLowerCase().replace(/[^가-힣a-z0-9]/g, '');
/** Syllables → jamo string, so 가 vs 카 counts as one small difference rather than a whole syllable. */
export function jamo(s) {
  let out = '';
  for (const ch of s) { const d = decompose(ch); out += d ? d.cho + d.jung + d.jong : ch; }
  return out;
}

export function lev(a, b) {
  const A = [...a], B = [...b];
  let prev = Array.from({ length: B.length + 1 }, (_, j) => j);
  for (let i = 1; i <= A.length; i++) {
    const cur = [i];
    for (let j = 1; j <= B.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (A[i - 1] === B[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[B.length];
}

/** 0–1: how close `said` is to `target`, at the level of jamo. */
export function similarity(said, target) {
  const a = jamo(squash(said)), b = jamo(squash(target));
  if (!b) return 0;
  return Math.max(0, 1 - lev(a, b) / Math.max(a.length, b.length));
}

/**
 * Marks each syllable of the target as heard or not, by aligning it with what was said.
 * Returns [{text, ok}] in target order, spaces included as {text:' ', ok:true}.
 */
export function alignSyllables(said, target) {
  const A = [...squash(said)];
  const T = [...String(target)];
  const tIdx = T.map((ch, i) => (/[가-힣a-z0-9]/i.test(ch) ? i : -1)).filter((i) => i >= 0);
  const B = tIdx.map((i) => T[i].toLowerCase());
  const d = Array.from({ length: A.length + 1 }, () => new Array(B.length + 1).fill(0));
  for (let i = 0; i <= A.length; i++) d[i][0] = i;
  for (let j = 0; j <= B.length; j++) d[0][j] = j;
  for (let i = 1; i <= A.length; i++) for (let j = 1; j <= B.length; j++)
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (A[i - 1] === B[j - 1] ? 0 : 1));
  const ok = new Array(B.length).fill(false);
  let i = A.length, j = B.length;
  while (i > 0 && j > 0) {
    if (A[i - 1] === B[j - 1] && d[i][j] === d[i - 1][j - 1]) { ok[j - 1] = true; i--; j--; }
    else if (d[i][j] === d[i - 1][j - 1] + 1) { i--; j--; }
    else if (d[i][j] === d[i - 1][j] + 1) i--;
    else j--;
  }
  const okAt = new Map(tIdx.map((ti, k) => [ti, ok[k]]));
  return T.map((ch, i) => ({ text: ch, ok: okAt.has(i) ? okAt.get(i) : true }));
}

/**
 * Best match of what was said (several recognition alternatives) against the accepted answers.
 * Returns {score 0–1, answer, said, verdict: 'great'|'good'|'close'|'miss'}.
 */
export function judge(saidAlternatives, answers) {
  let best = { score: 0, answer: answers[0], said: saidAlternatives[0] ?? '' };
  for (const s of saidAlternatives) for (const a of answers) {
    const score = similarity(s, a);
    if (score > best.score) best = { score, answer: a, said: s };
  }
  const v = best.score;
  return { ...best, verdict: v >= 0.92 ? 'great' : v >= 0.82 ? 'good' : v >= 0.5 ? 'close' : 'miss' };
}

export const VERDICT = {
  great: { label: 'Parfait', tone: 'good' },
  good: { label: 'Bien', tone: 'good' },
  close: { label: 'Presque', tone: 'warm' },
  miss: { label: 'Pas encore', tone: 'bad' },
};
