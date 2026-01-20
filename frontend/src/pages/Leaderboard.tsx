import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/common/Layout';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { useAuthStore } from '../stores/authStore';
import { gameHistoryApi, GlobalLeaderboardEntry } from '../services/gameHistory';

const Leaderboard = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [leaderboard, setLeaderboard] = useState<GlobalLeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    try {
      const data = await gameHistoryApi.getGlobalLeaderboard(50);
      setLeaderboard(data.leaderboard);
    } catch (error) {
      console.error('Failed to load leaderboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const myRank = leaderboard.findIndex((e) => e.playerId === user?.id) + 1;

  return (
    <Layout>
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Global Leaderboard</h1>
          <Button variant="outline" onClick={() => navigate('/history')}>
            My History
          </Button>
        </div>

        {/* Top 3 Podium */}
        {leaderboard.length >= 3 && (
          <div className="flex justify-center items-end gap-4 mb-8">
            {/* Second Place */}
            <div className="text-center">
              <div className="relative mb-2">
                {leaderboard[1].avatarUrl ? (
                  <img
                    src={leaderboard[1].avatarUrl}
                    alt={leaderboard[1].nickname}
                    className="w-16 h-16 rounded-full object-cover mx-auto border-4 border-gray-400"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto border-4 border-gray-400">
                    <span className="text-2xl font-bold text-gray-600">
                      {leaderboard[1].nickname.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center text-white font-bold">
                  2
                </div>
              </div>
              <p className="font-medium text-gray-900 mt-4">{leaderboard[1].nickname}</p>
              <p className="text-lg font-bold text-gray-600">{leaderboard[1].totalScore.toLocaleString()}</p>
              <div className="h-24 w-20 bg-gray-200 rounded-t-lg mt-2" />
            </div>

            {/* First Place */}
            <div className="text-center">
              <div className="relative mb-2">
                {leaderboard[0].avatarUrl ? (
                  <img
                    src={leaderboard[0].avatarUrl}
                    alt={leaderboard[0].nickname}
                    className="w-20 h-20 rounded-full object-cover mx-auto border-4 border-yellow-400"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-yellow-100 flex items-center justify-center mx-auto border-4 border-yellow-400">
                    <span className="text-3xl font-bold text-yellow-600">
                      {leaderboard[0].nickname.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center text-yellow-900 font-bold">
                  1
                </div>
              </div>
              <p className="font-medium text-gray-900 mt-4">{leaderboard[0].nickname}</p>
              <p className="text-xl font-bold text-yellow-600">{leaderboard[0].totalScore.toLocaleString()}</p>
              <div className="h-32 w-24 bg-yellow-200 rounded-t-lg mt-2" />
            </div>

            {/* Third Place */}
            <div className="text-center">
              <div className="relative mb-2">
                {leaderboard[2].avatarUrl ? (
                  <img
                    src={leaderboard[2].avatarUrl}
                    alt={leaderboard[2].nickname}
                    className="w-16 h-16 rounded-full object-cover mx-auto border-4 border-orange-400"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center mx-auto border-4 border-orange-400">
                    <span className="text-2xl font-bold text-orange-600">
                      {leaderboard[2].nickname.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-8 h-8 bg-orange-400 rounded-full flex items-center justify-center text-orange-900 font-bold">
                  3
                </div>
              </div>
              <p className="font-medium text-gray-900 mt-4">{leaderboard[2].nickname}</p>
              <p className="text-lg font-bold text-orange-600">{leaderboard[2].totalScore.toLocaleString()}</p>
              <div className="h-16 w-20 bg-orange-200 rounded-t-lg mt-2" />
            </div>
          </div>
        )}

        {/* My Rank */}
        {myRank > 0 && (
          <Card className="p-4 mb-6 bg-purple-50 border-2 border-purple-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                  #{myRank}
                </span>
                <span className="font-medium text-purple-900">Your Rank</span>
              </div>
              <span className="font-bold text-purple-600">
                {leaderboard[myRank - 1]?.totalScore.toLocaleString()} points
              </span>
            </div>
          </Card>
        )}

        {/* Full Leaderboard */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">All Players</h2>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-purple-600 border-t-transparent" />
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No players yet. Be the first to play!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {leaderboard.map((entry, index) => (
                <div
                  key={entry.playerId}
                  className={`flex items-center gap-3 p-3 rounded-lg ${
                    entry.playerId === user?.id
                      ? 'bg-purple-50 border border-purple-200'
                      : 'bg-gray-50'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                    index === 0
                      ? 'bg-yellow-400 text-yellow-900'
                      : index === 1
                      ? 'bg-gray-400 text-white'
                      : index === 2
                      ? 'bg-orange-400 text-orange-900'
                      : 'bg-gray-200 text-gray-700'
                  }`}>
                    {index + 1}
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
                  </div>

                  <div className="text-right">
                    <p className="font-bold text-gray-900">{entry.totalScore.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">
                      {entry.gamesPlayed} games - {entry.wins} wins
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </Layout>
  );
};

export default Leaderboard;
