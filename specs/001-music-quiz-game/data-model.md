# Data Model: Music Quiz Game Platform

**Branch**: `001-music-quiz-game`
**Date**: 2025-01-17
**Database**: PostgreSQL (AWS RDS)

## Entity Relationship Diagram

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│    User     │───┬───│  QuizSet    │───────│  Question   │
└─────────────┘   │   └─────────────┘       └─────────────┘
       │          │          │
       │          │          │
       ▼          │          ▼
┌─────────────┐   │   ┌─────────────┐
│  Friend     │   │   │   Answer    │
│ Relationship│   │   │ (embedded)  │
└─────────────┘   │   └─────────────┘
       │          │
       │          ▼
       │   ┌─────────────┐       ┌─────────────┐
       │   │  GameRoom   │───────│   Game      │
       │   └─────────────┘       │ Participant │
       │          │              └─────────────┘
       │          │                    │
       │          ▼                    │
       │   ┌─────────────┐            │
       └───│AnswerSubmit │◄───────────┘
           └─────────────┘
```

## Entities

### User (Auth Service)

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| oauth_provider | VARCHAR(20) | NOT NULL | 'google' or 'kakao' |
| oauth_id | VARCHAR(255) | NOT NULL, UNIQUE with provider | Provider's user ID |
| email | VARCHAR(255) | NULLABLE | Email from OAuth (if consented) |
| nickname | VARCHAR(20) | NOT NULL, UNIQUE | Display name (2-20 chars) |
| avatar_url | VARCHAR(500) | NULLABLE | Profile image URL |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Registration time |
| updated_at | TIMESTAMP | NOT NULL | Last profile update |
| last_login_at | TIMESTAMP | NULLABLE | Last successful login |

**Indexes**:
- `idx_user_oauth` ON (oauth_provider, oauth_id) UNIQUE
- `idx_user_nickname` ON (nickname) UNIQUE

**Validation Rules**:
- nickname: 2-20 characters, alphanumeric + underscore + Korean
- email: Valid email format (if provided)

---

### QuizSet (Quiz Service)

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| creator_id | UUID | FK → User.id, NOT NULL | Owner of the quiz |
| title | VARCHAR(100) | NOT NULL | Quiz title |
| description | TEXT | NULLABLE | Optional description |
| visibility | VARCHAR(20) | NOT NULL, DEFAULT 'public' | 'public', 'private', 'friends' |
| question_count | INT | NOT NULL, DEFAULT 0 | Denormalized count |
| play_count | INT | NOT NULL, DEFAULT 0 | Times played |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Creation time |
| updated_at | TIMESTAMP | NOT NULL | Last modification |
| deleted_at | TIMESTAMP | NULLABLE | Soft delete |

**Indexes**:
- `idx_quizset_creator` ON (creator_id)
- `idx_quizset_visibility` ON (visibility) WHERE deleted_at IS NULL
- `idx_quizset_created` ON (created_at DESC)

**Validation Rules**:
- title: 1-100 characters
- Must have at least 1 question to be playable

---

### Question (Quiz Service)

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| quiz_set_id | UUID | FK → QuizSet.id, NOT NULL | Parent quiz |
| order_index | INT | NOT NULL | Position in quiz (0-based) |
| audio_type | VARCHAR(20) | NOT NULL | 'youtube' or 'mp3' |
| audio_source | VARCHAR(500) | NOT NULL | YouTube URL or S3 key |
| start_time_ms | INT | NOT NULL | Playback start (milliseconds) |
| end_time_ms | INT | NOT NULL | Playback end (milliseconds) |
| time_limit_sec | INT | NOT NULL, DEFAULT 30 | Answer time limit |
| answers | JSONB | NOT NULL | Array of acceptable answers |
| hint | VARCHAR(200) | NULLABLE | Optional hint text |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Creation time |
| updated_at | TIMESTAMP | NOT NULL | Last modification |

**Indexes**:
- `idx_question_quiz` ON (quiz_set_id, order_index)

**Validation Rules**:
- audio_type: Must be 'youtube' or 'mp3'
- For youtube: audio_source must be valid YouTube URL or video ID
- For mp3: audio_source must be valid S3 key
- start_time_ms < end_time_ms
- end_time_ms - start_time_ms <= 60000 (max 60 second clip)
- answers: 1-10 items, each 1-100 characters

**Answers JSONB Structure**:
```json
{
  "primary": "IU",
  "alternatives": ["아이유", "Lee Ji-eun", "이지은"]
}
```

---

### GameRoom (Game Service)

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| room_code | VARCHAR(6) | NOT NULL, UNIQUE | Join code (e.g., "ABC123") |
| host_id | UUID | FK → User.id, NOT NULL | Room creator |
| quiz_set_id | UUID | FK → QuizSet.id, NOT NULL | Selected quiz |
| status | VARCHAR(20) | NOT NULL, DEFAULT 'lobby' | 'lobby', 'playing', 'finished' |
| max_players | INT | NOT NULL, DEFAULT 10 | Player limit (2-20) |
| current_question | INT | NOT NULL, DEFAULT -1 | Current question index (-1 = not started) |
| settings | JSONB | NOT NULL, DEFAULT '{}' | Room configuration |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Creation time |
| started_at | TIMESTAMP | NULLABLE | Game start time |
| finished_at | TIMESTAMP | NULLABLE | Game end time |

**Indexes**:
- `idx_gameroom_code` ON (room_code) UNIQUE WHERE status != 'finished'
- `idx_gameroom_host` ON (host_id)
- `idx_gameroom_status` ON (status) WHERE status = 'lobby'

**Validation Rules**:
- room_code: 6 alphanumeric characters (uppercase)
- max_players: 2-20
- Status transitions: lobby → playing → finished

**Settings JSONB Structure**:
```json
{
  "allowLateJoin": false,
  "showLeaderboardDuringGame": true,
  "questionTimeLimit": 30
}
```

---

### GameParticipant (Game Service)

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| room_id | UUID | FK → GameRoom.id, NOT NULL | Parent room |
| user_id | UUID | FK → User.id, NOT NULL | Player |
| score | INT | NOT NULL, DEFAULT 0 | Current total score |
| correct_count | INT | NOT NULL, DEFAULT 0 | Correct answers |
| is_active | BOOLEAN | NOT NULL, DEFAULT TRUE | Connected status |
| joined_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Join time |
| left_at | TIMESTAMP | NULLABLE | Disconnect time |

**Indexes**:
- `idx_participant_room` ON (room_id)
- `idx_participant_user_room` ON (user_id, room_id) UNIQUE

**Validation Rules**:
- One participant per user per room
- Score >= 0

---

### AnswerSubmission (Game Service)

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| participant_id | UUID | FK → GameParticipant.id, NOT NULL | Who submitted |
| question_index | INT | NOT NULL | Which question |
| answer_text | VARCHAR(200) | NOT NULL | Submitted answer |
| is_correct | BOOLEAN | NOT NULL | Evaluation result |
| points_awarded | INT | NOT NULL, DEFAULT 0 | Points earned |
| response_time_ms | INT | NOT NULL | Time to answer (ms) |
| submitted_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Submission time |

**Indexes**:
- `idx_submission_participant` ON (participant_id)
- `idx_submission_question` ON (participant_id, question_index) UNIQUE

**Validation Rules**:
- One submission per participant per question
- response_time_ms >= 0
- points_awarded >= 0

---

### FriendRelationship (Social Service)

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| requester_id | UUID | FK → User.id, NOT NULL | Who sent request |
| recipient_id | UUID | FK → User.id, NOT NULL | Who received |
| status | VARCHAR(20) | NOT NULL, DEFAULT 'pending' | 'pending', 'accepted', 'declined', 'blocked' |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Request time |
| updated_at | TIMESTAMP | NOT NULL | Status change time |

**Indexes**:
- `idx_friend_requester` ON (requester_id)
- `idx_friend_recipient` ON (recipient_id)
- `idx_friend_pair` ON (requester_id, recipient_id) UNIQUE
- `idx_friend_status` ON (status) WHERE status = 'pending'

**Validation Rules**:
- requester_id != recipient_id
- Only one relationship per pair (check both directions)
- Status transitions: pending → accepted/declined/blocked

---

## Redis Data Structures

### Session Management (Auth Service)

```
Key: session:{sessionId}
Type: HASH
TTL: 7 days
Fields:
  - userId: UUID
  - createdAt: timestamp
  - lastAccessedAt: timestamp
  - userAgent: string

Key: user:sessions:{userId}
Type: SET
TTL: None (cleaned on logout)
Members: [sessionId1, sessionId2, ...]
```

### Real-time Game State (Game Service)

```
Key: room:{roomCode}:state
Type: HASH
TTL: 24 hours (cleaned after game)
Fields:
  - status: 'lobby' | 'playing' | 'finished'
  - currentQuestion: number
  - questionStartTime: timestamp
  - players: JSON string of player states

Key: room:{roomCode}:scores
Type: SORTED SET
TTL: 24 hours
Members: userId with score as rank value

Key: room:{roomCode}:answers:{questionIndex}
Type: HASH
TTL: 24 hours
Fields:
  - {userId}: JSON { answer, timestamp, correct }
```

### Presence (Social Service)

```
Key: presence:{userId}
Type: STRING
Value: 'online' | 'in_game:{roomCode}'
TTL: 5 minutes (refreshed by heartbeat)

Key: presence:online
Type: SET
TTL: None (managed by presence service)
Members: [userId1, userId2, ...]
```

---

## State Machines

### GameRoom Status

```
           create
              │
              ▼
         ┌────────┐
         │ lobby  │◄──────────┐
         └────┬───┘           │
              │ start         │ "play again"
              ▼               │
         ┌────────┐           │
         │playing │           │
         └────┬───┘           │
              │ all questions │
              ▼               │
         ┌────────┐           │
         │finished├───────────┘
         └────────┘
              │ timeout (24h)
              ▼
           (deleted)
```

### FriendRelationship Status

```
    request sent
         │
         ▼
    ┌─────────┐
    │ pending │
    └────┬────┘
         │
    ┌────┴────┬──────────┐
    ▼         ▼          ▼
┌────────┐ ┌────────┐ ┌───────┐
│accepted│ │declined│ │blocked│
└────────┘ └────────┘ └───────┘
```

---

## Scoring Algorithm

```typescript
const BASE_POINTS = 1000;
const TIME_LIMIT_MS = 30000; // 30 seconds

function calculateScore(responseTimeMs: number, isCorrect: boolean): number {
  if (!isCorrect) return 0;

  // Speed bonus: 1.0 at 0ms, 0.0 at time limit
  const speedBonus = Math.max(0, 1 - (responseTimeMs / TIME_LIMIT_MS));

  // Final score: base + up to 100% bonus for speed
  return Math.round(BASE_POINTS * (1 + speedBonus));
}

// Examples:
// Correct at 0s:    1000 * (1 + 1.0) = 2000 points
// Correct at 15s:   1000 * (1 + 0.5) = 1500 points
// Correct at 30s:   1000 * (1 + 0.0) = 1000 points
// Incorrect:        0 points
```

---

## Migration Strategy

**Phase 1**: Auth Service tables (User)
**Phase 2**: Quiz Service tables (QuizSet, Question)
**Phase 3**: Game Service tables (GameRoom, GameParticipant, AnswerSubmission)
**Phase 4**: Social Service tables (FriendRelationship)

Each service owns its migrations. Cross-service references use UUID and are validated at application level.
