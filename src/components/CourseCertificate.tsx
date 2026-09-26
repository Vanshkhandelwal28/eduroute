import { useMemo, useRef, useState } from 'react';
import { Download, X, Award } from 'lucide-react';
import { formatCertDate, makeCertId } from '../utils/courseProgressStore';

export type CertificateData = {
  studentName: string;
  courseName: string;
  skills: string[];
  level: string;
  durationLabel: string;
  completionDate?: string;
  certId?: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  data: CertificateData;
};

/**
 * Certificate of Completion — matches EduRoute template.
 * Skills / level / duration come from the actual course (e.g. DSA + React + DevOps).
 */
export function CourseCertificate({ open, onClose, data }: Props) {
  const printRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);

  const certId = useMemo(() => data.certId || makeCertId(), [data.certId]);
  const issued = data.completionDate || formatCertDate();
  const skillsText =
    data.skills.length > 0 ? data.skills.slice(0, 6).join(', ') : 'Core skills';

  const downloadPng = async () => {
    const el = printRef.current;
    if (!el) return;
    setBusy(true);
    try {
      // Draw certificate onto canvas for a clean PNG download (no extra deps)
      const rect = el.getBoundingClientRect();
      const scale = 2;
      const w = Math.max(900, Math.floor(rect.width * scale));
      const h = Math.max(640, Math.floor(rect.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas unavailable');

      // Background
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, w, h);

      // Outer border
      ctx.strokeStyle = '#1e3a8a';
      ctx.lineWidth = 8;
      ctx.strokeRect(16, 16, w - 32, h - 32);
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.strokeRect(28, 28, w - 56, h - 56);

      // Corner accents
      ctx.fillStyle = '#1e40af';
      ctx.beginPath();
      ctx.moveTo(16, 16);
      ctx.lineTo(140, 16);
      ctx.lineTo(16, 100);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(w - 16, 16);
      ctx.lineTo(w - 140, 16);
      ctx.lineTo(w - 16, 100);
      ctx.closePath();
      ctx.fill();

      const cx = w / 2;
      let y = 90;

      // Brand
      ctx.fillStyle = '#1e40af';
      ctx.font = `bold ${Math.floor(w * 0.035)}px system-ui, sans-serif`;
      ctx.textAlign = 'left';
      ctx.fillText('EduRoute', 60, y);
      ctx.fillStyle = '#64748b';
      ctx.font = `${Math.floor(w * 0.016)}px system-ui, sans-serif`;
      ctx.fillText('Learn  ·  Build  ·  Grow', 60, y + 28);

      ctx.fillStyle = '#64748b';
      ctx.textAlign = 'right';
      ctx.font = `${Math.floor(w * 0.014)}px system-ui, sans-serif`;
      ctx.fillText(`Certificate ID: ${certId}`, w - 60, y);
      ctx.fillText(`Issued On: ${issued}`, w - 60, y + 24);

      y = 170;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#0f172a';
      ctx.font = `bold ${Math.floor(w * 0.048)}px Georgia, serif`;
      ctx.fillText('Certificate of Completion', cx, y);

      y += 50;
      ctx.fillStyle = '#475569';
      ctx.font = `${Math.floor(w * 0.018)}px system-ui, sans-serif`;
      ctx.fillText('THIS IS TO CERTIFY THAT', cx, y);

      y += 55;
      ctx.fillStyle = '#1e3a8a';
      ctx.font = `bold ${Math.floor(w * 0.042)}px Georgia, serif`;
      ctx.fillText(data.studentName || 'Student', cx, y);

      y += 40;
      ctx.fillStyle = '#475569';
      ctx.font = `${Math.floor(w * 0.018)}px system-ui, sans-serif`;
      ctx.fillText('has successfully completed the course', cx, y);

      y += 48;
      ctx.fillStyle = '#2563eb';
      ctx.font = `bold ${Math.floor(w * 0.036)}px Georgia, serif`;
      const courseLines = wrapText(ctx, data.courseName, w * 0.75);
      for (const line of courseLines) {
        ctx.fillText(line, cx, y);
        y += Math.floor(w * 0.038);
      }

      ctx.fillStyle = '#64748b';
      ctx.font = `${Math.floor(w * 0.016)}px system-ui, sans-serif`;
      ctx.fillText('on EduRoute', cx, y + 8);

      y += 50;
      ctx.fillStyle = '#334155';
      ctx.font = `${Math.floor(w * 0.015)}px system-ui, sans-serif`;
      ctx.fillText(
        'Your dedication and consistent effort have helped you build valuable skills',
        cx,
        y,
      );
      ctx.fillText('and take one step closer to your career goals.', cx, y + 22);

      // Info bar
      y += 70;
      const barH = 90;
      const barY = y;
      roundRect(ctx, 70, barY, w - 140, barH, 16);
      ctx.fillStyle = '#eef2ff';
      ctx.fill();

      const cols = [
        { label: 'Skills Gained', value: skillsText },
        { label: 'Course Level', value: data.level },
        { label: 'Duration', value: data.durationLabel },
        { label: 'Completion Date', value: issued },
      ];
      const colW = (w - 140) / 4;
      cols.forEach((c, i) => {
        const x = 70 + colW * i + colW / 2;
        ctx.fillStyle = '#6366f1';
        ctx.font = `bold ${Math.floor(w * 0.013)}px system-ui, sans-serif`;
        ctx.fillText(c.label, x, barY + 32);
        ctx.fillStyle = '#0f172a';
        ctx.font = `bold ${Math.floor(w * 0.015)}px system-ui, sans-serif`;
        const lines = wrapText(ctx, c.value, colW - 20);
        lines.slice(0, 2).forEach((ln, li) => {
          ctx.fillText(ln, x, barY + 56 + li * 18);
        });
      });

      // Footer quote
      ctx.fillStyle = '#64748b';
      ctx.textAlign = 'left';
      ctx.font = `italic ${Math.floor(w * 0.015)}px Georgia, serif`;
      ctx.fillText('"Learn Today, Build Tomorrow." — EduRoute', 70, h - 50);

      ctx.textAlign = 'center';
      ctx.fillStyle = '#94a3b8';
      ctx.font = `${Math.floor(w * 0.012)}px system-ui, sans-serif`;
      ctx.fillText('Authorized Signature', cx, h - 70);
      ctx.fillStyle = '#334155';
      ctx.font = `bold ${Math.floor(w * 0.014)}px system-ui, sans-serif`;
      ctx.fillText('EduRoute · Academic Team', cx, h - 48);

      // Badge circle top-right
      ctx.beginPath();
      ctx.arc(w - 110, 200, 55, 0, Math.PI * 2);
      ctx.fillStyle = '#1e40af';
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${Math.floor(w * 0.014)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('EduRoute', w - 110, 195);
      ctx.font = `${Math.floor(w * 0.011)}px system-ui, sans-serif`;
      ctx.fillText('COURSE', w - 110, 215);
      ctx.fillText('COMPLETION', w - 110, 230);

      const a = document.createElement('a');
      a.download = `EduRoute-${certId}.png`;
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
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative max-h-[95vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
            <Award className="h-4 w-4 text-indigo-600" />
            Certificate of Completion
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

        <div ref={printRef} className="relative bg-slate-50 p-6 sm:p-10">
          <div className="relative overflow-hidden rounded-xl border-2 border-blue-900 bg-white p-6 sm:p-10">
            {/* corner accents */}
            <div className="pointer-events-none absolute left-0 top-0 h-16 w-24 bg-gradient-to-br from-blue-800 to-transparent opacity-90" />
            <div className="pointer-events-none absolute right-0 top-0 h-16 w-24 bg-gradient-to-bl from-blue-800 to-transparent opacity-90" />

            <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-800 text-white">
                    <Award className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xl font-black text-blue-800">EduRoute</p>
                    <p className="text-[11px] font-semibold tracking-wide text-slate-500">
                      Learn · Build · Grow
                    </p>
                  </div>
                </div>
              </div>
              <div className="text-right text-[11px] text-slate-500">
                <p>Certificate ID: {certId}</p>
                <p>Issued On: {issued}</p>
              </div>
            </div>

            <h2 className="text-center font-serif text-2xl font-bold text-slate-900 sm:text-3xl">
              Certificate of Completion
            </h2>
            <p className="mt-3 text-center text-xs font-semibold tracking-widest text-slate-500">
              THIS IS TO CERTIFY THAT
            </p>
            <p className="mt-4 text-center font-serif text-2xl font-bold text-blue-900 sm:text-3xl">
              {data.studentName || 'Student'}
            </p>
            <p className="mt-3 text-center text-sm text-slate-600">
              has successfully completed the course
            </p>
            <p className="mt-2 text-center text-xl font-bold text-blue-600 sm:text-2xl">
              {data.courseName}
            </p>
            <p className="mt-1 text-center text-sm text-slate-500">on EduRoute</p>
            <p className="mx-auto mt-4 max-w-lg text-center text-xs leading-relaxed text-slate-600">
              Your dedication and consistent effort have helped you build valuable skills and take one
              step closer to your career goals.
            </p>

            <div className="mt-8 grid grid-cols-2 gap-3 rounded-2xl bg-indigo-50 p-4 sm:grid-cols-4">
              <div className="text-center">
                <p className="text-[10px] font-bold uppercase tracking-wide text-indigo-600">
                  Skills Gained
                </p>
                <p className="mt-1 text-xs font-bold text-slate-800">{skillsText}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] font-bold uppercase tracking-wide text-indigo-600">
                  Course Level
                </p>
                <p className="mt-1 text-xs font-bold text-slate-800">{data.level}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] font-bold uppercase tracking-wide text-indigo-600">Duration</p>
                <p className="mt-1 text-xs font-bold text-slate-800">{data.durationLabel}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] font-bold uppercase tracking-wide text-indigo-600">
                  Completion Date
                </p>
                <p className="mt-1 text-xs font-bold text-slate-800">{issued}</p>
              </div>
            </div>

            <div className="mt-10 flex flex-wrap items-end justify-between gap-4">
              <p className="max-w-[200px] text-xs italic text-slate-500">
                "Learn Today, Build Tomorrow." — EduRoute
              </p>
              <div className="text-center">
                <div className="mx-auto mb-1 h-px w-40 bg-slate-300" />
                <p className="text-[10px] font-semibold text-slate-500">Authorized Signature</p>
                <p className="text-xs font-bold text-slate-700">EduRoute · Academic Team</p>
              </div>
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-800 text-center text-[9px] font-bold leading-tight text-white">
                EduRoute
                <br />
                COURSE
                <br />
                COMPLETION
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
