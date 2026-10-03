/**
 * Multi-conversation store for AI Buddy.
 * Hybrid: localStorage cache + Neon sync via /api/buddy/sync (same userId → cross-browser).
 */

import type { BuddyMessage } from '../types/buddy';

export type BuddyConversation = {
  id: string;
  title: string;
  messages: BuddyMessage[];
  createdAt: number;
  updatedAt: number;
};

type ConversationStore = {
  conversations: BuddyConversation[];
  activeId: string | null;
};

const STORAGE_KEY = (userId: string) => `buddy-conversations-v1:${userId}`;

const WELCOME_TEXT =
  "Hi, I'm Buddy. Tell me what you are trying to learn or achieve, and I will turn it into a practical next step.";

export function makeWelcomeMessage(): BuddyMessage {
  return {
    id: Date.now(),
    role: 'ai',
    text: WELCOME_TEXT,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };
}

function emptyStore(): ConversationStore {
  return { conversations: [], activeId: null };
}

function readStore(userId: string): ConversationStore {
  if (typeof window === 'undefined') return emptyStore();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY(userId));
    if (!raw) return emptyStore();
    const parsed = JSON.parse(raw) as Partial<ConversationStore>;
    return {
      conversations: Array.isArray(parsed.conversations) ? parsed.conversations : [],
      activeId: typeof parsed.activeId === 'string' ? parsed.activeId : null,
    };
  } catch {
    return emptyStore();
  }
}

function writeStore(userId: string, store: ConversationStore) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY(userId), JSON.stringify(store));
  } catch {
    /* quota / private mode */
  }
  // Fire-and-forget server sync for cross-browser
  void pushStoreToServer(userId, store);
}

function authHeaders(): HeadersInit {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  try {
    const token =
      localStorage.getItem('eduroute_token') ||
      localStorage.getItem('token') ||
      localStorage.getItem('authToken');
    if (token && !token.startsWith('open-') && !token.startsWith('pending-') && token.includes('.')) {
      h.Authorization = `Bearer ${token}`;
    }
  } catch {
    /* ignore */
  }
  return h;
}

async function pushStoreToServer(userId: string, store: ConversationStore) {
  if (!userId || typeof fetch === 'undefined') return;
  try {
    await fetch(`/api/buddy/sync`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        userId,
        conversations: store.conversations,
        activeId: store.activeId,
      }),
    });
  } catch {
    /* offline ok — localStorage still works */
  }
}

/** Pull from Neon; merge if server has more/newer chats. Call on Buddy page mount. */
export async function pullConversationsFromServer(userId: string): Promise<ConversationStore> {
  const local = readStore(userId);
  if (!userId || typeof fetch === 'undefined') return local;

  try {
    const res = await fetch(`/api/buddy/sync?userId=${encodeURIComponent(userId)}`, {
      headers: authHeaders(),
    });
    if (!res.ok) return local;
    const envelope = await res.json();
    const data = envelope?.data ?? envelope;
    if (!data || data.empty) return local;

    const remoteConversations = Array.isArray(data.conversations) ? data.conversations : [];
    if (remoteConversations.length === 0) return local;

    // Prefer server when it has more user messages or more conversations
    const localUserMsgs = local.conversations.reduce(
      (n, c) => n + c.messages.filter((m) => m.role === 'user').length,
      0,
    );
    const remoteUserMsgs = remoteConversations.reduce(
      (n: number, c: BuddyConversation) =>
        n + (Array.isArray(c.messages) ? c.messages.filter((m) => m.role === 'user').length : 0),
      0,
    );

    if (remoteUserMsgs >= localUserMsgs || remoteConversations.length > local.conversations.length) {
      const merged: ConversationStore = {
        conversations: remoteConversations as BuddyConversation[],
        activeId:
          typeof data.activeId === 'string'
            ? data.activeId
            : remoteConversations[0]?.id ?? null,
      };
      try {
        window.localStorage.setItem(STORAGE_KEY(userId), JSON.stringify(merged));
      } catch {
        /* ignore */
      }
      return merged;
    }
  } catch {
    /* keep local */
  }
  return local;
}

function newId() {
  return `c_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function titleFromMessages(messages: BuddyMessage[]): string {
  const firstUser = messages.find((m) => m.role === 'user');
  if (!firstUser?.text?.trim()) return 'New chat';
  const t = firstUser.text.trim().replace(/\s+/g, ' ');
  return t.length > 48 ? `${t.slice(0, 48)}…` : t;
}

export function ensureActiveConversation(userId: string): {
  store: ConversationStore;
  active: BuddyConversation;
} {
  const store = readStore(userId);
  let active = store.conversations.find((c) => c.id === store.activeId);

  if (!active) {
    const now = Date.now();
    active = {
      id: newId(),
      title: 'New chat',
      messages: [makeWelcomeMessage()],
      createdAt: now,
      updatedAt: now,
    };
    store.conversations = [active, ...store.conversations];
    store.activeId = active.id;
    writeStore(userId, store);
  }

  return { store, active };
}

export function listConversations(userId: string): BuddyConversation[] {
  return readStore(userId).conversations.slice().sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getActiveConversation(userId: string): BuddyConversation {
  return ensureActiveConversation(userId).active;
}

export function saveActiveMessages(userId: string, messages: BuddyMessage[]): BuddyConversation {
  const store = readStore(userId);
  let active = store.conversations.find((c) => c.id === store.activeId);
  if (!active) {
    const created = ensureActiveConversation(userId);
    active = created.active;
  }
  const updated: BuddyConversation = {
    ...active,
    messages,
    title: titleFromMessages(messages),
    updatedAt: Date.now(),
  };
  store.conversations = store.conversations.map((c) => (c.id === updated.id ? updated : c));
  store.activeId = updated.id;
  writeStore(userId, store);
  return updated;
}

export function startNewConversation(userId: string): BuddyConversation {
  const store = readStore(userId);
  const current = store.conversations.find((c) => c.id === store.activeId);

  if (current && !current.messages.some((m) => m.role === 'user')) {
    store.conversations = store.conversations.filter((c) => c.id !== current.id);
  }

  const now = Date.now();
  const fresh: BuddyConversation = {
    id: newId(),
    title: 'New chat',
    messages: [makeWelcomeMessage()],
    createdAt: now,
    updatedAt: now,
  };
  store.conversations = [fresh, ...store.conversations];
  store.activeId = fresh.id;
  writeStore(userId, store);
  return fresh;
}

export function switchConversation(userId: string, conversationId: string): BuddyConversation | null {
  const store = readStore(userId);
  const target = store.conversations.find((c) => c.id === conversationId);
  if (!target) return null;
  store.activeId = target.id;
  writeStore(userId, store);
  return target;
}

export function deleteConversation(userId: string, conversationId: string): BuddyConversation {
  const store = readStore(userId);
  store.conversations = store.conversations.filter((c) => c.id !== conversationId);

  if (store.activeId === conversationId) {
    if (store.conversations.length === 0) {
      const now = Date.now();
      const fresh: BuddyConversation = {
        id: newId(),
        title: 'New chat',
        messages: [makeWelcomeMessage()],
        createdAt: now,
        updatedAt: now,
      };
      store.conversations = [fresh];
      store.activeId = fresh.id;
    } else {
      store.conversations.sort((a, b) => b.updatedAt - a.updatedAt);
      store.activeId = store.conversations[0].id;
    }
  }

  writeStore(userId, store);
  return store.conversations.find((c) => c.id === store.activeId)!;
}

export function formatChatTime(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}
