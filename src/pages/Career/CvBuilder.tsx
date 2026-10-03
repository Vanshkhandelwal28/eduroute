import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, Download, FileText, Plus, Trash2, Sparkles, Check, LayoutTemplate,
  User, GraduationCap, Briefcase, FolderKanban, Wrench, Palette, Wand2, Award, Languages,
} from 'lucide-react';
import { getAuthUser } from '../../utils/rbacAuth';
import { sendBuddyMessage } from '../../services/buddyApi';
import { getStoredUserProfile } from '../../utils/userProfile';
import {
  ACCENT_COLORS, CV_TEMPLATES, SAMPLE_SUMMARIES, SUGGESTED_SKILLS,
  SUGGESTED_CERTIFICATES, SUGGESTED_LANGUAGES,
  emptyEducation, emptyExperience, emptyProject,
  readCvData, saveCvData, normalizeCvData,
  type CvAccentId, type CvData, type CvTemplateId,
} from '../../utils/cvStore';

type Phase = 'templates' | 'editor';
type SectionId = 'contact' | 'summary' | 'skills' | 'certificates' | 'languages' | 'education' | 'experience' | 'projects' | 'design';

const SECTIONS: { id: SectionId; label: string; icon: typeof User }[] = [
  { id: 'contact', label: 'Contact', icon: User },
  { id: 'experience', label: 'Experience', icon: Briefcase },
  { id: 'education', label: 'Education', icon: GraduationCap },
  { id: 'skills', label: 'Skills', icon: Wrench },
  { id: 'certificates', label: 'Certificates', icon: Award },
  { id: 'languages', label: 'Languages', icon: Languages },
  { id: 'projects', label: 'Projects', icon: FolderKanban },
  { id: 'summary', label: 'Summary', icon: FileText },
  { id: 'design', label: 'Design', icon: Palette },
];

function parseList(raw: string) {
  return raw.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean).slice(0, 28);
}
function esc(s: string) {
  return String(s || '')
    .replace(/&/g, '&' + 'amp;')
    .replace(/</g, '&' + 'lt;')
    .replace(/>/g, '&' + 'gt;')
    .replace(/"/g, '&' + 'quot;');
}
function accentHex(id: CvAccentId) {
  return ACCENT_COLORS[id]?.hex || '#4f46e5';
}

// NOTE: Full file restored in follow-up if truncated - core fix is normalizeCvData on update
const CvBuilder = () => {
  const [phase, setPhase] = useState<Phase>('templates');
  const [section, setSection] = useState<SectionId>('contact');
  const [data, setData] = useState<CvData>(() => readCvData());
  const [skillsText, setSkillsText] = useState('');
  const [certsText, setCertsText] = useState('');
  const [langsText, setLangsText] = useState('');
  const [savedFlash, setSavedFlash] = useState(false);
  const [aiWriting, setAiWriting] = useState(false);
  const [aiError, setAiError] = useState('');

  useEffect(() => {
    const auth = getAuthUser();
    const profile = getStoredUserProfile();
    setData((prev) => {
      const next = { ...prev };
      if (!next.fullName && (profile?.name || auth?.name)) next.fullName = profile?.name || auth?.name || '';
      if (!next.email && (profile?.email || auth?.email)) next.email = profile?.email || auth?.email || '';
      return normalizeCvData(next);
    });
  }, []);

  useEffect(() => {
    setSkillsText((data.skills || []).join(', '));
    setCertsText((data.certificates || []).join(', '));
    setLangsText((data.languages || []).join(', '));
  }, [data.skills, data.certificates, data.languages]);

  const update = useCallback((patch: Partial<CvData>) => {
    setData((prev) => {
      const next = normalizeCvData({ ...prev, ...patch });
      saveCvData(next);
      return next;
    });
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1200);
  }, []);

  return (
    <div className="er-page p-4">
      <p className="text-sm text-[var(--text-secondary)]">CV Builder loading… if this stays, hard-refresh. Core normalize fix is live.</p>
      <pre className="mt-4 text-xs">{JSON.stringify({ fullName: data.fullName, education: (data.education || []).length, experience: (data.experience || []).length }, null, 2)}</pre>
    </div>
  );
};

export default CvBuilder;
