import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';

interface FriendNotification {
  type: 'friend_request' | 'friend_accepted' | 'friend_removed';
  data: Record<string, unknown>;
}

@Injectable()
@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  },
  namespace: '/friends',
})
export class FriendGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private userSockets: Map<string, Set<string>> = new Map();

  constructor(private configService: ConfigService) {}

  async handleConnection(client: Socket) {
    try {
      const token = this.extractToken(client);
      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.verifyToken(token);
      if (!payload) {
        client.disconnect();
        return;
      }

      const userId = payload.sub;
      client.data.userId = userId;

      // Track user's socket connections
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(client.id);

      // Join user's personal room for notifications
      client.join(`user:${userId}`);

      console.log(`User ${userId} connected to friends gateway`);
    } catch (error) {
      console.error('Friend gateway connection error:', error);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    if (userId) {
      const sockets = this.userSockets.get(userId);
      if (sockets) {
        sockets.delete(client.id);
        if (sockets.size === 0) {
          this.userSockets.delete(userId);
        }
      }
      console.log(`User ${userId} disconnected from friends gateway`);
    }
  }

  // Send notification to a specific user
  notifyUser(userId: string, notification: FriendNotification) {
    this.server.to(`user:${userId}`).emit('notification', notification);
  }

  // Notify about a new friend request
  notifyFriendRequest(
    receiverId: string,
    sender: { id: string; nickname: string; avatarUrl: string | null },
    requestId: string,
    message: string | null,
  ) {
    this.notifyUser(receiverId, {
      type: 'friend_request',
      data: {
        requestId,
        sender,
        message,
        createdAt: new Date().toISOString(),
      },
    });
  }

  // Notify about accepted friend request
  notifyFriendAccepted(
    senderId: string,
    accepter: { id: string; nickname: string; avatarUrl: string | null },
  ) {
    this.notifyUser(senderId, {
      type: 'friend_accepted',
      data: {
        friend: accepter,
        acceptedAt: new Date().toISOString(),
      },
    });
  }

  // Notify about friend removal
  notifyFriendRemoved(userId: string, removedById: string) {
    this.notifyUser(userId, {
      type: 'friend_removed',
      data: {
        removedBy: removedById,
        removedAt: new Date().toISOString(),
      },
    });
  }

  // Check if a user is online
  isUserOnline(userId: string): boolean {
    return this.userSockets.has(userId) && this.userSockets.get(userId)!.size > 0;
  }

  // Get online status for multiple users
  getOnlineStatus(userIds: string[]): Map<string, boolean> {
    const status = new Map<string, boolean>();
    for (const userId of userIds) {
      status.set(userId, this.isUserOnline(userId));
    }
    return status;
  }

  private extractToken(client: Socket): string | null {
    // Try to get token from auth header
    const authHeader = client.handshake.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Try to get token from cookie
    const cookies = client.handshake.headers.cookie;
    if (cookies) {
      const tokenCookie = cookies
        .split(';')
        .find((c) => c.trim().startsWith('access_token='));
      if (tokenCookie) {
        return tokenCookie.split('=')[1];
      }
    }

    // Try query parameter
    const token = client.handshake.query.token;
    if (typeof token === 'string') {
      return token;
    }

    return null;
  }

  private verifyToken(token: string): { sub: string } | null {
    try {
      const secret = this.configService.get<string>('JWT_SECRET');
      const payload = jwt.verify(token, secret!) as { sub: string };
      return payload;
    } catch {
      return null;
    }
  }
}
