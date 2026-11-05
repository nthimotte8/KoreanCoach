// Offline support: the app shell and its libraries are cached after the first visit.
// AI models are cached separately by WebLLM and transformers.js.
const VERSION = 'kc-v1';
const SHELL = ['./', 'index.html', 'css/app.css', 'manifest.webmanifest', 'icon.svg', 'js/ai.js','js/coach.js','js/data/hangeul.js','js/data/lessons-a.js','js/data/lessons-b.js','js/data/lessons.js','js/db.js','js/exercises.js','js/hangul.js','js/llm-worker.js','js/main.js','js/players.js','js/podcasts.js','js/repo.js','js/speech.js','js/srs.js','js/textproc.js','js/ui.js','js/views/coach.js','js/views/conversation.js','js/views/gate.js','js/views/hangeul.js','js/views/home.js','js/views/import.js','js/views/lesson.js','js/views/listen.js','js/views/path.js','js/views/scene.js','js/views/settings.js','js/views/speak.js','js/views/vocab.js','js/whisper-worker.js'];
const LIBS = /^https:\/\/(esm\.run|cdn\.jsdelivr\.net|fonts\.(googleapis|gstatic)\.com)\//;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('kc-') && k !== VERSION).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  // app files: network first (fresh after an update), cache when offline
  if (url.origin === self.location.origin) {
    e.respondWith(fetch(e.request).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(e.request, copy)); }
      return res;
    }).catch(() => caches.match(e.request, { ignoreSearch: true }).then((r) => r || caches.match('index.html'))));
    return;
  }
  // pinned library versions never change: cache first
  if (LIBS.test(e.request.url)) {
    e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request).then((res) => {
      if (res.ok || res.type === 'opaque') { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(e.request, copy)); }
      return res;
    })));
  }
});
