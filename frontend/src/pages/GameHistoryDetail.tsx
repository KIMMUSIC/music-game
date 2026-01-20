import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../components/common/Layout';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { useAuthStore } from '../stores/authStore';
import { gameHistoryApi, GameDetails } from '../services/gameHistory';

const GameHistoryDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [game, setGame] = useState<GameDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRound, setExpandedRound] = useState<number | null>(null);

  useEffect(() => {
    if (id) {
      loadGame();
    }
  }, [id]);

  const loadGame = async () => {
    if (!id) return;

    try {
      const data = await gameHistoryApi.getGameDetails(id);
      setGame(data);
    } catch (err) {
      setError('Failed to load game details');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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

  if (error || !game) {
    return (
      <Layout>
        <div className="max-w-md mx-auto text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Game Not Found</h1>
          <p className="text-gray-600 mb-6">{error || 'This game no longer exists.'}</p>
          <Button onClick={() => navigate('/history')}>Back to History</Button>
        </div>
      </Layout>
    );
  }

  const winner = game.playerResults.find((p) => p.isWinner);
  const myResult = game.playerResults.find((p) => p.playerId === user?.id);

  return (
    <Layout>
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate('/history')} className="mb-4">
            &larr; Back to History
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">{game.quizTitle}</h1>
          <p className="text-gray-600">{formatDate(game.playedAt)}</p>
        </div>

        {/* Game Summary */}
        <Card className="p-6 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-purple-600">{game.playerCount}</p>
              <p className="text-sm text-gray-500">Players</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-600">{game.totalRounds}</p>
              <p className="text-sm text-gray-500">Rounds</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{formatDuration(game.durationMs)}</p>
              <p className="text-sm text-gray-500">Duration</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-orange-600">{winner?.playerNickname || '-'}</p>
              <p className="text-sm text-gray-500">Winner</p>
            </div>
          </div>
        </Card>

        {/* My Result */}
        {myResult && (
          <Card className={`p-6 mb-6 ${myResult.isWinner ? 'bg-yellow-50 border-2 border-yellow-300' : ''}`}>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Result</h2>
            <div className="flex items-center gap-6">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold ${
                myResult.rank === 1
                  ? 'bg-yellow-400 text-yellow-900'
                  : myResult.rank === 2
                  ? 'bg-gray-400 text-white'
                  : myResult.rank === 3
                  ? 'bg-orange-400 text-orange-900'
                  : 'bg-gray-200 text-gray-700'
              }`}>
                #{myResult.rank}
              </div>
              <div className="flex-1 grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-gray-900">{myResult.score.toLocaleString()}</p>
                  <p className="text-sm text-gray-500">Score</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{myResult.correctAnswers}</p>
                  <p className="text-sm text-gray-500">Correct</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {Math.round((myResult.correctAnswers / myResult.totalAnswers) * 100)}%
                  </p>
                  <p className="text-sm text-gray-500">Accuracy</p>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Final Standings */}
        <Card className="p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Final Standings</h2>
          <div className="space-y-2">
            {game.playerResults
              .sort((a, b) => a.rank - b.rank)
              .map((player) => (
                <div
                  key={player.id}
                  className={`flex items-center gap-3 p-3 rounded-lg ${
                    player.playerId === user?.id
                      ? 'bg-purple-50 border border-purple-200'
                      : 'bg-gray-50'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                    player.rank === 1
                      ? 'bg-yellow-400 text-yellow-900'
                      : player.rank === 2
                      ? 'bg-gray-400 text-white'
                      : player.rank === 3
                      ? 'bg-orange-400 text-orange-900'
                      : 'bg-gray-200 text-gray-700'
                  }`}>
                    {player.rank}
                  </div>

                  {player.playerAvatarUrl ? (
                    <img
                      src={player.playerAvatarUrl}
                      alt={player.playerNickname}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                      <span className="text-sm font-bold text-purple-600">
                        {player.playerNickname.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}

                  <div className="flex-1">
                    <span className="font-medium text-gray-900">{player.playerNickname}</span>
                    {player.playerId === user?.id && (
                      <span className="text-purple-600 ml-2 text-sm">(You)</span>
                    )}
                    <span className="text-gray-500 text-sm ml-2">
                      - {player.correctAnswers}/{player.totalAnswers} correct
                    </span>
                  </div>

                  <span className="font-bold text-gray-900">{player.score.toLocaleString()}</span>
                </div>
              ))}
          </div>
        </Card>

        {/* Round Details */}
        <Card className="p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Round Details</h2>
          <div className="space-y-3">
            {game.roundData.map((round, index) => (
              <div key={index} className="border rounded-lg overflow-hidden">
                <button
                  onClick={() => setExpandedRound(expandedRound === index ? null : index)}
                  className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold">
                      {index + 1}
                    </span>
                    <div className="text-left">
                      <p className="font-medium text-gray-900">{round.songTitle}</p>
                      <p className="text-sm text-gray-500">{round.songArtist}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-500">
                      {round.correctAnswers}/{game.playerCount} correct
                    </span>
                    <svg
                      className={`w-5 h-5 text-gray-400 transition-transform ${
                        expandedRound === index ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {expandedRound === index && (
                  <div className="p-4 border-t">
                    <div className="space-y-2">
                      {game.playerResults.map((player) => {
                        const answer = player.answerDetails.find((a) => a.round === index + 1);
                        return (
                          <div
                            key={player.id}
                            className={`flex items-center justify-between p-2 rounded ${
                              answer?.isCorrect ? 'bg-green-50' : 'bg-gray-50'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {answer?.isCorrect ? (
                                <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              ) : (
                                <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              )}
                              <span className="font-medium">{player.playerNickname}</span>
                              <span className="text-gray-500 text-sm">
                                "{answer?.answer || 'No answer'}"
                              </span>
                            </div>
                            {answer?.isCorrect && (
                              <span className="text-green-600 font-medium">
                                +{answer.points}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>

        <div className="flex gap-4">
          <Button variant="outline" onClick={() => navigate('/history')} className="flex-1">
            Back to History
          </Button>
          <Button onClick={() => navigate('/')} className="flex-1">
            Play Again
          </Button>
        </div>
      </div>
    </Layout>
  );
};

export default GameHistoryDetail;
