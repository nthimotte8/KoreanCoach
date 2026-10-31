# Korean Coach

Apprendre le coréen **de zéro jusqu’au niveau A2**, à l’oral comme à l’écrit, avec les K-dramas. Objectif final : comprendre les dramas sans sous-titres.

Site : https://nthimotte8.github.io/KoreanCoach/ (Chrome ou Edge sur ordinateur, conseillé).

Gratuit, sans compte : tout tourne dans le navigateur et la progression reste sur ton ordinateur.

## Ce qu’il y a dedans

| Partie | Contenu |
|---|---|
| **Parcours** | Lecture du hangeul en 6 étapes, puis 25 leçons (A1 → A2) qui suivent une histoire : Jiwoo arrive à Séoul, rencontre Minjun… jusqu’à la déclaration à Busan. Chaque leçon : mots et grammaire expliqués en français, une scène dialoguée, des exercices, puis « À toi de parler ». 201 mots, 173 répliques, 125 phrases à dire. |
| **Affichage** | Chaque phrase en trois lignes : hangeul, romanisation (selon la prononciation réelle : 감사합니다 → gamsahamnida), traduction française. La romanisation et la traduction peuvent être masquées dans Réglages. |
| **Écouter** | Écoute à l’aveugle (sans texte, puis on dévoile), vitesse réglable, suggestions d’audios en 4 paliers (podcasts pour débutants → coréen naturel → tes dramas), recherche de podcasts, et import de vraies scènes : sous-titres coréens, fichier audio (transcrit par Whisper dans le navigateur) ou vidéo YouTube. |
| **Parler** | Sons difficiles pour un francophone (ㄱ/ㅋ/ㄲ, ㅓ/ㅗ…), répétition (shadowing), « dis-le en coréen », jouer un rôle dans une scène, conversation avec le coach. La prononciation est vérifiée syllabe par syllabe et tu réécoutes ta voix à côté du modèle. |
| **Vocabulaire** | Répétition espacée, à l’oreille (on entend avant de lire) ou à voix haute. |
| **Progression** | Deux indicateurs : **compréhension sans texte** et **expression orale**, suivis semaine après semaine. |
| **Coach IA** (facultatif) | Répond à tes questions en français, traduit les scènes importées, converse en coréen simple en te corrigeant. Modèle Qwen 2.5 exécuté sur ta carte graphique (WebLLM). Le parcours n’en dépend pas. |

## Comment ça marche

| Brique | Technologie |
|---|---|
| Voix coréenne | Synthèse vocale du système (`speechSynthesis`) : Yuna sur Mac, « Google 한국의 » dans Chrome |
| Reconnaissance de ta voix | Service de reconnaissance vocale du navigateur, en `ko-KR`. Dans Chrome, l’audio passe par les serveurs de Google le temps de la transcription. |
| Transcription des fichiers importés | Whisper multilingue via transformers.js, dans un Web Worker |
| Coach | WebLLM (WebGPU), réponses contraintes par un schéma JSON |
| Données | IndexedDB, uniquement dans ce navigateur ; export et import dans Réglages |

JavaScript moderne, sans étape de build : les fichiers de `web/` sont servis tels quels.

## En local

```bash
python3 -m http.server 8000 -d web   # puis http://localhost:8000
```

## Tests

```bash
node --test web/tests/unit.test.mjs        # romanisation, prononciation, sous-titres, données des leçons
python3 -m http.server 8123 -d web &
node web/tests/e2e.mjs /tmp                # parcours complet avec voix, micro et IA simulés (Playwright)
```

## Publication

Le workflow `.github/workflows/web.yml` teste puis publie `web/` sur GitHub Pages à chaque push sur `main`. Une seule fois : **Settings › Pages › Source : GitHub Actions**.

## Limites

- Les voix de synthèse sont claires mais plus lentes et neutres que de vrais acteurs : c’est le rôle des paliers d’écoute et des scènes importées.
- Le contenu des leçons a été rédigé avec soin ; une relecture par un locuteur natif reste conseillée.
- Le coach est un petit modèle : il peut se tromper en coréen.
- Beaucoup de serveurs de podcasts interdisent la lecture de leurs fichiers par un site web : télécharge l’épisode et importe le fichier.
