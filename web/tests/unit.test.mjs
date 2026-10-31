// Logic tests: romanisation, comparison of what was said, subtitles parsing, spaced repetition, lesson data.
import test from 'node:test';
import assert from 'node:assert/strict';
import { romanize, judge, alignSyllables, decompose, compose, similarity } from '../js/hangul.js';
import { parseSubtitles } from '../js/podcasts.js';
import { review, newCard, cardKey } from '../js/srs.js';
import { LESSONS, HANGEUL, CAST, PAIRS } from '../js/data/lessons.js';

test('romanisation follows pronunciation', () => {
  const cases = {
    '안녕하세요': 'annyeonghaseyo', '감사합니다': 'gamsahamnida', '괜찮아': 'gwaenchana', '맛있어': 'masisseo',
    '같이': 'gachi', '좋아해': 'joahae', '좋다': 'jota', '없어': 'eopseo', '축하해': 'chukahae', '국물': 'gungmul',
    '신라': 'silla', '연락': 'yeollak', '설날': 'seollal', '종로': 'jongno', '한국어': 'hangugeo', '읽고': 'ilgo',
    '잘 먹겠습니다': 'jal meokgetseumnida', '어떡해': 'eotteokae', '몰라': 'molla', '싫어': 'sireo', '진짜?': 'jinjja?',
  };
  for (const [ko, rom] of Object.entries(cases)) assert.equal(romanize(ko), rom, ko);
});

test('syllables compose and decompose', () => {
  assert.deepEqual(decompose('한'), { cho: 'ㅎ', jung: 'ㅏ', jong: 'ㄴ' });
  assert.equal(compose('ㅎ', 'ㅏ', 'ㄴ'), '한');
  assert.equal(decompose('a'), null);
});

test('judging what was said', () => {
  assert.equal(judge(['안녕하세요'], ['안녕하세요']).verdict, 'great');
  assert.equal(judge(['안녕 하세요.'], ['안녕하세요']).verdict, 'great', 'spaces and punctuation ignored');
  assert.notEqual(judge(['감사니다'], ['감사합니다']).verdict, 'great');
  assert.equal(judge(['사랑해'], ['감사합니다']).verdict, 'miss');
  assert.equal(judge(['아뇨', '아니요'], ['아니요']).verdict, 'great', 'best alternative wins');
  assert.ok(similarity('가', '카') > similarity('가', '나무'));
  const a = alignSyllables('감사니다', '감사합니다');
  assert.deepEqual(a.filter((x) => !x.ok).map((x) => x.text), ['합']);
});

test('subtitles: SRT, timed lines, plain text', () => {
  const srt = parseSubtitles('1\n00:00:01,200 --> 00:00:03,000\n<i>지우야, 어디 가?</i>\n\n2\n00:00:03,400 --> 00:00:05,800\n나 집에 가.');
  assert.equal(srt.length, 2);
  assert.equal(srt[0].ko, '지우야, 어디 가?');
  assert.equal(srt[1].start, 3.4);
  const timed = parseSubtitles('0:01\n안녕하세요\n0:04 반가워요');
  assert.deepEqual(timed.map((l) => l.start), [1, 4]);
  const plain = parseSubtitles('배고파. 라면 먹자! Hello');
  assert.deepEqual(plain.map((l) => l.ko), ['배고파.', '라면 먹자!']);
});

test('spaced repetition moves cards forward', () => {
  const c = newCard({ ko: '진짜' }, 0);
  const r1 = review(c, 2, 0);
  assert.equal(r1.interval, 1);
  assert.equal(review(r1, 0, 0).interval, 0);
  assert.equal(cardKey(' 진짜? '), '진짜');
});

test('lesson data is complete and consistent', () => {
  assert.equal(LESSONS.length, 25);
  assert.equal(HANGEUL.length, 6);
  const ids = new Set();
  for (const l of LESSONS) {
    assert.ok(!ids.has(l.id)); ids.add(l.id);
    assert.ok(l.words.length >= 6, `${l.id} words`);
    assert.ok(l.scene.lines.length >= 6, `${l.id} scene`);
    assert.ok(l.speak.length >= 5, `${l.id} speak`);
    assert.ok(l.grammar.ex.length >= 2, `${l.id} examples`);
    for (const x of [...l.words, ...l.scene.lines, ...l.grammar.ex]) {
      assert.match(x.ko, /[가-힣]/, `${l.id} korean`);
      assert.ok(x.fr, `${l.id} french for ${x.ko}`);
    }
    for (const x of l.scene.lines) assert.ok(CAST[x.who], `${l.id} cast ${x.who}`);
    for (const p of l.speak) for (const a of p.answers) assert.match(a, /[가-힣]/, `${l.id} answer`);
  }
  for (const p of PAIRS) for (const s of p.sets) assert.ok(s.length >= 2);
});
