interface HintDisplayProps {
  hint: string | null;
  penaltyPercent: number;
}

export const HintDisplay = ({ hint, penaltyPercent }: HintDisplayProps) => {
  if (!hint) return null;

  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-2">
        <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
        <span className="text-sm font-medium text-gray-700">Hint</span>
        {penaltyPercent > 0 && (
          <span className="text-xs text-amber-600 ml-auto">
            -{penaltyPercent}% points
          </span>
        )}
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 animate-fadeIn">
        <p className="text-amber-900">{hint}</p>
      </div>
    </div>
  );
};
