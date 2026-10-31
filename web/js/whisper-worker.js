// Korean speech-to-text with Whisper (transformers.js), off the main thread. Used only to transcribe imported audio.
// In:  {id, type:'transcribe', audio: Float32Array (16 kHz mono)}
// Out: {id, type:'progress', progress, text} | {id, type:'result', text, chunks} | {id, type:'error', message}
import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.5.2';

env.allowLocalModels = false;

// multilingual models (the .en versions only know English); base is a good balance in the browser
const MODELS = ['onnx-community/whisper-base', 'Xenova/whisper-base', 'Xenova/whisper-tiny'];
let asr = null;
let loading = null;

async function hasWebGPU() {
  try { return !!(navigator.gpu && (await navigator.gpu.requestAdapter())); } catch { return false; }
}

function load(id) {
  if (asr) return Promise.resolve(asr);
  if (!loading) {
    loading = (async () => {
      const device = (await hasWebGPU()) ? 'webgpu' : 'wasm';
      const files = {};
      const progress_callback = (p) => {
        if (p.status !== 'progress' || !p.file) return;
        files[p.file] = { loaded: p.loaded ?? 0, total: p.total ?? 0 };
        const t = Object.values(files).reduce((a, f) => a + f.total, 0);
        const l = Object.values(files).reduce((a, f) => a + f.loaded, 0);
        self.postMessage({ id, type: 'progress', progress: t ? l / t : 0, text: 'Téléchargement du modèle de transcription…' });
      };
      const dtypes = device === 'webgpu' ? [{ encoder_model: 'fp32', decoder_model_merged: 'q4' }, 'fp32'] : ['q8'];
      let lastError;
      for (const model of MODELS) {
        for (const dtype of dtypes) {
          try { asr = await pipeline('automatic-speech-recognition', model, { device, dtype, progress_callback }); return asr; } catch (e) { lastError = e; }
        }
      }
      throw lastError;
    })().finally(() => { loading = null; });
  }
  return loading;
}

self.onmessage = async ({ data }) => {
  const { id } = data;
  try {
    const run = await load(id);
    self.postMessage({ id, type: 'progress', progress: 1, text: 'Transcription en cours…' });
    const out = await run(data.audio, { language: 'korean', task: 'transcribe', chunk_length_s: 30, stride_length_s: 5, return_timestamps: true });
    const chunks = (out.chunks ?? []).map((c) => ({ text: c.text.trim(), start: c.timestamp?.[0] ?? 0, end: c.timestamp?.[1] ?? (c.timestamp?.[0] ?? 0) + 4 }));
    self.postMessage({ id, type: 'result', text: (out.text ?? '').trim(), chunks });
  } catch (e) {
    self.postMessage({ id, type: 'error', message: e?.message || String(e) });
  }
};
