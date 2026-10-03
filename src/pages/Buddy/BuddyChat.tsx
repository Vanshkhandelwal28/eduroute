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
    text: "Hi, I'm Buddy. Tell me what you are trying to learn or achieve, and I will turn it into a practical next step.",
    timestamp: timestamp(),
  };
}

function isSpeechRecognitionSupported() {
  return typeof window !== 'undefined' && !!(window as any).SpeechRecognition || !!(window as any).webkitSpeechRecognition;
}
function isSpeechSynthesisSupported() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((ev: any) => void) | null;
  onerror: ((ev: any) => void) | null;
  onend: (() => void) | null;
};

const SIDEBAR_DEFAULT = 280;

export default function BuddyChat() {
  const authUser = getAuthUser();
  const currentUserId = authUser?.id || 'demo-student-101';
  const firstName = (authUser?.name || 'Student').split(' ')[0];

  const [messages, setMessages] = useState<BuddyMessage[]>([welcomeMessage(firstName)]);
  const [conversations, setConversations] = useState<BuddyConversation[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [progress, setProgress] = useState<BuddyProgress | null>(null);
  const [language, setLanguage] = useState<BuddyLanguage>('english');
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
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

  const handleSend = async (preset?: string) => {
    const text = (preset ?? input).trim();
    if (!text || isTyping) return;
    const userMsg: BuddyMessage = {
      id: Date.now(),
      role: 'user',
      text,
      timestamp: timestamp(),
    };
    setMessages((m) => [...m, userMsg]);
    setInput('');
    setIsTyping(true);
    try {
      const context = buildBuddyOnboardingContext?.() as any;
      const res = await sendBuddyMessage({
        userId: currentUserId,
        message: text,
        language,
        context: context || undefined,
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
            : p,
        );
      }
    } catch {
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

  const onDeleteChat = (id: string) => {
    const next = deleteConversation(currentUserId, id);
    setActiveChatId(next.id);
    setMessages(next.messages);
    setConversations(listConversations(currentUserId));
  };

  return (
    <BuddyChatView
      messages={messages}
      conversations={conversations}
      activeChatId={activeChatId}
      progress={progress}
      language={language}
      setLanguage={setLanguage}
      input={input}
      isTyping={isTyping}
      onInputChange={setInput}
      onSend={() => void handleSend()}
      onPresetSend={(t: string) => void handleSend(t)}
      onNewChat={onNewChat}
      onSelectChat={onSelectChat}
      onDeleteChat={onDeleteChat}
      sidebarWidth={sidebarWidth}
      setSidebarWidth={setSidebarWidth}
      sidebarOpen={sidebarOpen}
      setSidebarOpen={setSidebarOpen}
      scrollRef={scrollRef}
      inputRef={inputRef}
      isListening={isListening}
      voiceSupported={voiceSupported}
      ttsSupported={ttsSupported}
      autoSpeak={autoSpeak}
      setAutoSpeak={setAutoSpeak}
      speakingId={speakingId}
      setSpeakingId={setSpeakingId}
      firstName={firstName}
    />
  );
}
