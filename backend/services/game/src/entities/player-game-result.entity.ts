import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { GameResult } from './game-result.entity';

@Entity('player_game_results')
@Index(['playerId', 'gameResult'])
export class PlayerGameResult {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'player_id' })
  @Index()
  playerId: string;

  @Column({ name: 'player_nickname' })
  playerNickname: string;

  @Column({ type: 'varchar', length: 500, name: 'player_avatar_url', nullable: true })
  playerAvatarUrl: string | null;

  @Column()
  rank: number;

  @Column()
  score: number;

  @Column({ name: 'correct_answers' })
  correctAnswers: number;

  @Column({ name: 'total_answers' })
  totalAnswers: number;

  @Column({ type: 'integer', name: 'average_response_time_ms', nullable: true })
  averageResponseTimeMs: number | null;

  @Column({ name: 'is_winner', default: false })
  isWinner: boolean;

  @Column({ type: 'jsonb', name: 'answer_details', default: '[]' })
  answerDetails: {
    round: number;
    answer: string;
    isCorrect: boolean;
    points: number;
    responseTimeMs: number;
  }[];

  @ManyToOne(() => GameResult, (game) => game.playerResults, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'game_result_id' })
  gameResult: GameResult;

  @Column({ name: 'game_result_id' })
  gameResultId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
