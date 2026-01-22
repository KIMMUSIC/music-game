import { create } from 'zustand';
import { roomSocket } from '../services/room';
import { ChatMessageData } from '../components/game/ChatMessage';

interface ChatState {
  messages: ChatMessageData[];
  isLoading: boolean;
  error: string | null;

  // Actions
  sendMessage: (content: string, type: 'message' | 'emoji') => Promise<void>;
  loadHistory: (roomId: string, limit?: number) => Promise<void>;
  addMessage: (message: ChatMessageData) => void;
  clearMessages: () => void;
  clearError: () => void;
  initializeListeners: () => void;
  reset: () => void;
}

let listenersInitialized = false;

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  isLoading: false,
  error: null,

  sendMessage: async (content, type) => {
    set({ isLoading: true, error: null });

    const socket = roomSocket.getSocket();
    if (!socket) {
      set({ error: 'Not connected', isLoading: false });
      return;
    }

    return new Promise((resolve) => {
      socket.emit(
        'chat:send',
        { content, type },
        (response: { success?: boolean; error?: string; message?: ChatMessageData }) => {
          if (response.error) {
            set({ error: response.error, isLoading: false });
          } else {
            // Add sender's own message from callback (since broadcast excludes sender)
            if (response.message) {
              get().addMessage(response.message);
            }
            set({ isLoading: false });
          }
          resolve();
        }
      );
    });
  },

  loadHistory: async (roomId, limit = 50) => {
    set({ isLoading: true, error: null });

    const socket = roomSocket.getSocket();
    if (!socket) {
      set({ error: 'Not connected', isLoading: false });
      return;
    }

    return new Promise((resolve) => {
      socket.emit(
        'chat:history',
        { limit },
        (response: { success?: boolean; error?: string; messages?: ChatMessageData[] }) => {
          if (response.error) {
            set({ error: response.error, isLoading: false });
          } else if (response.messages) {
            set({ messages: response.messages, isLoading: false });
          } else {
            set({ isLoading: false });
          }
          resolve();
        }
      );
    });
  },

  addMessage: (message) => {
    set((state) => ({
      messages: [...state.messages, message],
    }));
  },

  clearMessages: () => {
    set({ messages: [] });
  },

  clearError: () => {
    set({ error: null });
  },

  initializeListeners: () => {
    if (listenersInitialized) return;

    const socket = roomSocket.getSocket();
    if (!socket) return;

    socket.on('chat:message', (message: ChatMessageData) => {
      get().addMessage(message);
    });

    listenersInitialized = true;
  },

  reset: () => {
    // Remove chat socket listener to prevent duplicates
    const socket = roomSocket.getSocket();
    if (socket) {
      socket.off('chat:message');
    }
    listenersInitialized = false;
    set({ messages: [], isLoading: false, error: null });
  },
}));
