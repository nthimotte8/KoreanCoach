// Voice: Korean text-to-speech (system voices), Korean speech recognition (the browser's service),
// microphone recording for listening back to yourself, and Whisper for transcribing imported audio.
import { getSetting } from './db.js';

const mock = () => globalThis.__KC_MOCK__;

/* ---------------- text-to-speech ---------------- */
export const RATES = { lent: 0.65, normal: 0.9, rapide: 1.15 };
const PREFERRED = [
  'Google 한국의', 'Microsoft SunHi Online (Natural) - Korean (Korea)', 'Microsoft InJoon Online (Natural) - Korean (Korea)',
  'Yuna', 'Yuna (Premium)', 'Yuna (Enhanced)', 'Sora', 'Minsu', 'Jian', 'Suhyun', 'Microsoft Heami - Korean (Korean)',
];
let voices = [];
function loadVoices() {
  if (!('speechSynthesis' in globalThis)) return;
  voices = speechSynthesis.getVoices().filter((v) => /^ko([-_]|$)/i.test(v.lang));
  voices.sort((a, b) => rank(a) - rank(b));
}
const rank = (v) => { const i = PREFERRED.findIndex((n) => v.name === n || v.name.startsWith(n)); return i < 0 ? 99 : i; };
if ('speechSynthesis' in globalThis) { loadVoices(); speechSynthesis.addEventListener?.('voiceschanged', loadVoices); }

export const canSpeak = () => !!mock() || 'speechSynthesis' in globalThis;
export const koreanVoices = () => { loadVoices(); return voices; };
/** Waits a moment for the voice list, which Chrome fills asynchronously. */
export async function voicesReady() {
  for (let i = 0; i < 20 && !voices.length && canSpeak(); i++) { await new Promise((r) => setTimeout(r, 100)); loadVoices(); }
  return voices;
}

let prefs = { voice: null, rate: 'normal' };
export async function loadVoicePrefs() {
  prefs = { voice: await getSetting('voice', null), rate: await getSetting('rate', 'normal') };
  return prefs;
}
export const currentRate = () => prefs.rate;
export function setRatePref(r) { prefs.rate = r; }
export function setVoicePref(v) { prefs.voice = v; }

/** The voice for a speaker: 'f' (default) or 'm'. A second voice is used when the system has one. */
function voiceFor(who) {
  const chosen = voices.find((v) => v.name === prefs.voice) ?? voices[0] ?? null;
  if (who !== 'm') return { voice: chosen, pitch: 1 };
  const male = voices.find((v) => /InJoon|Minsu|male|남/i.test(v.name) && v !== chosen);
  return male ? { voice: male, pitch: 1 } : { voice: chosen, pitch: 0.75 };
}

let speaking = 0;
/** Speaks Korean text. rate: a RATES key or a number. Resolves when finished or interrupted. */
export function speak(text, { rate, who = 'f' } = {}) {
  const r = typeof rate === 'number' ? rate : RATES[rate ?? prefs.rate] ?? RATES.normal;
  if (mock()?.speak) return mock().speak(text, { rate: r, who });
  return new Promise((resolve) => {
    if (!('speechSynthesis' in globalThis) || !text) return resolve();
    speechSynthesis.cancel();
    speaking++;
    const u = new SpeechSynthesisUtterance(text);
    const { voice, pitch } = voiceFor(who);
    u.lang = voice?.lang ?? 'ko-KR';
    if (voice) u.voice = voice;
    u.rate = r;
    u.pitch = pitch;
    let done = false;
    const end = () => { if (!done) { done = true; resolve(); } };
    u.onend = u.onerror = end;
    // Chrome sometimes never fires onend: give up after a generous estimate
    setTimeout(end, 1500 + text.length * 400 / r);
    speechSynthesis.speak(u);
  });
}
export function stopSpeaking() { if ('speechSynthesis' in globalThis) speechSynthesis.cancel(); speaking++; }

/** Speaks lines one after the other (a dialogue). Stops if `signal.stop` becomes true. */
export async function speakLines(lines, { rate, signal = {}, onLine } = {}) {
  for (let i = 0; i < lines.length; i++) {
    if (signal.stop) return;
    onLine?.(i);
    await speak(lines[i].ko, { rate, who: lines[i].voice });
    await new Promise((r) => setTimeout(r, 350));
  }
  onLine?.(-1);
}

/* ---------------- speech recognition (Korean) ---------------- */
const Rec = globalThis.SpeechRecognition || globalThis.webkitSpeechRecognition;
export const canRecognize = () => !!mock()?.recognize || !!Rec;

/**
 * Listens once in Korean. Returns a handle {result: Promise<{text, alternatives}>, stop()}.
 * onPartial(text) receives the words as they are recognised.
 */
export function listen({ onPartial } = {}) {
  if (mock()?.recognize) {
    let stop;
    const result = new Promise((resolve) => { stop = () => resolve(mock().recognize()); setTimeout(stop, 400); });
    return { result, stop: () => stop() };
  }
  if (!Rec) return { result: Promise.reject(new Error('Ce navigateur ne reconnaît pas la voix. Utilise Chrome ou Edge.')), stop() {} };
  stopSpeaking();
  const r = new Rec();
  r.lang = 'ko-KR';
  r.interimResults = true;
  r.maxAlternatives = 5;
  r.continuous = false;
  let finals = [];
  let interim = '';
  const result = new Promise((resolve, reject) => {
    r.onresult = (e) => {
      interim = '';
      finals = [];
      for (const res of e.results) {
        if (res.isFinal) finals.push([...res].map((a) => a.transcript.trim()));
        else interim += res[0].transcript;
      }
      onPartial?.((finals.map((f) => f[0]).join(' ') + ' ' + interim).trim());
    };
    r.onerror = (e) => {
      if (e.error === 'no-speech' || e.error === 'aborted') return resolve({ text: '', alternatives: [] });
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') return reject(new Error('Micro refusé. Autorise le micro pour ce site (icône à gauche de l’adresse) puis réessaie.'));
      if (e.error === 'network') return reject(new Error('La reconnaissance vocale a besoin d’Internet (elle passe par le service de Chrome).'));
      reject(new Error('Reconnaissance vocale : ' + e.error));
    };
    r.onend = () => {
      if (!finals.length && interim) finals = [[interim.trim()]];
      // alternatives of the whole utterance: first choices joined, plus each alternative of a single result
      const main = finals.map((f) => f[0]).join(' ').trim();
      const alts = finals.length === 1 ? finals[0] : [main];
      resolve({ text: main, alternatives: [...new Set([main, ...alts].filter(Boolean))] });
    };
  });
  try { r.start(); } catch { /* already started */ }
  return { result, stop: () => { try { r.stop(); } catch { /* ended */ } } };
}

/* ---------------- microphone recording (to hear yourself) ---------------- */
export class Recorder {
  constructor() { this.rec = null; this.chunks = []; this.stream = null; }
  get recording() { return !!this.rec && this.rec.state === 'recording'; }
  async start() {
    if (mock()) { this.rec = { state: 'recording' }; return; }
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch {
      throw new Error('Micro inaccessible. Autorise le micro pour ce site (icône à gauche de l’adresse) puis réessaie.');
    }
    this.chunks = [];
    this.rec = new MediaRecorder(this.stream);
    this.rec.ondataavailable = (e) => { if (e.data.size) this.chunks.push(e.data); };
    this.rec.start();
  }
  /** Stops and returns {blob, url}, or null when nothing was recorded. */
  stop() {
    if (mock()) { this.rec = null; return Promise.resolve(null); }
    return new Promise((resolve) => {
      if (!this.rec) return resolve(null);
      this.rec.onstop = () => {
        this.stream?.getTracks().forEach((t) => t.stop());
        const blob = new Blob(this.chunks, { type: this.rec.mimeType || 'audio/webm' });
        this.rec = null;
        resolve(blob.size ? { blob, url: URL.createObjectURL(blob) } : null);
      };
      this.rec.stop();
    });
  }
  cancel() {
    try { if (this.rec?.stop) this.rec.stop(); } catch { /* already stopped */ }
    this.stream?.getTracks().forEach((t) => t.stop());
    this.rec = null;
  }
}

/* ---------------- Whisper, for imported audio files ---------------- */
let worker = null;
let seq = 0;
const pending = new Map();
const progressListeners = new Set();
export function onAsrProgress(fn) { progressListeners.add(fn); return () => progressListeners.delete(fn); }

function asrWorker() {
  if (!worker) {
    worker = new Worker(new URL('./whisper-worker.js', import.meta.url), { type: 'module' });
    worker.onmessage = ({ data }) => {
      if (data.type === 'progress') { progressListeners.forEach((fn) => fn(data)); return; }
      const p = pending.get(data.id);
      if (!p) return;
      pending.delete(data.id);
      if (data.type === 'error') p.reject(new Error('Transcription : ' + data.message));
      else p.resolve(data);
    };
    worker.onerror = (e) => {
      for (const p of pending.values()) p.reject(new Error('La transcription n’a pas pu démarrer (' + (e.message || 'erreur') + ').'));
      pending.clear();
      worker = null;
    };
  }
  return worker;
}

/** Transcribes 16 kHz mono Korean audio → {text, chunks:[{text, start, end}]} (sentence-level timestamps). */
export async function transcribe(audio) {
  if (mock()?.asr) return mock().asr(audio);
  const id = ++seq;
  const copy = new Float32Array(audio);
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    asrWorker().postMessage({ id, type: 'transcribe', audio: copy }, [copy.buffer]);
  });
}

/** Decodes any audio/video file to 16 kHz mono, keeping at most `maxSeconds`. */
export async function decode(blob, maxSeconds = Infinity) {
  const buf = await blob.arrayBuffer();
  const Ctx = globalThis.AudioContext || globalThis.webkitAudioContext;
  const ctx = new Ctx({ sampleRate: 16000 });
  try {
    const audio = await ctx.decodeAudioData(buf);
    const len = Math.min(audio.length, Math.floor(maxSeconds * 16000));
    const out = new Float32Array(len);
    for (let ch = 0; ch < audio.numberOfChannels; ch++) {
      const data = audio.getChannelData(ch);
      for (let i = 0; i < len; i++) out[i] += data[i] / audio.numberOfChannels;
    }
    return { audio: out, duration: audio.duration };
  } catch {
    throw new Error('Ce fichier ne peut pas être lu par le navigateur. Essaie un MP3, M4A, WAV ou MP4.');
  } finally {
    ctx.close().catch(() => {});
  }
}
