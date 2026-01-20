import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import { friendsApi, FriendInfo, FriendRequestInfo, PendingRequests, UserInfo } from '../services/friends';

interface FriendsState {
  friends: FriendInfo[];
  pendingRequests: PendingRequests;
  searchResults: UserInfo[];
  isLoading: boolean;
  error: string | null;
  socket: Socket | null;

  // Actions
  loadFriends: () => Promise<void>;
  loadPendingRequests: () => Promise<void>;
  searchUsers: (query: string) => Promise<void>;
  sendFriendRequest: (receiverId: string, message?: string) => Promise<void>;
  acceptRequest: (requestId: string) => Promise<void>;
  rejectRequest: (requestId: string) => Promise<void>;
  cancelRequest: (requestId: string) => Promise<void>;
  removeFriend: (friendId: string) => Promise<void>;
  connectSocket: () => void;
  disconnectSocket: () => void;
  clearSearchResults: () => void;
  clearError: () => void;
}

const SOCIAL_WS_URL = import.meta.env.VITE_SOCIAL_SERVICE_URL || 'http://localhost:3004';

export const useFriendsStore = create<FriendsState>((set, get) => ({
  friends: [],
  pendingRequests: { incoming: [], outgoing: [] },
  searchResults: [],
  isLoading: false,
  error: null,
  socket: null,

  loadFriends: async () => {
    set({ isLoading: true, error: null });
    try {
      const friends = await friendsApi.getFriends();
      set({ friends, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  loadPendingRequests: async () => {
    set({ isLoading: true, error: null });
    try {
      const pendingRequests = await friendsApi.getPendingRequests();
      set({ pendingRequests, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  searchUsers: async (query: string) => {
    if (query.length < 2) {
      set({ searchResults: [] });
      return;
    }
    try {
      const users = await friendsApi.searchUsers(query);
      set({ searchResults: users });
    } catch (error) {
      console.error('Search failed:', error);
      set({ searchResults: [] });
    }
  },

  sendFriendRequest: async (receiverId: string, message?: string) => {
    set({ error: null });
    try {
      const request = await friendsApi.sendFriendRequest(receiverId, message);
      set(state => ({
        pendingRequests: {
          ...state.pendingRequests,
          outgoing: [request, ...state.pendingRequests.outgoing],
        },
        searchResults: state.searchResults.filter(u => u.id !== receiverId),
      }));
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  acceptRequest: async (requestId: string) => {
    set({ error: null });
    try {
      await friendsApi.acceptFriendRequest(requestId);
      // Reload friends and requests to get updated data
      await get().loadFriends();
      await get().loadPendingRequests();
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  rejectRequest: async (requestId: string) => {
    set({ error: null });
    try {
      await friendsApi.rejectFriendRequest(requestId);
      set(state => ({
        pendingRequests: {
          ...state.pendingRequests,
          incoming: state.pendingRequests.incoming.filter(r => r.id !== requestId),
        },
      }));
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  cancelRequest: async (requestId: string) => {
    set({ error: null });
    try {
      await friendsApi.cancelFriendRequest(requestId);
      set(state => ({
        pendingRequests: {
          ...state.pendingRequests,
          outgoing: state.pendingRequests.outgoing.filter(r => r.id !== requestId),
        },
      }));
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  removeFriend: async (friendId: string) => {
    set({ error: null });
    try {
      await friendsApi.removeFriend(friendId);
      set(state => ({
        friends: state.friends.filter(f => f.id !== friendId),
      }));
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  connectSocket: () => {
    const { socket } = get();
    if (socket?.connected) return;

    const newSocket = io(`${SOCIAL_WS_URL}/friends`, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });

    newSocket.on('connect', () => {
      console.log('Connected to friends socket');
    });

    newSocket.on('notification', (notification: { type: string; data: Record<string, unknown> }) => {
      switch (notification.type) {
        case 'friend_request':
          // Add to incoming requests
          set(state => ({
            pendingRequests: {
              ...state.pendingRequests,
              incoming: [notification.data as unknown as FriendRequestInfo, ...state.pendingRequests.incoming],
            },
          }));
          break;

        case 'friend_accepted':
          // Reload friends list
          get().loadFriends();
          break;

        case 'friend_removed':
          // Remove from friends list
          set(state => ({
            friends: state.friends.filter(f => f.id !== notification.data.removedBy),
          }));
          break;
      }
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from friends socket');
    });

    set({ socket: newSocket });
  },

  disconnectSocket: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null });
    }
  },

  clearSearchResults: () => set({ searchResults: [] }),

  clearError: () => set({ error: null }),
}));
