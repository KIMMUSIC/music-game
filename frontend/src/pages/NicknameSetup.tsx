import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/common/Card';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { useAuthStore } from '../stores/authStore';
import { api } from '../services/api';

const NicknameSetup = () => {
  const navigate = useNavigate();
  const { user, setUser } = useAuthStore();
  const [nickname, setNickname] = useState(user?.nickname || '');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const validateNickname = (value: string): string | null => {
    if (value.length < 2) {
      return 'Nickname must be at least 2 characters';
    }
    if (value.length > 20) {
      return 'Nickname must be 20 characters or less';
    }
    if (!/^[a-zA-Z0-9가-힣]+$/.test(value)) {
      return 'Nickname can only contain letters, numbers, and Korean characters';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const validationError = validateNickname(nickname);
    if (validationError) {
      setError(validationError);
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

      navigate('/');
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { status?: number } };
        if (axiosError.response?.status === 409) {
          setError('This nickname is already taken');
        } else {
          setError('Failed to update nickname. Please try again.');
        }
      } else {
        setError('Failed to update nickname. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 to-blue-500 p-4">
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Choose Your Nickname
          </h1>
          <p className="text-gray-600">
            This is how other players will see you
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            label="Nickname"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="Enter your nickname"
            error={error}
            maxLength={20}
          />

          <div className="flex flex-col gap-3">
            <Button
              type="submit"
              disabled={isLoading || !nickname}
              className="w-full"
            >
              {isLoading ? 'Saving...' : 'Save Nickname'}
            </Button>

            <Button
              type="button"
              variant="ghost"
              onClick={handleSkip}
              className="w-full"
            >
              Skip for now
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default NicknameSetup;
