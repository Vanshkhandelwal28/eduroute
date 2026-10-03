import { FormEvent, useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type MouseEvent as ReactMouseEvent } from 'react';
import { fetchBuddyProgress, sendBuddyMessage } from '../../services/buddyApi';
import type { BuddyLanguage, BuddyMessage, BuddyProgress } from '../../types/buddy';
import { getAuthUser } from '../../utils/rbacAuth';
import {
  type BuddyConversation,
  deleteConversation,
  getActiveConversation,
  listConversations,
  pullConversationsFromServer,
  saveActiveMessages,
  startNewConversation,
  switchConversation,
} from '../../utils/buddyConversations';
import { buildBuddyOnboardingContext } from '../../utils/onboardingStore';
import { BuddyChatView } from './BuddyChatView';

const timestamp = () =>
  new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

function welcomeMessage(_name: string): BuddyMessage {
  return {
    id: 1,
    role: 'ai',
    text: [
      `Hi, I'm Buddy! 👋`,
      ``,
      `Tell me what you are trying to learn or achieve,`,
      `and I will turn it into a practical next step.`,
    ].join('\n'),
    timestamp: timestamp(),
  };
}

const SIDEBAR_MIN = 0;
const SIDEBAR_MAX = 360;
const SIDEBAR_DEFAULT = 300;
const SIDEBAR_COLLAPSED = 0;

type SpeechRecognitionResultLike = { readonly isFinal: boolean; readonly 0: { transcript: string } };
type SpeechRecognitionEventLike = { readonly results: ArrayLike<SpeechRecognitionResultLike> };
type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: ((ev: Event) => void) | null;
  onresult: ((ev: SpeechRecognitionEventLike) => void) | null;
  onerror: ((ev: { error: string }) => void) | null;
  onend: ((ev: Event) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

function getSpeechRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === 'undefined') return null;
  const w = window as Window & {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

function isSpeechRecognitionSupported() {
  return Boolean(getSpeechRecognitionCtor());
}

function isSpeechSynthesisSupported() {
  return typeof window !== 'undefined' && typeof window.speechSynthesis !== 'undefined';
}

function buddyLangToSpeechLang(lang: BuddyLanguage): string {
  if (lang === 'hindi') return 'hi-IN';
  if (lang === 'hinglish') return 'en-IN';
  return 'en-IN';
}

function speakText(text: string, lang: BuddyLanguage) {
  if (!isSpeechSynthesisSupported()) return;
  try {
    window.speechSynthesis.cancel();
    const clean = String(text || '')
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/[*_#`>]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 1200);
    if (!clean) return;
    const u = new SpeechSynthesisUtterance(clean);
    u.lang = buddyLangToSpeechLang(lang);
    u.rate = 1.02;
    u.pitch = 1;
    window.speechSynthesis.speak(u);
  } catch {
    /* ignore */
  }
}

function stopSpeaking() {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      /* ignore */
    }
  }
}

export default function BuddyChat() {
  const authUser = getAuthUser();
  const currentUserId = authUser?.id || 'demo-student-101';
  const firstName = (authUser?.name || 'Student').split(' ')[0];

  const [messages, setMessages] = useState<BuddyMessage[]>([welcomeMessage(firstName)]);
  const [input, setInput] = useState('');
  const inputLatest = useRef(input);
  const [isTyping, setIsTyping] = useState(false);
  const [language, setLanguage] = useState<BuddyLanguage>('english');
  const [progress, setProgress] = useState<BuddyProgress | null>(null);
  const [error, setError] = useState('');
  const [conversations, setConversations] = useState<BuddyConversation[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_DEFAULT);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported] = useState(() => isSpeechRecognitionSupported());
  const [ttsSupported] = useState(() => isSpeechSynthesisSupported());
  const [autoSpeak, setAutoSpeak] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const autoSendAfterVoice = useRef(false);
  const hadSpeechRef = useRef(false);
  const noSpeechTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const networkRetryRef = useRef(0);
  const listeningSessionRef = useRef(0);
  const committedTranscriptRef = useRef('');
  const dragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(SIDEBAR_DEFAULT);

  useEffect(() => {
    inputLatest.current = input;
  }, [input]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await pullConversationsFromServer(currentUserId);
      } catch {
        /* offline ok */
      }
      if (cancelled) return;
      const active = getActiveConversation(currentUserId);
      setActiveChatId(active.id);
      setMessages(active.messages.length ? active.messages : [welcomeMessage(firstName)]);
      setConversations(listConversations(currentUserId));
      try {
        const data = await fetchBuddyProgress(currentUserId);
        if (cancelled) return;
        setProgress(data.progress);
        setLanguage(data.progress.preferredLanguage || 'english');
      } catch {
        /* offline ok */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentUserId, firstName]);

  useEffect(() => {
    if (!activeChatId) return;
    saveActiveMessages(currentUserId, messages);
    setConversations(listConversations(currentUserId));
  }, [messages, activeChatId, currentUserId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  useEffect(() => {
    const refresh = () => {
      const active = getActiveConversation(currentUserId);
      setActiveChatId(active.id);
      setMessages(active.messages.length ? active.messages : [welcomeMessage(firstName)]);
      setConversations(listConversations(currentUserId));
    };
    window.addEventListener('eduroute:buddy-messages-updated', refresh);
    return () => window.removeEventListener('eduroute:buddy-messages-updated', refresh);
  }, [currentUserId, firstName]);

  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.abort();
      } catch {
        /* ignore */
      }
      stopSpeaking();
    };
  }, []);

  const effectiveWidth = sidebarOpen ? sidebarWidth : SIDEBAR_COLLAPSED;

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((v) => !v);
  }, []);

  const onDragStart = (e: ReactPointerEvent) => {
    dragging.current = true;
    startX.current = e.clientX;
    startWidth.current = sidebarWidth;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const onDragMove = (e: ReactPointerEvent) => {
    if (!dragging.current) return;
    const dx = e.clientX - startX.current;
    const next = Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, startWidth.current + dx));
    setSidebarWidth(next);
    if (next > 40) setSidebarOpen(true);
  };
  const onDragEnd = (_e: ReactPointerEvent) => {
    dragging.current = false;
  };

  const handleSend = async (preset?: string) => {
    const text = (preset ?? inputLatest.current ?? input).trim();
    if (!text || isTyping) return;
    setError('');
    const userMsg: BuddyMessage = {
      id: Date.now(),
      role: 'user',
      text,
      timestamp: timestamp(),
    };
    setMessages((m) => [...m, userMsg]);
    setInput('');
    inputLatest.current = '';
    setIsTyping(true);
    try {
      let context: any;
      try {
        context = buildBuddyOnboardingContext();
      } catch {
        context = undefined;
      }
      const res = await sendBuddyMessage({
        userId: currentUserId,
        message: text,
        language,
        context,
      });
      const aiMsg: BuddyMessage = {
        id: Date.now() + 1,
        role: 'ai',
        text: res.reply,
        timestamp: timestamp(),
      };
      setMessages((m) => [...m, aiMsg]);
      if (res.gamification) {
        setProgress((p) =>
          p
            ? { ...p, points: res.gamification.points, level: res.gamification.level }
            : {
                points: res.gamification.points,
                level: res.gamification.level,
                achievements: [],
                weeklyChallenges: [],
                missingSkills: [],
                preferredLanguage: language,
              },
        );
      }
      if (autoSpeak && res.reply) {
        speakText(res.reply, language);
        setSpeakingId(String(aiMsg.id));
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to send message');
      setMessages((m) => [
        ...m,
        {
          id: Date.now() + 1,
          role: 'ai',
          text: 'Sorry, something went wrong. Please try again.',
          timestamp: timestamp(),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void handleSend();
  };

  const onNewChat = () => {
    const conv = startNewConversation(currentUserId);
    setActiveChatId(conv.id);
    setMessages(conv.messages);
    setConversations(listConversations(currentUserId));
  };

  const onSelectChat = (id: string) => {
    const conv = switchConversation(currentUserId, id);
    if (conv) {
      setActiveChatId(conv.id);
      setMessages(conv.messages);
      setConversations(listConversations(currentUserId));
    }
  };

  const onDeleteChat = (id: string, _e?: ReactMouseEvent) => {
    const next = deleteConversation(currentUserId, id);
    setActiveChatId(next.id);
    setMessages(next.messages);
    setConversations(listConversations(currentUserId));
  };

  const toggleSpeakMessage = (id: string, text: string) => {
    if (speakingId === id) {
      stopSpeaking();
      setSpeakingId(null);
      return;
    }
    speakText(text, language);
    setSpeakingId(id);
  };

  const toggleListening = () => {
    if (!voiceSupported) return;
    if (isListening) {
      try {
        recognitionRef.current?.stop();
      } catch {
        /* ignore */
      }
      setIsListening(false);
      return;
    }
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) return;
    const rec = new Ctor();
    recognitionRef.current = rec;
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = buddyLangToSpeechLang(language);
    rec.onresult = (ev) => {
      let transcript = '';
      for (let i = 0; i < ev.results.length; i++) {
        transcript += ev.results[i][0].transcript;
      }
      setInput(transcript);
      inputLatest.current = transcript;
    };
    rec.onerror = () => setIsListening(false);
    rec.onend = () => setIsListening(false);
    try {
      rec.start();
      setIsListening(true);
    } catch {
      setIsListening(false);
    }
  };

  return (
    <BuddyChatView
      firstName={firstName}
      messages={messages}
      input={input}
      setInput={setInput}
      inputLatest={inputLatest}
      isTyping={isTyping}
      language={language}
      setLanguage={setLanguage}
      error={error}
      isListening={isListening}
      voiceSupported={voiceSupported}
      ttsSupported={ttsSupported}
      autoSpeak={autoSpeak}
      setAutoSpeak={setAutoSpeak}
      speakingId={speakingId}
      scrollRef={scrollRef}
      inputRef={inputRef}
      conversations={conversations}
      activeChatId={activeChatId}
      effectiveWidth={effectiveWidth}
      onSubmit={onSubmit}
      handleSend={handleSend}
      onNewChat={onNewChat}
      onSelectChat={onSelectChat}
      onDeleteChat={onDeleteChat}
      toggleSidebar={toggleSidebar}
      toggleListening={toggleListening}
      toggleSpeakMessage={toggleSpeakMessage}
      onDragStart={onDragStart}
      onDragMove={onDragMove}
      onDragEnd={onDragEnd}
    />
  );
}
