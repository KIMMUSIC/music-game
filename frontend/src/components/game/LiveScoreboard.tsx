import { useAuthStore } from '../../stores/authStore';
import { LiveScoreEntry } from '../../services/game';
import { LiveScoreDisplay } from '../../services/room';

interface LiveScoreboardProps {
  scores: LiveScoreEntry[];
  displayMode: LiveScoreDisplay;
}

export const LiveScoreboard = ({ scores, displayMode }: LiveScoreboardProps) => {
  const { user } = useAuthStore();

  if (displayMode === 'hidden' || scores.length === 0) {
    return null;
  }

  // Compact mode: show only top 3 and current user
  if (displayMode === 'compact') {
    const top3 = scores.slice(0, 3);
    const userEntry = scores.find((s) => s.playerId === user?.id);
    const showUserSeparately = userEntry && userEntry.rank > 3;

    return (
      <div className="fixed top-20 right-4 w-48 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-3 z-10">
        <h3 className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
          Live Scores
        </h3>
        <div className="space-y-1">
          {top3.map((entry) => (
            <ScoreRow
              key={entry.playerId}
              entry={entry}
              isUser={entry.playerId === user?.id}
              compact
            />
          ))}
          {showUserSeparately && (
            <>
              <div className="border-t border-gray-200 my-1" />
              <ScoreRow
                entry={userEntry}
                isUser
                compact
              />
            </>
          )}
        </div>
      </div>
    );
  }

  // Full mode: show all players
  return (
    <div className="fixed top-20 right-4 w-56 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-4 z-10 max-h-96 overflow-y-auto">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Live Scores</h3>
      <div className="space-y-2">
        {scores.map((entry) => (
          <ScoreRow
            key={entry.playerId}
            entry={entry}
            isUser={entry.playerId === user?.id}
          />
        ))}
      </div>
    </div>
  );
};

interface ScoreRowProps {
  entry: LiveScoreEntry;
  isUser: boolean;
  compact?: boolean;
}

const ScoreRow = ({ entry, isUser, compact }: ScoreRowProps) => {
  const rankChange = entry.previousRank - entry.rank;

  return (
    <div
      className={`flex items-center gap-2 ${
        compact ? 'text-sm' : 'text-base'
      } ${isUser ? 'font-semibold text-purple-700' : 'text-gray-700'}`}
    >
      <span
        className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${
          entry.rank === 1
            ? 'bg-yellow-400 text-yellow-900'
            : entry.rank === 2
            ? 'bg-gray-300 text-gray-700'
            : entry.rank === 3
            ? 'bg-orange-300 text-orange-800'
            : 'bg-gray-100 text-gray-600'
        }`}
      >
        {entry.rank}
      </span>
      <span className="flex-1 truncate">
        {entry.nickname}
        {isUser && ' (You)'}
      </span>
      <span className="font-mono">{entry.score}</span>
      {rankChange !== 0 && !compact && (
        <span
          className={`text-xs ${
            rankChange > 0 ? 'text-green-500' : 'text-red-500'
          }`}
        >
          {rankChange > 0 ? `+${rankChange}` : rankChange}
        </span>
      )}
    </div>
  );
};

export default LiveScoreboard;
