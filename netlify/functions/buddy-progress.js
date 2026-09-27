const { connectDatabase, UserProgress } = require('./_lib/database');

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    },
    body: JSON.stringify(body),
  };
}

const DEFAULT_PROGRESS = {
  points: 0,
  level: 1,
  achievements: ['Welcome to Buddy 🚀'],
  weeklyChallenges: [
    'Complete 3 DSA problems',
    'Ship 1 portfolio section update',
    'Apply to 2 internships',
  ],
  missingSkills: [],
  preferredLanguage: 'english',
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(200, { ok: true });

  try {
    let userId;
    try {
      userId = event.queryStringParameters?.userId || JSON.parse(event.body || '{}')?.userId;
    } catch {
      userId = event.queryStringParameters?.userId;
    }
    if (!userId) return json(400, { ok: false, error: 'userId is required.' });

    // Graceful offline when Mongo is not configured (common on fresh Netlify deploys)
    if (!process.env.MONGODB_URI) {
      console.warn('buddy-progress: MONGODB_URI missing — returning defaults');
      return json(200, {
        ok: true,
        progress: DEFAULT_PROGRESS,
        history: [],
        offline: true,
      });
    }

    try {
      await connectDatabase();
    } catch (dbErr) {
      console.warn('buddy-progress: DB connect failed — returning defaults:', dbErr.message);
      return json(200, {
        ok: true,
        progress: DEFAULT_PROGRESS,
        history: [],
        offline: true,
      });
    }

    const profile = await UserProgress.findOneAndUpdate(
      { userId },
      {
        $setOnInsert: {
          userId,
          weeklyChallenges: DEFAULT_PROGRESS.weeklyChallenges,
          achievements: DEFAULT_PROGRESS.achievements,
        },
      },
      { upsert: true, new: true }
    );

    if (event.httpMethod === 'POST') {
      try {
        const { missingSkills = [] } = JSON.parse(event.body || '{}');
        profile.missingSkills = missingSkills;
        await profile.save();
      } catch (saveErr) {
        console.warn('buddy-progress POST save failed:', saveErr.message);
      }
    }

    return json(200, {
      ok: true,
      progress: {
        points: profile.points,
        level: profile.level,
        achievements: profile.achievements,
        weeklyChallenges: profile.weeklyChallenges,
        missingSkills: profile.missingSkills,
        preferredLanguage: profile.preferredLanguage,
      },
      history: (profile.chatHistory || []).slice(-20),
    });
  } catch (error) {
    console.error('buddy-progress error', error);
    // Never 500 for progress — client has localStorage fallback; keep UX clean
    return json(200, {
      ok: true,
      progress: DEFAULT_PROGRESS,
      history: [],
      offline: true,
      error: error.message || 'Failed to fetch progress (served defaults).',
    });
  }
};
