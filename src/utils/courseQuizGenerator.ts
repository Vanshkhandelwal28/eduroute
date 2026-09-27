/**
 * Final course assessment — AI-generated MCQ / True-False / short answers.
 * Primary: /api/course-quiz (Gemini → Groq). Fallback: buddy-chat, then knowledge banks.
 * MCQ options are always shuffled so the correct answer is not always A.
 */

import type { AiDesignedCourse } from './aiCourseStore';

export type QuizQuestionType = 'mcq' | 'true_false' | 'short';

export type QuizQuestion = {
  id: string;
  type: QuizQuestionType;
  prompt: string;
  options: string[];
  answer: string;
  topic: string;
  explanation?: string;
};

export type QuizConfig = {
  questionCount: number;
  timerSeconds: number;
  passPercent: number;
};

/** Shuffle MCQ options so the correct answer is not always index 0 (A). */
function shuffleMcq(q: QuizQuestion): QuizQuestion {
  if (q.type !== 'mcq' || !q.options || q.options.length < 2) return q;
  const correctIdx = Math.min(q.options.length - 1, Math.max(0, parseInt(String(q.answer), 10) || 0));
  const correctText = q.options[correctIdx];
  const opts = [...q.options];
  for (let i = opts.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [opts[i], opts[j]] = [opts[j], opts[i]];
  }
  const newIdx = opts.indexOf(correctText);
  return { ...q, options: opts, answer: String(newIdx >= 0 ? newIdx : 0) };
}

function shuffleQuiz(questions: QuizQuestion[]): QuizQuestion[] {
  return questions.map(shuffleMcq);
}

export function quizConfigForDays(days: number): QuizConfig {
  const d = Math.max(1, days || 15);
  if (d <= 15) return { questionCount: 12, timerSeconds: 20 * 60, passPercent: 60 };
  if (d <= 30) return { questionCount: 16, timerSeconds: 30 * 60, passPercent: 60 };
  if (d <= 60) return { questionCount: 32, timerSeconds: 60 * 60, passPercent: 60 };
  return { questionCount: 36, timerSeconds: 60 * 60, passPercent: 60 };
}

function topicPool(course: AiDesignedCourse): string[] {
  const fromTopics = course.topics.map((t) => t.title).filter(Boolean);
  const fromSkills = course.topics.flatMap((t) => t.skills || []);
  const interests = course.interests || [];
  const pool = [...fromTopics, ...fromSkills, ...interests].map((s) => String(s).trim()).filter(Boolean);
  return pool.length ? Array.from(new Set(pool)) : [course.field || course.title || 'General'];
}

function cleanTopicLabel(raw: string): string {
  return String(raw || '')
    .replace(/^(Foundations|Core concepts|Hands-on practice|Projects|Interview\s*\/?\s*placement prep)\s*:\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function planTypes(n: number): QuizQuestionType[] {
  const shortCount = Math.max(1, Math.min(4, Math.round(n * 0.12)));
  const tfCount = Math.max(2, Math.round(n * 0.28));
  const mcqCount = Math.max(1, n - shortCount - tfCount);
  const types: QuizQuestionType[] = [
    ...Array(mcqCount).fill('mcq'),
    ...Array(tfCount).fill('true_false'),
    ...Array(shortCount).fill('short'),
  ] as QuizQuestionType[];
  for (let i = types.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [types[i], types[j]] = [types[j], types[i]];
  }
  return types.slice(0, n);
}

type BankQ = { prompt: string; options: string[]; answer: string; explanation?: string; type?: QuizQuestionType };

const KNOWLEDGE_BANKS: { keys: string[]; questions: BankQ[] }[] = [
  {
    keys: ['dynamic programming', 'dp', 'memoization'],
    questions: [
      { prompt: 'What is the core idea of Dynamic Programming?', options: ['Break a problem into overlapping subproblems and reuse their results', 'Always use recursion without storing results', 'Sort the input before every operation', 'Only work on graphs with negative edges'], answer: '0', explanation: 'DP reuses overlapping subproblem results.' },
      { prompt: 'Memoization in DP means:', options: ['Caching results of expensive function calls', 'Deleting unused variables', 'Sorting memo notes alphabetically', 'Running the algorithm twice for verification'], answer: '0' },
      { prompt: 'True or False: Optimal substructure is a key property required for DP.', options: ['True', 'False'], answer: 'true', type: 'true_false' },
      { prompt: 'Name the DP technique that fills a table bottom-up.', options: [], answer: 'tabulation', type: 'short' },
    ],
  },
  {
    keys: ['array', 'hashing', 'hash'],
    questions: [
      { prompt: 'Average time complexity of lookup in a well-designed hash map is:', options: ['O(1)', 'O(n)', 'O(log n)', 'O(n²)'], answer: '0' },
      { prompt: 'A collision in hashing occurs when:', options: ['Two keys map to the same bucket', 'The array is full of zeros', 'You sort the hash table', 'The key is a negative number'], answer: '0' },
      { prompt: 'True or False: Arrays provide O(1) random access by index.', options: ['True', 'False'], answer: 'true', type: 'true_false' },
    ],
  },
  {
    keys: ['tree', 'graph', 'bfs', 'dfs'],
    questions: [
      { prompt: 'BFS typically uses which data structure?', options: ['Queue', 'Stack only', 'Priority queue of heaps only', 'Hash set only'], answer: '0' },
      { prompt: 'DFS is commonly implemented with:', options: ['Stack or recursion', 'Only a queue', 'Only a hash map', 'Bubble sort'], answer: '0' },
      { prompt: 'True or False: A binary tree node can have at most two children.', options: ['True', 'False'], answer: 'true', type: 'true_false' },
    ],
  },
  {
    keys: ['python'],
    questions: [
      { prompt: 'Which keyword defines a function in Python?', options: ['def', 'function', 'func', 'lambda only'], answer: '0' },
      { prompt: 'What does list.append(x) do?', options: ['Adds x to the end of the list', 'Removes x from the list', 'Sorts the list', 'Creates a new empty list'], answer: '0' },
      { prompt: 'True or False: Python lists are mutable.', options: ['True', 'False'], answer: 'true', type: 'true_false' },
      { prompt: 'Name the Python structure for key-value pairs.', options: [], answer: 'dict', type: 'short' },
    ],
  },
  {
    keys: ['c++', 'cpp', 'cplusplus'],
    questions: [
      { prompt: 'Which header is typically needed for std::cout?', options: ['iostream', 'stdio.h only', 'math.h', 'string only'], answer: '0' },
      { prompt: 'A pointer in C++ stores:', options: ['A memory address', 'Only the value 0', 'A function name as text', 'A compile-time constant only'], answer: '0' },
      { prompt: 'True or False: vector in C++ can grow dynamically.', options: ['True', 'False'], answer: 'true', type: 'true_false' },
    ],
  },
  {
    keys: ['react', 'frontend', 'javascript', 'js'],
    questions: [
      { prompt: 'In React, what does useState return?', options: ['A state value and a setter function', 'Only a DOM node', 'A CSS class name', 'A database connection'], answer: '0' },
      { prompt: 'JSX allows you to:', options: ['Write HTML-like syntax in JavaScript', 'Compile C++ to the browser', 'Replace the entire Node runtime', 'Disable the virtual DOM permanently'], answer: '0' },
      { prompt: 'True or False: Props in React are read-only for the child component.', options: ['True', 'False'], answer: 'true', type: 'true_false' },
    ],
  },
  {
    keys: ['node', 'express', 'backend', 'api', 'rest'],
    questions: [
      { prompt: 'HTTP status 404 means:', options: ['Resource not found', 'Success', 'Server crash only', 'Redirect permanently'], answer: '0' },
      { prompt: 'REST APIs commonly use which format for payloads?', options: ['JSON', 'Only binary images', 'Only CSV', 'Only XML with no JSON'], answer: '0' },
      { prompt: 'True or False: Express is a popular Node.js web framework.', options: ['True', 'False'], answer: 'true', type: 'true_false' },
    ],
  },
  {
    keys: ['sql', 'database', 'postgres', 'mysql'],
    questions: [
      { prompt: 'SELECT is used to:', options: ['Read rows from tables', 'Delete the database server', 'Compile C code', 'Start a Docker container'], answer: '0' },
      { prompt: 'A PRIMARY KEY must be:', options: ['Unique and not null', 'Always nullable', 'Always a float', 'Duplicated in every row'], answer: '0' },
      { prompt: 'True or False: JOIN combines rows from related tables.', options: ['True', 'False'], answer: 'true', type: 'true_false' },
    ],
  },
  {
    keys: ['docker', 'kubernetes', 'k8s', 'devops', 'ci/cd', 'pipeline'],
    questions: [
      { prompt: 'A Docker container packages:', options: ['App code with its runtime dependencies', 'Only the host OS kernel source', 'Only CSS files', 'Only a spreadsheet'], answer: '0' },
      { prompt: 'CI/CD primarily helps teams:', options: ['Automate build, test, and deploy', 'Replace all unit tests with screenshots', 'Avoid version control', 'Disable monitoring'], answer: '0' },
      { prompt: 'True or False: Kubernetes orchestrates containers across a cluster.', options: ['True', 'False'], answer: 'true', type: 'true_false' },
    ],
  },
  {
    keys: ['system design', 'scalability', 'cache', 'cdn'],
    questions: [
      { prompt: 'A CDN is mainly used to:', options: ['Serve static content closer to users', 'Replace the primary database', 'Compile TypeScript', 'Encrypt passwords only'], answer: '0' },
      { prompt: 'Horizontal scaling means:', options: ['Adding more machines', 'Only upgrading one CPU', 'Deleting indexes', 'Reducing RAM deliberately'], answer: '0' },
      { prompt: 'True or False: Caching can reduce load on the primary database.', options: ['True', 'False'], answer: 'true', type: 'true_false' },
    ],
  },
  {
    keys: ['security', 'owasp', 'cyber', 'auth', 'jwt', 'oauth'],
    questions: [
      { prompt: 'OWASP Top 10 catalogs:', options: ['Common web application security risks', 'CPU benchmark scores', 'CSS color names', 'Git commit messages'], answer: '0' },
      { prompt: 'JWT is commonly used for:', options: ['Stateless authentication tokens', 'Storing large video files', 'Compiling Java', 'DNS resolution only'], answer: '0' },
      { prompt: 'True or False: SQL injection is a common web vulnerability.', options: ['True', 'False'], answer: 'true', type: 'true_false' },
    ],
  },
  {
    keys: ['data', 'analytics', 'pandas', 'eda', 'visualization'],
    questions: [
      { prompt: 'EDA typically stands for:', options: ['Exploratory Data Analysis', 'Encrypted Disk Array', 'External Device Adapter', 'Empty Data Archive'], answer: '0' },
      { prompt: 'Pandas is mainly used for:', options: ['Tabular data analysis in Python', '3D game rendering', 'Kernel development', 'Writing assembly only'], answer: '0' },
      { prompt: 'True or False: A histogram is useful to see value distributions.', options: ['True', 'False'], answer: 'true', type: 'true_false' },
    ],
  },
  {
    keys: ['algorithm', 'dsa', 'complexity', 'big o', 'sorting'],
    questions: [
      { prompt: 'Binary search requires the input to be:', options: ['Sorted', 'A graph', 'Unsorted always', 'A hash set only'], answer: '0' },
      { prompt: 'Time complexity of binary search on a sorted array is:', options: ['O(log n)', 'O(n²)', 'O(n!)', 'O(1) always regardless of n'], answer: '0' },
      { prompt: 'True or False: Big-O describes how runtime grows with input size.', options: ['True', 'False'], answer: 'true', type: 'true_false' },
    ],
  },
  {
    keys: ['unit testing', 'integration testing', 'postman', 'debugging', 'test'],
    questions: [
      { prompt: 'Unit tests typically focus on:', options: ['Isolated functions or modules', 'Only the production database', 'Manual UI screenshots only', 'DNS configuration'], answer: '0' },
      { prompt: 'Integration tests verify:', options: ['How multiple components work together', 'Only CSS pixel values', 'Compiler flags', 'Keyboard layout'], answer: '0' },
      { prompt: 'True or False: Postman can send HTTP requests to test APIs.', options: ['True', 'False'], answer: 'true', type: 'true_false' },
      { prompt: 'Name a common assertion library used with JS tests.', options: [], answer: 'jest', type: 'short' },
    ],
  },
];

function bankForTopic(topic: string): BankQ[] {
  const hay = topic.toLowerCase();
  for (const bank of KNOWLEDGE_BANKS) {
    if (bank.keys.some((k) => hay.includes(k))) return bank.questions;
  }
  return [];
}

function templateQuestions(course: AiDesignedCourse, count: number): QuizQuestion[] {
  const topics = topicPool(course).map(cleanTopicLabel);
  const types = planTypes(count);
  const qs: QuizQuestion[] = [];
  const usedPrompts = new Set<string>();
  for (let i = 0; i < types.length; i++) {
    const topic = topics[i % topics.length] || course.field || 'this course';
    const type = types[i];
    const id = `q-${i + 1}`;
    const bank = bankForTopic(topic);
    let chosen: BankQ | null = null;
    for (const b of bank) {
      const t = (b.type || 'mcq') as QuizQuestionType;
      if ((t === type || (type === 'mcq' && !b.type)) && !usedPrompts.has(b.prompt)) {
        chosen = b;
        usedPrompts.add(b.prompt);
        break;
      }
    }
    if (!chosen) {
      for (const b of bank) {
        if (!usedPrompts.has(b.prompt)) {
          chosen = b;
          usedPrompts.add(b.prompt);
          break;
        }
      }
    }
    if (chosen) {
      const qType = (chosen.type || type) as QuizQuestionType;
      qs.push({
        id,
        type: qType,
        prompt: chosen.prompt,
        options: qType === 'true_false' ? ['True', 'False'] : qType === 'short' ? [] : chosen.options.slice(0, 4),
        answer: chosen.answer,
        topic,
        explanation: chosen.explanation,
      });
      continue;
    }
    if (type === 'mcq') {
      qs.push({
        id,
        type: 'mcq',
        prompt: `Which practice best helps you master ${topic}?`,
        options: [
          `Build small projects and solve problems using ${topic}`,
          `Only memorize definitions without applying ${topic}`,
          `Avoid coding exercises related to ${topic}`,
          `Skip ${topic} entirely for theory-only study`,
        ],
        answer: '0',
        topic,
      });
    } else if (type === 'true_false') {
      const truth = i % 2 === 0;
      qs.push({
        id,
        type: 'true_false',
        prompt: truth
          ? `True or False: Understanding ${topic} is useful for software engineering roles.`
          : `True or False: You can skip all practice on ${topic} and still be interview-ready.`,
        options: ['True', 'False'],
        answer: truth ? 'true' : 'false',
        topic,
      });
    } else {
      const keyword =
        topic
          .split(/[:\-–|,]/)
          .map((s) => s.trim())
          .find((s) => s.length > 2) ||
        topic.split(/\s+/).find((s) => s.length > 3) ||
        topic;
      qs.push({
        id,
        type: 'short',
        prompt: `Name one important concept or technique from ${topic}.`,
        options: [],
        answer: keyword.toLowerCase(),
        topic,
      });
    }
  }
  return qs;
}

function extractJson(text: string): unknown | null {
  if (!text) return null;
  const cleaned = String(text).replace(/```json\s*/gi, '').replace(/```/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    /* */
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
  const topics = topicPool(course).map(cleanTopicLabel);
  const out: QuizQuestion[] = [];
  for (let i = 0; i < Math.min(count, arr.length); i++) {
    const q = arr[i] as Record<string, unknown>;
    if (!q || typeof q !== 'object') continue;
    let type = String(q.type || 'mcq').toLowerCase().replace(/-/g, '_') as QuizQuestionType;
    if (type !== 'mcq' && type !== 'true_false' && type !== 'short') type = 'mcq';
    const prompt = String(q.prompt || q.question || '').trim();
    if (!prompt || prompt.length < 12) continue;
    if (/which statement is most accurate\?/i.test(prompt) && /in the context of/i.test(prompt)) continue;
    const topic = cleanTopicLabel(String(q.topic || topics[i % topics.length]));
    const id = String(q.id || `q-${i + 1}`);
    if (type === 'mcq') {
      let options = Array.isArray(q.options) ? q.options.map(String) : [];
      while (options.length < 4) options.push(`Option ${options.length + 1}`);
      options = options.slice(0, 4);
      let answer = String(q.answer ?? '0');
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
  return out.length >= Math.min(4, Math.max(3, Math.floor(count * 0.4))) ? out.slice(0, count) : null;
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

async function callCourseQuizApi(
  course: AiDesignedCourse,
  topics: string[],
  questionCount: number,
): Promise<unknown | null> {
  const body = JSON.stringify({
    course: {
      title: course.title,
      field: course.field,
      durationDays: course.durationDays,
      summary: course.summary,
      interests: course.interests || [],
    },
    topics,
    questionCount,
  });
  const urls = ['/api/course-quiz', '/.netlify/functions/course-quiz'];
  for (const url of urls) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });
      const data = await res.json().catch(() => null);
      if (!data) continue;
      if (data.ok && data.data) {
        if (data.data.questions) return data.data;
        return data.data;
      }
      if (data.ok && Array.isArray(data.questions)) return { questions: data.questions };
      console.warn('[course-quiz]', url, data?.error || data?.source || res.status, data?.errors);
    } catch (e) {
      console.warn('[course-quiz] fetch failed', url, e);
    }
  }
  return null;
}

function buildQuizPrompt(
  course: AiDesignedCourse,
  topics: string[],
  config: QuizConfig,
  mcqN: number,
  tfN: number,
  shortN: number,
): string {
  const topicLines = course.topics
    .slice(0, 10)
    .map((t, i) => `${i + 1}. ${cleanTopicLabel(t.title)} — ${(t.description || '').slice(0, 80)}`)
    .join('\n');
  return (
    `You are an expert exam writer for a software/tech course on EduRoute.\n` +
    `Write a FINAL ASSESSMENT quiz that tests real understanding (not generic filler).\n\n` +
    `Course title: ${course.title}\nField: ${course.field}\nDuration: ${course.durationDays} days\n` +
    `Modules:\n${topicLines || topics.join(', ')}\n\n` +
    `Return ONLY valid JSON (no markdown): {"questions":[{"id":"q1","type":"mcq","prompt":"...","options":["optA","optB","optC","optD"],"answer":"2","topic":"...","explanation":"..."}]}\n` +
    `Exactly ${config.questionCount} questions (~${mcqN} mcq, ~${tfN} true_false, ~${shortN} short).\n` +
    `MCQ answer is INDEX "0"|"1"|"2"|"3" — put correct option at a RANDOM position, not always first.\n` +
    `Specific knowledge questions only. Never write "In the context of X, which statement is most accurate?"\n`
  );
}

export async function generateCourseQuiz(
  course: AiDesignedCourse,
  userId?: string,
): Promise<{ questions: QuizQuestion[]; config: QuizConfig; source: 'ai' | 'template' }> {
  const config = quizConfigForDays(course.durationDays);
  const topics = topicPool(course).map(cleanTopicLabel).slice(0, 12);
  const types = planTypes(config.questionCount);
  const shortN = types.filter((t) => t === 'short').length;
  const tfN = types.filter((t) => t === 'true_false').length;
  const mcqN = types.filter((t) => t === 'mcq').length;

  const apiData = await callCourseQuizApi(course, topics, config.questionCount);
  if (apiData) {
    const normalized = normalizeAiQuestions(apiData, course, config.questionCount);
    if (normalized?.length) {
      if (normalized.length < config.questionCount) {
        const pad = templateQuestions(course, config.questionCount - normalized.length).map((q, i) => ({
          ...q,
          id: `pad-${i + 1}`,
        }));
        return {
          questions: shuffleQuiz([...normalized, ...pad].slice(0, config.questionCount)),
          config,
          source: 'ai',
        };
      }
      return { questions: shuffleQuiz(normalized), config, source: 'ai' };
    }
  }

  const prompt = buildQuizPrompt(course, topics, config, mcqN, tfN, shortN);
  for (let attempt = 0; attempt < 2; attempt++) {
    const reply = await callBuddy(
      attempt === 0 ? prompt : prompt + '\n\nReturn ONLY the JSON object.',
      userId || 'course-quiz',
    );
    if (!reply) continue;
    const normalized = normalizeAiQuestions(extractJson(reply), course, config.questionCount);
    if (normalized?.length) {
      if (normalized.length < config.questionCount) {
        const pad = templateQuestions(course, config.questionCount - normalized.length).map((q, i) => ({
          ...q,
          id: `pad-${i + 1}`,
        }));
        return {
          questions: shuffleQuiz([...normalized, ...pad].slice(0, config.questionCount)),
          config,
          source: 'ai',
        };
      }
      return { questions: shuffleQuiz(normalized), config, source: 'ai' };
    }
  }

  return {
    questions: shuffleQuiz(templateQuestions(course, config.questionCount)),
    config,
    source: 'template',
  };
}

export function scoreAnswer(q: QuizQuestion, userAnswer: string): boolean {
  const ua = String(userAnswer || '').trim().toLowerCase();
  if (!ua && q.type !== 'true_false') return false;
  if (q.type === 'mcq') return ua === String(q.answer).toLowerCase();
  if (q.type === 'true_false') {
    let a = ua;
    if (a === 't' || a === 'yes' || a === '1' || a === 'true') a = 'true';
    if (a === 'f' || a === 'no' || a === '0' || a === 'false') a = 'false';
    return a === q.answer;
  }
  const expected = String(q.answer || '').toLowerCase().trim();
  if (!expected) return ua.length > 1;
  if (ua === expected || ua.includes(expected) || expected.includes(ua)) return true;
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
    if (scoreAnswer(q, answers[q.id] ?? '')) score += 1;
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
