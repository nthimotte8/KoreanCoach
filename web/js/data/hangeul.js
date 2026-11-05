// Reading Hangeul in six steps. Each letter is heard inside a syllable (a consonant alone has no sound).
// letters: [jamo, romanisation, how it sounds for a French speaker, example syllable]
// words: [korean, french] — read with the letters of this step and the previous ones.

export const HANGEUL = [
  {
    id: 'h1', title: 'Les voyelles simples', short: 'Voyelles',
    intro: [
      'Le hangeul est un alphabet : chaque lettre note un son, et les lettres se regroupent en blocs d’une syllabe. Il a été inventé en 1443 pour être appris en quelques jours.',
      'Une syllabe commence toujours par une consonne. Quand on entend une voyelle seule, on écrit devant elle ㅇ, une consonne muette qui sert de support : 아 se lit « a ».',
      'Les voyelles verticales (ㅏ ㅓ ㅣ) se placent à droite de la consonne, les horizontales (ㅗ ㅜ ㅡ) en dessous : 아, 오.',
    ],
    letters: [
      ['ㅏ', 'a', 'a de « papa »', '아'],
      ['ㅓ', 'eo', 'o ouvert de « porte », bouche bien ouverte', '어'],
      ['ㅗ', 'o', 'o fermé de « eau », lèvres arrondies', '오'],
      ['ㅜ', 'u', 'ou de « loup »', '우'],
      ['ㅡ', 'eu', 'comme « ou » mais lèvres étirées, sans les arrondir', '으'],
      ['ㅣ', 'i', 'i de « lit »', '이'],
      ['ㅐ', 'ae', 'è de « mère »', '애'],
      ['ㅔ', 'e', 'é / è : aujourd’hui prononcé comme ㅐ', '에'],
    ],
    words: [['아이', 'enfant'], ['오이', 'concombre'], ['이', 'deux ; dent'], ['오', 'cinq'], ['아!', 'ah !'], ['어?', 'hein ?']],
    tip: 'Le piège pour un francophone : ㅓ (eo) et ㅗ (o). Pour ㅓ, ouvre grand la bouche comme pour « or » ; pour ㅗ, arrondis les lèvres comme pour « eau ».',
  },
  {
    id: 'h2', title: 'Les consonnes de base', short: 'Consonnes',
    intro: [
      'Chaque consonne dessine la position de la bouche : ㄱ montre la langue qui touche le fond du palais, ㄴ la langue contre les dents, ㅁ la bouche fermée.',
      'ㄱ, ㄷ, ㅂ, ㅈ sont entre deux sons : un peu « g / k », « d / t », « b / p », « dj / tch ». En début de mot, on les entend plus durs ; entre deux voyelles, plus doux.',
    ],
    letters: [
      ['ㄱ', 'g / k', 'entre g et k, sans souffle', '가'],
      ['ㄴ', 'n', 'n de « nous »', '나'],
      ['ㄷ', 'd / t', 'entre d et t', '다'],
      ['ㄹ', 'r / l', 'r roulé léger entre deux voyelles, l en fin de syllabe', '라'],
      ['ㅁ', 'm', 'm de « mer »', '마'],
      ['ㅂ', 'b / p', 'entre b et p', '바'],
      ['ㅅ', 's', 's de « sac » ; « ch » devant i : 시 se dit « chi »', '사'],
      ['ㅈ', 'j', 'dj de « adjoint », ou tch léger', '자'],
      ['ㅎ', 'h', 'h expiré, comme en anglais', '하'],
    ],
    words: [['나', 'moi (familier)'], ['너', 'toi'], ['바다', 'la mer'], ['고기', 'la viande'], ['우리', 'nous'], ['하나', 'un'], ['노래', 'chanson'], ['드라마', 'drama'], ['누나', 'grande sœur (dit par un homme)'], ['어머니', 'mère']],
    tip: 'ㄹ se dit comme un r très bref, la langue touche juste une fois le palais : 우리 « ou-ri », presque « ou-di ».',
  },
  {
    id: 'h3', title: 'Les voyelles avec un « y »', short: 'Voyelles en y',
    intro: [
      'Un trait en plus devant une voyelle ajoute un « y » devant le son : ㅏ (a) → ㅑ (ya), ㅓ (eo) → ㅕ (yeo), ㅗ (o) → ㅛ (yo), ㅜ (u) → ㅠ (yu).',
    ],
    letters: [
      ['ㅑ', 'ya', 'ya de « yaourt »', '야'],
      ['ㅕ', 'yeo', 'yo ouvert, bouche ouverte', '여'],
      ['ㅛ', 'yo', 'yo fermé de « yoyo »', '요'],
      ['ㅠ', 'yu', 'you de « youpi »', '유'],
      ['ㅒ', 'yae', 'yè', '얘'],
      ['ㅖ', 'ye', 'yé ; après une consonne, souvent juste « é »', '예'],
    ],
    words: [['야!', 'hé !'], ['여기', 'ici'], ['요리', 'cuisine'], ['우유', 'lait'], ['여보', 'chéri·e (entre époux)'], ['여자', 'femme'], ['휴지', 'mouchoir'], ['예', 'oui (formel)']],
    tip: 'Tu entendras 요 partout : c’est la terminaison polie des phrases (고마워요, 괜찮아요).',
  },
  {
    id: 'h4', title: 'Les consonnes soufflées et tendues', short: 'Souffle et tension',
    intro: [
      'Le coréen a trois versions de plusieurs consonnes, une difficulté pour l’oreille francophone :',
      'Douces (ㄱ ㄷ ㅂ ㅈ), soufflées avec un petit souffle d’air (ㅋ ㅌ ㅍ ㅊ), et tendues, sans souffle, gorge serrée (ㄲ ㄸ ㅃ ㅉ ㅆ).',
      'Astuce : mets ta main devant la bouche. Pour 카 tu sens de l’air, pour 까 presque rien, et la voix monte un peu.',
    ],
    letters: [
      ['ㅋ', 'k', 'k avec un souffle d’air', '카'],
      ['ㅌ', 't', 't avec un souffle', '타'],
      ['ㅍ', 'p', 'p avec un souffle', '파'],
      ['ㅊ', 'ch', 'tch avec un souffle', '차'],
      ['ㄲ', 'kk', 'k sec et tendu, sans souffle', '까'],
      ['ㄸ', 'tt', 't sec et tendu', '따'],
      ['ㅃ', 'pp', 'p sec et tendu', '빠'],
      ['ㅆ', 'ss', 's appuyé et tendu', '싸'],
      ['ㅉ', 'jj', 'tch sec et tendu', '짜'],
    ],
    words: [['커피', 'café'], ['토끼', 'lapin'], ['아파', 'j’ai mal'], ['차', 'thé ; voiture'], ['오빠', 'grand frère (dit par une femme)'], ['아빠', 'papa'], ['가짜', 'faux'], ['아까', 'tout à l’heure'], ['기차', 'train'], ['코', 'nez']],
    tip: 'Le mot 오빠, si fréquent dans les dramas, a un ㅃ tendu : « o-ppa », avec un p appuyé.',
  },
  {
    id: 'h5', title: 'Les voyelles composées', short: 'Voyelles composées',
    intro: [
      'Certaines voyelles combinent deux voyelles simples et se prononcent d’un seul souffle : ㅗ + ㅏ = ㅘ (wa), ㅜ + ㅓ = ㅝ (wo).',
    ],
    letters: [
      ['ㅘ', 'wa', 'oua de « ouate »', '와'],
      ['ㅙ', 'wae', 'ouè', '왜'],
      ['ㅚ', 'oe', 'ouè (comme ㅙ aujourd’hui)', '외'],
      ['ㅝ', 'wo', 'ouo ouvert', '워'],
      ['ㅞ', 'we', 'ouè', '웨'],
      ['ㅟ', 'wi', 'oui', '위'],
      ['ㅢ', 'ui', 'eu-i glissé ; souvent « i », et « é » quand il veut dire « de »', '의'],
    ],
    words: [['와!', 'waouh !'], ['왜?', 'pourquoi ?'], ['사과', 'pomme ; excuses'], ['회사', 'entreprise'], ['뭐?', 'quoi ?'], ['돼지', 'cochon'], ['귀', 'oreille'], ['의사', 'médecin'], ['줘', 'donne-moi']],
    tip: '왜? (pourquoi ?) et 뭐? (quoi ?) reviennent dans presque chaque dispute de drama.',
  },
  {
    id: 'h6', title: 'Les consonnes finales et la liaison', short: 'Finales',
    intro: [
      'Une consonne peut se placer en bas du bloc : c’est le 받침 (batchim). 한 = ㅎ + ㅏ + ㄴ.',
      'En fin de syllabe, il n’existe que sept sons : k, n, t, l, m, p, ng. Par exemple ㅅ, ㅈ, ㅊ, ㅌ, ㅎ se prononcent tous « t » : 옷 (vêtement) se dit « ot ».',
      'Quand la syllabe suivante commence par une voyelle (ㅇ), la consonne finale glisse vers elle, comme une liaison en français : 한국어 se dit « han-gu-geo », 맛있어 « ma-si-sseo ».',
    ],
    letters: [
      ['ㄱ', 'k', 'k retenu, sans relâcher', '악'],
      ['ㄴ', 'n', 'n', '안'],
      ['ㄷ', 't', 't retenu (aussi ㅅ ㅈ ㅊ ㅌ ㅎ)', '앋'],
      ['ㄹ', 'l', 'l', '알'],
      ['ㅁ', 'm', 'm, lèvres fermées', '암'],
      ['ㅂ', 'p', 'p retenu, lèvres fermées', '압'],
      ['ㅇ', 'ng', 'ng de « parking »', '앙'],
    ],
    words: [['밥', 'riz ; repas'], ['물', 'eau'], ['집', 'maison'], ['한국', 'Corée'], ['사랑', 'amour'], ['친구', 'ami'], ['김치', 'kimchi'], ['서울', 'Séoul'], ['옷', 'vêtement'], ['한국어', 'langue coréenne'], ['맛있어', 'c’est bon'], ['음악', 'musique']],
    tip: '사랑해 (je t’aime) : 사 + 랑 + 해, avec le « ng » de 랑 qui résonne dans le nez.',
  },
];
