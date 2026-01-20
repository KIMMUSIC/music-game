import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Layout } from '../components/common/Layout';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { useAuthStore } from '../stores/authStore';
import { useRoomStore } from '../stores/roomStore';
import { quizService, Quiz } from '../services/quiz';
import { ScoringMode } from '../services/room';

const CreateRoom = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const quizId = searchParams.get('quizId');

  const { room, isLoading, error, connect, createRoom, updateRoomSettings, setError } = useRoomStore();

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [maxPlayers, setMaxPlayers] = useState(8);
  const [scoringMode, setScoringMode] = useState<ScoringMode>('all_correct');
  const [chatEnabled, setChatEnabled] = useState(true);
  const [skipVotingEnabled, setSkipVotingEnabled] = useState(false);
  const [skipThresholdPercent, setSkipThresholdPercent] = useState(100);
  const [isLoadingQuiz, setIsLoadingQuiz] = useState(true);

  useEffect(() => {
    if (quizId) {
      loadQuiz(quizId);
    } else {
      setIsLoadingQuiz(false);
    }
  }, [quizId]);

  const { user, token } = useAuthStore();

  useEffect(() => {
    // Connect to room socket when component mounts
    if (token) {
      connect(token);
    }
  }, [connect, token]);

  useEffect(() => {
    if (room) {
      navigate(`/room/${room.id}`);
    }
  }, [room, navigate]);

  const loadQuiz = async (id: string) => {
    try {
      const data = await quizService.getQuiz(id);
      setQuiz(data);
    } catch {
      setError('Failed to load quiz');
    } finally {
      setIsLoadingQuiz(false);
    }
  };

  const handleCreateRoom = async () => {
    if (!quiz) return;

    await createRoom(quiz.id, quiz.title, maxPlayers);
    // Settings will be updated after room is created via useEffect
  };

  // Update room settings when room is created and settings differ from defaults
  useEffect(() => {
    if (room) {
      const settingsToUpdate: Partial<{
        scoringMode: ScoringMode;
        chatEnabled: boolean;
        skipVotingEnabled: boolean;
        skipThresholdPercent: number;
      }> = {};
      if (scoringMode !== 'all_correct') {
        settingsToUpdate.scoringMode = scoringMode;
      }
      if (!chatEnabled) {
        settingsToUpdate.chatEnabled = chatEnabled;
      }
      if (skipVotingEnabled) {
        settingsToUpdate.skipVotingEnabled = skipVotingEnabled;
        settingsToUpdate.skipThresholdPercent = skipThresholdPercent;
      }
      if (Object.keys(settingsToUpdate).length > 0) {
        updateRoomSettings(settingsToUpdate);
      }
    }
  }, [room?.id]);

  if (isLoadingQuiz) {
    return (
      <Layout>
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent" />
        </div>
      </Layout>
    );
  }

  if (!quiz) {
    return (
      <Layout>
        <div className="max-w-md mx-auto text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Select a Quiz
          </h1>
          <p className="text-gray-600 mb-6">
            Please select a quiz from your collection to create a room.
          </p>
          <Button onClick={() => navigate('/quizzes')}>
            Go to My Quizzes
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Create Room</h1>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        <Card className="p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Selected Quiz
          </h2>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="font-medium text-gray-900">{quiz.title}</div>
            {quiz.description && (
              <p className="text-sm text-gray-600 mt-1">{quiz.description}</p>
            )}
            <div className="text-sm text-gray-500 mt-2">
              {quiz.songCount || quiz.songs?.length || 0} songs
            </div>
          </div>
        </Card>

        <Card className="p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Room Settings
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Players
              </label>
              <select
                value={maxPlayers}
                onChange={(e) => setMaxPlayers(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                {[2, 3, 4, 5, 6, 7, 8, 10, 12, 16].map((n) => (
                  <option key={n} value={n}>
                    {n} players
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Scoring Mode
              </label>
              <select
                value={scoringMode}
                onChange={(e) => setScoringMode(e.target.value as ScoringMode)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="all_correct">All Correct Answers Score</option>
                <option value="first_correct_only">First Correct Only</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {scoringMode === 'first_correct_only'
                  ? 'Only the first player to answer correctly earns points.'
                  : 'All players who answer correctly earn points.'}
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Chat
                </label>
                <p className="text-xs text-gray-500">
                  Allow players to chat in the lobby and during gameplay
                </p>
              </div>
              <button
                type="button"
                onClick={() => setChatEnabled(!chatEnabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  chatEnabled ? 'bg-purple-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    chatEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Skip Voting
                </label>
                <p className="text-xs text-gray-500">
                  Allow players to vote to skip difficult songs
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSkipVotingEnabled(!skipVotingEnabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  skipVotingEnabled ? 'bg-purple-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    skipVotingEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {skipVotingEnabled && (
              <div className="ml-4 pl-4 border-l-2 border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Skip Threshold
                </label>
                <select
                  value={skipThresholdPercent}
                  onChange={(e) => setSkipThresholdPercent(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value={50}>50% of players</option>
                  <option value={75}>75% of players</option>
                  <option value={100}>100% (unanimous)</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {skipThresholdPercent === 100
                    ? 'All players must vote to skip.'
                    : `Song skips when ${skipThresholdPercent}% of players vote.`}
                </p>
              </div>
            )}

            <div className="text-sm text-gray-500">
              Host: {user?.nickname}
            </div>
          </div>
        </Card>

        <div className="flex gap-4">
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreateRoom}
            disabled={isLoading}
            className="flex-1"
          >
            {isLoading ? 'Creating...' : 'Create Room'}
          </Button>
        </div>
      </div>
    </Layout>
  );
};

export default CreateRoom;
