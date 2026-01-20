import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../components/common/Layout';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { YouTubePlayer, YouTubePlayerHandle } from '../components/game/YouTubePlayer';
import { LiveScoreboard } from '../components/game/LiveScoreboard';
import { GameChat } from '../components/game/GameChat';
import { SkipVoteIndicator } from '../components/game/SkipVoteIndicator';
import { HintDisplay } from '../components/game/HintDisplay';
import { VolumeControl, useVolume } from '../components/game/VolumeControl';
import { useAuthStore } from '../stores/authStore';
import { useRoomStore } from '../stores/roomStore';
import { useGameStore } from '../stores/gameStore';
import { useChatStore } from '../stores/chatStore';

const GamePlay = () => {
  const { id: roomId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, token } = useAuthStore();
  const { room, connect } = useRoomStore();
  const {
    phase,
    currentRound,
    totalRounds,
    currentSong,
    roundEndTime,
    hasAnswered,
    scoringMode,
    someoneGotIt,
    liveScores,
    roundResult,
    leaderboard,
    gameResult,
    countdownSeconds,
    skipVotingEnabled,
    hasVotedSkip,
    skipVoteCount,
    totalPlayers,
    skipVotePercent,
    currentHint,
    hintPenaltyPercent,
    roundWinner,
    revealedAnswer,
    showNextQuestion,
    isLoading,
    error,
    voteSkip,
    initializeListeners,
    requestGameState,
    reset,
  } = useGameStore();

  const [timeRemaining, setTimeRemaining] = useState(0);
  const [volume, setVolume] = useVolume();
  const audioRef = useRef<HTMLAudioElement>(null);
  const youtubePlayerRef = useRef<YouTubePlayerHandle>(null);
  const { initializeListeners: initChatListeners, reset: resetChat } = useChatStore();

  // Apply volume to HTML5 audio element
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100;
    }
  }, [volume]);

  useEffect(() => {
    if (token) {
      connect(token);
    }

    initializeListeners();
    initChatListeners();

    // Request current game state in case we missed events
    const timer = setTimeout(() => {
      requestGameState();
    }, 500);

    return () => {
      clearTimeout(timer);
      reset();
      resetChat();
    };
  }, [connect, initializeListeners, initChatListeners, requestGameState, reset, resetChat, token]);

  // Debug: log phase changes
  useEffect(() => {
    console.log('GamePlay phase:', phase, 'roundResult:', roundResult, 'gameResult:', gameResult, 'room?.status:', room?.status);
  }, [phase, roundResult, gameResult, room?.status]);

  // Navigate back to lobby when room resets to 'waiting' after game ends
  useEffect(() => {
    if (room?.status === 'waiting' && phase === 'finished') {
      console.log('Room reset to waiting, navigating to lobby');
      reset(); // Reset game state
      navigate(`/room/${roomId}`);
    }
  }, [room?.status, phase, roomId, navigate, reset]);

  // Countdown timer for round
  useEffect(() => {
    if (phase === 'playing' && roundEndTime) {
      const interval = setInterval(() => {
        const remaining = Math.max(0, Math.floor((roundEndTime - Date.now()) / 1000));
        setTimeRemaining(remaining);

        if (remaining === 0) {
          clearInterval(interval);
        }
      }, 100);

      return () => clearInterval(interval);
    }
  }, [phase, roundEndTime]);

  // Countdown before round starts (3, 2, 1)
  const { setCountdown } = useGameStore();
  useEffect(() => {
    if (phase === 'countdown' && countdownSeconds > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdownSeconds - 1);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [phase, countdownSeconds, setCountdown]);

  // Play audio when round starts with looping (continue during round_ended)
  useEffect(() => {
    if ((phase === 'playing' || phase === 'round_ended') && currentSong) {
      const isYouTube = currentSong.sourceType === 'youtube';

      if (isYouTube) {
        // YouTube looping is handled by the YouTubePlayer component
        // No timeout needed - we want continuous looping
      } else if (audioRef.current) {
        const audio = audioRef.current;
        const startTime = currentSong.previewStart;
        const endTime = startTime + currentSong.previewDuration;

        // Set volume before playing
        audio.volume = volume / 100;

        // Only start if not already playing (to avoid restart on phase change)
        if (phase === 'playing') {
          audio.currentTime = startTime;
          audio.play().catch(console.error);
        }

        // Setup loop handler for HTML5 audio
        const handleTimeUpdate = () => {
          if (audio.currentTime >= endTime) {
            audio.currentTime = startTime;
          }
        };

        audio.addEventListener('timeupdate', handleTimeUpdate);

        return () => {
          audio.removeEventListener('timeupdate', handleTimeUpdate);
        };
      }
    }
  }, [phase, currentSong, volume]);

  const handlePlayAgain = () => {
    navigate('/');
  };

  const handleViewResults = () => {
    navigate(`/results/${roomId}`);
  };

  // Countdown phase
  if (phase === 'countdown') {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto text-center py-12">
          <Card className="p-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Round {currentRound} of {totalRounds}
            </h2>
            <div className="text-8xl font-bold text-purple-600 mb-4">
              {countdownSeconds}
            </div>
            <p className="text-xl text-gray-600">Get ready to listen!</p>
          </Card>
        </div>
      </Layout>
    );
  }

  // Playing phase or round_ended - show audio player and chat/answer input
  // round_ended shows the same UI but with answer revealed overlay
  if (phase === 'playing' || phase === 'round_ended') {
    // Always show full live scores
    const displayMode = 'full';
    const chatEnabled = room?.settings?.chatEnabled ?? true;

    return (
      <Layout>
        {/* Live Scoreboard */}
        <LiveScoreboard scores={liveScores} displayMode={displayMode} />

        <div className="max-w-5xl mx-auto px-4">
          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main game area */}
            <div className="lg:col-span-2">
              <Card className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-gray-900">
                    Round {currentRound} / {totalRounds}
                  </h2>
                  <div className="flex items-center gap-4">
                    <VolumeControl volume={volume} onChange={setVolume} />
                    <div className={`text-3xl font-bold ${timeRemaining <= 3 ? 'text-red-600' : 'text-purple-600'}`}>
                      {timeRemaining}s
                    </div>
                  </div>
                </div>

                {/* Audio visualizer placeholder */}
                <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg p-8 mb-6">
                  <div className="flex justify-center items-center gap-1 h-24">
                    {[...Array(20)].map((_, i) => (
                      <div
                        key={i}
                        className="w-2 bg-white rounded-full animate-pulse"
                        style={{
                          height: `${Math.random() * 80 + 20}%`,
                          animationDelay: `${i * 0.1}s`,
                        }}
                      />
                    ))}
                  </div>
                  <p className="text-center text-white mt-4 text-lg">
                    Listen carefully...
                  </p>
                </div>

                {currentSong && (
                  currentSong.sourceType === 'youtube' ? (
                    <YouTubePlayer
                      ref={youtubePlayerRef}
                      videoUrl={currentSong.audioUrl}
                      startTime={currentSong.previewStart}
                      previewDuration={currentSong.previewDuration}
                      autoPlay={true}
                      volume={volume}
                    />
                  ) : (
                    <audio
                      ref={audioRef}
                      src={currentSong.audioUrl}
                      preload="auto"
                    />
                  )
                )}

                {/* Winner announcement overlay */}
                {roundWinner && revealedAnswer && (
                  <div className="bg-gradient-to-r from-green-400 to-emerald-500 rounded-lg p-6 mb-4 text-center text-white animate-pulse">
                    <p className="text-lg font-bold mb-2">
                      🎉 {roundWinner.nickname} got it! (+{roundWinner.points} pts)
                    </p>
                    <p className="text-xl font-bold">
                      {revealedAnswer.title}
                    </p>
                    <p className="text-lg opacity-90">
                      by {revealedAnswer.artist}
                    </p>
                  </div>
                )}

                {/* Timeout announcement overlay */}
                {!roundWinner && revealedAnswer && (
                  <div className="bg-gradient-to-r from-red-400 to-orange-500 rounded-lg p-6 mb-4 text-center text-white">
                    <p className="text-lg font-bold mb-2">
                      ⏰ Time's up! No one got it.
                    </p>
                    <p className="text-xl font-bold">
                      {revealedAnswer.title}
                    </p>
                    <p className="text-lg opacity-90">
                      by {revealedAnswer.artist}
                    </p>
                  </div>
                )}

                {/* Next question transition overlay */}
                {showNextQuestion && (
                  <div className="bg-gradient-to-r from-blue-400 to-purple-500 rounded-lg p-6 mb-4 text-center text-white animate-pulse">
                    <p className="text-2xl font-bold">
                      🎵 다음 문제
                    </p>
                    <p className="text-lg opacity-90 mt-2">
                      Round {currentRound} / {totalRounds}
                    </p>
                  </div>
                )}

                {/* Match Mode Indicator */}
                {currentSong?.matchMode && currentSong.matchMode !== 'title_and_artist' && (
                  <div className="mb-4 text-center">
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
                      currentSong.matchMode === 'title_only'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      {currentSong.matchMode === 'title_only' ? (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Title Only
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Exact Match Required
                        </>
                      )}
                    </span>
                  </div>
                )}

                {/* Hint Display */}
                <HintDisplay hint={currentHint} penaltyPercent={hintPenaltyPercent} />

                {/* Skip Vote Indicator */}
                {skipVotingEnabled && roomId && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <SkipVoteIndicator
                      count={skipVoteCount}
                      total={totalPlayers || room?.players.length || 0}
                      percent={skipVotePercent}
                      hasVoted={hasVotedSkip}
                      onVoteSkip={() => voteSkip(roomId)}
                      disabled={isLoading}
                    />
                  </div>
                )}
              </Card>
            </div>

            {/* Chat/Answer area */}
            <div className="lg:col-span-1 h-[500px]">
              {roomId && (
                <GameChat roomId={roomId} chatEnabled={chatEnabled} />
              )}
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // Revealing phase - show correct answer and results
  if (phase === 'revealing' && roundResult) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto">
          <Card className="p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 text-center">
              Round {roundResult.round} Results
            </h2>

            <div className="bg-purple-50 rounded-lg p-6 mb-6 text-center">
              <p className="text-sm text-purple-600 mb-2">The answer was</p>
              <p className="text-2xl font-bold text-purple-900">
                {roundResult.song.title}
              </p>
              <p className="text-lg text-purple-700">
                by {roundResult.song.artist}
              </p>
            </div>

            {/* First correct player highlight for first_correct_only mode */}
            {roundResult.firstCorrectNickname && (
              <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 mb-6 text-center">
                <p className="text-yellow-800 text-sm">First Correct Answer</p>
                <p className="text-yellow-900 font-bold text-lg">
                  {roundResult.firstCorrectNickname}
                  {roundResult.firstCorrectPlayerId === user?.id && ' (You!)'}
                </p>
              </div>
            )}

            <div className="space-y-3">
              {roundResult.playerResults.map((result) => (
                <div
                  key={result.playerId}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    result.isCorrect ? 'bg-green-50' : 'bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {result.isCorrect ? (
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    ) : (
                      <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-gray-900">
                        {result.nickname}
                        {result.playerId === user?.id && ' (You)'}
                      </p>
                      <p className="text-sm text-gray-500">{result.answer || 'No answer'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    {result.isCorrect && (
                      <>
                        <p className="font-bold text-green-600">+{result.points}</p>
                        {result.timeBonus > 0 && (
                          <p className="text-xs text-green-500">+{result.timeBonus} time bonus</p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </Layout>
    );
  }

  // Leaderboard phase
  if (phase === 'leaderboard') {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto">
          <Card className="p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">
              Leaderboard
            </h2>

            <div className="space-y-3">
              {leaderboard.map((entry, index) => (
                <div
                  key={entry.playerId}
                  className={`flex items-center gap-4 p-4 rounded-lg ${
                    index === 0
                      ? 'bg-yellow-50 border-2 border-yellow-300'
                      : index === 1
                      ? 'bg-gray-100 border-2 border-gray-300'
                      : index === 2
                      ? 'bg-orange-50 border-2 border-orange-300'
                      : 'bg-gray-50'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                    index === 0
                      ? 'bg-yellow-400 text-yellow-900'
                      : index === 1
                      ? 'bg-gray-400 text-white'
                      : index === 2
                      ? 'bg-orange-400 text-orange-900'
                      : 'bg-gray-200 text-gray-700'
                  }`}>
                    {entry.rank}
                  </div>

                  {entry.avatarUrl ? (
                    <img
                      src={entry.avatarUrl}
                      alt={entry.nickname}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                      <span className="text-lg font-bold text-purple-600">
                        {entry.nickname.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}

                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">
                      {entry.nickname}
                      {entry.playerId === user?.id && ' (You)'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {entry.correctAnswers} correct answers
                    </p>
                  </div>

                  <div className="text-xl font-bold text-purple-600">
                    {entry.score}
                  </div>
                </div>
              ))}
            </div>

            <p className="text-center text-gray-500 mt-6">
              Next round starting soon...
            </p>
          </Card>
        </div>
      </Layout>
    );
  }

  // Finished phase - show final results
  if (phase === 'finished' && gameResult) {
    const winner = gameResult.leaderboard[0];
    const myResult = gameResult.leaderboard.find((e) => e.playerId === user?.id);

    return (
      <Layout>
        <div className="max-w-2xl mx-auto">
          <Card className="p-6 mb-6 text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Game Over!
            </h1>
            <p className="text-gray-600 mb-6">{gameResult.quizTitle}</p>

            {/* Winner announcement */}
            <div className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-lg p-6 mb-6 text-white">
              <p className="text-lg mb-2">Winner</p>
              <div className="flex items-center justify-center gap-4">
                {winner.avatarUrl ? (
                  <img
                    src={winner.avatarUrl}
                    alt={winner.nickname}
                    className="w-16 h-16 rounded-full object-cover border-4 border-white"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center border-4 border-white">
                    <span className="text-2xl font-bold">
                      {winner.nickname.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="text-left">
                  <p className="text-2xl font-bold">{winner.nickname}</p>
                  <p className="text-lg">{winner.score} points</p>
                </div>
              </div>
            </div>

            {/* My result */}
            {myResult && myResult.playerId !== winner.playerId && (
              <div className="bg-purple-50 rounded-lg p-4 mb-6">
                <p className="text-purple-600 mb-1">Your result</p>
                <p className="text-2xl font-bold text-purple-900">
                  #{myResult.rank} - {myResult.score} points
                </p>
                <p className="text-purple-700">
                  {myResult.correctAnswers} correct answers
                </p>
              </div>
            )}
          </Card>

          {/* Final leaderboard */}
          <Card className="p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Final Standings
            </h2>
            <div className="space-y-2">
              {gameResult.leaderboard.map((entry) => (
                <div
                  key={entry.playerId}
                  className={`flex items-center gap-3 p-3 rounded-lg ${
                    entry.playerId === user?.id ? 'bg-purple-50' : 'bg-gray-50'
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-700">
                    {entry.rank}
                  </div>
                  <div className="flex-1">
                    <span className="font-medium">{entry.nickname}</span>
                    {entry.playerId === user?.id && (
                      <span className="text-purple-600 ml-2">(You)</span>
                    )}
                  </div>
                  <span className="font-bold text-gray-900">{entry.score}</span>
                </div>
              ))}
            </div>
          </Card>

          <div className="flex gap-4">
            <Button variant="outline" onClick={handlePlayAgain} className="flex-1">
              Play Again
            </Button>
            <Button onClick={handleViewResults} className="flex-1">
              View Details
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  // Loading state
  return (
    <Layout>
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent" />
      </div>
    </Layout>
  );
};

export default GamePlay;
