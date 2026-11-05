// End-to-end walk through the app with voice, microphone and AI replaced by fakes (no GPU, no download).
// Usage: python3 -m http.server 8123 -d web &  node web/tests/e2e.mjs [outDir]
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const BASE = process.env.BASE ?? 'http://localhost:8123/';
const OUT = process.argv[2] ?? '/tmp';
const MOCK = () => {
  const keys = (s) => Object.keys(s.properties ?? {});
  globalThis.__KC_MOCK__ = {
    cached: true,
    said: null, // what the fake microphone "hears"; null = the expected answer shown on screen
    spoken: [],
    async speak(text) { globalThis.__KC_MOCK__.spoken.push(text); await new Promise((r) => setTimeout(r, 20)); },
    recognize() {
      const m = globalThis.__KC_MOCK__;
      const text = m.said ?? document.querySelector('[data-expected]')?.dataset.expected ?? '안녕하세요';
      return { text, alternatives: [text] };
    },
    podcasts: {
      async search(term) { return [{ id: 1, title: term, author: 'TTMIK', artwork: null, genre: 'Education', feedUrl: null, count: 2 }]; },
      async episodes() { return [{ title: 'Beginner: 안녕하세요', audioUrl: 'https://podcasts.example.invalid/ep1.mp3', duration: 600, published: '2026-10-20', description: '' }]; },
    },
    async llm(messages, schema) {
      await new Promise((r) => setTimeout(r, 80));
      const k = keys(schema);
      if (k.includes('answer')) return { answer: '은/는 marque le thème, 이/가 le sujet.', examples: [{ ko: '저는 학생이에요.', fr: 'Je suis étudiant.' }] };
      if (k.includes('reply_ko')) {
        const last = messages[messages.length - 1].content;
        return last.startsWith('Learner:')
          ? { reply_ko: '아, 그래요? 뭐 마실래요?', reply_fr: 'Ah bon ? Vous voulez boire quoi ?', corrections: [{ original: '커피 주세요요', better: '커피 주세요', why: 'Un seul -요 suffit.' }], suggestion_ko: '아메리카노 주세요.', suggestion_fr: 'Un americano, s’il vous plaît.' }
          : { reply_ko: '어서 오세요! 뭐 드릴까요?', reply_fr: 'Bienvenue ! Qu’est-ce que je vous sers ?', corrections: [], suggestion_ko: '커피 주세요.', suggestion_fr: 'Un café, s’il vous plaît.' };
      }
      if (k.includes('items')) {
        const n = (messages[1].content.match(/^\d+\./gm) ?? []).length;
        return { items: Array.from({ length: n }, (_, i) => ({ fr: `Traduction ${i + 1}`, words: [{ ko: '집', fr: 'maison' }] })) };
      }
      if (k.includes('meaning_fr')) return { meaning_fr: 'vraiment', dictionary_form: '', example_ko: '진짜 맛있어요.', example_fr: 'C’est vraiment bon.' };
      throw new Error('unexpected schema ' + k);
    },
  };
};

const errors = [];
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 } });
await ctx.addInitScript(MOCK);
const page = await ctx.newPage();
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.g|youtube|Failed to load resource|example\.invalid/.test(m.text())) errors.push('console: ' + m.text()); });
const step = async (name, fn) => { try { await fn(); console.log('ok  ', name); } catch (e) { console.log('FAIL', name, '-', e.message.split('\n')[0]); errors.push(name); } };
const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png`, fullPage: true });

/** Clicks the coach loading button when the gate shows it. */
async function loadCoach() {
  const b = page.locator('[data-load]');
  await b.waitFor({ timeout: 5000 }).catch(() => {});
  if (await b.isVisible().catch(() => false)) await b.click();
}

/** Answers the current exercise task, whatever its type, until the end screen. */
async function finishExercises(max = 30) {
  for (let n = 0; n < max; n++) {
    if (await page.getByRole('heading', { name: 'Terminé' }).isVisible().catch(() => false)) return;
    const reveal = page.locator('#reveal');
    if (await reveal.isVisible().catch(() => false)) { await reveal.click(); await page.locator('[data-u="1"]').click(); continue; }
    const opt = page.locator('.choice[data-opt]:not([disabled])').first();
    if (await opt.isVisible().catch(() => false)) {
      await opt.click();
      await page.locator('#next').click();
      continue;
    }
    if (await page.locator('#talk:not([disabled])').isVisible().catch(() => false) && !(await page.locator('#fb .answer').isVisible().catch(() => false))) {
      await page.locator('#talk').click();
      await page.locator('#fb .answer').waitFor({ timeout: 4000 });
      const nx = page.locator('#next');
      if (await nx.isVisible().catch(() => false)) await nx.click();
      else { await page.locator('#talk').click(); await page.waitForTimeout(600); if (await nx.isVisible().catch(() => false)) await nx.click(); }
      continue;
    }
    await page.waitForTimeout(200);
  }
  throw new Error('exercises did not finish');
}

await page.goto(BASE);
await step('home for a new learner', async () => { await page.getByText('Bienvenue.').waitFor({ timeout: 6000 }); await shot('01-home'); });
await step('path page', async () => { await page.getByRole('link', { name: 'Parcours' }).first().click(); await page.getByRole('heading', { name: 'Lire le hangeul' }).waitFor(); await shot('02-path'); });
await step('hangeul step 1', async () => {
  await page.goto(BASE + '#alphabet-h1');
  await page.getByRole('heading', { name: 'Les voyelles simples' }).waitFor();
  await page.locator('.letter').first().click();
  await shot('03-hangeul');
});
await step('hangeul exercises', async () => {
  await page.getByRole('link', { name: 'S’exercer' }).click();
  await page.locator('.ex').waitFor();
  await shot('04-hangeul-ex');
  await finishExercises();
  await page.getByRole('link', { name: /Étape suivante/ }).waitFor();
});
await step('lesson 1 discover', async () => {
  await page.goto(BASE + '#lecon-l01');
  await page.getByRole('heading', { name: 'Trois niveaux de politesse' }).waitFor();
  await shot('05-lesson-discover');
  await page.locator('#done').click();
  await page.getByText('Premier jour à Séoul').waitFor();
  await page.locator('[data-nav="mots"] .badge').waitFor();
});
await step('lesson 1 scene: blind first, then text', async () => {
  await page.getByText('Écoute d’abord toute la scène sans le texte').waitFor();
  await page.locator('#play').click();
  await page.waitForFunction(() => globalThis.__KC_MOCK__.spoken.includes('아니에요.'));
  await page.locator('#toggle').click();
  await page.locator('.sline .ko').first().waitFor();
  await shot('06-lesson-scene');
  await page.locator('#done').click();
});
await step('lesson 1 exercises', async () => {
  await page.locator('.ex').waitFor();
  await shot('07-lesson-ex');
  await finishExercises();
  await page.locator('.done-card').getByRole('link', { name: /À toi de parler/ }).click();
});
await step('lesson 1 speaking (fake microphone)', async () => {
  await page.getByRole('heading', { name: 'Dis-le en coréen' }).waitFor();
  // first answer said correctly
  await page.evaluate(() => { globalThis.__KC_MOCK__.said = '안녕하세요'; });
  await page.locator('#talk').click();
  await page.getByText('Parfait').waitFor();
  await shot('08-speak-ok');
  await page.locator('#next').click();
  // second one said wrong
  await page.evaluate(() => { globalThis.__KC_MOCK__.said = '감사니다'; });
  await page.locator('#talk').click();
  await page.locator('.diff .miss').first().waitFor();
  await shot('09-speak-diff');
  await page.evaluate(() => { globalThis.__KC_MOCK__.said = null; });
  await page.locator('#talk').click();
  await page.waitForTimeout(500);
  await page.locator('#next').click();
  await page.evaluate(() => {
    // the remaining prompts: make the fake mic say the expected answer
    const obs = new MutationObserver(() => { const h = document.querySelector('#hint-text'); globalThis.__KC_MOCK__.said = null; if (h) h.closest('#task')?.setAttribute('data-expected', ''); });
    obs.observe(document.body, { subtree: true, childList: true });
  });
  await finishExercises();
  await page.getByText('Leçon 1 terminée').waitFor();
});
await step('home shows indicators', async () => {
  await page.goto(BASE + '#accueil');
  await page.getByText('Compréhension sans texte').first().waitFor();
  await shot('10-home-progress');
});
await step('vocabulary review by ear', async () => {
  await page.goto(BASE + '#mots');
  await page.locator('#hear').waitFor();
  await page.locator('#reveal').click();
  await page.locator('[data-grade="2"]').click();
  await shot('11-vocab');
});
await step('vocabulary notebook', async () => {
  await page.goto(BASE + '#mots-carnet');
  await page.locator('table.t').waitFor();
  await page.locator('#ko').fill('진짜');
  await page.locator('#add button[type=submit]').click();
  await page.getByText('Ce mot est déjà dans ton carnet.').or(page.locator('td', { hasText: '진짜' }).first()).first().waitFor();
});
await step('speaking hub and minimal pairs', async () => {
  await page.goto(BASE + '#parler');
  await page.getByRole('heading', { name: '1. Les sons difficiles' }).waitFor();
  await shot('12-speak-hub');
  await page.goto(BASE + '#parler-sons-gk');
  await page.locator('.ex').waitFor();
  await finishExercises();
});
await step('role play a scene', async () => {
  await page.goto(BASE + '#parler-jouer-l01');
  await page.getByRole('button', { name: /Jiwoo/ }).click();
  await page.locator('#talk').waitFor();
  await page.evaluate(() => { globalThis.__KC_MOCK__.said = '안녕하세요'; });
  await page.locator('#talk').click();
  await page.locator('#cont').click();
  await shot('13-roleplay');
});
await step('listening suggestions and podcast episodes', async () => {
  await page.goto(BASE + '#ecouter');
  await page.getByRole('heading', { name: 'Débutant, avec explications' }).waitFor();
  await page.locator('[data-pod]').first().click();
  await page.getByText('Beginner: 안녕하세요').waitFor();
  await shot('14-listen');
});
await step('blind listening of learned lines', async () => {
  await page.goto(BASE + '#ecouter-aveugle');
  await page.locator('#reveal').waitFor();
  await finishExercises();
});
await step('import subtitles, translate with the coach, blind mode', async () => {
  await page.goto(BASE + '#importer');
  await page.locator('#ex').click();
  await page.locator('#go').click();
  await page.getByRole('heading', { name: 'Exemple : la fin de journée' }).waitFor();
  await loadCoach();
  await page.locator('#translate').click();
  await page.getByText('Traduction 1').first().waitFor({ timeout: 8000 });
  await shot('15-scene');
  await page.getByRole('link', { name: /Écoute à l’aveugle/ }).click();
  await finishExercises();
});
await step('coach answers in French with examples', async () => {
  await page.goto(BASE + '#coach');
  await loadCoach();
  await page.locator('[data-q]').first().click();
  await page.getByText('marque le thème').waitFor();
  await shot('16-coach');
});
await step('conversation with suggestions', async () => {
  await page.goto(BASE + '#conversation-cafe');
  await loadCoach();
  await page.getByText('어서 오세요!').waitFor();
  await page.evaluate(() => { globalThis.__KC_MOCK__.said = '커피 주세요요'; });
  await page.locator('#talk').click();
  await page.getByText('Un seul -요 suffit.').waitFor();
  await shot('17-conversation');
});
await step('settings: hide romanisation', async () => {
  await page.goto(BASE + '#reglages');
  await page.locator('#rom').uncheck();
  await page.waitForFunction(() => document.body.classList.contains('no-rom'));
  await page.locator('#rom').check();
  await shot('18-settings');
});
await step('phone layout', async () => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(BASE + '#lecon-l02');
  await page.getByRole('heading', { name: 'L’intonation fait la question' }).waitFor();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  if (overflow) throw new Error('horizontal scroll on phone');
  await shot('19-phone-lesson');
  await page.goto(BASE + '#accueil');
  await shot('20-phone-home');
});

await browser.close();
console.log(errors.length ? `\n${errors.length} problem(s):\n${errors.join('\n')}` : '\nAll good.');
process.exit(errors.length ? 1 : 0);
