// Every prompt the AI coach uses, in one place. Answers are JSON constrained by a schema.
// The guided path never depends on these: the coach explains, translates imported scenes and converses.
import { json } from './ai.js';

const S = (properties, required = Object.keys(properties)) => ({ type: 'object', properties, required });
const str = { type: 'string' };
const list = (items, max) => ({ type: 'array', items, maxItems: max });
const pair = S({ ko: str, fr: str });

const LEARNER = 'The learner is a French-speaking adult beginner in Korean (CEFR A1–A2) who learns with K-dramas.';
const hasKo = (s) => /[가-힣]/.test(String(s ?? ''));

/* ---------------- questions in French ---------------- */
/** Answers a question about Korean, in French, with Korean examples. Streams the "answer" field. */
export async function ask(question, history, onAnswer) {
  const r = await json([
    { role: 'system', content: `You are Korean Coach, a patient Korean teacher. ${LEARNER}\n` +
      'Answer in JSON:\n- "answer": in French, simple and precise, under 110 words. Quote Korean words in Hangeul. If you are not sure, say so.\n' +
      '- "examples": 1 to 3 short, natural Korean example sentences ("ko") with their French translation ("fr"). Use polite -요 speech unless the question is about casual speech.' },
    ...history.slice(-6),
    { role: 'user', content: question },
  ], S({ answer: str, examples: list(pair, 3) }), { maxTokens: 450, temperature: 0.3, stream: 'answer', onPartial: onAnswer });
  return { answer: String(r.answer ?? '').trim(), examples: (r.examples ?? []).filter((e) => hasKo(e.ko)).slice(0, 3) };
}

/* ---------------- spoken role play ---------------- */
export const SCENARIOS = [
  { key: 'cafe', label: 'Commander dans un café', speech: 'polite', role: 'a friendly barista in a Seoul café', opening: 'Greet the customer and ask what they would like.' },
  { key: 'meet', label: 'Première rencontre', speech: 'polite', role: 'a Korean person the learner meets for the first time at a party', opening: 'Say hello and ask the learner’s name.' },
  { key: 'office', label: 'Un collègue au bureau', speech: 'polite', role: 'Minjun, a friendly senior colleague (선배) at a Seoul office', opening: 'Ask the learner if they have eaten lunch.' },
  { key: 'friend', label: 'Un ami au téléphone (반말)', speech: 'casual', role: 'Seoyeon, the learner’s close Korean friend, calling in the evening', opening: 'Call and ask what the learner is doing.' },
  { key: 'pocha', label: 'Au pojangmacha (반말)', speech: 'casual', role: 'a close friend drinking soju with the learner at a street food tent', opening: 'Suggest ordering something to eat.' },
  { key: 'taxi', label: 'En taxi', speech: 'polite', role: 'a Seoul taxi driver', opening: 'Greet the passenger and ask where they are going.' },
];

function roleplaySystem(sc) {
  const speech = sc.speech === 'casual' ? 'casual speech (반말)' : 'polite speech (해요체)';
  return `You are playing ${sc.role}. ${LEARNER}\n` +
    `Use only very simple, natural Korean, A1–A2 vocabulary, ${speech}.\n` +
    'Answer in JSON, in this order:\n' +
    '- "reply_ko": your next line in Korean, in character: 1 or 2 very short sentences (under 15 words), usually ending with a simple question.\n' +
    '- "reply_fr": its French translation.\n' +
    '- "corrections": up to 2 real mistakes in the learner’s last message: "original" (their words), "better" (natural Korean), "why" (short, in French). Empty if none. Ignore spacing and punctuation: messages come from speech recognition. If the learner wrote in French, give the Korean way to say it as "better".\n' +
    '- "suggestion_ko": one short, simple Korean sentence the learner could say next.\n' +
    '- "suggestion_fr": its French translation.';
}

const turnSchema = S({
  reply_ko: str, reply_fr: str,
  corrections: list(S({ original: str, better: str, why: str }), 2),
  suggestion_ko: str, suggestion_fr: str,
});

export async function roleplayTurn(sc, history, message, onReply) {
  const r = await json([
    { role: 'system', content: roleplaySystem(sc) },
    ...history.slice(-10),
    { role: 'user', content: message ? `Learner: ${message}` : `${sc.opening} Corrections must be empty.` },
  ], turnSchema, { maxTokens: 320, temperature: 0.6, stream: 'reply_ko', onPartial: onReply });
  const corrections = message ? (r.corrections ?? []).filter((c) => c.better && hasKo(c.better) && c.original !== c.better).slice(0, 2) : [];
  return {
    ko: String(r.reply_ko || '네?').trim(), fr: String(r.reply_fr ?? '').trim(), corrections,
    suggestion: hasKo(r.suggestion_ko) ? { ko: r.suggestion_ko.trim(), fr: String(r.suggestion_fr ?? '').trim() } : null,
  };
}

/* ---------------- imported scenes ---------------- */
/** Translates up to 8 Korean subtitle lines into French, with 1–3 key words each. */
export async function translateLines(lines) {
  const listing = lines.map((l, i) => `${i + 1}. ${l}`).join('\n');
  const r = await json([
    { role: 'system', content: 'You translate Korean drama and video subtitles into natural French for a beginner learner. Answer in JSON.' },
    { role: 'user', content: `Translate each line into French (keep the tone: casual, polite, emotional). For each line, also give 1 to 3 key words or expressions from the line ("ko", as written in the line) with their French meaning ("fr").\n\n${listing}` },
  ], S({ items: { type: 'array', items: S({ fr: str, words: list(pair, 3) }), minItems: lines.length, maxItems: lines.length } }),
  { maxTokens: 140 * lines.length + 60, temperature: 0.2 });
  return lines.map((l, i) => ({ fr: String(r.items?.[i]?.fr ?? '').trim(), words: (r.items?.[i]?.words ?? []).filter((w) => hasKo(w.ko) && l.includes(w.ko.replace(/[.?!]/g, ''))) }));
}

/* ---------------- vocabulary ---------------- */
export async function explain(ko, context) {
  const r = await json([
    { role: 'system', content: 'You are a Korean teacher for French speakers. Answer in JSON.' },
    { role: 'user', content: `Korean word or expression: "${ko}"${context ? `\nSentence where it appeared: "${context}"` : ''}\n` +
      'Give its meaning in French in a few words (in this context), its dictionary form if it is conjugated, and one short simple Korean example sentence with its French translation.' },
  ], S({ meaning_fr: str, dictionary_form: str, example_ko: str, example_fr: str }), { maxTokens: 160, temperature: 0.2 });
  return {
    meaning: String(r.meaning_fr ?? '').trim(),
    base: hasKo(r.dictionary_form) && r.dictionary_form !== ko ? r.dictionary_form.trim() : '',
    example: hasKo(r.example_ko) ? { ko: r.example_ko.trim(), fr: String(r.example_fr ?? '').trim() } : null,
  };
}
