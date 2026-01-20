import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { UserService } from '../src/services/user.service';
import { User } from '../src/entities/user.entity';

describe('UserService', () => {
  let service: UserService;
  let repository: jest.Mocked<Repository<User>>;

  const mockUser: User = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    oauthProvider: 'google',
    oauthId: 'google-123',
    email: 'test@example.com',
    nickname: 'testuser',
    avatarUrl: 'https://example.com/avatar.jpg',
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLoginAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    repository = module.get(getRepositoryToken(User));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findById', () => {
    it('should return user if found', async () => {
      repository.findOne.mockResolvedValue(mockUser);

      const result = await service.findById(mockUser.id);

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: mockUser.id },
      });
      expect(result).toEqual(mockUser);
    });

    it('should return null if user not found', async () => {
      repository.findOne.mockResolvedValue(null);

      const result = await service.findById('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('findByOAuth', () => {
    it('should return user by OAuth provider and ID', async () => {
      repository.findOne.mockResolvedValue(mockUser);

      const result = await service.findByOAuth('google', 'google-123');

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { oauthProvider: 'google', oauthId: 'google-123' },
      });
      expect(result).toEqual(mockUser);
    });
  });

  describe('findByNickname', () => {
    it('should return user by nickname', async () => {
      repository.findOne.mockResolvedValue(mockUser);

      const result = await service.findByNickname('testuser');

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { nickname: 'testuser' },
      });
      expect(result).toEqual(mockUser);
    });
  });

  describe('createFromOAuth', () => {
    const oauthProfile = {
      provider: 'google' as const,
      id: 'google-123',
      email: 'test@example.com',
      displayName: 'Test User',
      avatarUrl: 'https://example.com/avatar.jpg',
    };

    it('should create user with generated nickname', async () => {
      repository.findOne.mockResolvedValue(null); // No existing nickname
      repository.create.mockReturnValue(mockUser);
      repository.save.mockResolvedValue(mockUser);

      const result = await service.createFromOAuth(oauthProfile);

      expect(repository.create).toHaveBeenCalled();
      expect(repository.save).toHaveBeenCalled();
      expect(result).toEqual(mockUser);
    });
  });

  describe('updateNickname', () => {
    it('should update nickname if available', async () => {
      repository.findOne
        .mockResolvedValueOnce(mockUser) // Find user
        .mockResolvedValueOnce(null); // Nickname not taken
      repository.save.mockResolvedValue({ ...mockUser, nickname: 'newnickname' });

      const result = await service.updateNickname(mockUser.id, 'newnickname');

      expect(result.nickname).toBe('newnickname');
    });

    it('should throw ConflictException if nickname taken', async () => {
      const anotherUser = { ...mockUser, id: 'other-id' };
      repository.findOne
        .mockResolvedValueOnce(mockUser) // Find user
        .mockResolvedValueOnce(anotherUser); // Nickname taken

      await expect(service.updateNickname(mockUser.id, 'takennickname')).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw NotFoundException if user not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.updateNickname('non-existent', 'nickname')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateLastLogin', () => {
    it('should update lastLoginAt timestamp', async () => {
      repository.findOne.mockResolvedValue(mockUser);
      repository.save.mockResolvedValue({ ...mockUser, lastLoginAt: new Date() });

      const result = await service.updateLastLogin(mockUser.id);

      expect(repository.save).toHaveBeenCalled();
      expect(result.lastLoginAt).toBeDefined();
    });
  });

  describe('searchByNickname', () => {
    it('should return matching users', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockUser]),
      };

      repository.createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder);

      const result = await service.searchByNickname('test', 10);

      expect(result).toEqual([mockUser]);
    });
  });
});
