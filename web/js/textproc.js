// JSON helpers for the coach's streamed answers, and small text utilities. Pure functions, shared with the tests.

export function extractJson(text) {
  const t = String(text).trim();
  try { return JSON.parse(t); } catch { /* try the next shape */ }
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) { try { return JSON.parse(fence[1]); } catch { /* next */ } }
  const s = t.indexOf('{'), e = t.lastIndexOf('}');
  if (s >= 0 && e > s) { try { return JSON.parse(t.slice(s, e + 1)); } catch { /* fall through */ } }
  throw new Error('Le coach a donné une réponse illisible. Réessaie.');
}

/**
 * Reads a string field out of JSON that is still being written, e.g. '{"reply": "Hello, ho'.
 * Returns {value, done}: the text so far (unescaped) and whether its closing quote has arrived.
 */
export function partialField(text, field) {
  const m = String(text).match(new RegExp(`"${field}"\\s*:\\s*"`));
  if (!m) return { value: '', done: false };
  let out = '', i = m.index + m[0].length;
  const esc = { n: '\n', t: '\t', r: '', '"': '"', '\\': '\\', '/': '/', b: '', f: '' };
  while (i < text.length) {
    const c = text[i];
    if (c === '"') return { value: out, done: true };
    if (c === '\\') {
      const n = text[i + 1];
      if (n === undefined) break;
      if (n === 'u') {
        const hex = text.slice(i + 2, i + 6);
        if (hex.length < 4) break;
        out += String.fromCharCode(parseInt(hex, 16));
        i += 6;
        continue;
      }
      out += esc[n] ?? n;
      i += 2;
      continue;
    }
    out += c;
    i++;
  }
  return { value: out, done: false };
}

export function youtubeId(url) {
  const m = String(url).match(/(?:youtu\.be\/|v=|\/shorts\/|\/embed\/|\/live\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}
