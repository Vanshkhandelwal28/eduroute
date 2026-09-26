const { generateBuddyReply } = require('./_lib/aiClient');
const { buddyEnvSummary } = require('./_lib/envCheck');

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'POST,OPTIONS',
    },
    body: JSON.stringify(body),
  };
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(200, { ok: true });
  if (event.httpMethod !== 'POST') return json(405, { ok: false, error: 'Method not allowed' });

  try {
    const payload = JSON.parse(event.body || '{}');
    const { userId, message, language = 'english' } = payload;

    if (!userId || typeof message !== 'string' || !message.trim()) {
      return json(400, { ok: false, error: 'userId and message are required.' });
    }

    if (message.length > 2000) {
      return json(413, { ok: false, error: 'Please keep your message under 2000 characters.' });
    }

    let profile = null;
    let points = 0;
    let level = 1;
    let recentMessages = [{ role: 'user', content: message.trim() }];

    try {
      const { connectDatabase, UserProgress } = require('./_lib/database');
      await connectDatabase();
      profile = await UserProgress.findOneAndUpdate(
        { userId },
        { $setOnInsert: { userId, weeklyChallenges: ['Build 1 mini project this week'] } },
        { upsert: true, new: true }
      );
      profile.chatHistory = profile.chatHistory || [];
      profile.chatHistory.push({ role: 'user', text: message.trim() });
      recentMessages = profile.chatHistory.slice(-12).map((entry) => ({
        role: entry.role === 'assistant' ? 'assistant' : 'user',
        content: entry.text,
      }));
      points = profile.points || 0;
      level = profile.level || 1;
    } catch (dbErr) {
      console.warn('Buddy DB unavailable, answering without persistence:', dbErr.message);
    }

    const envSnap = buddyEnvSummary();
    console.log('[buddy-chat] env', JSON.stringify(envSnap));

    const { reply: aiReply, usedWebSearch = false, sources = [] } = await generateBuddyReply({
      messages: recentMessages,
      language,
    });

    const pointsEarned = usedWebSearch ? 8 : 5;
    const newPoints = points + pointsEarned;
    const newLevel = Math.max(1, Math.floor(newPoints / 100) + 1);

    if (profile) {
      try {
        profile.points = newPoints;
        profile.level = newLevel;
        profile.preferredLanguage = language;
        profile.chatHistory.push({ role: 'assistant', text: aiReply });
        if (profile.chatHistory.length > 50) {
          profile.chatHistory = profile.chatHistory.slice(-50);
        }
        await profile.save();
      } catch (saveErr) {
        console.warn('Buddy progress save failed:', saveErr.message);
      }
    }

    const limited =
      typeof aiReply === 'string' && /limited mode|No AI key found/i.test(aiReply);

    return json(200, {
      ok: true,
      reply: aiReply,
      usedWebSearch,
      sources,
      gamification: {
        points: newPoints,
        level: newLevel,
        pointsEarned,
      },
      ...(limited ? { env: envSnap } : {}),
    });
  } catch (error) {
    console.error('buddy-chat error', error);
    return json(500, {
      ok: false,
      error: error.message || 'Failed to process Buddy chat.',
      env: buddyEnvSummary(),
    });
  }
};
