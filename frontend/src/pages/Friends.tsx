import { useEffect, useState } from 'react';
import { Layout } from '../components/common/Layout';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { useFriendsStore } from '../stores/friendsStore';
import { FriendInfo, FriendRequestInfo, UserInfo } from '../services/friends';

type Tab = 'friends' | 'requests' | 'search';

const Friends = () => {
  const [activeTab, setActiveTab] = useState<Tab>('friends');
  const [searchQuery, setSearchQuery] = useState('');
  const [requestMessage, setRequestMessage] = useState('');
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  const {
    friends,
    pendingRequests,
    searchResults,
    isLoading,
    error,
    loadFriends,
    loadPendingRequests,
    searchUsers,
    sendFriendRequest,
    acceptRequest,
    rejectRequest,
    cancelRequest,
    removeFriend,
    connectSocket,
    disconnectSocket,
    clearSearchResults,
    clearError,
  } = useFriendsStore();

  useEffect(() => {
    loadFriends();
    loadPendingRequests();
    connectSocket();

    return () => {
      disconnectSocket();
    };
  }, []);

  useEffect(() => {
    const delaySearch = setTimeout(() => {
      if (searchQuery.length >= 2) {
        searchUsers(searchQuery);
      } else {
        clearSearchResults();
      }
    }, 300);

    return () => clearTimeout(delaySearch);
  }, [searchQuery]);

  const handleSendRequest = async (userId: string) => {
    try {
      await sendFriendRequest(userId, requestMessage || undefined);
      setRequestMessage('');
      setSelectedUser(null);
    } catch {
      // Error is handled in store
    }
  };

  const incomingCount = pendingRequests.incoming.length;

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Friends</h1>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex justify-between items-center">
            <span>{error}</span>
            <button onClick={clearError} className="text-red-500 hover:text-red-700">
              &times;
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-6">
          <button
            className={`px-6 py-3 font-medium ${
              activeTab === 'friends'
                ? 'text-purple-600 border-b-2 border-purple-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('friends')}
          >
            Friends ({friends.length})
          </button>
          <button
            className={`px-6 py-3 font-medium flex items-center gap-2 ${
              activeTab === 'requests'
                ? 'text-purple-600 border-b-2 border-purple-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('requests')}
          >
            Requests
            {incomingCount > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                {incomingCount}
              </span>
            )}
          </button>
          <button
            className={`px-6 py-3 font-medium ${
              activeTab === 'search'
                ? 'text-purple-600 border-b-2 border-purple-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('search')}
          >
            Add Friends
          </button>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        ) : (
          <>
            {activeTab === 'friends' && (
              <FriendsList friends={friends} onRemove={removeFriend} />
            )}

            {activeTab === 'requests' && (
              <RequestsList
                incoming={pendingRequests.incoming}
                outgoing={pendingRequests.outgoing}
                onAccept={acceptRequest}
                onReject={rejectRequest}
                onCancel={cancelRequest}
              />
            )}

            {activeTab === 'search' && (
              <SearchUsers
                query={searchQuery}
                setQuery={setSearchQuery}
                results={searchResults}
                friends={friends}
                pendingRequests={pendingRequests}
                selectedUser={selectedUser}
                setSelectedUser={setSelectedUser}
                requestMessage={requestMessage}
                setRequestMessage={setRequestMessage}
                onSendRequest={handleSendRequest}
              />
            )}
          </>
        )}
      </div>
    </Layout>
  );
};

interface FriendsListProps {
  friends: FriendInfo[];
  onRemove: (friendId: string) => void;
}

const FriendsList = ({ friends, onRemove }: FriendsListProps) => {
  const [removingId, setRemovingId] = useState<string | null>(null);

  const handleRemove = async (friendId: string) => {
    if (confirm('Are you sure you want to remove this friend?')) {
      setRemovingId(friendId);
      try {
        await onRemove(friendId);
      } finally {
        setRemovingId(null);
      }
    }
  };

  if (friends.length === 0) {
    return (
      <Card className="p-12 text-center">
        <div className="text-gray-400 mb-4">
          <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <h3 className="text-xl font-medium text-gray-700 mb-2">No friends yet</h3>
        <p className="text-gray-500">Search for users to add them as friends!</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {friends.map((friend) => (
        <Card key={friend.id} className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center overflow-hidden">
              {friend.avatarUrl ? (
                <img src={friend.avatarUrl} alt={friend.nickname} className="w-full h-full object-cover" />
              ) : (
                <span className="text-purple-600 font-medium text-lg">
                  {friend.nickname.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div>
              <h3 className="font-medium text-gray-900">{friend.nickname}</h3>
              <p className="text-sm text-gray-500">
                Friends since {new Date(friend.since).toLocaleDateString()}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleRemove(friend.id)}
            disabled={removingId === friend.id}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            {removingId === friend.id ? 'Removing...' : 'Remove'}
          </Button>
        </Card>
      ))}
    </div>
  );
};

interface RequestsListProps {
  incoming: FriendRequestInfo[];
  outgoing: FriendRequestInfo[];
  onAccept: (requestId: string) => void;
  onReject: (requestId: string) => void;
  onCancel: (requestId: string) => void;
}

const RequestsList = ({ incoming, outgoing, onAccept, onReject, onCancel }: RequestsListProps) => {
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleAction = async (action: () => Promise<void>, requestId: string) => {
    setProcessingId(requestId);
    try {
      await action();
    } finally {
      setProcessingId(null);
    }
  };

  const hasNoRequests = incoming.length === 0 && outgoing.length === 0;

  if (hasNoRequests) {
    return (
      <Card className="p-12 text-center">
        <div className="text-gray-400 mb-4">
          <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h3 className="text-xl font-medium text-gray-700 mb-2">No pending requests</h3>
        <p className="text-gray-500">Friend requests will appear here</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {incoming.length > 0 && (
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-3">Incoming Requests</h3>
          <div className="space-y-3">
            {incoming.map((request) => (
              <Card key={request.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center overflow-hidden">
                      {request.sender.avatarUrl ? (
                        <img src={request.sender.avatarUrl} alt={request.sender.nickname} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-purple-600 font-medium text-lg">
                          {request.sender.nickname.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">{request.sender.nickname}</h4>
                      {request.message && (
                        <p className="text-sm text-gray-600 italic">"{request.message}"</p>
                      )}
                      <p className="text-sm text-gray-500">
                        {new Date(request.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleAction(() => onAccept(request.id), request.id)}
                      disabled={processingId === request.id}
                    >
                      Accept
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAction(() => onReject(request.id), request.id)}
                      disabled={processingId === request.id}
                    >
                      Decline
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {outgoing.length > 0 && (
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-3">Sent Requests</h3>
          <div className="space-y-3">
            {outgoing.map((request) => (
              <Card key={request.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
                      {request.receiver.avatarUrl ? (
                        <img src={request.receiver.avatarUrl} alt={request.receiver.nickname} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-gray-600 font-medium text-lg">
                          {request.receiver.nickname.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">{request.receiver.nickname}</h4>
                      <p className="text-sm text-gray-500">Pending</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleAction(() => onCancel(request.id), request.id)}
                    disabled={processingId === request.id}
                    className="text-gray-600"
                  >
                    Cancel
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

interface SearchUsersProps {
  query: string;
  setQuery: (query: string) => void;
  results: UserInfo[];
  friends: FriendInfo[];
  pendingRequests: { incoming: FriendRequestInfo[]; outgoing: FriendRequestInfo[] };
  selectedUser: string | null;
  setSelectedUser: (userId: string | null) => void;
  requestMessage: string;
  setRequestMessage: (message: string) => void;
  onSendRequest: (userId: string) => void;
}

const SearchUsers = ({
  query,
  setQuery,
  results,
  friends,
  pendingRequests,
  selectedUser,
  setSelectedUser,
  requestMessage,
  setRequestMessage,
  onSendRequest,
}: SearchUsersProps) => {
  const isFriend = (userId: string) => friends.some(f => f.id === userId);
  const hasPendingRequest = (userId: string) =>
    pendingRequests.outgoing.some(r => r.receiver.id === userId) ||
    pendingRequests.incoming.some(r => r.sender.id === userId);

  return (
    <div className="space-y-4">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by nickname..."
          className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
        <svg
          className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 transform -translate-y-1/2"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      {query.length < 2 ? (
        <Card className="p-12 text-center">
          <div className="text-gray-400 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-medium text-gray-700 mb-2">Search for users</h3>
          <p className="text-gray-500">Type at least 2 characters to search</p>
        </Card>
      ) : results.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-gray-500">No users found matching "{query}"</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {results.map((user) => (
            <Card key={user.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center overflow-hidden">
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt={user.nickname} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-purple-600 font-medium text-lg">
                        {user.nickname.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <h4 className="font-medium text-gray-900">{user.nickname}</h4>
                </div>
                <div>
                  {isFriend(user.id) ? (
                    <span className="text-green-600 text-sm">Already friends</span>
                  ) : hasPendingRequest(user.id) ? (
                    <span className="text-yellow-600 text-sm">Request pending</span>
                  ) : selectedUser === user.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={requestMessage}
                        onChange={(e) => setRequestMessage(e.target.value)}
                        placeholder="Add a message (optional)"
                        className="px-3 py-1 border border-gray-300 rounded text-sm"
                      />
                      <Button size="sm" onClick={() => onSendRequest(user.id)}>
                        Send
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedUser(null)}>
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button size="sm" onClick={() => setSelectedUser(user.id)}>
                      Add Friend
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Friends;
