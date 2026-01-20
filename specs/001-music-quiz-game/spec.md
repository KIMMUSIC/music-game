# Feature Specification: Music Quiz Game Platform

**Feature Branch**: `001-music-quiz-game`
**Created**: 2025-01-17
**Status**: Draft
**Input**: User description: "노래 맞추기 게임을 다른 사람들과 할 수 있는 웹 서비스"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Third-Party Login and Profile Setup (Priority: P1)

A new user visits the platform and wants to create an account to play music quiz games with friends. They sign in using their existing social account (Google, Kakao, etc.) and set up their nickname for the platform.

**Why this priority**: Authentication is the foundational requirement. Without user identity, no other features (room creation, friend invites, score tracking) can function. This is the entry point for all users.

**Independent Test**: Can be fully tested by completing the login flow and verifying the user can set/change their nickname. Delivers the ability to have a persistent identity on the platform.

**Acceptance Scenarios**:

1. **Given** an unauthenticated user on the landing page, **When** they click "Login with Google/Kakao", **Then** they are redirected to the OAuth provider and upon successful authentication, returned to the platform as a logged-in user.
2. **Given** a first-time authenticated user, **When** they complete login, **Then** they are prompted to set a unique nickname before accessing other features.
3. **Given** a logged-in user, **When** they visit their profile settings, **Then** they can view and modify their nickname.
4. **Given** a user attempting to set a nickname, **When** the nickname is already taken, **Then** the system displays an error and asks for a different nickname.

---

### User Story 2 - Quiz Set Creation (Priority: P2)

A logged-in user wants to create a quiz set (collection of music questions) that others can play. They access the quiz creation page, add questions using YouTube links or MP3 files, specify the playback segment, and define acceptable answers for each question.

**Why this priority**: Quiz content is the core value of the platform. Without quiz sets, there is nothing to play. This must exist before game rooms can function.

**Independent Test**: Can be fully tested by creating a quiz set with multiple questions and verifying the questions play correctly in preview mode. Delivers the ability to contribute playable content.

**Acceptance Scenarios**:

1. **Given** a logged-in user on the quiz creation page, **When** they provide a YouTube URL for a question, **Then** the system validates the URL and allows them to specify start/end timestamps for the audio clip.
2. **Given** a logged-in user on the quiz creation page, **When** they upload an MP3 file, **Then** the system accepts the file and allows them to specify start/end timestamps for the audio clip.
3. **Given** a user creating a question, **When** they set acceptable answers, **Then** they can specify multiple correct answers (e.g., song title variations, artist name).
4. **Given** a user with a completed quiz set, **When** they save the quiz, **Then** the quiz becomes available for selection when creating game rooms.
5. **Given** a quiz creator, **When** they preview a question, **Then** the audio plays from the specified start to end timestamp.

---

### User Story 3 - Game Room Creation and Joining (Priority: P3)

A logged-in user wants to host a music quiz game session. They create a room, select a quiz set, and receive a shareable invitation link/code. Friends can join the room using this link/code.

**Why this priority**: This enables the core multiplayer experience. Rooms are the container for real-time gameplay. Depends on P1 (authentication) and P2 (quiz content).

**Independent Test**: Can be fully tested by creating a room, sharing the invite link, and verifying another user can successfully join. Delivers the ability to gather players for a game.

**Acceptance Scenarios**:

1. **Given** a logged-in user, **When** they click "Create Room", **Then** they can select a quiz set and configure room settings (max players, etc.).
2. **Given** a user who has created a room, **When** room creation is complete, **Then** they receive a unique room code and shareable invite link.
3. **Given** a logged-in user with an invite link, **When** they click the link, **Then** they are directed to the room lobby and added as a participant.
4. **Given** a logged-in user with a room code, **When** they enter the code on the join room page, **Then** they are added to the room lobby.
5. **Given** a user in the room lobby, **When** the host has not started the game, **Then** they see a list of current participants and can leave the room.

---

### User Story 4 - Real-time Gameplay (Priority: P4)

Players in a room participate in the quiz game. The host starts the game, questions are presented one by one with audio playback, players submit answers in real-time, and scores are updated live for all participants to see.

**Why this priority**: This is the main interactive experience but depends on all previous stories (auth, content, rooms). It delivers the core entertainment value.

**Independent Test**: Can be fully tested with 2+ players in a room playing through a quiz. Delivers the competitive music guessing experience.

**Acceptance Scenarios**:

1. **Given** a host in a room with at least one other player, **When** the host clicks "Start Game", **Then** all players see the game interface and the first question begins.
2. **Given** players during a question, **When** the audio clip plays, **Then** all players hear the same audio simultaneously.
3. **Given** a player during a question, **When** they type and submit an answer, **Then** the answer is evaluated against acceptable answers (case-insensitive, allowing minor typos if configured).
4. **Given** a player who submitted a correct answer, **When** the question ends, **Then** their score increases based on answer speed (faster = more points).
5. **Given** all players during gameplay, **When** scores change, **Then** all players see the updated scoreboard in real-time.
6. **Given** a question in progress, **When** the time limit expires, **Then** the correct answer is revealed and the next question begins after a brief interval.

---

### User Story 5 - Game Results and Rankings (Priority: P5)

After all questions are completed, the game ends and players see final rankings. The results show each player's score, position, and game statistics.

**Why this priority**: This provides closure and satisfaction after gameplay. Lower priority as it's the conclusion of the experience.

**Independent Test**: Can be fully tested by completing a game and verifying all players see consistent final rankings. Delivers recognition and competitive satisfaction.

**Acceptance Scenarios**:

1. **Given** a game where all questions have been answered, **When** the final question ends, **Then** all players see the final results screen.
2. **Given** players on the results screen, **When** results are displayed, **Then** players are ranked by score in descending order with their final position shown.
3. **Given** a player on the results screen, **When** viewing their stats, **Then** they see their total score, number of correct answers, and average answer time.
4. **Given** players on the results screen, **When** the host clicks "Play Again", **Then** a new game can be started with the same quiz or a different one.

---

### User Story 6 - Friend System (Priority: P6)

Users can add friends by nickname, view their friends list, and easily invite friends to game rooms.

**Why this priority**: Enhances the social experience but the platform is fully functional without it. Users can still share invite links manually.

**Independent Test**: Can be fully tested by sending a friend request, accepting it, and verifying both users appear on each other's friends list. Delivers easier social connections.

**Acceptance Scenarios**:

1. **Given** a logged-in user, **When** they search for another user by nickname, **Then** they can send a friend request.
2. **Given** a user who receives a friend request, **When** they view their notifications, **Then** they can accept or decline the request.
3. **Given** two users who are friends, **When** one views their friends list, **Then** they see the other user with their online status.
4. **Given** a user in a game room lobby, **When** they click "Invite Friends", **Then** they see their friends list and can send direct invitations.

---

### Edge Cases

- What happens when a host leaves during gameplay? The system should either transfer host role to another player or end the game gracefully.
- What happens when a player disconnects mid-game? Their current score is preserved, and they can rejoin if the game is still in progress.
- What happens when a YouTube video becomes unavailable? The quiz creator should be notified, and that question should be skipped or the quiz marked as needing repair.
- What happens when all players answer correctly simultaneously? Points are awarded based on exact submission timestamp.
- What happens when a room reaches max capacity? New join attempts should be rejected with a "room full" message.
- What happens when a user submits an answer with special characters or unicode? The answer comparison should normalize text appropriately.

## Requirements *(mandatory)*

### Functional Requirements

**Authentication & User Management**
- **FR-001**: System MUST support third-party authentication only (OAuth2 providers: Google, Kakao minimum).
- **FR-002**: System MUST NOT store or handle user passwords directly.
- **FR-003**: Users MUST set a unique nickname after first login.
- **FR-004**: Nicknames MUST be between 2-20 characters and unique across the platform.

**Quiz Set Management**
- **FR-005**: Users MUST be able to create quiz sets containing 1 or more questions.
- **FR-006**: Each question MUST support either a YouTube URL or an uploaded MP3 file as the audio source.
- **FR-007**: Each question MUST have configurable start and end timestamps for audio playback (clip duration).
- **FR-008**: Each question MUST have at least 1 acceptable answer, up to 10 alternative answers allowed.
- **FR-009**: Quiz creators MUST be able to preview questions before publishing.
- **FR-010**: System MUST validate YouTube URLs for accessibility.
- **FR-011**: MP3 uploads MUST be limited to 10MB per file.

**Game Room Management**
- **FR-012**: Logged-in users MUST be able to create game rooms.
- **FR-013**: Room creators MUST select a quiz set when creating a room.
- **FR-014**: Each room MUST have a unique room code (6 alphanumeric characters).
- **FR-015**: Rooms MUST support 2-20 players.
- **FR-016**: Room hosts MUST be able to start the game when at least 2 players are present.
- **FR-017**: Shareable invite links MUST direct users to the specific room.

**Gameplay**
- **FR-018**: All players MUST hear audio synchronized within 500ms of each other.
- **FR-019**: Answer submission MUST record exact timestamp for scoring.
- **FR-020**: Correct answers MUST be evaluated case-insensitively.
- **FR-021**: Scores MUST be calculated based on correctness and speed (faster correct answers = more points).
- **FR-022**: Scoreboard MUST update in real-time for all players (within 1 second).
- **FR-023**: Each question MUST have a time limit (configurable, default 30 seconds).
- **FR-024**: System MUST reveal correct answer after time expires or all players answer.

**Social Features**
- **FR-025**: Users MUST be able to search for other users by nickname.
- **FR-026**: Users MUST be able to send and receive friend requests.
- **FR-027**: Users MUST be able to view online status of friends.
- **FR-028**: Room hosts MUST be able to invite friends directly from friends list.

### Key Entities

- **User**: Represents a registered platform member. Attributes: unique ID, OAuth provider ID, nickname, created date. Relationships: owns quiz sets, participates in games, has friends.

- **QuizSet**: A collection of music questions created by a user. Attributes: title, description, question count, creator, visibility, created/updated dates. Relationships: belongs to creator, contains questions, used by game rooms.

- **Question**: A single music guessing challenge. Attributes: audio source (YouTube URL or file reference), start timestamp, end timestamp, acceptable answers list, order in quiz. Relationships: belongs to a quiz set.

- **GameRoom**: A temporary session where players compete. Attributes: room code, invite link, host, selected quiz, max players, status (lobby/playing/finished). Relationships: has a host (user), uses a quiz set, contains participants.

- **GameParticipant**: A user's participation in a specific game. Attributes: user reference, room reference, current score, join time. Relationships: links user to game room.

- **FriendRelationship**: Connection between two users. Attributes: requester, recipient, status (pending/accepted/declined), created date. Relationships: connects two users.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users complete the login and nickname setup process in under 2 minutes.
- **SC-002**: Users create a 10-question quiz set in under 15 minutes.
- **SC-003**: Players join a room via invite link within 10 seconds of clicking.
- **SC-004**: Audio playback starts within 2 seconds of question start for all players.
- **SC-005**: Score updates appear on all player screens within 1 second of answer submission.
- **SC-006**: System supports at least 100 concurrent game rooms with 10 players each.
- **SC-007**: 95% of users successfully complete their first game without errors.
- **SC-008**: Answer evaluation accuracy is 99%+ (correct answers recognized, incorrect rejected).
- **SC-009**: Platform availability is 99.5% uptime during operating hours.
- **SC-010**: 80% of users who complete one game return to play another within 7 days.

## Assumptions

- OAuth providers (Google, Kakao) will remain available and maintain their current API contracts.
- YouTube's embed/iframe API allows extracting audio timing without violating terms of service.
- Users have stable internet connections suitable for real-time multiplayer experiences.
- Browser audio playback APIs provide sufficient synchronization for casual gaming (not competitive esports-level precision).
- User-uploaded MP3 files are legal for personal use within friend groups (platform does not verify copyright).
- Default time limit of 30 seconds per question is appropriate; can be adjusted based on user feedback.
- Score calculation formula: base_points * (1 + speed_bonus) where speed_bonus decreases linearly from 1.0 to 0.0 as time passes.
