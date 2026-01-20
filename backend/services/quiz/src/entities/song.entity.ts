import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Quiz } from './quiz.entity';

@Entity('songs')
export class Song {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  quizId: string;

  @ManyToOne(() => Quiz, (quiz) => quiz.songs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'quizId' })
  quiz: Quiz;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'varchar', length: 200 })
  artist: string;

  @Column({ type: 'varchar', length: 500 })
  audioUrl: string;

  @Column({ type: 'varchar', length: 20, default: 'upload' })
  sourceType: 'upload' | 'youtube';

  @Column({ type: 'int', default: 0 })
  startTime: number; // seconds from start of audio to begin playing

  @Column({ type: 'int', default: 10 })
  playDuration: number; // seconds of audio to play

  @Column({ type: 'int', default: 30 })
  timeLimit: number; // seconds players have to answer

  @Column({ type: 'int' })
  orderIndex: number;

  @Column({ type: 'varchar', length: 30, default: 'title_and_artist' })
  matchMode: 'title_only' | 'title_and_artist' | 'exact';

  @Column({ type: 'jsonb', default: '[]' })
  alternativeAnswers: string[];

  @Column({ type: 'varchar', length: 50, nullable: true })
  genre: string | null;

  @Column({ type: 'int', nullable: true })
  releaseYear: number | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  hint: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
