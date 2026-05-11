function formatDateKey(date = new Date(), timeZone = 'UTC') {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .formatToParts(date)
    .reduce((acc, part) => {
      if (part.type !== 'literal') acc[part.type] = part.value;
      return acc;
    }, {});

  return `${parts.year}-${parts.month}-${parts.day}`;
}

function previousDateKey(dateKey) {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

function pairKey(userIdA, userIdB) {
  return [userIdA, userIdB].sort().join(':');
}

function displayName(snapshot, userId) {
  return snapshot?.names?.[userId] || `<@${userId}>`;
}

function clonePair(pair) {
  return {
    ...pair,
    members: [...pair.members],
  };
}

class StreakManager {
  constructor(snapshot = {}) {
    this.snapshot = {
      pairs: snapshot.pairs || {},
      users: snapshot.users || {},
      names: snapshot.names || {},
    };
  }

  toJSON() {
    return this.snapshot;
  }

  touchUser(userId, name) {
    if (!userId) return;
    this.snapshot.users[userId] ||= { total: 0, partners: {} };
    if (name) this.snapshot.names[userId] = name;
  }

  recordStreak({ authorId, authorName, partnerId, partnerName, at = new Date(), timeZone = 'UTC' }) {
    if (!authorId || !partnerId || authorId === partnerId) {
      return { changed: false, reason: 'invalid_partner' };
    }

    this.touchUser(authorId, authorName);
    this.touchUser(partnerId, partnerName);

    const today = formatDateKey(at, timeZone);
    const yesterday = previousDateKey(today);
    const key = pairKey(authorId, partnerId);
    const pair = this.snapshot.pairs[key] || {
      members: [authorId, partnerId].sort(),
      current: 0,
      best: 0,
      lastDate: null,
      total: 0,
    };

    if (pair.lastDate === today) {
      this.snapshot.pairs[key] = pair;
      return { changed: false, reason: 'already_counted_today', pair: clonePair(pair), today };
    }

    pair.current = pair.lastDate === yesterday ? pair.current + 1 : 1;
    pair.best = Math.max(pair.best, pair.current);
    pair.total += 1;
    pair.lastDate = today;

    this.snapshot.pairs[key] = pair;

    for (const userId of pair.members) {
      this.snapshot.users[userId] ||= { total: 0, partners: {} };
      this.snapshot.users[userId].total += 1;
      const otherId = pair.members.find((id) => id !== userId);
      this.snapshot.users[userId].partners[otherId] = pair.current;
    }

    return { changed: true, pair: clonePair(pair), today };
  }

  getUserInfo(userId) {
    const user = this.snapshot.users[userId] || { total: 0, partners: {} };
    const partners = Object.entries(user.partners)
      .map(([partnerId, current]) => ({
        partnerId,
        partnerName: displayName(this.snapshot, partnerId),
        current,
      }))
      .sort((a, b) => b.current - a.current);

    return {
      userId,
      name: displayName(this.snapshot, userId),
      total: user.total,
      partners,
    };
  }

  getLeaderboard(limit = 10) {
    return Object.entries(this.snapshot.pairs)
      .map(([key, pair]) => ({ key, ...pair }))
      .sort((a, b) => b.current - a.current || b.best - a.best)
      .slice(0, limit);
  }
}

module.exports = {
  StreakManager,
  formatDateKey,
  pairKey,
  previousDateKey,
};
