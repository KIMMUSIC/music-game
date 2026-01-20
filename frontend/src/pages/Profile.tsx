import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/common/Layout';
import { Card } from '../components/common/Card';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { useAuthStore } from '../stores/authStore';
import { api } from '../services/api';

const Profile = () => {
  const navigate = useNavigate();
  const { user, setUser, logout } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [nickname, setNickname] = useState(user?.nickname || '');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSaveNickname = async () => {
    setError('');

    if (nickname.length < 2 || nickname.length > 20) {
      setError('Nickname must be between 2 and 20 characters');
      return;
    }

    if (!/^[a-zA-Z0-9가-힣]+$/.test(nickname)) {
      setError('Invalid characters in nickname');
      return;
    }

    setIsLoading(true);

    try {
      const response = await api.put<{ id: string; nickname: string }>(
        '/auth/me/nickname',
        { nickname }
      );

      if (user) {
        setUser({ ...user, nickname: response.nickname });
      }

      setIsEditing(false);
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { status?: number } };
        if (axiosError.response?.status === 409) {
          setError('This nickname is already taken');
        } else {
          setError('Failed to update nickname');
        }
      } else {
        setError('Failed to update nickname');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleCancelEdit = () => {
    setNickname(user?.nickname || '');
    setError('');
    setIsEditing(false);
  };

  if (!user) {
    return null;
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Profile</h1>

        <Card className="p-6">
          <div className="flex items-center gap-4 mb-6">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.nickname}
                className="w-20 h-20 rounded-full object-cover"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-purple-100 flex items-center justify-center">
                <span className="text-2xl font-bold text-purple-600">
                  {user.nickname.charAt(0).toUpperCase()}
                </span>
              </div>
            )}

            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {user.nickname}
              </h2>
              {user.email && (
                <p className="text-gray-500">{user.email}</p>
              )}
            </div>
          </div>

          <div className="border-t pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Account Settings
            </h3>

            <div className="space-y-4">
              {isEditing ? (
                <div className="space-y-3">
                  <Input
                    label="Nickname"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    error={error}
                    maxLength={20}
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={handleSaveNickname}
                      disabled={isLoading}
                      size="sm"
                    >
                      {isLoading ? 'Saving...' : 'Save'}
                    </Button>
                    <Button
                      onClick={handleCancelEdit}
                      variant="outline"
                      size="sm"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Nickname</p>
                    <p className="font-medium">{user.nickname}</p>
                  </div>
                  <Button
                    onClick={() => setIsEditing(true)}
                    variant="outline"
                    size="sm"
                  >
                    Edit
                  </Button>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium">{user.email || 'Not provided'}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t mt-6 pt-6">
            <Button
              onClick={handleLogout}
              variant="outline"
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              Sign Out
            </Button>
          </div>
        </Card>
      </div>
    </Layout>
  );
};

export default Profile;
