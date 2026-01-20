interface SkipVoteIndicatorProps {
  count: number;
  total: number;
  percent: number;
  hasVoted: boolean;
  onVoteSkip: () => void;
  disabled?: boolean;
}

export const SkipVoteIndicator = ({
  count,
  total,
  percent,
  hasVoted,
  onVoteSkip,
  disabled = false,
}: SkipVoteIndicatorProps) => {
  return (
    <div className="flex items-center gap-3">
      <button
        onClick={onVoteSkip}
        disabled={disabled || hasVoted}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
          hasVoted
            ? 'bg-orange-100 text-orange-700 cursor-default'
            : disabled
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : 'bg-gray-100 hover:bg-orange-100 text-gray-700 hover:text-orange-700'
        }`}
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 5l7 7-7 7M5 5l7 7-7 7"
          />
        </svg>
        <span className="font-medium">
          {hasVoted ? 'Voted to Skip' : 'Skip Song'}
        </span>
      </button>

      {count > 0 && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <span className="font-medium text-orange-600">{count}</span>
            <span>/</span>
            <span>{total}</span>
          </div>
          <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-orange-500 transition-all duration-300"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
