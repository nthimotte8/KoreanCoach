// Settings: display (romanisation, translation), Korean voice and speed, speech recognition, AI coach, data.
import * as ai from '../ai.js';
import * as db from '../db.js';
import { canRecognize, currentRate, listen, setRatePref, setVoicePref, speak, voicesReady } from '../speech.js';
import { applyDisplay } from '../main.js';
import { $, $$, html, render, toast } from '../ui.js';

export async function mount(view) {
  const [tier, gpu, showRom, showFr, voiceName] = await Promise.all([
    ai.getTier(), ai.webgpuInfo(), db.getSetting('showRom', true), db.getSetting('showFr', true), db.getSetting('voice', null)]);
  const voices = await voicesReady();
  let offState = () => {};

  render(view, html`<div class="wrap">
    <div class="page-head"><div class="stack" style="gap:4px"><h1>Réglages</h1>
      <p>Tout est enregistré dans ce navigateur. Rien n’est envoyé à un serveur, sauf ta voix pendant les exercices oraux (voir plus bas).</p></div></div>

    <section class="panel">
      <h2>Affichage du coréen</h2>
      <p class="muted">Au début, garde les deux. Quand tu lis le hangeul sans hésiter, masque la romanisation : ton oreille et tes yeux progresseront plus vite.</p>
      <label class="tier"><input type="checkbox" id="rom" ${showRom ? 'checked' : ''}><span class="stack" style="gap:2px"><b>Afficher la romanisation</b><span class="hint">Ex. 사랑해 → saranghae</span></span></label>
      <label class="tier"><input type="checkbox" id="fr" ${showFr ? 'checked' : ''}><span class="stack" style="gap:2px"><b>Afficher la traduction française</b><span class="hint">Les exercices d’écoute la cachent de toute façon jusqu’à la réponse.</span></span></label>
    </section>

    <section class="panel">
      <h2>Voix coréenne</h2>
      ${voices.length ? html`<label class="field">Voix<select id="voice">${voices.map((v) => html`<option value="${v.name}" ${v.name === voiceName ? 'selected' : ''}>${v.name}${v.localService ? '' : ' (en ligne)'}</option>`)}</select></label>`
        : html`<p class="notice">Aucune voix coréenne n’est installée. Sur Mac : Réglages Système › Accessibilité › Contenu énoncé › Voix du système › Gérer les voix, puis ajoute « Yuna » (coréen). Dans Chrome, la voix « Google 한국의 » est aussi disponible en ligne.</p>`}
      <div class="row tight" role="group" aria-label="Vitesse">${['lent', 'normal', 'rapide'].map((r) => html`<button type="button" class="pick" data-rate="${r}" aria-pressed="${currentRate() === r}">${{ lent: 'Lente', normal: 'Normale', rapide: 'Rapide' }[r]}</button>`)}</div>
      <div class="row"><button class="btn" type="button" id="test">Tester : 안녕하세요, 만나서 반가워요</button></div>
      <p class="hint">Les personnages masculins utilisent une deuxième voix si ton système en a une, sinon la même voix, plus grave.</p>
    </section>

    <section class="panel">
      <h2>Reconnaissance de ta voix</h2>
      <p class="muted">Pour vérifier ta prononciation, le site utilise la reconnaissance vocale intégrée au navigateur. Dans Chrome, ta voix est envoyée aux serveurs de Google le temps de la transcrire ; l’enregistrement que tu réécoutes reste sur ton ordinateur.</p>
      ${canRecognize() ? html`<div class="row"><button class="btn" type="button" id="mic">Tester le micro en coréen</button><span id="mic-out" class="hint" lang="ko"></span></div>`
        : html`<p class="notice">Ce navigateur ne propose pas la reconnaissance vocale. Utilise Chrome ou Edge pour la vérification automatique.</p>`}
    </section>

    <section class="panel">
      <h2>Coach IA</h2>
      ${gpu.ok ? '' : html`<p class="notice">${gpu.reason}</p>`}
      <p class="muted">Le coach répond à tes questions, traduit les scènes importées et converse avec toi. Il est facultatif. Un modèle plus gros fait moins d’erreurs en coréen mais répond plus lentement.</p>
      ${ai.state.charsPerSec ? html`<p class="hint">Vitesse mesurée sur cet ordinateur : environ ${Math.round(ai.state.charsPerSec / 3)} syllabes par seconde.${ai.isSlow() ? ' C’est lent : essaie le niveau « Léger ».' : ''}</p>` : ''}
      <div class="stack" style="gap:8px" role="radiogroup" aria-label="Niveau du coach">
        ${ai.TIERS.map((t) => html`<label class="tier"><input type="radio" name="tier" value="${t.key}" ${t.key === tier ? 'checked' : ''}>
          <span class="stack" style="gap:2px"><b>${t.label}</b><span class="hint">${t.hint}</span></span></label>`)}
      </div>
      <div class="row"><button class="btn primary" type="button" id="load">Charger le coach</button>
        <button class="btn danger" type="button" id="del">Supprimer ce modèle du cache</button></div>
      <div id="model-state" class="hint" aria-live="polite"></div>
    </section>

    <section class="panel">
      <h2>Mes données</h2>
      <p class="muted">Progression, carnet et scènes sont enregistrés dans ce navigateur uniquement. Sauvegarde-les pour les retrouver sur un autre ordinateur.</p>
      <div class="row">
        <button class="btn" type="button" id="export">Exporter une sauvegarde</button>
        <label class="btn" for="import-file">Restaurer une sauvegarde</label><input type="file" id="import-file" accept="application/json,.json" class="sr">
        <button class="btn danger" type="button" id="reset">Tout effacer</button>
      </div>
      <p class="hint">Les fichiers audio importés ne sont pas inclus dans la sauvegarde ; leurs répliques et traductions, si.</p>
    </section>
  </div>`);

  $('#rom', view).addEventListener('change', async (e) => { await db.setSetting('showRom', e.target.checked); applyDisplay(); });
  $('#fr', view).addEventListener('change', async (e) => { await db.setSetting('showFr', e.target.checked); applyDisplay(); });
  $('#voice', view)?.addEventListener('change', async (e) => { setVoicePref(e.target.value); await db.setSetting('voice', e.target.value); speak('안녕하세요'); });
  for (const b of $$('[data-rate]', view)) b.addEventListener('click', async () => {
    setRatePref(b.dataset.rate); await db.setSetting('rate', b.dataset.rate);
    for (const x of $$('[data-rate]', view)) x.setAttribute('aria-pressed', String(x === b));
    speak('만나서 반가워요');
  });
  $('#test', view).addEventListener('click', () => speak('안녕하세요, 만나서 반가워요'));
  $('#mic', view)?.addEventListener('click', async (e) => {
    const b = e.currentTarget;
    b.disabled = true; $('#mic-out', view).textContent = 'Dis « 안녕하세요 »…';
    try {
      const r = await listen({ onPartial: (t) => { $('#mic-out', view).textContent = t; } }).result;
      $('#mic-out', view).textContent = r.text ? `Reconnu : ${r.text}` : 'Rien entendu.';
    } catch (err) { $('#mic-out', view).textContent = err.message; }
    b.disabled = false;
  });

  for (const r of $$('input[name="tier"]', view)) r.addEventListener('change', async () => { await ai.setTier(r.value); toast('Niveau enregistré. Le nouveau modèle se chargera à la prochaine utilisation.'); });
  $('#load', view).addEventListener('click', () => { ai.load().catch((err) => toast(err.message, 'bad')); });
  $('#del', view).addEventListener('click', async () => {
    try { await ai.deleteCached($('input[name="tier"]:checked', view).value); toast('Modèle supprimé du cache.'); } catch (err) { toast(err.message, 'bad'); }
  });
  offState = ai.onState((s) => {
    const el = $('#model-state', view);
    if (!el) return;
    el.textContent = s.status === 'loading' ? `${s.text} (${Math.round(s.progress * 100)} %)` : s.status === 'ready' ? `Chargé : ${s.modelId}` : s.status === 'error' ? s.error : '';
  });

  $('#export', view).addEventListener('click', async () => {
    const data = await db.exportAll();
    for (const m of data.materials ?? []) delete m.audioBlob;
    const url = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url; a.download = `korean-coach-${new Date().toISOString().slice(0, 10)}.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  $('#import-file', view).addEventListener('change', async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    try { await db.importAll(JSON.parse(await f.text())); toast('Sauvegarde restaurée.', 'good'); setTimeout(() => location.reload(), 600); } catch (err) { toast(err.message, 'bad'); }
  });
  $('#reset', view).addEventListener('click', async (e) => {
    const b = e.currentTarget;
    if (b.dataset.confirm !== '1') { b.dataset.confirm = '1'; b.textContent = 'Confirmer : tout effacer'; return; }
    await db.clearAll(); toast('Tout est effacé.'); setTimeout(() => location.reload(), 600);
  });
  return () => offState();
}
