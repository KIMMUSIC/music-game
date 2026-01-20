import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  Unique,
} from 'typeorm';

@Entity('friendships')
@Unique(['userId', 'friendId'])
@Index(['userId'])
@Index(['friendId'])
export class Friendship {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'friend_id' })
  friendId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
