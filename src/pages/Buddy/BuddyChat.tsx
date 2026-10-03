import { FormEvent, useEffect, useRef, useState } from 'react';
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
  const [error, setError] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [effectiveWidth, setEffectiveWidth] = useState(300);
  const [isListening, setIsListening] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputLatest = useRef('');

  useEffect(() => {
    inputLatest.current = input;
  }, [input]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await pullConversationsFromServer(currentUserId);
      } catch {
        /* offline */
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
        /* offline */
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
    setError('');
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
      const res = await sendBuddyMessage({
        userId: currentUserId,
        message: text,
        language,
        context: buildBuddyOnboardingContext?.() as any,
      });
      setMessages((m) => [
        ...m,
        {
          id: Date.now() + 1,
          role: 'ai',
          text: res.reply,
          timestamp: timestamp(),
        },
      ]);
      if (res.gamification) {
        setProgress((p) =>
          p ? { ...p, points: res.gamification.points, level: res.gamification.level } : p,
        );
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to send');
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

  const onDeleteChat = (id: string) => {
    const next = deleteConversation(currentUserId, id);
    setActiveChatId(next.id);
    setMessages(next.messages);
    setConversations(listConversations(currentUserId));
  };

  const noop = () => {};

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
      voiceSupported={false}
      ttsSupported={false}
      autoSpeak={autoSpeak}
      setAutoSpeak={setAutoSpeak}
      speakingId={speakingId}
      scrollRef={scrollRef}
      inputRef={inputRef}
      conversations={conversations}
      activeChatId={activeChatId}
      effectiveWidth={sidebarOpen ? effectiveWidth : 0}
      onSubmit={onSubmit}
      handleSend={handleSend}
      onNewChat={onNewChat}
      onSelectChat={onSelectChat}
      onDeleteChat={onDeleteChat}
      toggleSidebar={() => setSidebarOpen((v) => !v)}
      toggleListening={noop}
      toggleSpeakMessage={noop}
      onDragStart={noop as any}
      onDragMove={noop as any}
      onDragEnd={noop as any}
    />
  );
}
