import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { PlayerGameResult } from './player-game-result.entity';

@Entity('game_results')
export class GameResult {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'room_id' })
  @Index()
  roomId: string;

  @Column({ name: 'quiz_id' })
  @Index()
  quizId: string;

  @Column({ name: 'quiz_title' })
  quizTitle: string;

  @Column({ name: 'host_id' })
  @Index()
  hostId: string;

  @Column({ type: 'uuid', name: 'winner_id', nullable: true })
  winnerId: string | null;

  @Column({ name: 'player_count' })
  playerCount: number;

  @Column({ name: 'total_rounds' })
  totalRounds: number;

  @Column({ name: 'duration_ms' })
  durationMs: number;

  @Column({ type: 'jsonb', name: 'round_data', default: '[]' })
  roundData: {
    songTitle: string;
    songArtist: string;
    correctAnswers: number;
  }[];

  @CreateDateColumn({ name: 'played_at' })
  playedAt: Date;

  @OneToMany(() => PlayerGameResult, (result) => result.gameResult, {
    cascade: true,
  })
  playerResults: PlayerGameResult[];
}
