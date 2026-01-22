import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, In } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../entities/user.entity';
import { OAuthProfile } from '../strategies/google.strategy';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  async findByIds(ids: string[]): Promise<User[]> {
    if (ids.length === 0) return [];
    return this.userRepository.find({ where: { id: In(ids) } });
  }

  async findByOAuth(
    oauthProvider: string,
    oauthId: string,
  ): Promise<User | null> {
    return this.userRepository.findOne({
      where: { oauthProvider: oauthProvider as 'google' | 'kakao', oauthId },
    });
  }

  async findByNickname(nickname: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { nickname } });
  }

  async createFromOAuth(profile: OAuthProfile): Promise<User> {
    // Generate unique nickname
    const baseNickname = this.generateBaseNickname(profile.displayName);
    let nickname = baseNickname;
    let counter = 1;

    while (await this.findByNickname(nickname)) {
      nickname = `${baseNickname}${counter}`;
      counter++;
      if (counter > 1000) {
        // Fallback to random suffix
        nickname = `${baseNickname}${Math.random().toString(36).substring(2, 6)}`;
        break;
      }
    }

    const user = this.userRepository.create({
      oauthProvider: profile.provider,
      oauthId: profile.id,
      email: profile.email,
      nickname,
      avatarUrl: profile.avatarUrl,
      lastLoginAt: new Date(),
    });

    return this.userRepository.save(user);
  }

  async createGuestUser(nickname: string): Promise<User> {
    // Validate nickname
    const sanitizedNickname = nickname.trim();
    if (sanitizedNickname.length < 1 || sanitizedNickname.length > 20) {
      throw new BadRequestException('Nickname must be 1-20 characters');
    }

    // Check if nickname is already taken
    const existingUser = await this.findByNickname(sanitizedNickname);
    if (existingUser) {
      throw new ConflictException('Nickname already taken');
    }

    const user = this.userRepository.create({
      oauthProvider: 'guest',
      oauthId: uuidv4(),
      email: null,
      nickname: sanitizedNickname,
      avatarUrl: null,
      lastLoginAt: new Date(),
    });

    return this.userRepository.save(user);
  }

  async updateNickname(userId: string, newNickname: string): Promise<User> {
    const user = await this.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if nickname is taken by another user
    const existingUser = await this.findByNickname(newNickname);
    if (existingUser && existingUser.id !== userId) {
      throw new ConflictException('Nickname already taken');
    }

    user.nickname = newNickname;
    return this.userRepository.save(user);
  }

  async updateLastLogin(userId: string): Promise<User> {
    const user = await this.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.lastLoginAt = new Date();
    return this.userRepository.save(user);
  }

  async searchByNickname(query: string, limit: number = 10): Promise<User[]> {
    return this.userRepository
      .createQueryBuilder('user')
      .where('user.nickname ILIKE :query', { query: `%${query}%` })
      .take(limit)
      .getMany();
  }

  private generateBaseNickname(displayName: string): string {
    // Remove special characters and limit length
    const sanitized = displayName
      .replace(/[^a-zA-Z0-9가-힣]/g, '')
      .substring(0, 12);

    return sanitized || 'Player';
  }
}
