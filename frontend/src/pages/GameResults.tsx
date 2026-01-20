import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../components/common/Layout';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { useAuthStore } from '../stores/authStore';
import { gameApi, GameEndResult } from '../services/game';

const GameResults = () => {
  const { id: roomId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [results, setResults] = useState<GameEndResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRound, setExpandedRound] = useState<number | null>(null);

  useEffect(() => {
    if (roomId) {
      loadResults();
    }
  }, [roomId]);

  const loadResults = async () => {
    if (!roomId) return;

    try {
      const data = await gameApi.getResults(roomId);
      setResults(data);
    } catch (err) {
      setError('Failed to load game results');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent" />
        </div>
      </Layout>
    );
  }

  if (error || !results) {
    return (
      <Layout>
        <div className="max-w-md mx-auto text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Results Not Found
          </h1>
          <p className="text-gray-600 mb-6">
            {error || 'Game results are no longer available.'}
          </p>
          <Button onClick={() => navigate('/')}>Go Home</Button>
        </div>
      </Layout>
    );
  }

  const winner = results.leaderboard[0];
  const myResult = results.leaderboard.find((e) => e.playerId === user?.id);

  return (
    <Layout>
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {results.quizTitle}
          </h1>
          <p className="text-gray-600">
            Game completed in {formatDuration(results.duration)}
          </p>
        </div>

        {/* Winner Card */}
        <Card className="p-6 mb-6 bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-300">
          <div className="flex items-center gap-6">
            <div className="relative">
              {winner.avatarUrl ? (
                <img
                  src={winner.avatarUrl}
                  alt={winner.nickname}
                  className="w-20 h-20 rounded-full object-cover border-4 border-yellow-400"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-yellow-100 flex items-center justify-center border-4 border-yellow-400">
                  <span className="text-3xl font-bold text-yellow-600">
                    {winner.nickname.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-yellow-900" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </div>
            </div>
            <div>
              <p className="text-sm text-yellow-700 font-medium">Winner</p>
              <p className="text-2xl font-bold text-gray-900">{winner.nickname}</p>
              <p className="text-lg text-gray-700">
                {winner.score} points - {winner.correctAnswers} correct
              </p>
            </div>
          </div>
        </Card>

        {/* Leaderboard */}
        <Card className="p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Final Leaderboard
          </h2>
          <div className="space-y-2">
            {results.leaderboard.map((entry) => (
              <div
                key={entry.playerId}
                className={`flex items-center gap-3 p-3 rounded-lg ${
                  entry.playerId === user?.id
                    ? 'bg-purple-50 border border-purple-200'
                    : 'bg-gray-50'
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                  entry.rank === 1
                    ? 'bg-yellow-400 text-yellow-900'
                    : entry.rank === 2
                    ? 'bg-gray-400 text-white'
                    : entry.rank === 3
                    ? 'bg-orange-400 text-orange-900'
                    : 'bg-gray-200 text-gray-700'
                }`}>
                  {entry.rank}
                </div>

                {entry.avatarUrl ? (
                  <img
                    src={entry.avatarUrl}
                    alt={entry.nickname}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                    <span className="text-sm font-bold text-purple-600">
                      {entry.nickname.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}

                <div className="flex-1">
                  <span className="font-medium text-gray-900">{entry.nickname}</span>
                  {entry.playerId === user?.id && (
                    <span className="text-purple-600 ml-2 text-sm">(You)</span>
                  )}
                  <span className="text-gray-500 text-sm ml-2">
                    - {entry.correctAnswers} correct
                  </span>
                </div>

                <span className="font-bold text-gray-900">{entry.score}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Round by Round Results */}
        <Card className="p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Round Details
          </h2>
          <div className="space-y-3">
            {results.roundResults.map((round) => (
              <div key={round.songIndex} className="border rounded-lg overflow-hidden">
                <button
                  onClick={() => setExpandedRound(
                    expandedRound === round.songIndex ? null : round.songIndex
                  )}
                  className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold">
                      {round.songIndex + 1}
                    </span>
                    <div className="text-left">
                      <p className="font-medium text-gray-900">{round.song.title}</p>
                      <p className="text-sm text-gray-500">{round.song.artist}</p>
                    </div>
                  </div>
                  <svg
                    className={`w-5 h-5 text-gray-400 transition-transform ${
                      expandedRound === round.songIndex ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {expandedRound === round.songIndex && (
                  <div className="p-4 border-t">
                    <div className="space-y-2">
                      {round.playerResults.map((result) => (
                        <div
                          key={result.playerId}
                          className={`flex items-center justify-between p-2 rounded ${
                            result.isCorrect ? 'bg-green-50' : 'bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {result.isCorrect ? (
                              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            )}
                            <span className="font-medium">{result.nickname}</span>
                            <span className="text-gray-500 text-sm">
                              "{result.answer || 'No answer'}"
                            </span>
                          </div>
                          {result.isCorrect && (
                            <span className="text-green-600 font-medium">
                              +{result.points}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>

        <div className="flex gap-4">
          <Button variant="outline" onClick={() => navigate('/')} className="flex-1">
            Back to Home
          </Button>
          <Button onClick={() => navigate('/quizzes')} className="flex-1">
            Create New Quiz
          </Button>
        </div>
      </div>
    </Layout>
  );
};

export default GameResults;
