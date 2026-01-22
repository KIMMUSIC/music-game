import { create } from 'zustand';
import {
  GamePhase,
  GameSong,
  PlayerScore,
  RoundEndedEvent,
  LeaderboardEntry,
  GameEndResult,
  LiveScoreEntry,
  SkipVoteUpdate,
  SkipExecutedEvent,
  HintEvent,
  CorrectAnswerEvent,
  RoundTimeoutEvent,
} from '../services/game';
import { roomSocket, LiveScoreDisplay } from '../services/room';

let listenersInitialized = false;

interface GameState {
  // Game state
  roomId: string | null;
  phase: GamePhase;
  currentRound: number;
  totalRounds: number;
  currentSong: GameSong | null;
  roundStartTime: number | null;
  roundEndTime: number | null;
  hasAnswered: boolean;
  scores: PlayerScore[];

  // First-correct-only mode (always enabled)
  someoneGotIt: boolean;

  // Live score display
  liveScoreDisplay: LiveScoreDisplay;
  liveScores: LiveScoreEntry[];

  // Skip voting
  skipVotingEnabled: boolean;
  hasVotedSkip: boolean;
  skipVoteCount: number;
  totalPlayers: number;
  skipVotePercent: number;
  roundSkipped: boolean;

  // Hints
  hintsEnabled: boolean;
  currentHint: string | null;
  hintPenaltyPercent: number;

  // Playback errors
  hasReportedPlaybackError: boolean;
  playbackErrorCount: number;
  playbackErrorPercent: number;

  // Round results
  roundResult: RoundEndedEvent | null;
  leaderboard: LeaderboardEntry[];

  // Current round answer info (shown during play)
  roundWinner: { playerId: string; nickname: string; points: number } | null;
  revealedAnswer: { title: string; artist: string } | null;

  // Final results
  gameResult: GameEndResult | null;

  // Countdown
  countdownSeconds: number;

  // Next question transition
  showNextQuestion: boolean;

  // UI state
  isLoading: boolean;
  error: string | null;

  // Actions
  setPhase: (phase: GamePhase) => void;
  setCountdown: (seconds: number) => void;
  startRound: (data: {
    round: number;
    totalRounds: number;
    song: GameSong;
    endTime: number;
  }) => void;
  setAnswered: (answered: boolean) => void;
  setRoundResult: (result: RoundEndedEvent) => void;
  setLeaderboard: (leaderboard: LeaderboardEntry[]) => void;
  setGameResult: (result: GameEndResult) => void;
  updateScores: (scores: PlayerScore[]) => void;
  submitAnswer: (roomId: string, answer: string) => Promise<void>;
  voteSkip: (roomId: string) => Promise<void>;
  reportPlaybackError: (roomId: string) => Promise<void>;
  reset: () => void;
  requestGameState: () => Promise<void>;
  initializeListeners: () => void;
}

const initialState = {
  roomId: null,
  phase: 'countdown' as GamePhase,
  currentRound: 0,
  totalRounds: 0,
  currentSong: null,
  roundStartTime: null,
  roundEndTime: null,
  hasAnswered: false,
  scores: [],
  someoneGotIt: false,
  liveScoreDisplay: 'hidden' as LiveScoreDisplay,
  liveScores: [] as LiveScoreEntry[],
  skipVotingEnabled: false,
  hasVotedSkip: false,
  skipVoteCount: 0,
  totalPlayers: 0,
  skipVotePercent: 0,
  roundSkipped: false,
  hintsEnabled: false,
  currentHint: null as string | null,
  hintPenaltyPercent: 0,
  hasReportedPlaybackError: false,
  playbackErrorCount: 0,
  playbackErrorPercent: 0,
  roundResult: null,
  leaderboard: [],
  roundWinner: null as { playerId: string; nickname: string; points: number } | null,
  revealedAnswer: null as { title: string; artist: string } | null,
  gameResult: null,
  countdownSeconds: 3,
  showNextQuestion: false,
  isLoading: false,
  error: null,
};

export const useGameStore = create<GameState>((set, get) => ({
  ...initialState,

  setPhase: (phase) => set({ phase }),

  setCountdown: (seconds) => set({ countdownSeconds: seconds }),

  startRound: (data) => set({
    phase: 'playing',
    currentRound: data.round,
    totalRounds: data.totalRounds,
    currentSong: data.song,
    roundStartTime: Date.now(),
    roundEndTime: data.endTime,
    hasAnswered: false,
    roundResult: null,
    someoneGotIt: false,
    hasVotedSkip: false,
    skipVoteCount: 0,
    skipVotePercent: 0,
    roundSkipped: false,
    currentHint: null,
    hintPenaltyPercent: 0,
    hasReportedPlaybackError: false,
    playbackErrorCount: 0,
    playbackErrorPercent: 0,
    roundWinner: null,
    revealedAnswer: null,
    showNextQuestion: false,
  }),

  setAnswered: (answered) => set({ hasAnswered: answered }),

  setRoundResult: (result) => set({
    phase: 'revealing',
    roundResult: result,
  }),

  setLeaderboard: (leaderboard) => set({
    phase: 'leaderboard',
    leaderboard,
  }),

  setGameResult: (result) => set({
    phase: 'finished',
    gameResult: result,
  }),

  updateScores: (scores) => set({ scores }),

  submitAnswer: async (roomId, answer) => {
    const { hasAnswered } = get();
    // If already got correct answer, don't submit again
    if (hasAnswered) return;

    set({ isLoading: true, error: null });

    const response = await roomSocket.emit('game:submit_answer', {
      roomId,
      answer,
    }) as { success?: boolean; submitted?: boolean; isCorrect?: boolean; error?: string };

    if (response.error) {
      // Clear error quickly for "already correct" case so user can keep chatting
      set({ error: response.error, isLoading: false });
      setTimeout(() => set({ error: null }), 1500);
    } else {
      // Only mark as answered if the answer was correct
      set({ hasAnswered: response.isCorrect === true, isLoading: false });
    }
  },

  voteSkip: async (roomId) => {
    const { hasVotedSkip } = get();
    if (hasVotedSkip) return;

    set({ isLoading: true, error: null });

    const response = await roomSocket.emit('game:vote_skip', {
      roomId,
    }) as any;

    if (response.error) {
      set({ error: response.error, isLoading: false });
    } else {
      set({ hasVotedSkip: true, isLoading: false });
    }
  },

  reportPlaybackError: async (roomId) => {
    const { hasReportedPlaybackError } = get();
    if (hasReportedPlaybackError) return;

    const response = await roomSocket.emit('game:report_playback_error', {
      roomId,
    }) as any;

    if (!response.error) {
      set({ hasReportedPlaybackError: true });
    }
  },

  reset: () => {
    // Remove all game-related socket listeners to prevent duplicates
    const socket = roomSocket.getSocket();
    if (socket) {
      socket.off('game:initialized');
      socket.off('game:state');
      socket.off('game:countdown');
      socket.off('game:round_started');
      socket.off('game:player_answered');
      socket.off('game:first_correct');
      socket.off('game:correct_answer');
      socket.off('game:round_timeout');
      socket.off('game:next_question');
      socket.off('game:score_update');
      socket.off('game:skip_vote_update');
      socket.off('game:skip_executed');
      socket.off('game:playback_error_reported');
      socket.off('game:hint');
      socket.off('game:leaderboard');
      socket.off('game:finished');
    }
    listenersInitialized = false;
    set(initialState);
  },

  requestGameState: async () => {
    const response = await roomSocket.emit('game:get_state', undefined) as any;
    if (response.success && response.state) {
      set({
        roomId: response.state.roomId,
        phase: response.state.phase,
        currentRound: response.state.currentRound,
        totalRounds: response.state.totalRounds,
        currentSong: response.state.currentSong,
        roundEndTime: response.state.roundEndTime,
        someoneGotIt: response.state.someoneGotIt || false,
        // Restore hint state on reconnection
        currentHint: response.state.currentHint || null,
        hintPenaltyPercent: response.state.hintPenaltyPercent || 0,
      });
    }
  },

  initializeListeners: () => {
    const socket = roomSocket.getSocket();
    console.log('initializeListeners called, socket:', socket ? 'exists' : 'null', 'connected:', socket?.connected, 'initialized:', listenersInitialized);
    if (!socket) return;
    if (listenersInitialized) {
      console.log('Listeners already initialized, skipping');
      return;
    }
    listenersInitialized = true;
    console.log('Registering game event listeners');

    // If socket is not connected yet, wait for connection
    if (!socket.connected) {
      console.log('Socket not connected, waiting for connect event');
      socket.once('connect', () => {
        console.log('Socket connected, listeners should work now');
      });
    }

    // Game initialized
    socket.on('game:initialized', (data: {
      roomId: string;
      totalRounds: number;
      skipVotingEnabled?: boolean;
      totalPlayers?: number;
    }) => {
      set({
        roomId: data.roomId,
        totalRounds: data.totalRounds,
        currentRound: 1,
        phase: 'countdown',
        skipVotingEnabled: data.skipVotingEnabled || false,
        totalPlayers: data.totalPlayers || 0,
      });
    });

    // Game state (for reconnection or late join)
    socket.on('game:state', (data: {
      roomId: string;
      phase: GamePhase;
      currentRound: number;
      totalRounds: number;
      currentSong: GameSong | null;
      roundEndTime: number | null;
      skipVotingEnabled?: boolean;
      totalPlayers?: number;
    }) => {
      set({
        roomId: data.roomId,
        phase: data.phase,
        currentRound: data.currentRound,
        totalRounds: data.totalRounds,
        currentSong: data.currentSong,
        roundEndTime: data.roundEndTime,
        skipVotingEnabled: data.skipVotingEnabled || false,
        totalPlayers: data.totalPlayers || 0,
      });
    });

    // Countdown before round
    socket.on('game:countdown', (data: { round: number; totalRounds: number; startsIn: number }) => {
      set({
        phase: 'countdown',
        currentRound: data.round,
        totalRounds: data.totalRounds,
        countdownSeconds: data.startsIn,
      });
    });

    // Round started
    socket.on('game:round_started', (data: {
      round: number;
      totalRounds: number;
      song: GameSong;
      endTime: number;
    }) => {
      console.log('game:round_started received:', data);
      // Calculate our own endTime based on timeLimit to avoid clock sync issues
      const localEndTime = Date.now() + (data.song.timeLimit || 30) * 1000;
      console.log('Using localEndTime:', localEndTime, 'vs server endTime:', data.endTime);
      get().startRound({ ...data, endTime: localEndTime });
    });

    // Player answered
    socket.on('game:player_answered', (data: { playerId: string; nickname: string }) => {
      // Could show indicator that player answered
    });

    // First correct answer (in first_correct_only mode) - legacy event
    socket.on('game:first_correct', (data: { round: number }) => {
      console.log('game:first_correct received:', data);
      set({ someoneGotIt: true });
    });

    // Someone got the correct answer - round ends immediately
    socket.on('game:correct_answer', (data: CorrectAnswerEvent) => {
      console.log('game:correct_answer received:', data);
      set({
        someoneGotIt: true,
        roundWinner: {
          playerId: data.playerId,
          nickname: data.nickname,
          points: data.points,
        },
        revealedAnswer: data.song,
        phase: 'round_ended',
        roundEndTime: null, // Clear timer to prevent affecting next round
      });
    });

    // Round timed out - no one got the answer
    socket.on('game:round_timeout', (data: RoundTimeoutEvent) => {
      console.log('game:round_timeout received:', data);
      set({
        revealedAnswer: data.song,
        roundWinner: null,
        phase: 'round_ended',
        roundSkipped: data.skipped || false,
        roundEndTime: null, // Clear timer to prevent affecting next round
      });
    });

    // Next question transition - show brief overlay before next round starts
    socket.on('game:next_question', (data: { round: number; totalRounds: number }) => {
      console.log('game:next_question received:', data);
      set({
        showNextQuestion: true,
        roundWinner: null,
        revealedAnswer: null,
        someoneGotIt: false,
        hasAnswered: false,
        hasVotedSkip: false,
        skipVoteCount: 0,
        roundSkipped: false,
        currentRound: data.round,
        totalRounds: data.totalRounds,
      });
    });

    // Live score update
    socket.on('game:score_update', (data: { leaderboard: LiveScoreEntry[] }) => {
      console.log('game:score_update received:', data);
      set({ liveScores: data.leaderboard });
    });

    // Skip vote update
    socket.on('game:skip_vote_update', (data: SkipVoteUpdate) => {
      console.log('game:skip_vote_update received:', data);
      set({
        skipVoteCount: data.count,
        totalPlayers: data.total,
        skipVotePercent: data.percent,
      });
    });

    // Skip executed
    socket.on('game:skip_executed', (data: SkipExecutedEvent) => {
      console.log('game:skip_executed received:', data);
      set({ roundSkipped: true });
    });

    // Playback error reported
    socket.on('game:playback_error_reported', (data: { playerId: string; errorCount: number; totalPlayers: number; percent: number }) => {
      console.log('game:playback_error_reported received:', data);
      set({
        playbackErrorCount: data.errorCount,
        playbackErrorPercent: data.percent,
      });
    });

    // Hint revealed
    socket.on('game:hint', (data: HintEvent) => {
      console.log('game:hint received:', data);
      const currentState = get();
      // Only set hint if we're in the correct round
      if (currentState.currentRound === data.round) {
        set({
          currentHint: data.hint,
          hintPenaltyPercent: data.penaltyPercent,
        });
      }
    });

    // Round ended - show results
    socket.on('game:round_ended', (data: RoundEndedEvent) => {
      console.log('game:round_ended received:', data);
      get().setRoundResult(data);
    });

    // Leaderboard
    socket.on('game:leaderboard', (data: { leaderboard: LeaderboardEntry[] }) => {
      console.log('game:leaderboard received:', data);
      get().setLeaderboard(data.leaderboard);
    });

    // Game finished
    socket.on('game:finished', (data: GameEndResult) => {
      console.log('game:finished received:', data);
      get().setGameResult(data);
    });

    // Error
    socket.on('game:error', (data: { message: string }) => {
      set({ error: data.message });
    });
  },
}));
