/**
 * Real PDF text extraction for CV upload.
 * Loads pdf.js from CDN (no npm dep) so Netlify/Vite singlefile builds work.
 */

export type CvStructuredInfo = {
  rawText: string;
  charCount: number;
  name?: string;
  email?: string;
  phone?: string;
  skills: string[];
  sections: { title: string; body: string }[];
  source: 'pdfjs' | 'text' | 'binary-fallback';
  note?: string;
};

function extractEmail(text: string): string | undefined {
  const m = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  return m?.[0];
}

function extractPhone(text: string): string | undefined {
  const m = text.match(/(?:\+?\d[\d\s\-()]{8,}\d)/);
  return m?.[0]?.trim();
}

function extractSections(text: string): { title: string; body: string }[] {
  const headers =
    /(?:^|\n)\s*(SUMMARY|PROFESSIONAL EXPERIENCE|EXPERIENCE|EDUCATION|SKILLS|CERTIFICATES?|CERTIFICATIONS?|PROJECTS?|LANGUAGES?|TECHNICAL SKILLS|WORK EXPERIENCE)\s*(?:\n|:)/gi;
  const matches: { title: string; index: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = headers.exec(text)) !== null) {
    matches.push({ title: m[1].toUpperCase(), index: m.index + m[0].length });
  }
  if (!matches.length) return [];
  const out: { title: string; body: string }[] = [];
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index;
    const end = i + 1 < matches.length ? matches[i + 1].index : text.length;
    const body = text.slice(start, end).trim().slice(0, 800);
    if (body) out.push({ title: matches[i].title, body });
  }
  return out.slice(0, 12);
}

function guessName(text: string): string | undefined {
  const lines = text
    .split(/\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  for (const line of lines.slice(0, 8)) {
    if (line.length < 2 || line.length > 40) continue;
    if (/@|http|skill|summary|education|experience|phone|email|student|intern/i.test(line))
      continue;
    if (/^[A-Za-z][A-Za-z\s.'-]{1,39}$/.test(line)) return line;
  }
  return undefined;
}

export function formatCvReport(info: CvStructuredInfo): string {
  const lines: string[] = [];
  lines.push(`Source: ${info.source} · ${info.charCount} characters`);
  if (info.note) lines.push(`Note: ${info.note}`);
  lines.push('');
  if (info.name) lines.push(`Name: ${info.name}`);
  if (info.email) lines.push(`Email: ${info.email}`);
  if (info.phone) lines.push(`Phone: ${info.phone}`);
  if (info.skills.length) {
    lines.push('');
    lines.push(`Skills (${info.skills.length}):`);
    lines.push(info.skills.join(', '));
  }
  if (info.sections.length) {
    lines.push('');
    lines.push('=== Sections ===');
    for (const s of info.sections) {
      lines.push('');
      lines.push(`--- ${s.title} ---`);
      lines.push(s.body.slice(0, 400));
    }
  }
  lines.push('');
  lines.push('=== Full readable text ===');
  lines.push(info.rawText.slice(0, 6000));
  if (info.rawText.length > 6000) lines.push('\n… (truncated)');
  return lines.join('\n');
}

async function loadPdfJs(): Promise<any> {
  const urls = [
    'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs',
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs',
    'https://unpkg.com/pdfjs-dist@4.10.38/build/pdf.min.mjs',
  ];
  let lastErr: unknown;
  for (const url of urls) {
    try {
      const mod = await import(/* @vite-ignore */ url);
      const pdfjs = mod.default || mod;
      if (pdfjs?.getDocument) {
        pdfjs.GlobalWorkerOptions.workerSrc =
          'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs';
        return pdfjs;
      }
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error('pdf.js CDN load failed');
}

async function extractWithPdfJs(data: ArrayBuffer): Promise<string> {
  const pdfjs = await loadPdfJs();
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(data) });
  const pdf = await loadingTask.promise;
  const pages: string[] = [];
  const maxPages = Math.min(pdf.numPages, 8);
  for (let i = 1; i <= maxPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const strings = content.items
      .map((item: any) => (typeof item?.str === 'string' ? item.str : ''))
      .filter(Boolean);
    pages.push(strings.join(' '));
  }
  return pages
    .join('\n\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function binaryFallback(raw: string): string {
  const cleaned = raw
    .replace(/[^\x09\x0A\x0D\x20-\x7E\u00A0-\u024F]/g, ' ')
    .replace(/[^\w+#./\-\s]+/g, ' ');
  const tokens = cleaned.match(/[A-Za-z][A-Za-z0-9+#./\-]{0,40}/g) || [];
  const short =
    cleaned.match(/\b(?:js|ts|go|c\+\+|cpp|jwt|dsa|oop|html|css|sql|aws|api)\b/gi) || [];
  return [...tokens, ...short].join(' ').slice(0, 10000);
}

export async function extractCvContent(
  file: File,
  skillExtractor: (text: string) => string[],
): Promise<CvStructuredInfo> {
  if (file.type.startsWith('text/') || /\.(txt|md|csv|json)$/i.test(file.name)) {
    const rawText = (await file.text()).slice(0, 20000);
    const skills = skillExtractor(rawText);
    return {
      rawText,
      charCount: rawText.length,
      name: guessName(rawText),
      email: extractEmail(rawText),
      phone: extractPhone(rawText),
      skills,
      sections: extractSections(rawText),
      source: 'text',
    };
  }

  const buf = await file.arrayBuffer();

  if (/\.pdf$/i.test(file.name) || file.type === 'application/pdf') {
    try {
      const rawText = await extractWithPdfJs(buf);
      if (rawText.length >= 30) {
        const skills = skillExtractor(rawText);
        return {
          rawText: rawText.slice(0, 20000),
          charCount: rawText.length,
          name: guessName(rawText),
          email: extractEmail(rawText),
          phone: extractPhone(rawText),
          skills,
          sections: extractSections(rawText),
          source: 'pdfjs',
        };
      }
    } catch (err) {
      console.warn('[cv] pdf.js extract failed', err);
    }
  }

  const decoder = new TextDecoder('utf-8', { fatal: false });
  const binary = decoder.decode(buf);
  const rawText = binaryFallback(binary);
  const skills = skillExtractor(rawText);
  return {
    rawText,
    charCount: rawText.length,
    name: guessName(rawText),
    email: extractEmail(rawText),
    phone: extractPhone(rawText),
    skills,
    sections: extractSections(rawText),
    source: 'binary-fallback',
    note:
      'Could not fully decode this PDF in-browser. Prefer .txt export, or paste skills above.',
  };
}
