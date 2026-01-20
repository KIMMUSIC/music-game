export const SERVICE_PORTS = {
  AUTH: 3001,
  QUIZ: 3002,
  GAME: 3003,
  SOCIAL: 3004,
} as const;

export const REDIS_KEYS = {
  SESSION: (sessionId: string) => `session:${sessionId}`,
  USER_SESSIONS: (userId: string) => `user:sessions:${userId}`,
  ROOM_STATE: (roomCode: string) => `room:${roomCode}:state`,
  ROOM_SCORES: (roomCode: string) => `room:${roomCode}:scores`,
  ROOM_ANSWERS: (roomCode: string, questionIndex: number) =>
    `room:${roomCode}:answers:${questionIndex}`,
  PRESENCE: (userId: string) => `presence:${userId}`,
  PRESENCE_ONLINE: 'presence:online',
} as const;

export const JWT_CONSTANTS = {
  ACCESS_TOKEN_EXPIRY: '15m',
  REFRESH_TOKEN_EXPIRY: '7d',
} as const;

export const VALIDATION_RULES = {
  NICKNAME: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 20,
    PATTERN: /^[a-zA-Z0-9_가-힣]+$/,
  },
  ROOM_CODE: {
    LENGTH: 6,
    PATTERN: /^[A-Z0-9]{6}$/,
  },
  QUIZ_TITLE: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 100,
  },
} as const;

export const SCORING = {
  BASE_POINTS: 1000,
  DEFAULT_TIME_LIMIT_SEC: 30,
} as const;
