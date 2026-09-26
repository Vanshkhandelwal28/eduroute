import { useMemo, useRef, useState } from 'react';
import { Download, X, Award } from 'lucide-react';
import { formatCertDate, makeCertId } from '../utils/courseProgressStore';
import {
  badgeFromPercent,
  badgeLabel,
  badgeRangeLabel,
  type CertBadge,
} from '../utils/courseAchievementsStore';

export type CertificateData = {
  studentName: string;
  courseName: string;
  skills: string[];
  level: string;
  durationLabel: string;
  completionDate?: string;
  certId?: string;
  /** Assessment score 0–100 — drives Gold / Silver / Bronze */
  percent?: number;
  badge?: CertBadge;
};

type Props = {
  open: boolean;
  onClose: () => void;
  data: CertificateData;
};

const BADGE_META: Record<
  CertBadge,
  { emoji: string; ring: string; labelBg: string; labelText: string; canvasFill: string }
> = {
  gold: {
    emoji: '🥇',
    ring: 'from-amber-400 to-yellow-600',
    labelBg: 'bg-amber-400',
    labelText: 'text-amber-950',
    canvasFill: '#f59e0b',
  },
  silver: {
    emoji: '🥈',
    ring: 'from-slate-300 to-slate-500',
    labelBg: 'bg-slate-300',
    labelText: 'text-slate-800',
    canvasFill: '#94a3b8',
  },
  bronze: {
    emoji: '🥉',
    ring: 'from-orange-400 to-amber-700',
    labelBg: 'bg-orange-400',
    labelText: 'text-orange-950',
    canvasFill: '#d97706',
  },
};

/**
 * Certificate of Completion — EduRoute template with score-based badge.
 * Bronze 60–74% · Silver 75–85% · Gold 85–100%
 */
export function CourseCertificate({ open, onClose, data }: Props) {
  const printRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);

  const certId = useMemo(() => data.certId || makeCertId(), [data.certId]);
  const issued = data.completionDate || formatCertDate();
  const skillsList =
    data.skills.length > 0 ? data.skills.slice(0, 8) : ['Core skills'];
  const skillsText = skillsList.join(' · ');

  const percent = typeof data.percent === 'number' ? data.percent : 100;
  const badge: CertBadge = data.badge || badgeFromPercent(percent);
  const meta = BADGE_META[badge];

  const downloadPng = async () => {
    const el = printRef.current;
    if (!el) return;
    setBusy(true);
    try {
      const rect = el.getBoundingClientRect();
      const scale = 2;
      const w = Math.max(1000, Math.floor(rect.width * scale));
      const h = Math.max(700, Math.floor(rect.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas unavailable');

      // Cream background
      ctx.fillStyle = '#fafbff';
      ctx.fillRect(0, 0, w, h);

      // Outer navy frame
      ctx.strokeStyle = '#1e3a8a';
      ctx.lineWidth = 10;
      ctx.strokeRect(12, 12, w - 24, h - 24);
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.strokeRect(24, 24, w - 48, h - 48);

      // Corner triangles (top-right / bottom-left style)
      ctx.fillStyle = '#1e40af';
      ctx.beginPath();
      ctx.moveTo(w - 12, 12);
      ctx.lineTo(w - 160, 12);
      ctx.lineTo(w - 12, 120);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(12, h - 12);
      ctx.lineTo(160, h - 12);
      ctx.lineTo(12, h - 120);
      ctx.closePath();
      ctx.fill();

      // Gold accent strips
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(w - 12, 12, 12, 100);
      ctx.fillRect(12, h - 112, 12, 100);

      const cx = w / 2;
      let y = 80;

      // Brand left
      ctx.fillStyle = '#1e40af';
      ctx.font = `bold ${Math.floor(w * 0.032)}px system-ui, sans-serif`;
      ctx.textAlign = 'left';
      ctx.fillText('EduRoute', 70, y);
      ctx.fillStyle = '#64748b';
      ctx.font = `${Math.floor(w * 0.014)}px system-ui, sans-serif`;
      ctx.fillText('Learn  ·  Build  ·  Grow', 70, y + 26);

      // ID right
      ctx.fillStyle = '#64748b';
      ctx.textAlign = 'right';
      ctx.font = `${Math.floor(w * 0.013)}px system-ui, sans-serif`;
      ctx.fillText(`Certificate ID: ${certId}`, w - 70, y);
      ctx.fillText(`Issued On: ${issued}`, w - 70, y + 22);

      y = 160;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#0f172a';
      ctx.font = `bold ${Math.floor(w * 0.045)}px Georgia, "Times New Roman", serif`;
      ctx.fillText('Certificate of Completion', cx, y);

      y += 42;
      ctx.fillStyle = '#64748b';
      ctx.font = `${Math.floor(w * 0.014)}px system-ui, sans-serif`;
      ctx.fillText('THIS IS TO CERTIFY THAT', cx, y);

      y += 50;
      ctx.fillStyle = '#1e3a8a';
      ctx.font = `bold ${Math.floor(w * 0.04)}px Georgia, serif`;
      ctx.fillText(data.studentName || 'Student', cx, y);

      y += 36;
      ctx.fillStyle = '#64748b';
      ctx.font = `${Math.floor(w * 0.015)}px system-ui, sans-serif`;
      ctx.fillText('has successfully completed the course', cx, y);

      y += 42;
      ctx.fillStyle = '#1d4ed8';
      ctx.font = `bold ${Math.floor(w * 0.032)}px Georgia, serif`;
      const courseLines = wrapText(ctx, data.courseName, w * 0.7);
      for (const line of courseLines) {
        ctx.fillText(line, cx, y);
        y += Math.floor(w * 0.034);
      }

      ctx.fillStyle = '#94a3b8';
      ctx.font = `${Math.floor(w * 0.012)}px system-ui, sans-serif`;
      ctx.fillText('SKILL PROGRAM  ·  EDUROUTE', cx, y + 6);

      // Achievement badge label (right side area in design — we center a highlight)
      y += 36;
      ctx.fillStyle = meta.canvasFill;
      roundRect(ctx, cx - 70, y - 8, 140, 36, 10);
      ctx.fill();
      ctx.fillStyle = '#0f172a';
      ctx.font = `bold ${Math.floor(w * 0.016)}px system-ui, sans-serif`;
      ctx.fillText(`${badgeLabel(badge)}  ·  ${percent}%`, cx, y + 16);

      y += 50;
      ctx.fillStyle = '#475569';
      ctx.font = `${Math.floor(w * 0.014)}px system-ui, sans-serif`;
      ctx.fillText(
        'This certifies that the student has demonstrated strong problem-solving skills,',
        cx,
        y,
      );
      ctx.fillText('algorithmic thinking and consistent practice.', cx, y + 22);

      // Info row
      y += 55;
      const barH = 100;
      roundRect(ctx, 60, y, w - 120, barH, 18);
      ctx.fillStyle = '#eef2ff';
      ctx.fill();

      const cols = [
        { label: 'Skills Covered', value: skillsText },
        { label: 'Course Level', value: data.level },
        { label: 'Duration', value: data.durationLabel },
        { label: 'Completion Date', value: issued },
        { label: 'Certificate Type', value: 'Skill Completion' },
      ];
      const colW = (w - 120) / cols.length;
      cols.forEach((c, i) => {
        const x = 60 + colW * i + colW / 2;
        ctx.fillStyle = '#4f46e5';
        ctx.font = `bold ${Math.floor(w * 0.012)}px system-ui, sans-serif`;
        ctx.fillText(c.label, x, y + 28);
        ctx.fillStyle = '#0f172a';
        ctx.font = `bold ${Math.floor(w * 0.013)}px system-ui, sans-serif`;
        const lines = wrapText(ctx, c.value, colW - 16);
        lines.slice(0, 2).forEach((ln, li) => {
          ctx.fillText(ln, x, y + 52 + li * 18);
        });
      });

      // Footer
      ctx.fillStyle = '#64748b';
      ctx.textAlign = 'left';
      ctx.font = `italic ${Math.floor(w * 0.014)}px Georgia, serif`;
      ctx.fillText('"Better Skills. Brighter Future." — EduRoute', 70, h - 55);

      ctx.textAlign = 'center';
      ctx.fillStyle = '#334155';
      ctx.font = `italic ${Math.floor(w * 0.016)}px Georgia, serif`;
      ctx.fillText('EduRoute', cx, h - 70);
      ctx.font = `${Math.floor(w * 0.012)}px system-ui, sans-serif`;
      ctx.fillStyle = '#64748b';
      ctx.fillText('Founder & CEO · EduRoute', cx, h - 48);

      // Seal circle
      ctx.beginPath();
      ctx.arc(w - 120, h - 90, 48, 0, Math.PI * 2);
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.fillStyle = '#dc2626';
      ctx.font = `bold ${Math.floor(w * 0.012)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('EDUROUTE', w - 120, h - 95);
      ctx.font = `${Math.floor(w * 0.01)}px system-ui, sans-serif`;
      ctx.fillText('ONLINE', w - 120, h - 78);

      const a = document.createElement('a');
      a.download = `EduRoute-${badgeLabel(badge)}-${certId}.png`;
      a.href = canvas.toDataURL('image/png');
      a.click();
    } catch (e) {
      console.error(e);
      window.print();
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm sm:p-4">
      <div className="relative max-h-[96vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
            <Award className="h-4 w-4 text-indigo-600" />
            Certificate of Completion
            <span
              className={`ml-2 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase ${meta.labelBg} ${meta.labelText}`}
            >
              {badgeLabel(badge)} · {percent}%
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={downloadPng}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-500 disabled:opacity-60"
            >
              <Download className="h-3.5 w-3.5" />
              {busy ? 'Preparing…' : 'Download certificate'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div ref={printRef} className="relative bg-[#fafbff] p-4 sm:p-8">
          <div className="relative overflow-hidden rounded-xl border-[3px] border-blue-900 bg-white p-5 sm:p-10">
            {/* corner accents */}
            <div className="pointer-events-none absolute right-0 top-0 h-20 w-28 bg-gradient-to-bl from-blue-900 via-blue-800 to-transparent" />
            <div className="pointer-events-none absolute bottom-0 left-0 h-20 w-28 bg-gradient-to-tr from-blue-900 via-blue-800 to-transparent" />
            <div className="pointer-events-none absolute right-0 top-0 h-3 w-full bg-gradient-to-l from-amber-400/80 to-transparent" />

            {/* Header */}
            <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-blue-900 text-white shadow-md">
                  <Award className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-2xl font-black tracking-tight text-blue-800">
                    Edu<span className="text-blue-500">Route</span>
                  </p>
                  <p className="text-[11px] font-semibold tracking-wide text-slate-500">
                    Learn · Build · Grow
                  </p>
                </div>
              </div>
              <div className="text-right text-[11px] text-slate-500">
                <p className="font-semibold">Certificate ID: {certId}</p>
                <p>Issued On: {issued}</p>
              </div>
            </div>

            <h2 className="text-center font-serif text-2xl font-bold text-slate-900 sm:text-4xl">
              Certificate of Completion
            </h2>
            <p className="mt-3 text-center text-[11px] font-semibold tracking-[0.2em] text-slate-500">
              THIS IS TO CERTIFY THAT
            </p>

            <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:justify-center sm:gap-10">
              <div className="min-w-0 flex-1 text-center">
                <p className="font-serif text-2xl font-bold text-blue-900 sm:text-3xl">
                  {data.studentName || 'Student'}
                </p>
                <p className="mt-3 text-sm text-slate-600">has successfully completed the course</p>
                <p className="mt-2 text-xl font-bold text-blue-600 sm:text-2xl">{data.courseName}</p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Skill Program · EduRoute
                </p>
                <p className="mx-auto mt-4 max-w-md text-center text-xs leading-relaxed text-slate-600">
                  This certifies that the student has demonstrated strong problem-solving skills,
                  algorithmic thinking and consistent practice.
                </p>
              </div>

              {/* Achievement badges — highlight awarded tier */}
              <div className="shrink-0 text-center">
                <p className="mb-2 text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Achievement Badge
                </p>
                <div className="flex items-end justify-center gap-2">
                  {(['gold', 'silver', 'bronze'] as CertBadge[]).map((b) => {
                    const active = b === badge;
                    const m = BADGE_META[b];
                    return (
                      <div
                        key={b}
                        className={`flex flex-col items-center transition ${
                          active ? 'scale-110 opacity-100' : 'scale-90 opacity-40'
                        }`}
                      >
                        <div
                          className={`flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-b ${m.ring} text-2xl shadow-md ring-2 ${
                            active ? 'ring-indigo-500' : 'ring-transparent'
                          }`}
                        >
                          {m.emoji}
                        </div>
                        <p className="mt-1 text-[9px] font-bold text-slate-600">{badgeRangeLabel(b)}</p>
                        <span
                          className={`mt-0.5 rounded-full px-2 py-0.5 text-[9px] font-black ${m.labelBg} ${m.labelText}`}
                        >
                          {badgeLabel(b)}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <p className="mt-2 max-w-[160px] text-[10px] text-slate-500">
                  Your badge is assigned from your assessment score ({percent}%).
                </p>
              </div>
            </div>

            {/* Info bar */}
            <div className="mt-8 grid grid-cols-2 gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/80 p-4 sm:grid-cols-5">
              <div className="text-center sm:col-span-1">
                <p className="text-[10px] font-bold uppercase tracking-wide text-indigo-600">Skills Covered</p>
                <p className="mt-1 text-[11px] font-bold leading-snug text-slate-800">{skillsText}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] font-bold uppercase tracking-wide text-indigo-600">Course Level</p>
                <p className="mt-1 text-xs font-bold text-slate-800">{data.level}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] font-bold uppercase tracking-wide text-indigo-600">Duration</p>
                <p className="mt-1 text-xs font-bold text-slate-800">{data.durationLabel}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] font-bold uppercase tracking-wide text-indigo-600">Completion Date</p>
                <p className="mt-1 text-xs font-bold text-slate-800">{issued}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] font-bold uppercase tracking-wide text-indigo-600">Certificate Type</p>
                <p className="mt-1 text-xs font-bold text-slate-800">Skill Completion</p>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-10 flex flex-wrap items-end justify-between gap-4">
              <p className="max-w-[220px] text-xs italic text-slate-500">
                "Better Skills. Brighter Future." — EduRoute
              </p>
              <div className="text-center">
                <p className="font-serif text-lg italic font-semibold text-blue-800">EduRoute</p>
                <div className="mx-auto mb-1 mt-0.5 h-px w-36 bg-slate-300" />
                <p className="text-[10px] font-semibold text-slate-500">Founder & CEO</p>
                <p className="text-xs font-bold text-slate-700">EduRoute</p>
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="flex h-16 w-16 items-center justify-center rounded-full border-[3px] border-red-600 text-center text-[9px] font-black leading-tight text-red-600">
                  EDUROUTE
                  <br />
                  ONLINE
                </div>
                <p className="text-[9px] font-semibold text-slate-400">Verify Certificate</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [text];
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export default CourseCertificate;
