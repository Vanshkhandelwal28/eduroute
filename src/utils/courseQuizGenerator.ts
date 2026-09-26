/**
 * Final course assessment — AI-generated MCQ / True-False / short answers.
 * Question count & timer scale with course durationDays.
 * Uses /api/buddy-chat when available; template fallback otherwise.
 */

import type { AiDesignedCourse } from './aiCourseStore';

export type QuizQuestionType = 'mcq' | 'true_false' | 'short';

export type QuizQuestion = {
  id: string;
  type: QuizQuestionType;
  prompt: string;
  /** MCQ options (4). Empty for true_false / short. */
  options: string[];
  /** Canonical answer: option index as string for mcq, "true"|"false", or short keyword */
  answer: string;
  /** Topic / skill this question tests (for gap report) */
  topic: string;
  explanation?: string;
};

export type QuizConfig = {
  questionCount: number;
  timerSeconds: number;
  passPercent: number;
};

/** Scale assessment size from course length. */
export function quizConfigForDays(days: number): QuizConfig {
  const d = Math.max(1, days || 15);
  if (d <= 15) {
    return { questionCount: 12, timerSeconds: 20 * 60, passPercent: 60 };
  }
  if (d <= 30) {
    return { questionCount: 16, timerSeconds: 30 * 60, passPercent: 60 };
  }
  if (d <= 60) {
    return { questionCount: 32, timerSeconds: 60 * 60, passPercent: 60 };
  }
  return { questionCount: 36, timerSeconds: 60 * 60, passPercent: 60 };
}

function topicPool(course: AiDesignedCourse): string[] {
  const fromTopics = course.topics.map((t) => t.title).filter(Boolean);
  const fromSkills = course.topics.flatMap((t) => t.skills || []);
  const interests = course.interests || [];
  const pool = [...fromTopics, ...fromSkills, ...interests].map((s) => String(s).trim()).filter(Boolean);
  return pool.length ? Array.from(new Set(pool)) : [course.field || course.title || 'General'];
}

/** Build mix: mostly MCQ + TF, fewer short answers (~15%). */
function planTypes(n: number): QuizQuestionType[] {
  const shortCount = Math.max(1, Math.min(4, Math.round(n * 0.12)));
  const tfCount = Math.max(2, Math.round(n * 0.28));
  const mcqCount = Math.max(1, n - shortCount - tfCount);
  const types: QuizQuestionType[] = [
    ...Array(mcqCount).fill('mcq'),
    ...Array(tfCount).fill('true_false'),
    ...Array(shortCount).fill('short'),
  ] as QuizQuestionType[];
  // mild shuffle
  for (let i = types.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [types[i], types[j]] = [types[j], types[i]];
  }
  return types.slice(0, n);
}

function templateQuestions(course: AiDesignedCourse, count: number): QuizQuestion[] {
  const topics = topicPool(course);
  const types = planTypes(count);
  const qs: QuizQuestion[] = [];

  for (let i = 0; i < types.length; i++) {
    const topic = topics[i % topics.length];
    const type = types[i];
    const id = `q-${i + 1}`;

    if (type === 'mcq') {
      qs.push({
        id,
        type: 'mcq',
        prompt: `In the context of "${topic}" from ${course.title}, which statement is most accurate?`,
        options: [
          `Core idea of ${topic} is applied correctly in real projects`,
          `${topic} is unrelated to ${course.field || 'this course'}`,
          `${topic} only matters for pure theory exams`,
          `${topic} should never be practiced with code`,
        ],
        answer: '0',
        topic,
        explanation: `Focus on practical understanding of ${topic}.`,
      });
    } else if (type === 'true_false') {
      const truth = i % 2 === 0;
      qs.push({
        id,
        type: 'true_false',
        prompt: truth
          ? `True or False: Studying "${topic}" helps you progress in ${course.title}.`
          : `True or False: "${topic}" has no relevance to ${course.title}.`,
        options: ['True', 'False'],
        answer: truth ? 'true' : 'false',
        topic,
        explanation: truth
          ? `${topic} is part of this course path.`
          : `${topic} is covered in this course — the statement is false.`,
      });
    } else {
      // short: expect a keyword from the topic title
      const keyword =
        topic
          .split(/[:\-–|,]/)
          .map((s) => s.trim())
          .find((s) => s.length > 2) || topic.split(/\s+/)[0] || 'practice';
      qs.push({
        id,
        type: 'short',
        prompt: `One-word (or short phrase): name a key focus area from the module "${topic}".`,
        options: [],
        answer: keyword.toLowerCase(),
        topic,
        explanation: `Accept answers related to: ${keyword}`,
      });
    }
  }
  return qs;
}

function extractJson(text: string): unknown | null {
  if (!text) return null;
  const cleaned = String(text)
    .replace(/```json\s*/gi, '')
    .replace(/```/g, '')
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    /* fall through */
  }
  const m = cleaned.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  if (m) {
    try {
      return JSON.parse(m[0]);
    } catch {
      return null;
    }
  }
  return null;
}

function normalizeAiQuestions(raw: unknown, course: AiDesignedCourse, count: number): QuizQuestion[] | null {
  const arr = Array.isArray(raw)
    ? raw
    : raw && typeof raw === 'object' && Array.isArray((raw as { questions?: unknown }).questions)
      ? (raw as { questions: unknown[] }).questions
      : null;
  if (!arr || !arr.length) return null;

  const topics = topicPool(course);
  const out: QuizQuestion[] = [];

  for (let i = 0; i < Math.min(count, arr.length); i++) {
    const q = arr[i] as Record<string, unknown>;
    if (!q || typeof q !== 'object') continue;
    let type = String(q.type || 'mcq').toLowerCase().replace(/-/g, '_') as QuizQuestionType;
    if (type !== 'mcq' && type !== 'true_false' && type !== 'short') type = 'mcq';

    const prompt = String(q.prompt || q.question || '').trim();
    if (!prompt) continue;

    const topic = String(q.topic || topics[i % topics.length]);
    const id = String(q.id || `q-${i + 1}`);

    if (type === 'mcq') {
      let options = Array.isArray(q.options) ? q.options.map(String) : [];
      while (options.length < 4) options.push(`Option ${options.length + 1}`);
      options = options.slice(0, 4);
      let answer = String(q.answer ?? '0');
      // allow letter A-D
      if (/^[A-Da-d]$/.test(answer)) answer = String(answer.toUpperCase().charCodeAt(0) - 65);
      const idx = Math.min(3, Math.max(0, parseInt(answer, 10) || 0));
      out.push({
        id,
        type: 'mcq',
        prompt,
        options,
        answer: String(idx),
        topic,
        explanation: q.explanation ? String(q.explanation) : undefined,
      });
    } else if (type === 'true_false') {
      let answer = String(q.answer ?? 'true').toLowerCase();
      if (answer === 't' || answer === 'yes' || answer === '1') answer = 'true';
      if (answer === 'f' || answer === 'no' || answer === '0') answer = 'false';
      if (answer !== 'true' && answer !== 'false') answer = 'true';
      out.push({
        id,
        type: 'true_false',
        prompt,
        options: ['True', 'False'],
        answer,
        topic,
        explanation: q.explanation ? String(q.explanation) : undefined,
      });
    } else {
      out.push({
        id,
        type: 'short',
        prompt,
        options: [],
        answer: String(q.answer || '').toLowerCase().trim() || topic.toLowerCase().split(/\s+/)[0],
        topic,
        explanation: q.explanation ? String(q.explanation) : undefined,
      });
    }
  }

  return out.length >= Math.min(8, count) ? out.slice(0, count) : null;
}

async function callBuddy(message: string, userId: string): Promise<string | null> {
  try {
    const res = await fetch('/api/buddy-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: userId || 'course-quiz', message, language: 'english' }),
    });
    const data = await res.json();
    if (!res.ok || !data?.ok || typeof data.reply !== 'string') return null;
    if (/limited mode|No AI key found/i.test(data.reply)) return null;
    return data.reply;
  } catch {
    return null;
  }
}

export async function generateCourseQuiz(
  course: AiDesignedCourse,
  userId?: string,
): Promise<{ questions: QuizQuestion[]; config: QuizConfig; source: 'ai' | 'template' }> {
  const config = quizConfigForDays(course.durationDays);
  const topics = topicPool(course).slice(0, 12);
  const types = planTypes(config.questionCount);
  const shortN = types.filter((t) => t === 'short').length;
  const tfN = types.filter((t) => t === 'true_false').length;
  const mcqN = types.filter((t) => t === 'mcq').length;

  const prompt =
    `You are an exam writer for EduRoute. Create a final assessment for this course.\n` +
    `Course: ${course.title}\n` +
    `Field: ${course.field}\n` +
    `Duration: ${course.durationDays} days\n` +
    `Summary: ${course.summary}\n` +
    `Topics/skills: ${topics.join('; ')}\n\n` +
    `Return ONLY valid JSON (no markdown) with shape:\n` +
    `{"questions":[{"id":"q1","type":"mcq|true_false|short","prompt":"...","options":["A","B","C","D"],"answer":"0","topic":"...","explanation":"..."}]}\n` +
    `Rules:\n` +
    `- Exactly ${config.questionCount} questions\n` +
    `- About ${mcqN} mcq (4 options, answer = index 0-3 as string)\n` +
    `- About ${tfN} true_false (answer "true" or "false")\n` +
    `- About ${shortN} short (one-word/short phrase answer, lowercase ok)\n` +
    `- Questions must test what was learned in the topics above\n` +
    `- Keep language clear for Indian students (English)\n`;

  const reply = await callBuddy(prompt, userId || 'course-quiz');
  if (reply) {
    const parsed = extractJson(reply);
    const normalized = normalizeAiQuestions(parsed, course, config.questionCount);
    if (normalized && normalized.length) {
      // pad if AI returned fewer
      if (normalized.length < config.questionCount) {
        const pad = templateQuestions(course, config.questionCount - normalized.length).map((q, i) => ({
          ...q,
          id: `pad-${i + 1}`,
        }));
        return { questions: [...normalized, ...pad].slice(0, config.questionCount), config, source: 'ai' };
      }
      return { questions: normalized, config, source: 'ai' };
    }
  }

  return {
    questions: templateQuestions(course, config.questionCount),
    config,
    source: 'template',
  };
}

/** Score a single answer. Short answers: fuzzy contains. */
export function scoreAnswer(q: QuizQuestion, userAnswer: string): boolean {
  const ua = String(userAnswer || '').trim().toLowerCase();
  if (!ua && q.type !== 'true_false') return false;

  if (q.type === 'mcq') {
    return ua === String(q.answer).toLowerCase();
  }
  if (q.type === 'true_false') {
    let a = ua;
    if (a === 't' || a === 'yes' || a === '1' || a === 'true') a = 'true';
    if (a === 'f' || a === 'no' || a === '0' || a === 'false') a = 'false';
    // also accept option labels
    if (a === 'true' || a === 'false') return a === q.answer;
    return false;
  }
  // short
  const expected = String(q.answer || '').toLowerCase().trim();
  if (!expected) return ua.length > 1;
  if (ua === expected) return true;
  if (ua.includes(expected) || expected.includes(ua)) return true;
  // token overlap
  const et = expected.split(/\s+/).filter(Boolean);
  const ut = ua.split(/\s+/).filter(Boolean);
  return et.some((t) => ut.includes(t) && t.length > 2);
}

export type QuizResult = {
  score: number;
  total: number;
  percent: number;
  passed: boolean;
  gapTopics: string[];
  wrongIds: string[];
};

export function evaluateQuiz(
  questions: QuizQuestion[],
  answers: Record<string, string>,
  passPercent = 60,
): QuizResult {
  let score = 0;
  const wrongIds: string[] = [];
  const gapSet = new Set<string>();

  for (const q of questions) {
    const ok = scoreAnswer(q, answers[q.id] ?? '');
    if (ok) score += 1;
    else {
      wrongIds.push(q.id);
      if (q.topic) gapSet.add(q.topic);
    }
  }

  const total = questions.length || 1;
  const percent = Math.round((score / total) * 100);
  return {
    score,
    total,
    percent,
    passed: percent >= passPercent,
    gapTopics: Array.from(gapSet),
    wrongIds,
  };
}
