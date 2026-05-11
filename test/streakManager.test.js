const assert = require('node:assert/strict');
const test = require('node:test');
const { StreakManager, formatDateKey, pairKey } = require('../src/streakManager');

test('pair keys are stable no matter who starts the streak', () => {
  assert.equal(pairKey('200', '100'), '100:200');
  assert.equal(pairKey('100', '200'), '100:200');
});

test('records one streak per pair per day', () => {
  const manager = new StreakManager();
  const first = manager.recordStreak({
    authorId: '100',
    authorName: 'Aksa',
    partnerId: '200',
    partnerName: 'Dede',
    at: new Date('2026-05-11T07:00:00Z'),
  });
  const duplicate = manager.recordStreak({
    authorId: '200',
    partnerId: '100',
    at: new Date('2026-05-11T20:00:00Z'),
  });

  assert.equal(first.changed, true);
  assert.equal(first.pair.current, 1);
  assert.equal(duplicate.changed, false);
  assert.equal(duplicate.reason, 'already_counted_today');
});

test('continues consecutive days and resets missed days', () => {
  const manager = new StreakManager();

  manager.recordStreak({ authorId: '1', partnerId: '2', at: new Date('2026-05-10T00:00:00Z') });
  const dayTwo = manager.recordStreak({ authorId: '1', partnerId: '2', at: new Date('2026-05-11T00:00:00Z') });
  const afterMiss = manager.recordStreak({ authorId: '1', partnerId: '2', at: new Date('2026-05-13T00:00:00Z') });

  assert.equal(dayTwo.pair.current, 2);
  assert.equal(dayTwo.pair.best, 2);
  assert.equal(afterMiss.pair.current, 1);
  assert.equal(afterMiss.pair.best, 2);
});

test('formats date keys in a configured timezone', () => {
  const date = new Date('2026-05-11T01:00:00Z');
  assert.equal(formatDateKey(date, 'UTC'), '2026-05-11');
  assert.equal(formatDateKey(date, 'America/Los_Angeles'), '2026-05-10');
});
