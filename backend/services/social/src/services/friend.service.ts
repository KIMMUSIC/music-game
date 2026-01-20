import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { Friendship } from '../entities/friendship.entity';
import { FriendRequest, FriendRequestStatus } from '../entities/friend-request.entity';

export interface UserInfo {
  id: string;
  nickname: string;
  avatarUrl: string | null;
}

export interface FriendInfo extends UserInfo {
  friendshipId: string;
  since: Date;
  isOnline?: boolean;
}

export interface FriendRequestInfo {
  id: string;
  sender: UserInfo;
  receiver: UserInfo;
  status: FriendRequestStatus;
  message: string | null;
  createdAt: Date;
}

@Injectable()
export class FriendService {
  constructor(
    @InjectRepository(Friendship)
    private friendshipRepository: Repository<Friendship>,
    @InjectRepository(FriendRequest)
    private friendRequestRepository: Repository<FriendRequest>,
    private configService: ConfigService,
  ) {}

  async sendFriendRequest(
    senderId: string,
    receiverId: string,
    message?: string,
  ): Promise<FriendRequest> {
    if (senderId === receiverId) {
      throw new BadRequestException('Cannot send friend request to yourself');
    }

    // Check if already friends
    const existingFriendship = await this.friendshipRepository.findOne({
      where: [
        { userId: senderId, friendId: receiverId },
        { userId: receiverId, friendId: senderId },
      ],
    });

    if (existingFriendship) {
      throw new ConflictException('Already friends with this user');
    }

    // Check for existing pending request
    const existingRequest = await this.friendRequestRepository.findOne({
      where: [
        { senderId, receiverId, status: 'pending' },
        { senderId: receiverId, receiverId: senderId, status: 'pending' },
      ],
    });

    if (existingRequest) {
      if (existingRequest.senderId === receiverId) {
        // Other user already sent a request, auto-accept it
        return this.acceptFriendRequest(existingRequest.id, senderId);
      }
      throw new ConflictException('Friend request already sent');
    }

    const request = this.friendRequestRepository.create({
      senderId,
      receiverId,
      message,
      status: 'pending',
    });

    return this.friendRequestRepository.save(request);
  }

  async acceptFriendRequest(
    requestId: string,
    userId: string,
  ): Promise<FriendRequest> {
    const request = await this.friendRequestRepository.findOne({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('Friend request not found');
    }

    if (request.receiverId !== userId) {
      throw new BadRequestException('Cannot accept this request');
    }

    if (request.status !== 'pending') {
      throw new BadRequestException('Request already processed');
    }

    // Update request status
    request.status = 'accepted';
    await this.friendRequestRepository.save(request);

    // Create bidirectional friendship
    const friendship1 = this.friendshipRepository.create({
      userId: request.senderId,
      friendId: request.receiverId,
    });

    const friendship2 = this.friendshipRepository.create({
      userId: request.receiverId,
      friendId: request.senderId,
    });

    await this.friendshipRepository.save([friendship1, friendship2]);

    return request;
  }

  async rejectFriendRequest(
    requestId: string,
    userId: string,
  ): Promise<FriendRequest> {
    const request = await this.friendRequestRepository.findOne({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('Friend request not found');
    }

    if (request.receiverId !== userId) {
      throw new BadRequestException('Cannot reject this request');
    }

    if (request.status !== 'pending') {
      throw new BadRequestException('Request already processed');
    }

    request.status = 'rejected';
    return this.friendRequestRepository.save(request);
  }

  async cancelFriendRequest(requestId: string, userId: string): Promise<void> {
    const request = await this.friendRequestRepository.findOne({
      where: { id: requestId, senderId: userId, status: 'pending' },
    });

    if (!request) {
      throw new NotFoundException('Friend request not found');
    }

    await this.friendRequestRepository.remove(request);
  }

  async removeFriend(userId: string, friendId: string): Promise<void> {
    const friendships = await this.friendshipRepository.find({
      where: [
        { userId, friendId },
        { userId: friendId, friendId: userId },
      ],
    });

    if (friendships.length === 0) {
      throw new NotFoundException('Friendship not found');
    }

    await this.friendshipRepository.remove(friendships);
  }

  async getFriends(userId: string): Promise<FriendInfo[]> {
    const friendships = await this.friendshipRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    if (friendships.length === 0) {
      return [];
    }

    const friendIds = friendships.map((f) => f.friendId);
    const users = await this.getUserInfoBatch(friendIds);

    return friendships.map((f) => {
      const user = users.find((u) => u.id === f.friendId);
      return {
        friendshipId: f.id,
        id: f.friendId,
        nickname: user?.nickname || 'Unknown',
        avatarUrl: user?.avatarUrl || null,
        since: f.createdAt,
      };
    });
  }

  async getPendingRequests(userId: string): Promise<{
    incoming: FriendRequestInfo[];
    outgoing: FriendRequestInfo[];
  }> {
    const [incoming, outgoing] = await Promise.all([
      this.friendRequestRepository.find({
        where: { receiverId: userId, status: 'pending' },
        order: { createdAt: 'DESC' },
      }),
      this.friendRequestRepository.find({
        where: { senderId: userId, status: 'pending' },
        order: { createdAt: 'DESC' },
      }),
    ]);

    const allUserIds = [
      ...incoming.map((r) => r.senderId),
      ...outgoing.map((r) => r.receiverId),
    ];

    const users = allUserIds.length > 0
      ? await this.getUserInfoBatch(allUserIds)
      : [];

    const incomingInfo: FriendRequestInfo[] = incoming.map((r) => {
      const sender = users.find((u) => u.id === r.senderId);
      return {
        id: r.id,
        sender: {
          id: r.senderId,
          nickname: sender?.nickname || 'Unknown',
          avatarUrl: sender?.avatarUrl || null,
        },
        receiver: {
          id: r.receiverId,
          nickname: '',
          avatarUrl: null,
        },
        status: r.status,
        message: r.message,
        createdAt: r.createdAt,
      };
    });

    const outgoingInfo: FriendRequestInfo[] = outgoing.map((r) => {
      const receiver = users.find((u) => u.id === r.receiverId);
      return {
        id: r.id,
        sender: {
          id: r.senderId,
          nickname: '',
          avatarUrl: null,
        },
        receiver: {
          id: r.receiverId,
          nickname: receiver?.nickname || 'Unknown',
          avatarUrl: receiver?.avatarUrl || null,
        },
        status: r.status,
        message: r.message,
        createdAt: r.createdAt,
      };
    });

    return { incoming: incomingInfo, outgoing: outgoingInfo };
  }

  async areFriends(userId1: string, userId2: string): Promise<boolean> {
    const friendship = await this.friendshipRepository.findOne({
      where: { userId: userId1, friendId: userId2 },
    });

    return !!friendship;
  }

  async getFriendCount(userId: string): Promise<number> {
    return this.friendshipRepository.count({
      where: { userId },
    });
  }

  async searchUsers(query: string, currentUserId: string): Promise<UserInfo[]> {
    const authServiceUrl = this.configService.get<string>('AUTH_SERVICE_URL');
    const internalKey = this.configService.get<string>('INTERNAL_API_KEY');

    try {
      const response = await axios.post(
        `${authServiceUrl}/auth/internal/search-users`,
        { query, excludeUserId: currentUserId },
        { headers: { 'X-Internal-Key': internalKey } },
      );

      return response.data.users || [];
    } catch (error) {
      console.error('Failed to search users:', error);
      return [];
    }
  }

  private async getUserInfoBatch(userIds: string[]): Promise<UserInfo[]> {
    if (userIds.length === 0) return [];

    const authServiceUrl = this.configService.get<string>('AUTH_SERVICE_URL');
    const internalKey = this.configService.get<string>('INTERNAL_API_KEY');

    try {
      const response = await axios.post(
        `${authServiceUrl}/auth/internal/get-users-batch`,
        { userIds },
        { headers: { 'X-Internal-Key': internalKey } },
      );

      return response.data.users || [];
    } catch (error) {
      console.error('Failed to fetch user info:', error);
      return [];
    }
  }
}
