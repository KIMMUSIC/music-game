import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/common/Layout';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { useAuthStore } from '../stores/authStore';
import { gameHistoryApi, GameHistoryItem, PlayerStats } from '../services/gameHistory';

const GameHistory = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [games, setGames] = useState<GameHistoryItem[]>([]);
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(0);
  const limit = 10;

  useEffect(() => {
    loadData();
  }, [page]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [gamesResult, statsResult] = await Promise.all([
        gameHistoryApi.getMyGames(limit, page * limit),
        page === 0 ? gameHistoryApi.getMyStats() : Promise.resolve(null),
      ]);

      setGames(gamesResult.games);
      setTotal(gamesResult.total);
      if (statsResult) {
        setStats(statsResult);
      }
    } catch (error) {
      console.error('Failed to load game history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Game History</h1>
          <Button variant="outline" onClick={() => navigate('/leaderboard')}>
            View Leaderboard
          </Button>
        </div>

        {/* Stats Summary */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card className="p-4 text-center">
              <p className="text-3xl font-bold text-purple-600">{stats.totalGames}</p>
              <p className="text-sm text-gray-500">Games Played</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-3xl font-bold text-green-600">{stats.totalWins}</p>
              <p className="text-sm text-gray-500">Wins</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-3xl font-bold text-blue-600">{stats.winRate}%</p>
              <p className="text-sm text-gray-500">Win Rate</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-3xl font-bold text-orange-600">{stats.averageAccuracy}%</p>
              <p className="text-sm text-gray-500">Accuracy</p>
            </Card>
          </div>
        )}

        {/* Additional Stats */}
        {stats && (
          <Card className="p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Stats</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.totalScore.toLocaleString()}</p>
                <p className="text-sm text-gray-500">Total Score</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.averageScore}</p>
                <p className="text-sm text-gray-500">Avg Score</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.bestScore.toLocaleString()}</p>
                <p className="text-sm text-gray-500">Best Score</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.currentStreak}</p>
                <p className="text-sm text-gray-500">Win Streak</p>
              </div>
            </div>
          </Card>
        )}

        {/* Game List */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Games</h2>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-purple-600 border-t-transparent" />
            </div>
          ) : games.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">You haven't played any games yet.</p>
              <Button onClick={() => navigate('/room/join')}>Join a Game</Button>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {games.map((game) => (
                  <div
                    key={game.id}
                    className={`flex items-center justify-between p-4 rounded-lg cursor-pointer transition-colors ${
                      game.isWinner
                        ? 'bg-yellow-50 hover:bg-yellow-100 border border-yellow-200'
                        : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                    onClick={() => navigate(`/history/${game.id}`)}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                        game.rank === 1
                          ? 'bg-yellow-400 text-yellow-900'
                          : game.rank === 2
                          ? 'bg-gray-400 text-white'
                          : game.rank === 3
                          ? 'bg-orange-400 text-orange-900'
                          : 'bg-gray-200 text-gray-700'
                      }`}>
                        #{game.rank}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{game.quizTitle}</p>
                        <p className="text-sm text-gray-500">
                          {formatDate(game.playedAt)} - {game.playerCount} players
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">{game.score.toLocaleString()}</p>
                      <p className="text-sm text-gray-500">
                        {game.correctAnswers}/{game.totalRounds} correct
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                  >
                    Previous
                  </Button>
                  <span className="flex items-center px-4 text-gray-600">
                    Page {page + 1} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </Card>
      </div>
    </Layout>
  );
};

export default GameHistory;
