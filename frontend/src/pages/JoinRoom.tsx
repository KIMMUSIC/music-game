import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/common/Layout';
import { Card } from '../components/common/Card';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { useAuthStore } from '../stores/authStore';
import { useRoomStore } from '../stores/roomStore';

const JoinRoom = () => {
  const navigate = useNavigate();
  const { token } = useAuthStore();
  const { room, isLoading, error, connect, joinRoom, setError } = useRoomStore();

  const [code, setCode] = useState('');

  useEffect(() => {
    if (token) {
      connect(token);
    }
  }, [connect, token]);

  useEffect(() => {
    if (room) {
      navigate(`/room/${room.id}`);
    }
  }, [room, navigate]);

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (value.length <= 6) {
      setCode(value);
      setError(null);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (code.length !== 6) {
      setError('Room code must be 6 characters');
      return;
    }

    await joinRoom(code);
  };

  return (
    <Layout>
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Join Room</h1>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        <Card className="p-6">
          <form onSubmit={handleJoin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Room Code
              </label>
              <input
                type="text"
                value={code}
                onChange={handleCodeChange}
                placeholder="Enter 6-character code"
                className="w-full px-4 py-3 text-2xl text-center font-mono tracking-widest border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent uppercase"
                maxLength={6}
                autoFocus
              />
              <p className="text-sm text-gray-500 mt-2 text-center">
                Ask the host for the room code
              </p>
            </div>

            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/')}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading || code.length !== 6}
                className="flex-1"
              >
                {isLoading ? 'Joining...' : 'Join Room'}
              </Button>
            </div>
          </form>
        </Card>

        <div className="mt-8 text-center">
          <p className="text-gray-600 mb-4">Want to create your own room?</p>
          <Button variant="outline" onClick={() => navigate('/quizzes')}>
            Create from My Quizzes
          </Button>
        </div>
      </div>
    </Layout>
  );
};

export default JoinRoom;
