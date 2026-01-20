import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from '../src/services/auth.service';
import { UserService } from '../src/services/user.service';
import { SessionService } from '../src/services/session.service';

describe('AuthService', () => {
  let service: AuthService;
  let userService: jest.Mocked<UserService>;
  let jwtService: jest.Mocked<JwtService>;
  let sessionService: jest.Mocked<SessionService>;

  const mockUser = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    oauthProvider: 'google' as const,
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
        AuthService,
        {
          provide: UserService,
          useValue: {
            findByOAuth: jest.fn(),
            createFromOAuth: jest.fn(),
            updateLastLogin: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
            verify: jest.fn(),
          },
        },
        {
          provide: SessionService,
          useValue: {
            createSession: jest.fn(),
            deleteSession: jest.fn(),
            validateSession: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config: Record<string, string> = {
                JWT_SECRET: 'test-secret',
                JWT_ACCESS_EXPIRY: '15m',
                JWT_REFRESH_EXPIRY: '7d',
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userService = module.get(UserService);
    jwtService = module.get(JwtService);
    sessionService = module.get(SessionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateOAuthUser', () => {
    const oauthProfile = {
      provider: 'google' as const,
      id: 'google-123',
      email: 'test@example.com',
      displayName: 'Test User',
      avatarUrl: 'https://example.com/avatar.jpg',
    };

    it('should return existing user if found', async () => {
      userService.findByOAuth.mockResolvedValue(mockUser);
      userService.updateLastLogin.mockResolvedValue(mockUser);

      const result = await service.validateOAuthUser(oauthProfile);

      expect(userService.findByOAuth).toHaveBeenCalledWith('google', 'google-123');
      expect(userService.updateLastLogin).toHaveBeenCalledWith(mockUser.id);
      expect(result).toEqual(mockUser);
    });

    it('should create new user if not found', async () => {
      userService.findByOAuth.mockResolvedValue(null);
      userService.createFromOAuth.mockResolvedValue(mockUser);

      const result = await service.validateOAuthUser(oauthProfile);

      expect(userService.findByOAuth).toHaveBeenCalledWith('google', 'google-123');
      expect(userService.createFromOAuth).toHaveBeenCalledWith(oauthProfile);
      expect(result).toEqual(mockUser);
    });
  });

  describe('generateTokens', () => {
    it('should generate access and refresh tokens', async () => {
      jwtService.sign
        .mockReturnValueOnce('access-token')
        .mockReturnValueOnce('refresh-token');
      sessionService.createSession.mockResolvedValue('session-id');

      const result = await service.generateTokens(mockUser);

      expect(jwtService.sign).toHaveBeenCalledTimes(2);
      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
    });
  });

  describe('validateToken', () => {
    it('should return payload for valid token', async () => {
      const payload = { sub: mockUser.id, nickname: mockUser.nickname };
      jwtService.verify.mockReturnValue(payload);

      const result = await service.validateToken('valid-token');

      expect(jwtService.verify).toHaveBeenCalledWith('valid-token');
      expect(result).toEqual({ valid: true, userId: mockUser.id });
    });

    it('should return invalid for expired token', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('Token expired');
      });

      const result = await service.validateToken('expired-token');

      expect(result).toEqual({ valid: false, userId: undefined });
    });
  });

  describe('logout', () => {
    it('should delete user session', async () => {
      sessionService.deleteSession.mockResolvedValue(undefined);

      await service.logout(mockUser.id, 'session-id');

      expect(sessionService.deleteSession).toHaveBeenCalledWith(mockUser.id, 'session-id');
    });
  });
});
