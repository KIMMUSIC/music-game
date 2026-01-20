import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';

export type FriendRequestStatus = 'pending' | 'accepted' | 'rejected';

@Entity('friend_requests')
@Unique(['senderId', 'receiverId'])
@Index(['senderId'])
@Index(['receiverId'])
@Index(['status'])
export class FriendRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'sender_id' })
  senderId: string;

  @Column({ name: 'receiver_id' })
  receiverId: string;

  @Column({
    type: 'enum',
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending',
  })
  status: FriendRequestStatus;

  @Column({ nullable: true })
  message: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
