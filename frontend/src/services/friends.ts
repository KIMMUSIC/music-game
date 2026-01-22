import { api } from './api';

export interface UserInfo {
  id: string;
  nickname: string;
  avatarUrl: string | null;
}

export interface FriendInfo extends UserInfo {
  friendshipId: string;
  since: Date;
  isOnline?: boolean;
}

export interface FriendRequestInfo {
  id: string;
  sender: UserInfo;
  receiver: UserInfo;
  status: 'pending' | 'accepted' | 'rejected';
  message: string | null;
  createdAt: Date;
}

export interface PendingRequests {
  incoming: FriendRequestInfo[];
  outgoing: FriendRequestInfo[];
}

// Social API uses /social prefix via ALB routing
const SOCIAL_API_PREFIX = '/social';

// Helper to get auth token from localStorage
const getAuthToken = (): string | null => {
  try {
    const authStorage = localStorage.getItem('auth-storage');
    if (authStorage) {
      const parsed = JSON.parse(authStorage);
      return parsed?.state?.token || null;
    }
  } catch {
    // Ignore parsing errors
  }
  return null;
};

const socialApi = {
  async get<T>(endpoint: string): Promise<T> {
    const token = getAuthToken();
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetch(`${SOCIAL_API_PREFIX}${endpoint}`, {
      credentials: 'include',
      headers,
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || 'Request failed');
    }
    return response.json();
  },

  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    const token = getAuthToken();
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetch(`${SOCIAL_API_PREFIX}${endpoint}`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: data ? JSON.stringify(data) : undefined,
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || 'Request failed');
    }
    return response.json();
  },

  async delete(endpoint: string): Promise<void> {
    const token = getAuthToken();
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetch(`${SOCIAL_API_PREFIX}${endpoint}`, {
      method: 'DELETE',
      headers,
      credentials: 'include',
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || 'Request failed');
    }
  },
};

export const friendsApi = {
  // Get all friends
  getFriends: () =>
    socialApi.get<{ friends: FriendInfo[] }>('/friends').then(res => res.friends),

  // Get friend count
  getFriendCount: () =>
    socialApi.get<{ count: number }>('/friends/count').then(res => res.count),

  // Get pending friend requests
  getPendingRequests: () =>
    socialApi.get<PendingRequests>('/friends/requests'),

  // Send a friend request
  sendFriendRequest: (receiverId: string, message?: string) =>
    socialApi.post<{ request: FriendRequestInfo }>('/friends/requests', { receiverId, message })
      .then(res => res.request),

  // Accept a friend request
  acceptFriendRequest: (requestId: string) =>
    socialApi.post<{ request: FriendRequestInfo }>(`/friends/requests/${requestId}/accept`)
      .then(res => res.request),

  // Reject a friend request
  rejectFriendRequest: (requestId: string) =>
    socialApi.post<{ request: FriendRequestInfo }>(`/friends/requests/${requestId}/reject`)
      .then(res => res.request),

  // Cancel a sent friend request
  cancelFriendRequest: (requestId: string) =>
    socialApi.delete(`/friends/requests/${requestId}`),

  // Remove a friend
  removeFriend: (friendId: string) =>
    socialApi.delete(`/friends/${friendId}`),

  // Check if two users are friends
  checkFriendship: (userId: string) =>
    socialApi.get<{ areFriends: boolean }>(`/friends/check/${userId}`)
      .then(res => res.areFriends),

  // Search users
  searchUsers: (query: string) =>
    socialApi.get<{ users: UserInfo[] }>(`/friends/search?q=${encodeURIComponent(query)}`)
      .then(res => res.users),
};
